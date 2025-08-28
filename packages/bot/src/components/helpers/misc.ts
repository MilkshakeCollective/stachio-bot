export function toStringArray(val: unknown): string[] {
	return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : [];
}
