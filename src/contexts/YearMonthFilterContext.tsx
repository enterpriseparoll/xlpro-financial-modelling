/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from 'react';

interface YearMonthFilterContextType {
  year: number;
  month: number;
  setPeriod: (year: number, month: number) => void;
  periodLabel: string;
}

const YearMonthFilterContext = createContext<YearMonthFilterContextType | undefined>(undefined);

export function YearMonthFilterProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(0); // 0 = All Year (Annual Forecast)

  const setPeriod = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const periodLabel = month === 0 ? `FY${year} (Annual)` : `${year}-M${String(month).padStart(2, '0')}`;

  return (
    <YearMonthFilterContext.Provider value={{ year, month, setPeriod, periodLabel }}>
      {children}
    </YearMonthFilterContext.Provider>
  );
}

export function useYearMonthFilterContext() {
  const ctx = useContext(YearMonthFilterContext);
  if (!ctx) {
    throw new Error('useYearMonthFilterContext must be used within YearMonthFilterProvider');
  }
  return ctx;
}
