import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/useAuth";
import SeoHead from "../components/SeoHead";
import {
  FiChevronDown,
  FiMail,
  FiShield,
  FiFlag,
  FiLock,
  FiUserX,
  FiArrowLeft,
  FiAward,
  FiSearch,
  FiCreditCard,
} from "react-icons/fi";

const FAQ_SECTIONS = [
  {
    heading: "Account",
    items: [
      {
        q: "How do I change my username?",
        a: "Go to Settings → Edit public info. Your username is how people find you via mentions, search, and your profile link. It must be 3–20 characters using lowercase letters, numbers, and underscores, and it has to be unique — if the one you want is taken, you'll be asked to pick another. After changing it, you can only change it again once every 30 days.",
      },
      {
        q: "How do I change my name?",
        a: "Go to Settings → Edit public info. Both a first and last name are required, and this is the name shown on your profile and posts. After changing it, you can only change it again once every 3 days.",
      },
      {
        q: "I didn't receive my verification code",
        a: "Sign-up and password-reset codes are valid for 5 minutes. Check your spam or promotions folder first, then use the resend option on the code screen to get a fresh one. Make sure you entered the email address correctly.",
      },
      {
        q: "How do I reset my password?",
        a: "On the login screen, tap 'Forgot password?' and enter your email. We'll send you a one-time code that's valid for 5 minutes — enter it, then choose a new password. Resetting your password signs you out of every device.",
      },
      {
        q: "How do I see which devices are signed in to my account?",
        a: "Open Settings → Security (Sessions & devices). You'll see each device that's signed in, and you can sign out of any single device or all other devices at once. If you see one you don't recognise, sign it out and reset your password.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Delete account. Your account is deactivated immediately: your profile and posts are hidden, you're signed out everywhere, and any creator subscriptions you have or offer are cancelled. Everything is permanently erased after a 30-day grace period. You can't sign back in yourself during that window — email support@tronites.com if you change your mind. Note that permanent deletion also removes your message history, including the copies in other people's inboxes. See the Privacy Policy for the few records we're required to keep.",
      },
      {
        q: "Can I download a copy of my data?",
        a: "Yes. Settings → Your data → Download my data gives you a JSON export containing your account details, posts, comments, likes, bookmarks, follower/following/blocked/muted lists (as user IDs), messages you sent and received, notifications, and reports you've filed.",
      },
      {
        q: "What are verification badges and tiers?",
        a: "Each badge confirms one specific claim about your account — for example that you're a real person, a notable creator, a registered business, or an official institution. Badges also unlock benefits such as longer posts, post editing, pinned posts, and post scheduling. To compare every badge and see exactly what you're entitled to at each level, open Tiers & benefits.",
      },
      {
        q: "How do I get verified, and does it cost anything?",
        a: "Go to Settings → Verification and apply for the badge that fits you. A reviewer checks your application and you'll be notified in the app when it's decided. The Creator badge requires an active Individual badge first, and the Business badge has a one-time verification fee that's shown and paid in the app when you apply. Business and Creator badges are valid for one year and need to be renewed — we'll remind you before yours lapses.",
      },
      {
        q: "My account was suspended or banned. Can I appeal?",
        a: "Yes. When you try to sign in to a restricted account, the login screen offers an appeal option. Submit a statement explaining why you think the decision should be reviewed and our moderation team will look at it. If the restriction is lifted, you'll be able to sign in normally again.",
      },
    ],
  },
  {
    heading: "Privacy & Safety",
    items: [
      {
        q: "Who can see when I'm online?",
        a: "You control this in Settings → Online status, with options for Everyone, Followers only, or Nobody.",
      },
      {
        q: "How do I block someone?",
        a: "Open their profile, tap the menu icon, and select Block. Blocking removes any follow relationship in both directions and hides your activity from each other, and neither of you can follow the other while the block is in place.",
      },
      {
        q: "What's the difference between muting and blocking?",
        a: "Muting only changes what you see: the muted account's posts and notifications are filtered out of your own feed and notifications. It's one-directional and doesn't remove follows. Blocking is mutual — it cuts the relationship in both directions.",
      },
      {
        q: "How do I report a post, comment, message, or user?",
        a: "Tap the menu icon on the content and select Report, then choose a reason (spam, harassment, hate speech, violence, nudity or sexual content, self-harm, impersonation, misinformation, or other). Reports go to our moderation team's review queue; you won't see a public callout, and repeat or severe violations can lead to suspension or a permanent ban.",
      },
      {
        q: "Why was my post or comment flagged?",
        a: "New and edited posts, comments, and direct messages are screened by automated checks (keyword and link-spam rules, posting-speed and similar-content checks, and an AI moderation service). A flag never removes anything by itself — it puts the content in front of a human moderator, who decides whether any action is needed. If your account is restricted as a result, you can appeal from the login screen.",
      },
      {
        q: "How do push notifications work?",
        a: "Turn them on or off in Settings → Notifications. Push notifications are per browser or device, so enable them on each one you want alerts on. You can also install Tronites to your home screen for a more app-like experience.",
      },
      {
        q: "What is my location used for?",
        a: "Location is optional. If you add a city or region in Settings → Location, it's only used to show trending hashtags near you. You can change or clear it at any time.",
      },
      {
        q: "How does the For You feed choose posts?",
        a: "For You mixes posts from people you follow, people they follow, hashtags and interests you follow or picked, and trending posts. Ranking favours how strongly a post's audience responds relative to the author's size, rather than raw follower counts, and posts from accounts you follow keep a guaranteed share of the feed.",
      },
    ],
  },
  {
    heading: "Posts & Media",
    items: [
      {
        q: "How long can a post be?",
        a: "Unverified accounts can write up to 280 characters. Individual badges allow 500, and Creator, Business, and Government badges allow 1,000. Open Tiers & benefits for the full comparison.",
      },
      {
        q: "Can I edit a post after publishing?",
        a: "Yes, if your account has a verification badge. You can edit a post within your tier's edit window — 15 minutes for Individual, 30 minutes for Creator and Business, and 60 minutes for Government — and you can edit a given post once every 5 minutes. Unverified accounts can't edit posts; you can delete a post and re-share it instead.",
      },
      {
        q: "How do I schedule or pin a post?",
        a: "Scheduling is available to any verified account: choose the schedule option when writing a post, and manage upcoming posts under Scheduled posts (More menu). Pinning is also tier-based — Individual accounts can pin 1 post, and Creator, Business, and Government accounts can pin up to 3.",
      },
      {
        q: "What's the difference between a repost and a quote?",
        a: "A repost shares someone's post to your followers as it is. A quote lets you add your own text above the original post.",
      },
      {
        q: "Why does my image have a description I didn't write?",
        a: "If you leave an image's alt text blank, Tronites may generate a short, literal description automatically using an AI service so the image is accessible to screen-reader users. Alt text you write yourself is never overwritten.",
      },
      {
        q: "Why is my video still processing?",
        a: "Videos go through an upload and encoding step after you post. This is usually quick, but larger files can take a bit longer — the post updates automatically the moment it's ready.",
      },
    ],
  },
  {
    heading: "Messages",
    items: [
      {
        q: "What are message requests?",
        a: "The first time you message someone who isn't a mutual follower, your message goes to their Message Requests instead of their main inbox. They can accept or decline it, and replying to a request counts as accepting it. Once you follow each other, conversations open up normally.",
      },
      {
        q: "Can I turn off read receipts?",
        a: "Yes — Settings → Messaging lets you turn read receipts on or off.",
      },
      {
        q: "Can I delete a message I sent?",
        a: "Yes. Open the message menu and choose Delete. You get a 5-second window to undo it; after that the message is permanently removed for both of you. You can only delete your own messages.",
      },
      {
        q: "How do I search inside a conversation?",
        a: "Tap the search icon at the top of the chat, then type any part of a word. Results are highlighted, and tapping one jumps to that message — even if it's further back in the history.",
      },
    ],
  },
  {
    heading: "Search",
    items: [
      {
        q: "What can I search, and can I filter results?",
        a: "Explore searches people, posts, comments, and your own messages. Posts, comments, and messages can be narrowed by sender/author, date range, and whether they include media (posts and comments can also filter by minimum likes).",
      },
      {
        q: "Where do my recent and saved searches live?",
        a: "They're stored on your account, so they follow you across devices. Focus the search box on Explore to see your history and saved searches, and remove any you don't want to keep.",
      },
    ],
  },
  {
    heading: "Payments & Creator Tools",
    items: [
      {
        q: "How do I promote a post?",
        a: "Creator and Business accounts can promote their own posts: open the post's menu (the ⋯ icon) and choose Promote. Pick a plan — the price and duration are shown before you pay. Payment is handled by Paystack, and the promotion goes live once payment is confirmed. Track your promotions and multi-post campaigns from the More menu.",
      },
      {
        q: "I was charged but my promotion, badge, tip, or subscription didn't go through",
        a: "Payments are confirmed with Paystack, which can occasionally take a few minutes. If it still hasn't updated, email support@tronites.com with your Paystack payment reference and the email you paid with, and we'll look into it.",
      },
      {
        q: "How do tips work?",
        a: "You can send a one-time tip to a creator from their profile or a post. Tips can be between ₦50 and ₦100,000 and are paid through Paystack.",
      },
      {
        q: "How do creator subscriptions work?",
        a: "Subscriptions are monthly. After your first payment, Tronites automatically charges the same payment method every 30 days until you cancel. To cancel, open the creator's profile and cancel your subscription — you keep access until the end of the period you've already paid for. If a renewal charge fails, the subscription is marked as failed and both you and the creator are notified.",
      },
      {
        q: "How do creator earnings and payouts work?",
        a: "Your balance, the platform fee, and the minimum payout amount are shown on the Creator earnings page. Save your bank details there (we only keep the last four digits of your account number) and request a payout once your available balance reaches the minimum. You can have one pending payout request at a time.",
      },
    ],
  },
];

const FaqItem = ({ q, a, forceOpen = false }) => {
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;
  return (
    <div className="border-b border-stroke last:border-b-0">
      <button
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="text-base font-medium text-ink">{q}</span>
        <FiChevronDown
          size={16}
          className={`shrink-0 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <p className="text-base text-ink-muted leading-relaxed pb-4 pr-6">{a}</p>
      )}
    </div>
  );
};

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const visibleSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: needle
      ? section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(needle) ||
            item.a.toLowerCase().includes(needle),
        )
      : section.items,
  })).filter((section) => section.items.length > 0);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user ? "/home" : "/");
    }
  };

  return (
    <MainLayout>
      <SeoHead
        title="Help & Support"
        description="Answers to common questions about accounts, privacy, verification, creator tiers, and using Tronites."
        canonical="/help"
      />
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">Help & Support</h1>
      <p className="text-base text-ink-muted mb-6">
        Answers to common questions, and how to reach us if you need more help.
      </p>

      <div className="relative mb-4">
        <FiSearch
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-400 transition"
        />
      </div>

      {visibleSections.length === 0 && (
        <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
          <p className="text-base text-ink-muted">
            No help topics match "{query.trim()}". Try a different word, or{" "}
            <a
              href="mailto:support@tronites.com"
              className="text-primary-600 font-medium hover:underline"
            >
              email our support team
            </a>
            .
          </p>
        </section>
      )}

      {visibleSections.map((section) => (
        <section
          key={section.heading}
          className="bg-card border border-stroke rounded-2xl p-5 mb-4"
        >
          <h2 className="text-base font-semibold text-ink mb-1">
            {section.heading}
          </h2>
          <div className="mt-2">
            {section.items.map((item) => (
              <FaqItem key={item.q} {...item} forceOpen={!!needle} />
            ))}
          </div>
        </section>
      ))}

      <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
        <h2 className="text-base font-semibold text-ink mb-3">
          Quick links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            to="/privacy"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiLock size={14} className="text-primary-600" />
            Privacy Policy
          </Link>
          <Link
            to="/tiers"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiAward size={14} className="text-primary-600" />
            Tiers & benefits
          </Link>
          <Link
            to="/terms"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiShield size={14} className="text-primary-600" />
            Terms of Use
          </Link>
          <Link
            to="/guidelines"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiUserX size={14} className="text-primary-600" />
            Community Guidelines
          </Link>
          <Link
            to="/refunds"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiCreditCard size={14} className="text-primary-600" />
            Refunds &amp; Cancellations
          </Link>
          <Link
            to="/copyright"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiFlag size={14} className="text-primary-600" />
            Copyright &amp; Takedowns
          </Link>
          <a
            href="mailto:support@tronites.com?subject=Tronites%20issue%20report"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiFlag size={14} className="text-primary-600" />
            Report an issue
          </a>
          <a
            href="mailto:support@tronites.com?subject=Payment%20or%20billing%20question&body=Payment%20reference%3A%20"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiCreditCard size={14} className="text-primary-600" />
            Payment or billing help
          </a>
        </div>
      </section>

      <section className="bg-card border border-stroke rounded-2xl p-5">
        <h2 className="text-base font-semibold text-ink mb-1">
          Still need help?
        </h2>
        <p className="text-base text-ink-muted mb-4">
          Email us and include your username. For payment problems, add your Paystack payment reference.
        </p>
        <a
          href="mailto:support@tronites.com"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-800 text-white text-base font-medium transition"
        >
          <FiMail size={15} />
          Email support@tronites.com
        </a>
        <p className="text-sm text-ink-muted mt-4 flex items-center gap-1.5">
          <FiUserX size={12} />
          For safety emergencies involving a specific account, use the in-app
          Report option so our moderation team can act on the right content
          directly.
        </p>
      </section>
    </MainLayout>
  );
};

export default HelpSupport;
