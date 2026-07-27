// ============================================================
// KNOWLEDGE MODEL
// Every sheet uses exactly the same five columns:
//   ID | Title | Content | Tags | Related
// This module turns the raw { sheetName: rows[] } payload from the
// loader into a flat set of KnowledgeItems, one per row, tagged
// with which sheet ("section") it came from. There is no per-sheet
// "type" — a KnowledgeItem from "Terminal Commands" and one from
// "WordPress" are structurally identical; only their Content differs,
// and that's handled entirely by the block parser.
// ============================================================

import { parseContent } from "../data/parser.js";
import { slugify } from "../utils/slug.js";

function splitList(str) {
  return String(str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Flattens an AST into plain text, for the search index. */
function astToPlainText(nodes) {
  const parts = [];
  for (const node of nodes || []) {
    if (node.text) parts.push(node.text);
    if (node.items) parts.push(node.items.join(" "));
    if (node.code) parts.push(node.code);
    if (node.raw) parts.push(node.raw);
    if (node.summary) parts.push(node.summary);
    if (node.children) parts.push(astToPlainText(node.children));
  }
  return parts.join(" ");
}

/**
 * @param {Object} rawSheets - { "Sheet Name": [{ID, Title, Content, Tags, Related}, ...] }
 * @returns {{ items: Map<string, object>, list: object[], sections: object[], tags: object[] }}
 */
export function buildKnowledgeBase(rawSheets) {
  const items = new Map();
  const sections = [];
  const tagCounts = new Map();

  for (const [sheetName, rows] of Object.entries(rawSheets || {})) {
    const sectionSlug = slugify(sheetName);
    sections.push({ name: sheetName, slug: sectionSlug, count: 0 });

    for (const row of rows || []) {
      const id = String(row.ID ?? row.Id ?? row.id ?? "").trim();
      if (!id) continue; // a row with no ID can't be routed to or referenced — skip it

      const title = String(row.Title ?? row.title ?? "").trim() || id;
      const rawContent = String(row.Content ?? row.content ?? "");
      const tags = splitList(row.Tags ?? row.tags);
      const related = splitList(row.Related ?? row.related);

      let cachedAst = null;
      const item = {
        id,
        title,
        rawContent,
        tags,
        related,
        section: sheetName,
        sectionSlug,
        // Parsed lazily and memoized — most items are never opened
        // in a given session, so there's no reason to parse them all
        // up front.
        get ast() {
          if (!cachedAst) cachedAst = parseContent(this.rawContent);
          return cachedAst;
        }
      };

      if (items.has(id)) {
        console.warn(`Duplicate KnowledgeItem ID "${id}" — the one from "${sheetName}" overwrites an earlier sheet's row. IDs must be globally unique.`);
      }
      items.set(id, item);
      for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const list = Array.from(items.values());

  // Search field + section counts, computed once up front (cheap,
  // and makes every subsequent search a plain substring scan).
  for (const item of list) {
    item.searchText = [item.id, item.title, item.tags.join(" "), astToPlainText(item.ast)]
      .join(" ")
      .toLowerCase();
    const section = sections.find((s) => s.name === item.section);
    if (section) section.count++;
  }

  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  return { items, list, sections, tags };
}
