-- xlPro — Phase 3: tenant-scoped, versioned valuation assumptions and run snapshots.
--
-- Design
-- * A tenant is a workspace. Users reach data only through tenant_members (RLS everywhere).
-- * Assumption sets are IMMUTABLE versions (no UPDATE/DELETE policies). Saving creates version N+1
--   through save_valuation_assumptions(), which checks the caller's expected version (optimistic
--   concurrency) so two editors cannot silently overwrite each other. Restoring = saving an old
--   payload as a new version, so history is never rewritten.
-- * Valuation runs are immutable snapshots of outputs tied to the exact assumption version.
-- * company_key is the app's company id. Companies are still browser-held in this release; they
--   move server-side in a later milestone. company_key is always scoped by tenant_id.

create extension if not exists pgcrypto;

-- ── Workspaces ────────────────────────────────────────────────────────────────────────────────
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members (user_id);

-- Membership helpers. SECURITY DEFINER avoids recursive RLS on tenant_members; search_path is pinned.
create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant and m.user_id = auth.uid());
$$;

create or replace function public.can_edit_tenant(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid() and m.role in ('owner', 'editor')
  );
$$;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

create policy tenants_select on public.tenants for select to authenticated
  using (public.is_tenant_member(id));
create or replace function public.is_tenant_owner(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create policy tenants_update on public.tenants for update to authenticated
  using (public.is_tenant_owner(id))
  with check (public.is_tenant_owner(id));

create policy tenant_members_select on public.tenant_members for select to authenticated
  using (public.is_tenant_member(tenant_id));
-- Membership changes go through future admin RPCs; no direct insert/update/delete for clients.

-- Creates a workspace and makes the caller its owner, atomically.
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  insert into public.tenants (name, created_by) values (trim(p_name), auth.uid()) returning id into v_id;
  insert into public.tenant_members (tenant_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$;

-- ── Versioned valuation assumptions ───────────────────────────────────────────────────────────
create table public.valuation_assumption_sets (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  company_key  text not null check (char_length(company_key) between 1 and 200),
  scenario_id  text not null check (scenario_id in ('base', 'bull', 'bear', 'custom')),
  version      integer not null check (version >= 1),
  assumptions  jsonb not null check (jsonb_typeof(assumptions) = 'object' and pg_column_size(assumptions) <= 16384),
  note         text check (note is null or char_length(note) <= 500),
  created_by   uuid not null references auth.users (id),
  created_at   timestamptz not null default now(),
  unique (tenant_id, company_key, scenario_id, version)
);
create index valuation_assumption_sets_latest_idx
  on public.valuation_assumption_sets (tenant_id, company_key, scenario_id, version desc);

alter table public.valuation_assumption_sets enable row level security;

create policy assumption_sets_select on public.valuation_assumption_sets for select to authenticated
  using (public.is_tenant_member(tenant_id));
-- No insert/update/delete policies: rows are written only by save_valuation_assumptions().

create or replace function public.save_valuation_assumptions(
  p_tenant uuid,
  p_company_key text,
  p_scenario_id text,
  p_assumptions jsonb,
  p_expected_version integer,
  p_note text default null
) returns public.valuation_assumption_sets
language plpgsql security definer set search_path = public as $$
declare
  v_latest integer;
  v_row public.valuation_assumption_sets;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.can_edit_tenant(p_tenant) then
    raise exception 'You do not have permission to edit this workspace' using errcode = '42501';
  end if;

  -- Serialise saves for one company/scenario so version numbers cannot collide.
  perform pg_advisory_xact_lock(hashtext(p_tenant::text || ':' || p_company_key || ':' || p_scenario_id));

  select coalesce(max(version), 0) into v_latest
  from public.valuation_assumption_sets
  where tenant_id = p_tenant and company_key = p_company_key and scenario_id = p_scenario_id;

  if v_latest <> coalesce(p_expected_version, 0) then
    raise exception 'Version conflict: latest saved version is %, you edited version %', v_latest, coalesce(p_expected_version, 0)
      using errcode = '40001';
  end if;

  insert into public.valuation_assumption_sets (tenant_id, company_key, scenario_id, version, assumptions, note, created_by)
  values (p_tenant, p_company_key, p_scenario_id, v_latest + 1, p_assumptions, nullif(trim(p_note), ''), auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

-- ── Immutable valuation run snapshots ─────────────────────────────────────────────────────────
create table public.valuation_runs (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  company_key        text not null,
  scenario_id        text not null,
  assumption_set_id  uuid not null references public.valuation_assumption_sets (id),
  engine_version     text not null,
  input_hash         text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  outputs            jsonb not null check (jsonb_typeof(outputs) = 'object' and pg_column_size(outputs) <= 65536),
  created_by         uuid not null default auth.uid() references auth.users (id),
  created_at         timestamptz not null default now()
);
create index valuation_runs_scope_idx on public.valuation_runs (tenant_id, company_key, scenario_id, created_at desc);

alter table public.valuation_runs enable row level security;

create policy valuation_runs_select on public.valuation_runs for select to authenticated
  using (public.is_tenant_member(tenant_id));
create policy valuation_runs_insert on public.valuation_runs for insert to authenticated
  with check (
    public.can_edit_tenant(tenant_id)
    and created_by = auth.uid()
    and exists (
      select 1 from public.valuation_assumption_sets s
      where s.id = assumption_set_id and s.tenant_id = valuation_runs.tenant_id
        and s.company_key = valuation_runs.company_key and s.scenario_id = valuation_runs.scenario_id
    )
  );

-- ── Privileges ────────────────────────────────────────────────────────────────────────────────
revoke all on public.tenants, public.tenant_members, public.valuation_assumption_sets, public.valuation_runs from anon;
revoke insert, update, delete on public.tenant_members, public.valuation_assumption_sets from authenticated;
revoke update, delete on public.valuation_runs from authenticated;
revoke insert, delete on public.tenants from authenticated;
grant select on public.tenants, public.tenant_members, public.valuation_assumption_sets, public.valuation_runs to authenticated;
grant update (name) on public.tenants to authenticated;
grant insert on public.valuation_runs to authenticated;

revoke execute on function public.create_workspace(text) from public, anon;
revoke execute on function public.save_valuation_assumptions(uuid, text, text, jsonb, integer, text) from public, anon;
revoke execute on function public.is_tenant_member(uuid) from public, anon;
revoke execute on function public.can_edit_tenant(uuid) from public, anon;
revoke execute on function public.is_tenant_owner(uuid) from public, anon;
grant execute on function public.is_tenant_owner(uuid) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.save_valuation_assumptions(uuid, text, text, jsonb, integer, text) to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.can_edit_tenant(uuid) to authenticated;
