import { Link } from "react-router-dom";
import BrandMark from "./ui/BrandMark";
import Ticker from "./ui/Ticker";
import cx from "../utils/cx";

const AUTH_TICKER_TAGS = [
  "NaijaTech",
  "LagosTraffic",
  "JollofDebate",
  "BuildInPublic",
  "Afrobeats",
  "Freelance",
  "NollywoodTalk",
];

// Split auth screen: oversized headline + tilted hashtag band on the left,
// form card on the right. Stacks on phones (headline shrinks via the fluid
// display-* classes). Page logic stays in the page; this is frame only.
//   size: "xl" for short headlines, "lg" for long ones.
const AuthLayout = ({ headline, sub, size = "xl", children }) => (
  <div className="app-bg relative min-h-dvh overflow-x-clip">
    <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-x-10 px-5 py-6 sm:px-8 lg:grid-cols-2 lg:py-10">
      <div className="flex flex-col lg:justify-between">
        <Link to="/" aria-label="Back to Tronites homepage" className="self-start">
          <BrandMark size={38} />
        </Link>
        <div className="mt-8 lg:mt-0 lg:pb-44">
          <h1 className={cx(size === "xl" ? "display-xl" : "display-lg", "text-ink")}>
            {headline}
          </h1>
          {sub && (
            <p className="mt-5 max-w-sm text-base text-ink-sub sm:text-lg">
              {sub}
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center py-8 lg:justify-end">
        <div className="card card-pop w-full max-w-md p-6 sm:p-8 lg:-rotate-1">
          {children}
        </div>
      </div>
    </div>

    <div className="relative z-0 pb-10 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-[12%] lg:pb-0">
      <Ticker
        items={AUTH_TICKER_TAGS}
        className="-ml-[3%] w-[106%] -rotate-2"
      />
    </div>
  </div>
);

// Single centred card for short, single-step screens (OTP, username,
// interests, 404…).
export const AuthCenter = ({ children, width = "max-w-md", card = true }) => (
  <div className="app-bg min-h-dvh">
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
      <Link to="/" aria-label="Tronites home" className="self-start">
        <BrandMark size={34} />
      </Link>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className={cx("w-full", width)}>
          {card ? <div className="card card-pop p-6 sm:p-8">{children}</div> : children}
        </div>
      </div>
    </div>
  </div>
);

export default AuthLayout;
