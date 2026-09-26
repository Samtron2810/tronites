import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

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
    <header className="sticky top-0 z-50 border-b border-[#2f5c4f] bg-[#04342c]/95 text-[#f3efe6] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Tronites home">
          <img src="/tronite-logo.png" alt="" className="h-9 w-auto" />
          <span className="hidden text-lg font-bold tracking-tight sm:inline">
            Tron<span className="text-[#9fe1cb]">ites</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-3" aria-label="Public navigation">
          <Link to="/explore" className="px-2 py-2 text-[#c9d8d1] transition hover:text-white sm:px-3">
            Explore
          </Link>
          <Link to="/help" className="hidden px-3 py-2 text-[#c9d8d1] transition hover:text-white sm:inline">
            Help
          </Link>
          <Link to="/tiers" className="hidden px-3 py-2 text-[#c9d8d1] transition hover:text-white sm:inline">
            Tiers
          </Link>

          {user ? (
            <Link to="/home" className="ml-1 rounded-full bg-[#1d9e75] px-4 py-2 font-semibold text-[#04342c] transition hover:bg-[#9fe1cb]">
              Go to feed
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-2 py-2 text-[#c9d8d1] transition hover:text-white sm:px-3">
                Log in
              </Link>
              <Link to="/signup" className="rounded-full bg-[#1d9e75] px-3 py-2 font-semibold text-[#04342c] transition hover:bg-[#9fe1cb] sm:px-4">
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
