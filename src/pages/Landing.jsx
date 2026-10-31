import { Link } from "react-router-dom";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { useAuth } from "../context/useAuth";
import SeoHead from "../components/SeoHead";
import PublicNavbar from "../components/PublicNavbar";
import SiteFooter from "../components/SiteFooter";
import Ticker from "../components/ui/Ticker";
import { buildOrganizationJsonLd } from "../hooks/useSeoMeta";

const TICKER_TAGS = [
  "NaijaTech",
  "LagosTraffic",
  "JollofDebate",
  "BuildInPublic",
  "Afrobeats",
  "Freelance",
  "NollywoodTalk",
];

const TRENDING = ["NaijaTech", "LagosTraffic", "Freelance"];

// Decorative switch (the real controls live in the app's settings).
const FakeSwitch = () => (
  <span
    aria-hidden="true"
    className="relative inline-block h-6 w-10 shrink-0 rounded-full border-2 border-line bg-primary-600"
  >
    <span className="absolute right-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-line bg-white" />
  </span>
);

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="app-bg min-h-screen overflow-x-clip">
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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
        <div>
          <span className="chip rounded-full px-3 py-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-ember"
            />
            Made for Nigerian creators
          </span>

          <h1
            className="display-xl mt-7"
            style={{ fontSize: "clamp(2.9rem, 9.5vw, 5.5rem)" }}
          >
            Say it
            <br />
            loud. Get
            <br />
            <span className="mark-amber">paid</span> for it.
          </h1>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-sub">
            Post, chat in real time, find your corner by hashtag, and keep what
            you earn. One app instead of five tabs.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              to={user ? "/home" : "/signup"}
              className="btn btn-primary btn-lg"
            >
              {user ? "Go to your feed" : "Create your account"}
              <FiArrowRight size={18} />
            </Link>
            <Link to="/explore" className="link-amber text-[15px]">
              Peek at the feed first
            </Link>
          </div>
        </div>

        {/* Sample posts — illustration only, not interactive. */}
        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-md space-y-5 lg:h-[470px] lg:max-w-none lg:space-y-0"
        >
          <div className="card card-pop rotate-[-2.5deg] p-5 lg:absolute lg:right-6 lg:top-0 lg:w-[78%]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-600 font-bold text-white">
                A
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">Adaeze Obi</p>
                <p className="font-mono text-[11px] text-ink-muted">
                  @adaeze 2h
                </p>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-snug text-ink">
              Rewrote the landing page copy three times today. The hero finally
              says what the product does.
            </p>
            <p className="mt-2 font-mono text-xs text-primary-600">
              #BuildInPublic
            </p>
          </div>

          <div className="card card-amber rotate-[2deg] rounded-tl-[2rem] p-5 lg:absolute lg:right-0 lg:top-[165px] lg:w-[86%]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Tobi Makes</p>
              <span className="chip bg-card">Tip received</span>
            </div>
            <p className="mt-2 text-[15px] leading-snug">
              Pricing freelance work without apologising for it. Full breakdown
              below.
            </p>
            <div className="mt-4 flex gap-2">
              <span className="btn btn-ink btn-sm">Send a tip</span>
              <span className="btn btn-sm bg-transparent shadow-none">
                Subscribe
              </span>
            </div>
          </div>

          <div className="card shadow-hard-green rotate-[-1deg] overflow-hidden lg:absolute lg:right-10 lg:top-[330px] lg:w-[80%]">
            <div className="hatch-bar" />
            <div className="p-5">
              <p className="mono-label flex items-center gap-1.5">
                <FiLock size={12} />
                Subscribers only
              </p>
              <p className="mt-2 text-[15px] leading-snug text-ink">
                The full thread on how I got my first three retainers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── hashtag band ────────────────────────────────────────── */}
      <div className="py-6" aria-label="Popular hashtags">
        <Ticker
          items={TICKER_TAGS}
          className="-ml-[3%] w-[106%] -rotate-2"
        />
      </div>

      {/* ── one app, not five tabs ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="display-lg max-w-xs">
            One app,
            <br />
            not five tabs.
          </h2>
          <p className="max-w-xs text-sm text-ink-sub">
            Everything below is live in the product today. No roadmap slides.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
          {/* 01 chat */}
          <div className="card card-pop rounded-tr-[2.5rem] p-6 sm:p-8">
            <p className="mono-label text-primary-600">01 Chat</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">
              Real conversations
            </h3>
            <p className="mt-2 max-w-sm text-sm text-ink-sub">
              Post, reply and message in real time. No algorithm sitting between
              you and the people you follow.
            </p>
            <div aria-hidden="true" className="mt-6 space-y-3">
              <p className="inline-block rounded-full border-2 border-line bg-sand px-4 py-2 text-sm">
                Did you see the new tier page?
              </p>
              <div className="text-right">
                <p className="inline-block rounded-full border-2 border-line bg-primary-600 px-4 py-2 text-sm text-white">
                  Yes. Sending you a tip right now.
                </p>
              </div>
              <p className="font-mono text-[11px] text-ink-muted">typing...</p>
            </div>
          </div>

          {/* 02 discover */}
          <div className="card card-ink shadow-hard-green rounded-tl-[2.5rem] p-6 sm:p-8">
            <p className="mono-label text-accent">02 Discover</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">
              Find your topic
            </h3>
            <ol className="mt-5">
              {TRENDING.map((t, i) => (
                <li
                  key={t}
                  className="flex items-center gap-5 border-t border-dotted border-current/30 py-3"
                >
                  <span className="w-5 font-display text-2xl font-extrabold text-accent">
                    {i + 1}
                  </span>
                  <Link
                    to={`/hashtag/${t}`}
                    className="font-mono text-sm hover:underline"
                  >
                    #{t}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          {/* 03 earn */}
          <div className="card card-amber -rotate-1 p-6 sm:p-8">
            <p className="mono-label text-[#16140f]/70">03 Earn</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">
              Get paid for your work
            </h3>
            <p className="mt-2 text-sm">
              Subscriber posts, tips and media kits. Paid out directly.
            </p>
            <div
              aria-hidden="true"
              className="mt-5 rounded-lg border-2 border-line bg-surface p-4 text-ink"
            >
              <p className="mono-label">Tip @tobi_makes</p>
              <div className="mt-3 flex gap-2">
                {["500", "1,000", "2,000"].map((n, i) => (
                  <span
                    key={n}
                    className={`rounded border-[1.5px] border-line px-3 py-1.5 font-mono text-xs ${
                      i === 1 ? "bg-ink text-surface" : "bg-card"
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 04 safety */}
          <div className="card card-sand rounded-tr-[2.5rem] p-6 shadow-hard sm:p-8">
            <p className="mono-label text-primary-600">04 Safety</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">
              Guardrails, switched on
            </h3>
            <ul
              aria-label="Safety controls"
              className="mt-5 divide-y-2 divide-dashed divide-line rounded-lg border-2 border-line bg-surface"
            >
              {[
                "Block and mute in one tap",
                "Report with context",
                "Appeal any moderation decision",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  {t}
                  <FakeSwitch />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── closing call to action ──────────────────────────────── */}
      <section className="bg-primary-600 pb-16 pt-24 text-[#f4eee1] [clip-path:polygon(0_5%,100%_0,100%_100%,0_100%)] sm:pb-20 sm:pt-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <h2 className="display-lg max-w-xl">
            Your people are already posting.
          </h2>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link
              to={user ? "/home" : "/signup"}
              className="btn btn-accent btn-lg border-[#16140f]"
            >
              {user ? "Go to your feed" : "Join free"}
              <FiArrowRight size={18} />
            </Link>
            <Link
              to="/explore"
              className="border-b-2 border-[#f4eee1] pb-0.5 font-mono text-[12px] uppercase tracking-[0.08em]"
            >
              Or browse without an account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
