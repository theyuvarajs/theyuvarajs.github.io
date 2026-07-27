// ============================================================
// CODE / COMMAND BLOCK
// Shared by <code language="..."> and <command> — both render as
// a card with a language label, a copy button, and (for <code>)
// syntax highlighting via the highlight.js bundle loaded in
// index.html. <command> blocks are visually styled as a terminal
// but render (and copy) the raw command text, with no leading
// "$ " prompt on each line.
// ============================================================

import { el } from "../utils/dom.js";

// A few friendly aliases so short forms in the sheet ("js", "sh")
// map to the language name highlight.js expects.
const LANG_ALIASES = { js: "javascript", ts: "typescript", sh: "bash", shell: "bash", yml: "yaml", py: "python" };

export function renderCodeBlock({ code, language = "", isCommand = false }) {
  const displayLang = LANG_ALIASES[language] || language;

  const copyBtn = el("button", { class: "code-block__copy", type: "button" }, ["Copy"]);
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("is-copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("is-copied");
      }, 1500);
    } catch (e) {
      // Clipboard API blocked (e.g. insecure context) — fail silently,
      // the code is still fully selectable/readable.
    }
  });

  const header = el("div", { class: "code-block__header" }, [
    el("span", { class: "code-block__lang" }, [isCommand ? "shell" : displayLang || "text"]),
    copyBtn
  ]);

  const codeEl = el("code", displayLang ? { class: "language-" + displayLang } : {});
  codeEl.textContent = isCommand
    ? code.split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
    : code;

  const pre = el("pre", {}, [codeEl]);
  const wrap = el("div", { class: "block code-block" + (isCommand ? " code-block--command" : "") }, [header, pre]);

  if (window.hljs && !isCommand) {
    try { window.hljs.highlightElement(codeEl); } catch (e) { /* unknown language — leave unhighlighted */ }
  }

  return wrap;
}
