/** Raised when DCF inputs are structurally invalid; the message is written for end users. */
export class DcfInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DcfInputError';
  }
}

export function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new DcfInputError(`${label} must be a finite number.`);
  return value;
}

export function requireRange(value: number, label: string, min: number, max: number): number {
  requireFinite(value, label);
  if (value < min || value > max) throw new DcfInputError(`${label} must be between ${min} and ${max}.`);
  return value;
}
