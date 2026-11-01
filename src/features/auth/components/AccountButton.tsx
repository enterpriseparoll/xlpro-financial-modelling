import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useSession } from '../hooks/useSession';

/** Header control: sign in, or show the signed-in user, workspace switcher and sign out. */
export function AccountButton() {
  const { status, user, workspaces, activeWorkspace, setActiveWorkspaceId, signOut, openAuth } = useSession();
  if (status === 'not_configured' || status === 'loading') return null;

  if (status === 'signed_out') {
    return (
      <button type="button" onClick={openAuth}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:border-primary hover:text-primary">
        <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UserRound className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden />
      <div className="hidden min-w-0 flex-col leading-tight md:flex">
        <span className="max-w-[10rem] truncate text-[11px] font-semibold text-foreground" title={user?.email}>{user?.email}</span>
        {workspaces.length > 1 ? (
          <select aria-label="Workspace" value={activeWorkspace?.id ?? ''} onChange={(e) => setActiveWorkspaceId(e.target.value)}
            className="max-w-[10rem] truncate bg-transparent text-[11px] text-muted-foreground">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        ) : (
          <span className="max-w-[10rem] truncate text-[11px] text-muted-foreground">{activeWorkspace?.name ?? 'No workspace'}</span>
        )}
      </div>
      <button type="button" onClick={() => void signOut()} aria-label="Sign out"
        className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
