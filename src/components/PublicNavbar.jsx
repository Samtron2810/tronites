import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import BrandMark from "./ui/BrandMark";

const NAV_LINK =
  "whitespace-nowrap px-1.5 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-sub transition hover:text-ink sm:px-3 sm:text-[12px] sm:tracking-[0.08em]";

/**
 * Lightweight navigation for public pages.
 *
 * It intentionally does not use the authenticated Navbar because that
 * component depends on notifications, messages, and the user menu. Keeping
 * this bar session-agnostic also makes it safe to server-render.
 */
const PublicNavbar = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Tronites home">
          <BrandMark size={32} />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-2" aria-label="Public navigation">
          <Link to="/explore" className={`hidden min-[400px]:inline ${NAV_LINK}`}>
            Explore
          </Link>
          <Link to="/tiers" className={`hidden md:inline ${NAV_LINK}`}>
            Tiers
          </Link>
          <Link to="/help" className={`hidden md:inline ${NAV_LINK}`}>
            Help
          </Link>

          {user ? (
            <Link to="/home" className="btn btn-ink btn-sm ml-1">
              Go to feed
            </Link>
          ) : (
            <>
              <Link to="/login" className={NAV_LINK}>
                Log in
              </Link>
              <Link
                to="/signup"
                className="btn btn-ink btn-sm ml-1 font-mono uppercase tracking-[0.08em]"
              >
                Join free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PublicNavbar;
