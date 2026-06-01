/**
 * Shared `toJSON` transform: rename Mongo's `_id` to `id` and drop the `__v`
 * version key, so API responses match our domain shape (`id`, not `_id`).
 * All three models reuse this instead of repeating the transform.
 *
 * Used as: `new Schema(def, { toJSON: { transform: idTransform } })`
 */
export function idTransform(_doc: unknown, ret: Record<string, unknown>) {
  ret["id"] = ret["_id"];
  delete ret["_id"];
  delete ret["__v"];
  return ret;
}
