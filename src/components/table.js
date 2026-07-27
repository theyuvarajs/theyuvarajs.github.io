// ============================================================
// MARKDOWN TABLE
// Parses the simple pipe-delimited markdown table syntax used
// inside a <table> block: a header row, a "---" separator row,
// then any number of data rows.
// ============================================================

import { el } from "../utils/dom.js";
import { renderInline } from "../utils/markdown.js";

const SEPARATOR_ROW = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;

function splitRow(line) {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function renderMarkdownTable(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows = lines.filter((l) => !SEPARATOR_ROW.test(l)).map(splitRow);

  const table = el("table", { class: "md-table" });

  if (rows.length) {
    const headRow = el("tr", {}, rows[0].map((cell) => el("th", { html: renderInline(cell) })));
    table.appendChild(el("thead", {}, [headRow]));

    const bodyRows = rows.slice(1).map((r) => el("tr", {}, r.map((cell) => el("td", { html: renderInline(cell) }))));
    table.appendChild(el("tbody", {}, bodyRows));
  }

  return el("div", { class: "table-wrap" }, [table]);
}
