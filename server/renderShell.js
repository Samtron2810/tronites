// Injects a server-rendered public page into the built index.html shell.
// Deliberately production-only (no Vite dev-server middleware-mode
// branch): this SSR path exists for crawlers and freshly-arriving
// anonymous visitors hitting production URLs, not for local development
// — `npm run dev` continues to serve the plain CSR app exactly as
// before, and a developer working on a public page component gets fast
// HMR the normal Vite way. Only `vercel build`'s output (dist/) and this
// function see SSR at all.
import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");
const MANIFEST_PATH = path.join(DIST_DIR, ".vite", "manifest.json");

// Both read once at cold start, not per-request — Vercel's serverless
// functions reuse a warm process across requests, so re-reading either
// from disk on every invocation would be pure waste. A fresh deploy
// gets a fresh cold start and therefore a fresh read automatically.
let cachedTemplate = null;
const getTemplate = () => {
  if (!cachedTemplate) {
    cachedTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  }
  return cachedTemplate;
};

// vite.config.js registers src/entry-client.jsx as a second build input
// specifically so it gets bundled and content-hashed the same way every
// other asset does (see that file's own comment) — which means its real
// production URL (dist/assets/entry-client-<hash>.js) is only knowable
// by reading the manifest Vite writes at build time, not by guessing a
// filename. Cached for the same cold-start reason as the template above.
let cachedEntryClientPath = null;
const getEntryClientPath = () => {
  if (!cachedEntryClientPath) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    const entry = manifest["src/entry-client.jsx"];
    if (!entry) {
      throw new Error(
        "entry-client.jsx not found in Vite build manifest — check vite.config.js's rollupOptions.input includes it.",
      );
    }
    cachedEntryClientPath = `/${entry.file}`;
  }
  return cachedEntryClientPath;
};

// The initial-data payload is attacker-influenced only insofar as it's
// public database content (post text, bios) — still run through a
// standard JSON-in-script escape so nothing in a post/bio can break out
// of the <script> tag (e.g. a post containing the literal text
// "</script>"). JSON.stringify alone does NOT escape "<", so this is not
// optional.
const escapeForInlineScript = (json) =>
  json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export const renderShell = ({ appHtml, headTags, initialData }) => {
  const template = getTemplate();
  const entryClientSrc = getEntryClientPath();

  const dataScript = initialData
    ? `<script>window.__INITIAL_DATA__ = ${escapeForInlineScript(
        JSON.stringify(initialData),
      )};</script>`
    : "";

  return (
    template
      // The base template's own entry script (main.jsx's bundled,
      // content-hashed output, injected by Vite into <head> — see
      // vite.config.js's comment on why main.jsx and entry-client.jsx
      // are two separate build inputs) MUST NOT run on an SSR'd public
      // page. main.jsx calls createRoot(...).render(...), which does
      // not hydrate — it would wipe out the server-rendered markup this
      // function is assembling and race with entry-client.jsx's
      // hydrateRoot() call for the same #root node. Stripped here,
      // unconditionally, on every SSR'd response.
      .replace(
        /<script type="module" crossorigin src="\/assets\/main-[^"]+\.js"><\/script>/,
        "",
      )
      // Replace the default static <title>/OG block with this page's
      // real tags. The template's own <title>Tronites</title> line is
      // unique in the file, so this is a safe single-match replace
      // rather than a regex spanning the whole <head>. headTags is
      // everything server/render.jsx's splitHeadTags pulled out of the
      // rendered app string — see that function's comment for exactly
      // why simple context extraction doesn't work on this
      // React/react-helmet-async version combination.
      .replace("<title>Tronites</title>", headTags || "<title>Tronites</title>")
      // Replace ONLY the #root div's content, anchored on the known
      // static-splash markup rather than a generic "#root through
      // </body>" span. The production build moves the app's own script
      // tag up into <head> with a content-hashed filename (confirmed by
      // inspecting the actual `vite build` output — the dev-mode source
      // file's <script src="/src/main.jsx"> sitting right after #root,
      // which an earlier version of this function depended on, does not
      // exist in the built HTML at all), so there's no script tag to
      // anchor on there either. Matching the specific static-splash
      // div by its id — a deliberate, load-bearing marker in
      // index.html, not a structural accident — is what makes this
      // replacement safe even if unrelated markup between #root and
      // </body> changes later. A crawler or JS-disabled visitor now
      // sees real content instead of a spinner; a normal visitor's
      // browser hydrates straight over this same markup with no flash,
      // since it's the exact HTML React would have produced
      // client-side anyway.
      .replace(
        /<div id="root">\s*<div\s+id="static-splash"[\s\S]*?<\/div>\s*<\/div>/,
        `<div id="root">${appHtml}</div>${dataScript}<script type="module" src="${entryClientSrc}"></script>`,
      )
  );
};
