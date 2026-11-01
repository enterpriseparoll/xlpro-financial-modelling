export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export interface SessionUser {
  id: string;
  email: string;
}

export type SessionStatus = 'not_configured' | 'loading' | 'signed_out' | 'signed_in';
