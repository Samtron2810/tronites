import { Link } from "react-router-dom";

const LINKS = [
  { to: "/help", label: "Help" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/guidelines", label: "Guidelines" },
  { to: "/refunds", label: "Refunds" },
  { to: "/copyright", label: "Copyright" },
];

// Footer for every anonymous/public page. Always dark (like the sidebar),
// independent of the light/dark theme.
const SiteFooter = () => (
  <footer className="bg-(--sidebar-bg) text-[#f4eee1]">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 font-mono text-[12px] uppercase tracking-[0.08em] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <span className="text-[#f4eee1]/70">
        © {new Date().getFullYear()} tronites
      </span>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-[#f4eee1]/80 transition hover:text-accent"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
