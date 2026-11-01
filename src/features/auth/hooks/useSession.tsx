import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { AuthDrawer } from '../components/AuthDrawer';
import { defaultWorkspaceName, pickWorkspace } from '../engine/workspace';
import * as auth from '../services/authService';
import type { SessionStatus, SessionUser, Workspace } from '../types';

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string) => void;
  workspaceError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  openAuth: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
// Only the chosen workspace id is remembered locally (a UI preference, not a credential).
const ACTIVE_WS_KEY = 'xlpro:active-workspace:v1';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>(isSupabaseConfigured ? 'loading' : 'not_configured');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => { try { return localStorage.getItem(ACTIVE_WS_KEY); } catch { return null; } });
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    auth.getSession()
      .then((s) => { if (alive) { setUser(auth.toSessionUser(s)); setStatus(s ? 'signed_in' : 'signed_out'); } })
      .catch(() => alive && setStatus('signed_out'));
    const off = auth.onAuthChange((s) => { setUser(auth.toSessionUser(s)); setStatus(s ? 'signed_in' : 'signed_out'); });
    return () => { alive = false; off(); };
  }, []);

  // Load memberships; the first sign-in creates a personal workspace so saving works immediately.
  useEffect(() => {
    if (status !== 'signed_in' || !user) { setWorkspaces([]); return; }
    let alive = true;
    (async () => {
      try {
        setWorkspaceError(null);
        let list = await auth.listWorkspaces(user.id);
        if (!list.length) {
          await auth.createWorkspace(defaultWorkspaceName(user.email));
          list = await auth.listWorkspaces(user.id);
        }
        if (alive) setWorkspaces(list);
      } catch (e) {
        if (alive) setWorkspaceError(e instanceof Error ? e.message : 'Could not load your workspaces.');
      }
    })();
    return () => { alive = false; };
  }, [status, user?.id]);

  const activeWorkspace = pickWorkspace(workspaces, activeId);
  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveId(id);
    try { localStorage.setItem(ACTIVE_WS_KEY, id); } catch { /* preference only */ }
  }, []);

  const value: SessionContextValue = {
    status,
    user,
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    workspaceError,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    openAuth: () => setAuthOpen(true),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
      {isSupabaseConfigured && <AuthDrawer open={authOpen} onOpenChange={setAuthOpen} />}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
