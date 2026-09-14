// Low-level localStorage helpers used across local data stores.
// Isolated into its own file with zero internal dependencies to eliminate
// circular imports between data modules.

const PREFIX = 'prolift:';

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw || raw === 'undefined' || raw === 'null') return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('lsSet error:', err);
  }
}

/** Simple unique id for locally-created records. */
export function genId(): string {
  return 'loc-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
