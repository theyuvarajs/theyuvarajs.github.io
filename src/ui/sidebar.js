// ============================================================
// SIDEBAR
// Sections and Tags are generated entirely from the loaded sheet
// data — add a new tab to the spreadsheet and it shows up here
// with zero code changes. Recent Articles comes from a small
// localStorage history of visited IDs.
// ============================================================

import { el } from "../utils/dom.js";
import { search } from "./search.js";

const RECENT_KEY = "kb-recent";
const MAX_RECENT = 8;
const MAX_TAGS_SHOWN = 40;

export function pushRecent(id) {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [id, ...existing.filter((r) => r !== id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (e) {
    // localStorage unavailable — Recent Articles just stays empty.
  }
}

function renderSearchBox(kb) {
  const input = el("input", { type: "search", class: "search-input", placeholder: "Search everything…" });
  const results = el("div", { class: "search-results" });
  const box = el("div", { class: "sidebar-search" }, [input, results]);

  input.addEventListener("input", () => {
    const query = input.value.trim();
    results.innerHTML = "";
    if (!query) {
      results.classList.remove("show");
      return;
    }
    const found = search(kb.list, query, 20);
    if (!found.length) {
      results.appendChild(el("div", { class: "search-empty" }, ["No matches"]));
    } else {
      for (const item of found) {
        results.appendChild(
          el("a", { class: "search-result", href: `#${item.id}` }, [
            el("span", { class: "search-result__id" }, [item.id]),
            el("span", { class: "search-result__title" }, [item.title]),
            el("span", { class: "search-result__section" }, [item.section])
          ])
        );
      }
    }
    results.classList.add("show");
  });

  document.addEventListener("click", (e) => {
    if (!box.contains(e.target)) results.classList.remove("show");
  });

  return box;
}

function renderSections(kb) {
  return el("div", { class: "sidebar-group" }, [
    el("h4", {}, ["Sections"]),
    el(
      "ul",
      {},
      kb.sections.map((s) =>
        el("li", {}, [
          el("a", { href: `#section:${s.slug}` }, [el("span", {}, [s.name]), el("span", { class: "count-pill" }, [String(s.count)])])
        ])
      )
    )
  ]);
}

function renderTags(kb) {
  return el("div", { class: "sidebar-group" }, [
    el("h4", {}, ["Tags"]),
    el(
      "div",
      { class: "tag-cloud" },
      kb.tags.slice(0, MAX_TAGS_SHOWN).map((t) => el("a", { class: "tag", href: `#tag:${encodeURIComponent(t.name)}` }, [t.name]))
    )
  ]);
}

function renderRecent(kb) {
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch (e) { /* ignore */ }

  const recentItems = ids.map((id) => kb.items.get(id)).filter(Boolean);

  return el("div", { class: "sidebar-group" }, [
    el("h4", {}, ["Recent Articles"]),
    recentItems.length
      ? el("ul", {}, recentItems.map((i) => el("li", {}, [el("a", { href: `#${i.id}` }, [i.title])])))
      : el("p", { class: "muted-note" }, ["Articles you view will show up here."])
  ]);
}

export function renderSidebar(kb) {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = "";
  nav.append(renderSearchBox(kb), renderSections(kb), renderTags(kb), renderRecent(kb));
}
