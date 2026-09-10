/**
 * The dsh tool registry snapshots every tool body result as lossless JSON.
 * `undefined` object properties, sparse arrays, `-0`, and non-finite numbers
 * are rejected. The Trading 212 API omits many optional fields, so the parsed
 * domain objects intentionally carry `undefined` for them. Sanitize the value
 * at the tool boundary instead of weakening the domain types.
 */
export function toLosslessJson<T>(value: T): T {
  if (value === undefined) return null as T
  if (typeof value === 'number') {
    if (Number.isFinite(value) === false) return null as T
    return (Object.is(value, -0) ? 0 : value) as T
  }
  if (typeof value === 'bigint') return value.toString() as T
  if (Array.isArray(value)) return value.map(item => toLosslessJson(item)) as T
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      // JSON serialization drops undefined object properties; do the same
      // before the registry validates the value.
      if (item === undefined) continue
      output[key] = toLosslessJson(item)
    }
    return output as T
  }
  return value
}
