// ============================================================
// ROUTER
// Every article lives at /#ID (e.g. /#TS-2, /#DEV-5). Section and
// tag browsing use a small hash prefix so the whole app stays a
// single static index.html with no server-side routing:
//   /#TS-2                -> article with ID "TS-2"
//   /#section:terminal-commands -> all articles in that section
//   /#tag:docker                -> all articles tagged "docker"
//   /  (no hash)                -> home
// ============================================================

export function initRouter(onRoute) {
  function handle() {
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    onRoute(raw || null);
  }
  window.addEventListener("hashchange", handle);
  handle(); // handle the initial deep link on page load
}

export function navigateTo(id) {
  window.location.hash = "#" + encodeURIComponent(id);
}
