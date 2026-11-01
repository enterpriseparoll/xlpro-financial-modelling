-- RLS and versioning tests for 20261101190000_valuation_persistence.sql.
-- Run on plain Postgres after rls_harness.sql and the migration; any failed assertion aborts with an error.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

create function pg_temp.expect_error(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error % but statement succeeded: %', p_code, p_sql;
exception when others then
  if sqlstate <> p_code then raise exception 'expected % got % (%) for: %', p_code, sqlstate, sqlerrm, p_sql; end if;
end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.expect_error(text, text) to anon, authenticated;

set role authenticated;

-- Alice creates a workspace and saves v1, v2.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t_ws as select public.create_workspace('Alice Capital') as id;
do $$ declare ws uuid := (select id from t_ws); v int; begin
  v := (public.save_valuation_assumptions(ws, 'comp-1', 'base', '{"riskFreeRate":4}', 0, 'first')).version;
  assert v = 1, 'first save is version 1';
  v := (public.save_valuation_assumptions(ws, 'comp-1', 'base', '{"riskFreeRate":4.5}', 1, null)).version;
  assert v = 2, 'second save is version 2';
  v := (public.save_valuation_assumptions(ws, 'comp-1', 'bull', '{}', 0)).version;
  assert v = 1, 'scenarios version independently';
end $$;

-- Stale expected version is rejected (no silent overwrite).
select pg_temp.expect_error(format($q$select public.save_valuation_assumptions(%L, 'comp-1', 'base', '{}', 1)$q$, (select id from t_ws)), '40001');

-- Immutable: no direct insert, update or delete.
select pg_temp.expect_error(format($q$insert into public.valuation_assumption_sets (tenant_id, company_key, scenario_id, version, assumptions, created_by) values (%L, 'comp-1', 'base', 9, '{}', auth.uid())$q$, (select id from t_ws)), '42501');
select pg_temp.expect_error($q$update public.valuation_assumption_sets set note = 'x'$q$, '42501');
select pg_temp.expect_error($q$delete from public.valuation_assumption_sets$q$, '42501');

-- Run snapshot must reference an assumption set in the same scope.
do $$ declare ws uuid := (select id from t_ws); s uuid; begin
  s := (select id from public.valuation_assumption_sets where tenant_id = ws and scenario_id = 'base' and version = 2);
  insert into public.valuation_runs (tenant_id, company_key, scenario_id, assumption_set_id, engine_version, input_hash, outputs)
  values (ws, 'comp-1', 'base', s, 'equity-dcf@1.0.0', repeat('a', 64), '{"enterpriseValue":100}');
end $$;
select pg_temp.expect_error(format($q$insert into public.valuation_runs (tenant_id, company_key, scenario_id, assumption_set_id, engine_version, input_hash, outputs) values (%L, 'comp-2', 'base', (select id from public.valuation_assumption_sets limit 1), 'x', repeat('a',64), '{}')$q$, (select id from t_ws)), '42501');

-- Bob (not a member) sees nothing and cannot write to Alice's workspace.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.tenants) = 0, 'bob sees no tenants';
  assert (select count(*) from public.tenant_members) = 0, 'bob sees no memberships';
  assert (select count(*) from public.valuation_assumption_sets) = 0, 'bob sees no assumption sets';
  assert (select count(*) from public.valuation_runs) = 0, 'bob sees no runs';
end $$;
select pg_temp.expect_error(format($q$select public.save_valuation_assumptions(%L, 'comp-1', 'base', '{}', 2)$q$, (select id from t_ws)), '42501');
select pg_temp.expect_error($q$insert into public.tenant_members (tenant_id, user_id, role) select id, auth.uid(), 'owner' from t_ws$q$, '42501');

-- Bob's own workspace is isolated from Alice's, even with the same company key.
do $$ declare ws uuid := public.create_workspace('Bob Partners'); begin
  assert (public.save_valuation_assumptions(ws, 'comp-1', 'base', '{"riskFreeRate":9}', 0)).version = 1, 'bob starts at v1';
  assert (select count(*) from public.valuation_assumption_sets) = 1, 'bob sees only his set';
end $$;

-- Anonymous callers are refused outright.
reset role;
set role anon;
select pg_temp.as_user(null);
select pg_temp.expect_error($q$select count(*) from public.valuation_assumption_sets$q$, '42501');
select pg_temp.expect_error($q$select public.create_workspace('x')$q$, '42501');

reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  assert (select count(*) from public.valuation_assumption_sets) = 3, 'alice still sees exactly her 3 versions';
end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
