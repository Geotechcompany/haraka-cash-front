import { config as loadEnv } from "dotenv";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load `.env` then `.ENV`. On Windows both names often resolve to the same
 * file (case-insensitive FS); the second load is skipped to avoid confusing
 * "0 vars injected" logs while still honouring either filename in the repo.
 */
export function loadProjectEnv(options?: { quiet?: boolean }) {
  const cwd = process.cwd();
  const seenRealPaths = new Set<string>();
  const summary: string[] = [];

  for (const file of [".env", ".ENV"]) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) {
      summary.push(`${file}: not found`);
      continue;
    }

    let realPath = path;
    try {
      realPath = realpathSync(path);
    } catch {
      // keep resolved path
    }

    if (seenRealPaths.has(realPath)) {
      summary.push(`${file}: skipped (same file as earlier env on this filesystem)`);
      continue;
    }
    seenRealPaths.add(realPath);

    const before = new Set(Object.keys(process.env));
    const result = loadEnv({ path, override: false, quiet: options?.quiet });
    const injected =
      result.parsed ?
        Object.keys(result.parsed).filter((key) => !before.has(key)).length
      : 0;
    const total = result.parsed ? Object.keys(result.parsed).length : 0;
    summary.push(
      injected === total ?
        `${file}: ${total} vars`
      : `${file}: ${injected} new vars (${total} in file)`,
    );
  }

  return summary;
}
