export const HANDLE_PATTERN = /^[a-z0-9.]{3,40}$/;
export const HANDLE_HINT = 'Use 3–40 letters, numbers, or dots.';
export function normalizeHandle(value: string): string { return value.trim().toLowerCase(); }
export function validateHandle(value: string): string {
  const handle = normalizeHandle(value);
  if (!HANDLE_PATTERN.test(handle)) throw new Error(HANDLE_HINT);
  return handle;
}
