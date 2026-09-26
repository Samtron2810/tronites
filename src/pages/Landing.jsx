import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import SeoHead from "../components/SeoHead";
import PublicNavbar from "../components/PublicNavbar";
import { buildOrganizationJsonLd } from "../hooks/useSeoMeta";
import {
  FiArrowUpRight,
  FiMessageCircle,
  FiHash,
  FiCompass,
  FiDollarSign,
  FiShield,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiMessageCircle,
    title: "Real conversations",
    body: "Post, reply, and chat in real time — no algorithmic delay between you and the people you actually follow.",
    rotate: "-rotate-1",
  },
  {
    icon: FiHash,
    title: "Find your topic",
    body: "Hashtags and an explore feed built for discovery, not for keeping you doom-scrolling.",
    rotate: "rotate-1",
  },
  {
    icon: FiDollarSign,
    title: "Get paid for your work",
    body: "Subscriber-only posts, tips, and media kits — creator monetization that pays out directly, no gatekeeping.",
    rotate: "-rotate-1",
  },
  {
    icon: FiShield,
    title: "Built with guardrails",
    body: "Moderation, blocking, and privacy controls that are on by default, not buried three menus deep.",
    rotate: "rotate-1",
  },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-primary-900 text-[#f3efe6] overflow-x-hidden">
      <SeoHead
        title="Connect, Post, and Chat in Real Time"
        description="Tronites is a social platform for creators and communities — post, chat, discover hashtags, and get paid for your work. Join free."
        canonical="/"
        jsonLd={buildOrganizationJsonLd({
          url: "https://tronites.com",
          logoUrl: "https://tronites.com/pwa-512.png",
        })}
      />

      {/* Shared across every anonymous/public page. */}
      <PublicNavbar />

      {/* ── hero ────────────────────────────────────────────────── */}
      <section className="relative">
        {/* doodle wallpaper, lifted straight from the app's own brand pattern,
            cranked up in opacity since this section carries no card surfaces
            to compete with it */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "var(--app-pattern)",
            backgroundSize: "420px 420px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-primary-200 mb-5">
              Made for creators &amp; communities
            </span>
            <h1 className="font-black leading-[0.95] tracking-tight text-[13vw] sm:text-6xl lg:text-7xl">
              Post it.
              <br />
              Talk it out.
              <br />
              <span className="text-primary-200">Get paid for it.</span>
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-[#c9d8d1] max-w-xl leading-relaxed">
              Tronites is where your posts, your people, and your income live in
              one place — real-time chat, hashtag discovery, and creator
              monetization that actually pays out.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={user ? "/home" : "/signup"}
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary-400 text-primary-900 font-bold text-base hover:bg-primary-200 transition"
              >
                {user ? "Go to your feed" : "Create your account"}
                <FiArrowUpRight
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-full border border-[#2f5c4f] text-[#f3efe6] font-semibold text-base hover:border-primary-200 transition"
                >
                  I already have an account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── feature strip — torn-notebook cards, alternating rotation ── */}
      <section className="bg-[#f3efe6] text-ink relative">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <h2 className="font-black text-3xl sm:text-4xl tracking-tight max-w-md mb-12">
            One app, not five tabs
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, body, rotate }) => (
              <div
                key={title}
                className={`bg-white border-2 border-ink rounded-2xl p-6 sm:p-7 shadow-[6px_6px_0_0_#04342c] transition-transform hover:rotate-0 ${rotate}`}
              >
                <div className="h-11 w-11 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-lg mb-1.5">{title}</h3>
                <p className="text-ink-sub text-[15px] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── explore teaser ─────────────────────────────────────────── */}
      <section className="bg-primary-600 text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <FiCompass size={28} className="mb-4 text-primary-200" />
            <h2 className="font-black text-2xl sm:text-3xl tracking-tight max-w-md">
              See what people are posting before you even sign up
            </h2>
          </div>
          <Link
            to="/explore"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary-600 font-bold hover:bg-primary-100 transition"
          >
            Explore posts
            <FiArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── footer ─────────────────────────────────────────────────── */}
      <footer className="bg-primary-900 text-[#8fa79c] text-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} Tronites</span>
          <div className="flex items-center gap-6">
            <Link to="/help" className="hover:text-white transition">
              Help
            </Link>
            <Link to="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
