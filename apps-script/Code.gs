/**
 * Knowledge Base Website — Google Sheets CMS API
 * ---------------------------------------------
 * Deploy this as a Web App (Deploy > New deployment > Web app).
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Then copy the resulting /exec URL into src/config.js (API_URL).
 *
 * Every sheet (tab) must use exactly the same five columns:
 *   ID | Title | Content | Tags | Related
 * See README.md for the full column reference and supported
 * Content block tags. This script doesn't care what's in those
 * columns — it just returns every row of every visible sheet,
 * verbatim, as JSON. All parsing/rendering happens client-side.
 *
 * Behavior:
 *   - Reads every sheet (tab) in the spreadsheet.
 *   - Skips hidden sheets entirely (a hidden sheet is never exposed).
 *   - Skips sheets whose name starts with "_" (treated as internal/notes-to-self).
 *   - Skips rows that are entirely empty.
 *   - Returns { "Sheet Name": [ {col: value, ...}, ... ], ... }
 *
 * To add a new section to the website: just add a new sheet tab with
 * these same five columns. Nothing in this file or the website code
 * needs to change.
 */

// If this script is bound to the spreadsheet (Extensions > Apps Script
// from within Sheets), leave SHEET_ID empty and it will use the active
// spreadsheet automatically. If it's a standalone script, paste the
// spreadsheet ID from its URL here instead.
var SHEET_ID = "";

function getSpreadsheet_() {
  return SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  var ss = getSpreadsheet_();
  var sheets = ss.getSheets();
  var result = {};

  sheets.forEach(function (sheet) {
    var name = sheet.getName();

    if (sheet.isSheetHidden()) return;      // never expose hidden sheets
    if (name.indexOf("_") === 0) return;     // "_Draft", "_Scratch" etc. stay private

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return; // no header + data

    var headers = values[0].map(function (h) { return String(h).trim(); });
    var rows = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var isEmpty = row.every(function (cell) { return cell === "" || cell === null; });
      if (isEmpty) continue;

      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue; // skip unlabeled columns
        var cell = row[c];
        // Normalize Dates (e.g. an "Updated" column formatted as a date)
        // to a plain yyyy-MM-dd string instead of a JS Date object.
        if (Object.prototype.toString.call(cell) === "[object Date]") {
          cell = Utilities.formatDate(cell, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }
        obj[headers[c]] = cell;
      }
      rows.push(obj);
    }

    if (rows.length) result[name] = rows;
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
