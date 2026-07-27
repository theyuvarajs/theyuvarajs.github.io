// ============================================================
// SITE CONFIGURATION
// This is the ONLY file you should ever need to touch.
// Everything else (content, navigation, articles) comes from
// Google Sheets automatically — see README.md for the sheet
// structure and how to add new sections/articles.
// ============================================================

window.SITE_CONFIG = {
  // Paste the Web App URL you get after deploying the Apps Script
  // (Deploy > New deployment > Web app). It ends in /exec
  API_URL: "https://script.google.com/macros/s/AKfycbyA7bP2r4zkfvNK6DvhsQOh8Oag9_r0lJKH3Qc2_NIGANviaHybS_FkRrc9TaPSfq_mgQ/exec",

  // Site branding shown in the top bar
  SITE_TITLE: "Knowledge Base",
  SITE_TAGLINE: "Everything in one place",

  // How long fetched sheet data is cached in the browser (ms).
  // Lower this while you're actively editing the sheet, raise it
  // once things are stable to reduce Apps Script calls.
  CACHE_TTL_MS: 5 * 60 * 1000
};

// ------------------------------------------------------------
// That's it. There is no template configuration anymore.
//
// Every sheet (tab) in the spreadsheet uses exactly the same five
// columns — ID | Title | Content | Tags | Related — and is rendered
// by the single renderer in src/ui/renderer.js. Add a new tab to the
// spreadsheet and it appears on the site automatically, with no
// code changes required anywhere.
// ------------------------------------------------------------
