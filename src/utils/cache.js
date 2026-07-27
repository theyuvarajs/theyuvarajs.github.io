// Thin wrapper around sessionStorage with a time-to-live, isolated
// here so the loader doesn't need to know about storage quirks
// (private browsing, quota errors, etc).

export function getCached(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > ttlMs) return null;
    return parsed.value;
  } catch (e) {
    return null;
  }
}

export function setCached(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), value }));
  } catch (e) {
    // Storage full or unavailable (e.g. private mode) — not fatal,
    // it just means every load re-fetches from the Apps Script API.
  }
}
