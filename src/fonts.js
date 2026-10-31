// Self-hosted DM Sans (no request to Google Fonts, so visitors' IP addresses
// aren't sent to Google — see the Privacy Policy). Imported from JS rather
// than via @import in index.css: Tailwind's CSS pipeline inlines the
// @fontsource stylesheets but leaves their relative url(./files/…) paths
// unresolved, so the .woff2 files would never be emitted. Each weight's CSS
// declares latin and latin-ext subsets with unicode-range, so the browser
// only downloads the subset a page actually needs.
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";

// Display (headings) + mono (labels, chips, tickers). Only the latin and
// latin-ext subsets are imported — latin-ext carries the diacritics Yoruba
// and Igbo names need (ẹ, ọ, ṣ, ụ), and skipping the other subsets keeps
// the PWA precache small.
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/bricolage-grotesque/latin-ext-600.css";
import "@fontsource/bricolage-grotesque/latin-ext-700.css";
import "@fontsource/bricolage-grotesque/latin-ext-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-ext-500.css";
