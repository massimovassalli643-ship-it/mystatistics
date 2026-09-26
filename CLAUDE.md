# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**My Statistics** — mobile-first (iPad landscape) single-file web app for live
football match statistics of A.S.D. Fiamma Monza 1970. Everything lives in
`index.html` (HTML + CSS + JS inline, ~1700 lines, zero build); deployed by
pushing `main` to GitHub Pages.

Backend: Google Apps Script web app (proxy to Anthropic API for OCR + Google
Sheets sync). The live code is in the Apps Script editor (project
"MyStatisticsBackend"); `backend/Code.gs` is the reference copy kept in sync
by hand. After ANY change to Code.gs: paste it in the editor, save, then
Deploy → Gestisci deployment → (Modifica) → Nuova versione → Implementa —
for EVERY active deployment (there are three; the iPad may use any of them).

Since v4 the backend also reads Google Drive (`DriveApp`). Adding a new OAuth
scope means the deployments must be re-authorized: run `testDriveDistinte()`
once from the editor and accept the Drive consent screen BEFORE publishing the
new version, otherwise the live web app can start asking for re-authorization
and both OCR and Sheets sync stop working mid-match.

Full functional/technical documentation: PDF "MyStatistics_Documentazione"
(25/05/2026). Living status: `PROGRESS.md`.

## Conventions

- No frameworks, no build step, no external deps beyond jsPDF and SheetJS CDNs,
  plus html2canvas (cdnjs, loaded lazily by `loadHtml2canvas` only for the
  graphic Report — approved 26/09/2026)
- Keep the logical module structure of `index.html` (Storage, Navigazione,
  Home, Setup, OCR, Lineup, Match, Eventi, Statistiche, Summary, Export, Sync,
  Impostazioni, Utility) — add code inside the matching block
- Frontend → backend requests use `Content-Type: text/plain;charset=utf-8`
  (avoids CORS preflight, which Apps Script cannot answer)
- Files in the repo are normalized to LF: edit with tools that read/modify/write
  the file (python, sed), never re-type it from tool output (truncation risk)

## Versioning

- `APP_VERSION` (top of the script in `index.html`) and `BACKEND_VERSION`
  (`backend/Code.gs`) must be bumped on EVERY change to that file, in the same
  commit as the `PROGRESS.md` update. Settings → "Verifica versioni" compares
  them with what is deployed (frontend online vs running, backend via GET ping)
- If a frontend change needs new backend behavior, raise `BACKEND_MIN_VERSION`
  in `index.html` too, so the iPad warns when a deployment is stale

## OCR (critical path)

- Never send the whole photo as one image: the Anthropic API downsizes to
  ~1568 px / 1.15 MP and small names get hallucinated. `prepareOcrImages()`
  sends one low-res overview + 4 high-res overlapping strips of the left
  62% of the page (N. ruolo, data di nascita, cognome e nome), contrast-enhanced
- Backend `handleOcrRequest` accepts `images[]` (new), `pdfBase64` (v4: PDF read
  at full resolution via the Anthropic `document` block) and `imageBase64` (legacy)
- Drive distinte: the browser cannot open a given folder, so `driveList` /
  `driveOcr` do it server-side; PDFs are OCR'd in the backend, images are sent
  back to the client for the strip pipeline
- Test protocol: synthetic 3024×4032 distinta drawn on a canvas in the browser
  console → must return 20/20 names (see PROGRESS.md, 12/09/2026)

## Progress tracking (mandatory)

`PROGRESS.md` is the living status document. **Every time a feature, option,
constant or configuration step is added or changed, update `PROGRESS.md` in
the same commit**: the feature sections, "Opzioni e costanti", a dated row in
"Changelog", and the "Roadmap / backlog" checkboxes. Never leave it stale.
