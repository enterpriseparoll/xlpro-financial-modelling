/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function LoadingSpinner({ label = 'Calculating financial model...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <div className="h-6 w-6 rounded-full border-2 border-primary-soft border-t-primary animate-spin" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
