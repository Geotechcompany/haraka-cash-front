import { z } from "zod";

/** Optional `?ref=` invite code on `/register`. */
export const registerSearchSchema = z.object({
  ref: z.string().optional(),
});

export type RegisterSearch = z.infer<typeof registerSearchSchema>;

/** Safe for SSR / empty search: never throws on missing params. */
export function parseRegisterSearch(input: unknown): RegisterSearch {
  return registerSearchSchema.parse(input ?? {});
}
