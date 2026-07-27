// ============================================================
// LOADER
// Fetches every sheet from the Apps Script Web App and returns
// the raw { "Sheet Name": [ {ID, Title, Content, Tags, Related}, ... ] }
// shape. No sheet-type detection, no per-template logic — that's
// the whole point of the new architecture, see models/knowledge.js
// for how these rows become KnowledgeItems.
// ============================================================

import { getCached, setCached } from "../utils/cache.js";

const CACHE_KEY = "kb-raw-sheets-v2";

export async function fetchAllSheets(forceRefresh = false) {
  const cfg = window.SITE_CONFIG;

  if (!forceRefresh) {
    const cached = getCached(CACHE_KEY, cfg.CACHE_TTL_MS);
    if (cached) return cached;
  }

  const res = await fetch(cfg.API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Apps Script returned HTTP " + res.status);

  const raw = await res.json();
  setCached(CACHE_KEY, raw);
  return raw;
}
