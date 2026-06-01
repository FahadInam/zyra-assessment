// Helpers for turning Mongoose `.lean()` documents into our domain types.
//
// `.lean()` returns plain objects shaped like the DB row: a string `_id` and a
// `__v` version key. Our domain types use `id` instead. `fromLean` does that
// remap in one place so services don't repeat it.

/** The shape a `.lean()` query returns for a domain type `T`. */
export type LeanDoc<T> = Omit<T, "id"> & { _id: string; __v?: number };

/** Map a lean document (`_id`, `__v`) to a domain entity (`id`). */
export function fromLean<T extends { id: string }>(doc: LeanDoc<T>): T {
  const { _id, __v: _version, ...rest } = doc;
  return { id: _id, ...rest } as unknown as T;
}
