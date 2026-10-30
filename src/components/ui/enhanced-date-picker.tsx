/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface EnhancedDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EnhancedDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  disabled = false,
}: EnhancedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Common modeling forecast horizons
  const quickYears = ['2026', '2027', '2028', '2029', '2030'];

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 px-2.5 rounded-md border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
        >
          Horizons
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-md p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Forecast Horizon
          </p>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {quickYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  onChange(`FY${yr}`);
                  setIsOpen(false);
                }}
                className="px-2 py-1.5 text-xs text-center rounded bg-muted hover:bg-primary-soft hover:text-primary transition-colors"
              >
                FY{yr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
