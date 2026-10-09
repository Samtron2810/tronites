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
