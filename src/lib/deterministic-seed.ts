/** FNV-1a 32-bit hash — stable across runs and platforms. */
export function hashSeedString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic unit interval [0, 1) from a string seed and salt index. */
export function seedUnit(seed: string, salt: number): number {
  const h = hashSeedString(`${seed}#${salt}`);
  return h / 0x1_0000_0000;
}
