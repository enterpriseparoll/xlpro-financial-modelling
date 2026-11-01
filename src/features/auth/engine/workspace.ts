import type { Workspace, WorkspaceRole } from '../types';

const ROLES: WorkspaceRole[] = ['owner', 'editor', 'viewer'];

/** Maps rows from `tenant_members` joined to `tenants`; malformed rows are dropped, never guessed. */
export function parseWorkspaceRows(rows: unknown): Workspace[] {
  if (!Array.isArray(rows)) return [];
  const out: Workspace[] = [];
  for (const row of rows) {
    const r = row as { role?: unknown; tenants?: unknown };
    const t = (Array.isArray(r.tenants) ? r.tenants[0] : r.tenants) as { id?: unknown; name?: unknown } | null | undefined;
    if (!t || typeof t.id !== 'string' || typeof t.name !== 'string') continue;
    if (!ROLES.includes(r.role as WorkspaceRole)) continue;
    out.push({ id: t.id, name: t.name, role: r.role as WorkspaceRole });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Keeps the previously chosen workspace when it is still available; otherwise the first one. */
export function pickWorkspace(workspaces: Workspace[], preferredId: string | null): Workspace | null {
  return workspaces.find((w) => w.id === preferredId) ?? workspaces[0] ?? null;
}

export function defaultWorkspaceName(email: string): string {
  const local = email.split('@')[0]?.trim();
  return local ? `${local}'s workspace`.slice(0, 120) : 'My workspace';
}

export const canEdit = (w: Workspace | null) => w?.role === 'owner' || w?.role === 'editor';

/** Client-side checks for a friendlier message; Supabase Auth remains the authority. */
export function validateCredentials(email: string, password: string, mode: 'sign_in' | 'sign_up'): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (mode === 'sign_up' && password.length < 8) return 'Use at least 8 characters for your password.';
  return null;
}

/** Plain-language versions of common Supabase Auth / network errors. Unknown messages pass through. */
export function friendlyAuthError(message: string): string {
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match an account.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email address first — check your inbox for the link.';
  if (/user already registered/i.test(message)) return 'An account with this email already exists. Try signing in instead.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  return message;
}
