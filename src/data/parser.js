// ============================================================
// CONTENT BLOCK PARSER
// ------------------------------------------------------------
// The "Content" column of every sheet row is plain text using a
// small set of XML-like block tags (see README.md for the full
// list). This module turns that text into a nested AST:
//
//   [{ type: "description", text: "..." },
//    { type: "process", children: [
//        { type: "step", children: [
//            { type: "command", code: "npm test" },
//            { type: "warning", text: "Docker must be running." }
//        ]}
//    ]}]
//
// This AST is the ONLY thing the renderer understands — there is
// no per-article-type branching anywhere else in the codebase.
// Content differences are handled entirely by this parser plus the
// single renderKnowledgeItem() renderer.
// ============================================================

// Block-level tags recognized by the tokenizer. Anything else
// (e.g. <kbd>, <b>, <a href="...">) is left as literal text and
// handled later as *inline* formatting — see utils/markdown.js.
const BLOCK_TAGS = new Set([
  "description", "checklist", "process", "step",
  "command", "code", "note", "tip", "warning", "quote",
  "image", "video", "table", "details", "summary"
]);

// Blocks whose raw inner text is used verbatim (code, commands,
// URLs, markdown tables) rather than parsed as paragraphs.
const RAW_LEAF_TAGS = new Set(["command", "code", "image", "video", "table"]);

// Blocks that render as paragraph text, but MAY instead contain
// other nested blocks (e.g. a <warning> that itself contains a
// <code> block).
const TEXT_OR_CONTAINER_TAGS = new Set(["description", "note", "tip", "warning", "quote", "summary"]);

/** Parse `key="value"` pairs out of a tag's attribute string. */
function parseAttrs(attrStr) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr))) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * Splits raw content into a flat token stream: text / open-tag /
 * close-tag. Unknown tags (not in BLOCK_TAGS) are kept as literal
 * text — this is what lets inline tags like <kbd> pass through
 * untouched to the markdown-lite renderer later.
 */
function tokenize(str) {
  const tokens = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9_]*)([^<>]*)>/g;
  let lastIndex = 0;
  let m;

  while ((m = tagRe.exec(str))) {
    if (m.index > lastIndex) tokens.push({ type: "text", value: str.slice(lastIndex, m.index) });

    const isClose = m[1] === "/";
    const name = m[2].toLowerCase();

    if (BLOCK_TAGS.has(name)) {
      tokens.push(isClose ? { type: "close", name } : { type: "open", name, attrs: parseAttrs(m[3]) });
    } else {
      // Not a recognized block tag — pass it through as literal text.
      tokens.push({ type: "text", value: m[0] });
    }
    lastIndex = tagRe.lastIndex;
  }
  if (lastIndex < str.length) tokens.push({ type: "text", value: str.slice(lastIndex) });

  return tokens;
}

/** Builds a raw tree (still untyped) from the token stream using a stack. */
function buildTree(tokens) {
  const root = { name: "__root__", attrs: {}, children: [], rawParts: [] };
  const stack = [root];

  for (const tok of tokens) {
    const top = stack[stack.length - 1];

    if (tok.type === "text") {
      top.rawParts.push(tok.value);
    } else if (tok.type === "open") {
      const node = { name: tok.name, attrs: tok.attrs, children: [], rawParts: [] };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === "close") {
      // Close the nearest matching ancestor (defensive against
      // authors forgetting a closing tag somewhere).
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].name === tok.name) {
          stack.length = i;
          break;
        }
      }
    }
  }

  return root;
}

/** Strips a common leading-whitespace amount from every line (keeps relative indentation), trims outer blank lines only. */
function dedent(text) {
  const lines = text.replace(/^\n+/, "").replace(/[ \t]+$/, "").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    minIndent = Math.min(minIndent, line.match(/^\s*/)[0].length);
  }
  if (!isFinite(minIndent)) minIndent = 0;

  return lines.map((l) => l.slice(minIndent)).join("\n");
}

function convertNode(node) {
  const { name, attrs, children, rawParts } = node;
  const rawText = rawParts.join("");

  if (name === "checklist") {
    const items = rawText
      .split("\n")
      .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean);
    return { type: "checklist", items };
  }

  if (name === "process" || name === "step") {
    return { type: name, children: children.map(convertNode).filter(Boolean) };
  }

  if (name === "details") {
    const converted = children.map(convertNode).filter(Boolean);
    const summaryNode = converted.find((c) => c.type === "summary");
    const rest = converted.filter((c) => c.type !== "summary");
    const fallbackText = dedent(rawText).trim();
    return {
      type: "details",
      summary: summaryNode ? summaryNode.text : "Details",
      children: rest.length ? rest : fallbackText ? [{ type: "description", text: fallbackText }] : []
    };
  }

  if (TEXT_OR_CONTAINER_TAGS.has(name)) {
    if (children.length) {
      return { type: name, children: children.map(convertNode).filter(Boolean) };
    }
    return { type: name, text: dedent(rawText).trim() };
  }

  if (RAW_LEAF_TAGS.has(name)) {
    if (name === "code") return { type: "code", language: (attrs.language || "").toLowerCase(), code: dedent(rawText) };
    if (name === "command") return { type: "command", code: dedent(rawText) };
    if (name === "image") return { type: "image", url: rawText.trim(), alt: attrs.alt || "" };
    if (name === "video") return { type: "video", url: rawText.trim() };
    if (name === "table") return { type: "table", raw: dedent(rawText).trim() };
  }

  return null;
}

/**
 * Parses a Content cell's raw text into an AST (array of block
 * nodes). Falls back to treating the whole thing as one paragraph
 * if no recognized block tags are used at all.
 */
export function parseContent(raw) {
  if (!raw || !raw.trim()) return [];

  const tree = buildTree(tokenize(raw));
  const nodes = tree.children.map(convertNode).filter(Boolean);

  if (nodes.length === 0) {
    return [{ type: "description", text: raw.trim() }];
  }
  return nodes;
}
