// ============================================================
// DOM UTILITIES
// Tiny helpers so the rest of the app never touches innerHTML
// with unescaped, untrusted spreadsheet content directly.
// ============================================================

/** Escape a string for safe insertion as HTML text. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Create an element.
 * attrs: plain attributes, `class` for className, `html` for
 *        raw innerHTML (only pass pre-sanitized HTML), and any
 *        `onX` key with a function value becomes an event listener.
 * children: string | Node | (string|Node)[] — strings become text nodes.
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }

  return node;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}
