const TRANSIENT_AUTH_MESSAGES = new Set(["Unauthorized", "User not found"]);

export function isTransientAuthError(error: unknown): boolean {
  return error instanceof Error && TRANSIENT_AUTH_MESSAGES.has(error.message);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Brief retry for Clerk session propagation after signup (Netlify SSR). */
export async function withTransientAuthRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 150;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientAuthError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}
