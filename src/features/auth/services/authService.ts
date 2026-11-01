import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { parseWorkspaceRows } from '../engine/workspace';
import type { SessionUser, Workspace } from '../types';

function client() {
  if (!supabase) throw new Error('Workspace storage is not configured.');
  return supabase;
}

export const toSessionUser = (session: Session | null): SessionUser | null =>
  session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null;

export async function getSession(): Promise<Session | null> {
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = client().auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Returns true when the account still needs email confirmation before it can sign in. */
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await client().auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const { data, error } = await client().from('tenant_members').select('role, tenants(id, name)').eq('user_id', userId);
  if (error) throw error;
  return parseWorkspaceRows(data);
}

export async function createWorkspace(name: string): Promise<string> {
  const { data, error } = await client().rpc('create_workspace', { p_name: name });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Workspace was not created.');
  return data;
}
