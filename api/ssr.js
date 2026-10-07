// Deployed as a Vercel Serverless Function. vercel.json (see this repo's
// updated version) routes matching requests here instead of straight to
// the static index.html the current rewrite sends everything to — see
// that file's own comment for the exact routing config and why it
// deliberately does NOT route every request through this function.
//
// This function's own job is narrower than "handle every request":
// - Only GET/HEAD navigations reach it at all (vercel.json's routing).
// - Only requests with NO "token" cookie get SSR — a visitor with a
//   session cookie present (even an expired one; this is a cheap
//   presence check, not a verify) skips straight to the static shell,
//   because SSR only ever renders the anonymous view anyway (see
//   entry/SsrAuthProvider.jsx) — there is nothing for a logged-in
//   visitor to gain here, and it avoids ever showing a flash of
//   logged-out content to someone who is actually logged in.
// - Only a path matching isPublicSsrPath (render.jsx) actually gets
//   rendered; everything else falls through to the static file exactly
//   like today.
import fs from "node:fs";
import path from "node:path";

// Load the SSR bundle that `vite build --ssr` emits into dist-ssr/ (see the
// "build" script in package.json). Never import server/render.jsx directly:
// Vercel's Node runtime cannot load .jsx, and a failing top-level import
// kills the function at cold start (500 FUNCTION_INVOCATION_FAILED) before
// any try/catch can run. Dynamic + cached so a bad bundle degrades to the
// static shell instead of a 500.
let ssrModulePromise = null;
const loadSsr = () => {
  if (!ssrModulePromise) {
    ssrModulePromise = Promise.all([
      import("../dist-ssr/render.js"),
      import("../server/renderShell.js"),
    ]).catch((err) => {
      ssrModulePromise = null;
      throw err;
    });
  }
  return ssrModulePromise;
};

const DIST_DIR = path.resolve(process.cwd(), "dist");

const serveStaticShell = (res) => {
  const html = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const hasSessionCookie = /(?:^|;\s*)token=/.test(req.headers.cookie || "");

  if (hasSessionCookie) {
    return serveStaticShell(res);
  }

  try {
    const [{ renderPublicApp, isPublicSsrPath }, { renderShell }] =
      await loadSsr();
    if (!isPublicSsrPath(url.pathname)) {
      return serveStaticShell(res);
    }
    const { appHtml, headTags, initialData } = await renderPublicApp(url.pathname);
    const page = renderShell({ appHtml, headTags, initialData });

    // Short, shared CDN-level cache — the rendered HTML is only as fresh
    // as the public API responses it embeds, which are themselves
    // cached for 60s server-side (see publicUserController.js et al.).
    // No point caching this response longer than the data it contains
    // can possibly have changed. s-maxage is Vercel's/CDN's cache, not
    // the browser's — stale-while-revalidate means a slightly-stale page
    // can still be served instantly while a fresh one renders in the
    // background for the next visitor.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(page);
  } catch (err) {
    // Any SSR failure (render threw, template missing, etc.) must never
    // take the page down entirely — fall back to the exact same static
    // shell a logged-in visitor gets, and the client-side fetch inside
    // each public page component (their normal, pre-existing behavior)
    // picks up the data after mount. Worse for SEO on that one request,
    // never worse for the visitor.
    console.error("SSR render failed, falling back to static shell:", err);
    serveStaticShell(res);
  }
}
