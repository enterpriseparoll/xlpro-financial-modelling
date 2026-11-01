# Supabase setup — xlPro workspace storage

Phase 3 stores valuation assumptions as **versioned, tenant-scoped records** in Supabase. Until the
two environment variables below are set, the app keeps working in browser-only mode and says so.

## What the migration creates

| Object | Purpose |
|---|---|
| `tenants`, `tenant_members` | Workspaces and who belongs to them (`owner`, `editor`, `viewer`). |
| `valuation_assumption_sets` | One immutable row per saved version, per tenant + company + scenario. |
| `valuation_runs` | Immutable snapshot of the outputs produced by a saved version, with an input hash and engine version. |
| `create_workspace(name)` | Creates a workspace and makes the caller its owner (used on first sign-in). |
| `save_valuation_assumptions(...)` | The only way to save: checks edit rights, numbers the version, rejects stale saves. |

Row-level security is on for every table. Users only see data in workspaces they belong to;
saved versions cannot be updated or deleted; anonymous users can read nothing.

Companies themselves are still held in the browser in this release, so `company_key` is the app's
company id, scoped by workspace. Moving companies server-side is a later milestone.

## Set up your cloud project

1. Create a project at supabase.com.
2. **Authentication → Providers → Email**: keep Email enabled. Decide whether new users must confirm
   their email (recommended for production; the app shows a "check your email" message when required).
3. Apply the migration — either:
   - **SQL editor**: paste `migrations/20261101190000_valuation_persistence.sql` and run it, or
   - **CLI**: `supabase link --project-ref <ref>` then `supabase db push`.
4. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local`
   (never the `service_role` key):

   ```
   VITE_SUPABASE_URL="https://<ref>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<anon key>"
   ```

5. Restart `npm run dev`. A **Sign in** button appears in the header.

## Testing the database rules locally

`npm run test:db` applies the migration to a throwaway Postgres container (Docker required) with a
minimal stand-in for Supabase's `auth` schema, then runs `tests/valuation_persistence_test.sql`:
workspace isolation, immutability, version conflicts and anonymous access. It does not exercise
Supabase Auth itself — sign-in still needs checking against your real project.
