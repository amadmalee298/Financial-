import { type Decimal, parseDecimal } from "./decimal";

/** Result of a form Server Action. */
export type FormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

export type FieldErrors = Record<string, string>;

const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Optional text, or null when empty. Trimmed and capped at `max` characters. */
export function optionalText(formData: FormData, key: string, max = 10_000) {
  return text(formData, key).slice(0, max) || null;
}

/** Upper-cased stock symbol, or null (with an error) when invalid. */
export function symbolField(formData: FormData, errors: FieldErrors, key = "symbol") {
  const symbol = text(formData, key).toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    errors[key] = "กรุณาระบุชื่อย่อหุ้น เช่น PTT";
    return null;
  }
  return symbol;
}

/** YYYY-MM-DD date, or null. Records an error when invalid, or empty and required. */
export function dateField(formData: FormData, key: string, errors: FieldErrors, { required = false } = {}) {
  const value = text(formData, key);
  if (!value) {
    if (required) errors[key] = "จำเป็นต้องกรอก";
    return null;
  }
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    errors[key] = "วันที่ไม่ถูกต้อง";
    return null;
  }
  return value;
}

/**
 * Decimal field with at most `scale` decimal places. Non-negative unless
 * `allowNegative`; `positive` additionally rejects zero.
 */
export function decimalField(
  formData: FormData,
  key: string,
  scale: number,
  errors: FieldErrors,
  { required = false, positive = false, allowNegative = false } = {},
): Decimal | null {
  const raw = text(formData, key);
  if (!raw) {
    if (required) errors[key] = "จำเป็นต้องกรอก";
    return null;
  }
  const value = parseDecimal(raw);
  if (!value) {
    errors[key] = "ต้องเป็นตัวเลข";
    return null;
  }
  if ((!allowNegative && value.isNegative()) || (positive && value.lessThanOrEqualTo(0))) {
    errors[key] = positive ? "ต้องมากกว่า 0" : "ต้องเป็นตัวเลขไม่ติดลบ";
    return null;
  }
  if (value.decimalPlaces() > scale) {
    errors[key] = `ทศนิยมได้ไม่เกิน ${scale} ตำแหน่ง`;
    return null;
  }
  return value;
}

export function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}
