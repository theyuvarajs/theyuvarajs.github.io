// ============================================================
// APP ENTRY POINT
// Loads the spreadsheet data, builds the knowledge base, and
// wires the router, sidebar, and theme toggle together. This is
// the only file that "knows" about all the other modules —
// everything else is independently testable in isolation.
// ============================================================

import { fetchAllSheets } from "./data/loader.js";
import { buildKnowledgeBase } from "./models/knowledge.js";
import { renderKnowledgeItem, renderHome, renderList, renderNotFound } from "./ui/renderer.js";
import { renderSidebar, renderSearchBox, pushRecent } from "./ui/sidebar.js";
import { initRouter } from "./ui/router.js";
import { initTheme } from "./ui/theme.js";

async function main() {
  const cfg = window.SITE_CONFIG;
  document.getElementById("brand-title").textContent = cfg.SITE_TITLE;
  document.getElementById("brand-tagline").textContent = cfg.SITE_TAGLINE;
  document.title = cfg.SITE_TITLE;

  initTheme(document.getElementById("theme-toggle"));
  setupSidebarToggle();
  setupBackToTop();

  const content = document.getElementById("content");
  content.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';

  let kb;
  try {
    const raw = await fetchAllSheets(false);
    kb = buildKnowledgeBase(raw);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h2>Couldn't load content</h2><p>${err.message}</p></div>`;
    console.error("Failed to load knowledge base:", err);
    return;
  }

  function route(hash) {
    window.scrollTo({ top: 0 });
    closeSidebarOnMobile();

    if (!hash) {
      renderHome(kb, content);
      return;
    }
    if (hash.startsWith("section:")) {
      const slug = hash.slice("section:".length);
      const section = kb.sections.find((s) => s.slug === slug);
      const items = kb.list.filter((i) => i.sectionSlug === slug);
      renderList(section ? section.name : slug, items, content);
      return;
    }
    if (hash.startsWith("tag:")) {
      const tag = decodeURIComponent(hash.slice("tag:".length));
      const items = kb.list.filter((i) => i.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
      renderList(`Tag: ${tag}`, items, content);
      return;
    }

    const item = kb.items.get(hash);
    if (!item) {
      renderNotFound(hash, content);
      return;
    }
    content.innerHTML = "";
    content.appendChild(renderKnowledgeItem(item, kb));
    pushRecent(item.id);
    renderSidebar(kb); // refresh so "Recent Articles" reflects the visit
  }

  renderSidebar(kb);
  document.getElementById("topbar-search").appendChild(renderSearchBox(kb));
  initRouter(route);
}

const SIDEBAR_COLLAPSED_KEY = "kb-sidebar-collapsed";
const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

// One button, two behaviors: on mobile it slides the sidebar in/out as an
// overlay (as before); on desktop it collapses/expands it in place, and
// remembers the choice in localStorage so it stays collapsed on reload.
function setupSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");

  try {
    if (!isMobile() && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
      sidebar.classList.add("collapsed");
    }
  } catch (e) {
    // localStorage unavailable — sidebar just starts expanded.
  }

  document.getElementById("nav-toggle").addEventListener("click", () => {
    if (isMobile()) {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("show");
    } else {
      const collapsed = sidebar.classList.toggle("collapsed");
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
      } catch (e) {
        // localStorage unavailable — the toggle still works, it just
        // won't be remembered on the next visit.
      }
    }
  });
  backdrop.addEventListener("click", closeSidebarOnMobile);
}

function closeSidebarOnMobile() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("backdrop").classList.remove("show");
}

function setupBackToTop() {
  const btn = document.getElementById("back-to-top");
  window.addEventListener("scroll", () => btn.classList.toggle("show", window.scrollY > 400));
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

main();
