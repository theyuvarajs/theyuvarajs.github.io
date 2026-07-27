// ============================================================
// SEARCH
// Searches ID, Title, Tags, and Content. Every KnowledgeItem
// already carries a precomputed lowercase `searchText` field (see
// models/knowledge.js), so a search over even a few thousand
// articles is just a handful of substring checks per item — no
// indexing library needed for a personal knowledge base of this size.
// ============================================================

export function search(list, query, limit = 25) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const item of list) {
    const idLower = item.id.toLowerCase();
    const titleLower = item.title.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (idLower === term) score += 50;
      else if (idLower.includes(term)) score += 20;

      if (titleLower.includes(term)) score += 15;
      if (item.tags.some((t) => t.toLowerCase().includes(term))) score += 10;
      if (item.searchText.includes(term)) score += 2;
    }

    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
