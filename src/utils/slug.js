// Turns a sheet/tag name into a URL-safe slug, e.g.
// "Terminal Commands" -> "terminal-commands"
export function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
