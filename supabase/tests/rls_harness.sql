-- Minimal stand-in for the Supabase auth schema so migrations and RLS can be tested on plain Postgres.
-- NOT for use against a real Supabase project (which already provides all of this).
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase grants table privileges to these roles by default; mirror that so the migration's revokes are tested.
alter default privileges in schema public grant all on tables to anon, authenticated;
