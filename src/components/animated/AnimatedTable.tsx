/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

const tbodyVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  isForecast?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

interface AnimatedTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  highlightRowIndex?: number;
}

export function AnimatedTable<T extends Record<string, any>>({
  data,
  columns,
  emptyMessage = 'No records found',
  className = '',
  onRowClick,
  highlightRowIndex,
}: AnimatedTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-border bg-card shadow-xs ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground select-none">
          <tr>
            {columns.map((col) => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left';

              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-4 py-3 font-semibold ${alignClass} ${
                    col.isForecast ? 'bg-primary-soft/30 text-foreground font-bold' : ''
                  }`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <motion.tbody
          variants={tbodyVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-border text-sm"
        >
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-xs font-medium text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const isHighlighted = highlightRowIndex === idx;
              return (
                <motion.tr
                  variants={rowVariants}
                  key={row.id ?? idx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-muted/70' : 'hover:bg-muted/40'
                  } ${isHighlighted ? 'bg-primary-soft/40' : ''}`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-xs text-foreground font-normal whitespace-nowrap ${alignClass} ${
                          col.isForecast ? 'bg-primary-soft/10' : ''
                        }`}
                      >
                        {col.render ? col.render(row, idx) : (row[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })
          )}
        </motion.tbody>
      </table>
    </div>
  );
}
