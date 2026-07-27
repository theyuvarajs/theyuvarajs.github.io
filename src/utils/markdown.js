// ============================================================
// INLINE TEXT FORMATTING
// Content cells are plain text, not HTML — but authors can use a
// tiny bit of markdown-lite (**bold**, *italic*, `code`, links)
// plus a small safelist of literal inline tags (<kbd>, <b>, ...).
//
// Everything is escaped first, THEN the safelisted patterns are
// selectively re-enabled. This means arbitrary HTML typed into a
// sheet cell can never execute — only the tags below ever render
// as real elements.
// ============================================================

import { escapeHtml } from "./dom.js";

const ALLOWED_INLINE_TAGS = ["kbd", "b", "strong", "i", "em", "u", "sub", "sup", "code", "br"];

function reEnableSafelistedTags(escaped) {
  let out = escaped;

  for (const tag of ALLOWED_INLINE_TAGS) {
    out = out.replace(new RegExp(`&lt;${tag}&gt;`, "gi"), `<${tag}>`);
    out = out.replace(new RegExp(`&lt;/${tag}&gt;`, "gi"), `</${tag}>`);
  }

  // <a href="...">...</a> — only http(s)/relative/hash links are allowed.
  out = out.replace(/&lt;a\s+href=&quot;([^&]*)&quot;\s*&gt;/gi, (match, href) => {
    const safe = /^https?:\/\//i.test(href) || href.startsWith("/") || href.startsWith("#");
    return safe
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
      : "";
  });
  out = out.replace(/&lt;\/a&gt;/gi, "</a>");

  return out;
}

/** Render a single line/phrase of inline formatting. Escapes first — always safe. */
export function renderInline(text) {
  if (!text) return "";
  let out = escapeHtml(text);
  out = reEnableSafelistedTags(out);

  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return out;
}

/** Render a text block as one or more paragraphs (blank line = new paragraph, single newline = <br>). */
export function renderParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${renderInline(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
