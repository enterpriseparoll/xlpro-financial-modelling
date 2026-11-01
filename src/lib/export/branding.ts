/** Branding → reusable xlsx-js-style cell styles. Adapted from docs-guides/export.zip. */
import type { ColumnAlign, ColumnFormat, ExportBranding } from './types';

/** Defaults match the app's existing branded exports. */
export const DEFAULT_PRIMARY = '#17324D';
export const DEFAULT_ACCENT = '#31789B';

export function toArgb(hex: string | undefined, fallback: string): string {
  let h = (hex ?? '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/i.test(h)) return `FF${h.toUpperCase()}`;
  if (/^[0-9a-f]{8}$/i.test(h)) return h.toUpperCase();
  return toArgb(fallback, 'FF17324D');
}

export function numFmtFor(format: ColumnFormat | undefined, currency: string): string | undefined {
  switch (format) {
    case 'currency': return `"${currency}" #,##0.00;[Red]-"${currency}" #,##0.00`;
    case 'number': return '#,##0.00;[Red]-#,##0.00';
    case 'decimal4': return '0.0000';
    case 'integer': return '0';
    case 'percent': return '0.00"%";[Red]-0.00"%"';
    case 'multiple': return '0.0"x"';
    case 'date': return 'dd mmm yyyy';
    default: return undefined;
  }
}

const THIN = { style: 'thin', color: { rgb: 'FFE2E8F0' } } as const;
const border = () => ({ top: THIN, bottom: THIN, left: THIN, right: THIN });
const align = (a?: ColumnAlign) => ({ horizontal: a ?? 'left', vertical: 'center', wrapText: false });

export type Style = Record<string, unknown>;

export function buildStyles(branding: ExportBranding) {
  const primary = toArgb(branding.primaryColor, DEFAULT_PRIMARY);
  const accent = toArgb(branding.accentColor, DEFAULT_ACCENT);
  const white = { color: { rgb: 'FFFFFFFF' } };
  const ink = { color: { rgb: 'FF1E293B' } };
  const muted = { color: { rgb: 'FF64748B' } };
  const band = (font: Style) => ({ fill: { patternType: 'solid', fgColor: { rgb: primary } }, font, alignment: { horizontal: 'left', vertical: 'center' } });

  return {
    titleBand: band({ ...white }),
    companyName: band({ ...white, bold: true, sz: 15 }),
    tagline: band({ color: { rgb: 'FFCBD5E1' }, bold: true, sz: 9 }),
    contact: band({ color: { rgb: 'FFCBD5E1' }, sz: 9 }),
    reportTitle: { font: { ...ink, bold: true, sz: 13 }, alignment: { horizontal: 'left', vertical: 'center' } },
    reportSubtitle: { font: { color: { rgb: accent }, bold: true, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' } },
    caption: { font: { ...muted, italic: true, sz: 9 }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } },
    metaTitle: { fill: { patternType: 'solid', fgColor: { rgb: 'FFF1F5F9' } }, font: { color: { rgb: accent }, bold: true, sz: 9 }, border: border() },
    metaLabel: { font: { ...muted, bold: true, sz: 9 }, border: border() },
    metaValue: (format: ColumnFormat | undefined, currency: string) => ({ font: { ...ink, sz: 9 }, border: border(), numFmt: numFmtFor(format, currency), alignment: { horizontal: 'left' } }),
    metaValueEmphasis: (format: ColumnFormat | undefined, currency: string) => ({
      fill: { patternType: 'solid', fgColor: { rgb: 'FFEFF6FB' } }, font: { color: { rgb: accent }, bold: true, sz: 10 }, border: border(),
      numFmt: numFmtFor(format, currency), alignment: { horizontal: 'left' },
    }),
    sectionHeader: { fill: { patternType: 'solid', fgColor: { rgb: 'FFF1F5F9' } }, font: { ...ink, bold: true, sz: 10 }, border: border() },
    sectionTag: { fill: { patternType: 'solid', fgColor: { rgb: 'FFF1F5F9' } }, font: { ...muted, bold: true, sz: 8 }, alignment: { horizontal: 'right' }, border: border() },
    colHeader: (a?: ColumnAlign) => ({ fill: { patternType: 'solid', fgColor: { rgb: accent } }, font: { ...white, bold: true, sz: 9 }, alignment: { ...align(a), wrapText: true }, border: border() }),
    cell: (a: ColumnAlign | undefined, f: ColumnFormat | undefined, currency: string, alt: boolean, strong: boolean) => ({
      ...(alt || strong ? { fill: { patternType: 'solid', fgColor: { rgb: strong ? 'FFE2E8F0' : 'FFF8FAFC' } } } : {}),
      font: { ...ink, sz: 9, bold: strong }, alignment: align(a), border: border(), numFmt: numFmtFor(f, currency),
    }),
    missing: (a: ColumnAlign | undefined, alt: boolean) => ({
      ...(alt ? { fill: { patternType: 'solid', fgColor: { rgb: 'FFF8FAFC' } } } : {}),
      font: { ...muted, italic: true, sz: 9 }, alignment: align(a), border: border(),
    }),
    subtotalLabel: { fill: { patternType: 'solid', fgColor: { rgb: 'FFE2E8F0' } }, font: { ...ink, bold: true, sz: 9 }, border: border() },
    subtotalCell: (a: ColumnAlign | undefined, f: ColumnFormat | undefined, currency: string) => ({
      fill: { patternType: 'solid', fgColor: { rgb: 'FFE2E8F0' } }, font: { ...ink, bold: true, sz: 9 }, alignment: align(a), border: border(), numFmt: numFmtFor(f, currency),
    }),
    footnote: { font: { ...muted, italic: true, sz: 8 }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } },
  };
}
