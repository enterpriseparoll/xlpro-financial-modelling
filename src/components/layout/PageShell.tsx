/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useYearMonthFilterContext } from '@/contexts/YearMonthFilterContext';

interface PageShellProps {
  moduleName: string;
  title: string;
  titleHighlight?: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  showPeriodBadge?: boolean;
}

export function PageShell({
  moduleName,
  title,
  titleHighlight,
  description,
  actions,
  children,
  showPeriodBadge = true,
}: PageShellProps) {
  const { periodLabel } = useYearMonthFilterContext();

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              {moduleName}
            </span>
            <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground leading-tight mt-0.5">
              {title} {titleHighlight && <span className="text-primary">{titleHighlight}</span>}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {showPeriodBadge && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-card border border-border rounded-md px-3 py-2 shadow-xs">
                {periodLabel}
              </span>
            )}
            {actions}
          </div>
        </div>

        {/* Accent Bar */}
        <div className="w-12 h-0.5 bg-primary rounded-full" />
      </div>

      {/* Main Page Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
