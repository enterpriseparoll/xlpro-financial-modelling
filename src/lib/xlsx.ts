import * as XLSXModule from 'xlsx-js-style';

/**
 * xlsx-js-style is CommonJS. Vite exposes its API on the namespace; Node's ESM loader (used by the
 * test runner) puts it on `default`. Import from here so both environments get the same object.
 */
const XLSX = ((XLSXModule as unknown as { default?: typeof XLSXModule }).default ?? XLSXModule) as typeof XLSXModule;

export default XLSX;
export type { CellObject, Range, WorkBook, WorkSheet } from 'xlsx-js-style';
