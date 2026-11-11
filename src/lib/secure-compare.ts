/**
 * Constant-time string equality (compares SHA-256 digests, so neither the
 * length nor the position of the first difference leaks through timing).
 * Web Crypto only, so it works on Workers and Node alike.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let difference = 0;
  for (let i = 0; i < x.length; i += 1) difference |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return difference === 0;
}
