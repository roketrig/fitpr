// Pure-JS UUID v4 generator — no native crypto dependency needed. Used for
// client-generated ids that get written straight into a Postgres uuid
// column, so the format has to be valid even though it's not
// cryptographically random.
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
