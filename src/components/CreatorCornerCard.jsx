import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { isCreator } from "../utils/creator";

// Amber "Creator corner" promo. Three states, all backed by existing data:
//  - creator without a subscription plan → set one up (Creator dashboard)
//  - creator with a plan                 → jump to earnings
//  - not a creator yet                   → point at the Tiers page
const CreatorCornerCard = () => {
  const { user } = useAuth();
  const creator = isCreator(user);
  // undefined = still checking, null = no plan, object = has plan
  const [plan, setPlan] = useState(undefined);

  useEffect(() => {
    if (!creator) return;
    let cancelled = false;
    api
      .get("/creator-monetization/plan/me")
      .then((r) => {
        if (!cancelled) setPlan(r.data?.plan || null);
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [creator]);

  if (!user) return null;
  if (creator && plan === undefined) return null; // avoid a flash of the wrong state

  let title;
  let cta;
  let to;
  if (!creator) {
    title = "Get paid for your posts.";
    cta = "See creator tier";
    to = "/tiers";
  } else if (!plan) {
    title = "Turn on subscriptions and let readers pay you.";
    cta = "Set up your plan";
    to = "/creator-dashboard";
  } else {
    title = "Your plan is live. Check what's come in.";
    cta = "Open earnings";
    to = "/creator-earnings";
  }

  return (
    <section
      aria-label="Creator corner"
      className="card card-amber -rotate-1 p-5 transition-transform hover:rotate-0"
    >
      <p className="mono-label text-[#16140f]/70">Creator corner</p>
      <h2 className="mt-2 font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em]">
        {title}
      </h2>
      <Link to={to} className="btn btn-ink btn-sm mt-4">
        {cta}
      </Link>
    </section>
  );
};

export default CreatorCornerCard;
