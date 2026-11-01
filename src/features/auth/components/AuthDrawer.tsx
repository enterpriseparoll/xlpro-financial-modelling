import { useState } from 'react';
import { SlideInForm } from '@/components/ui/slide-in-form';
import { friendlyAuthError, validateCredentials } from '../engine/workspace';
import { useSession } from '../hooks/useSession';

/** Email + password sign-in / sign-up in a slide-in drawer. Passwords go only to Supabase Auth. */
export function AuthDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo(null);
    const problem = validateCredentials(email, password, mode);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      if (mode === 'sign_in') {
        await signIn(email, password);
        setPassword('');
        onOpenChange(false);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        setPassword('');
        if (needsConfirmation) setInfo('Check your email to confirm your account, then sign in.');
        else onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? friendlyAuthError(err.message) : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlideInForm
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'sign_in' ? 'Sign in to your workspace' : 'Create your account'}
      description="Signing in lets you save valuation versions to your team workspace instead of this browser."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium text-foreground">Email</label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium text-foreground">Password</label>
          <input id="auth-password" type="password" autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
          {mode === 'sign_up' && <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        {info && <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{info}</p>}
        <button type="submit" disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in'); setError(null); setInfo(null); }}
          className="w-full text-xs font-semibold text-primary hover:underline">
          {mode === 'sign_in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </SlideInForm>
  );
}
