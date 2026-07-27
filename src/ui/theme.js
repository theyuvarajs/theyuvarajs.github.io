// ============================================================
// THEME
// The actual <html data-theme="..."> attribute is set inline in
// <head> (see index.html) so there's no flash of the wrong theme
// before this module even loads. This module just wires up the
// toggle button and persists the choice.
// ============================================================

const STORAGE_KEY = "kb-theme";

export function initTheme(toggleBtn) {
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  apply(document.documentElement.getAttribute("data-theme") || "light");

  toggleBtn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  });
}
