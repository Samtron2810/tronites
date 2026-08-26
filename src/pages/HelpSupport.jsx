import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import {
  FiChevronDown,
  FiMail,
  FiShield,
  FiFlag,
  FiLock,
  FiUserX,
  FiArrowLeft,
} from "react-icons/fi";

const FAQ_SECTIONS = [
  {
    heading: "Account",
    items: [
      {
        q: "How do I change my username?",
        a: "Your username is edited in Settings â†’ Account. It's how people find you via mentions, search, and your profile link. It must be 3â€“20 characters using lowercase letters, numbers, and underscores, and it has to be unique â€” if the one you want is taken, you'll be asked to pick another. After changing it, you can only change it again once every 30 days.",
      },
      {
        q: "How do I change my name?",
        a: "Your display name is edited in Settings â†’ Account. Both a first and last name are required, and this is the name shown on your profile and posts. After changing it, you can only change it again once every 3 days.",
      },
      {
        q: "How do I reset my password?",
        a: "On the login screen, tap 'Forgot password?' and enter your email. We'll send a reset link that expires after a short time for your security.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings â†’ Delete account. Your account is deactivated immediately and permanently erased after a 30-day grace period. Contact support within that window if you change your mind.",
      },
      {
        q: "Can I download a copy of my data?",
        a: "Yes. Settings â†’ Your data â†’ Download my data gives you a JSON export of your posts, comments, likes, bookmarks, follows, and messages.",
      },
    ],
  },
  {
    heading: "Privacy & Safety",
    items: [
      {
        q: "Who can see when I'm online?",
        a: "You control this in Settings â†’ Who can see you're online, with options for Everyone, Followers only, or Nobody.",
      },
      {
        q: "How do I block someone?",
        a: "Open their profile, tap the menu icon, and select Block. Blocking removes any follow relationship in both directions and hides your activity from each other.",
      },
      {
        q: "How do I report a post, comment, or user?",
        a: "Tap the menu icon on the content and select Report. Our moderation team reviews every report; you won't see a public callout, and repeat or severe violations can lead to suspension or a permanent ban.",
      },
    ],
  },
  {
    heading: "Posts & Media",
    items: [
      {
        q: "Why is my video still processing?",
        a: "Videos go through an upload and encoding step after you post. This is usually quick, but larger files can take a bit longer â€” the post updates automatically the moment it's ready.",
      },
      {
        q: "Can I edit a post after publishing?",
        a: "Not currently. You can delete a post and re-share it if you need to make a correction.",
      },
    ],
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stroke last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="text-base font-medium text-ink">{q}</span>
        <FiChevronDown
          size={16}
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-base text-ink-muted leading-relaxed pb-4 pr-6">{a}</p>
      )}
    </div>
  );
};

const HelpSupport = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <MainLayout>
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

      {FAQ_SECTIONS.map((section) => (
        <section
          key={section.heading}
          className="bg-card border border-stroke rounded-2xl p-5 mb-4"
        >
          <h2 className="text-base font-semibold text-ink mb-1">
            {section.heading}
          </h2>
          <div className="mt-2">
            {section.items.map((item) => (
              <FaqItem key={item.q} {...item} />
            ))}
          </div>
        </section>
      ))}

      <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
        <h2 className="text-base font-semibold text-ink mb-3">
          Quick links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link
            to="/privacy"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiLock size={14} className="text-primary-600" />
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiShield size={14} className="text-primary-600" />
            Terms of Use
          </Link>
          <a
            href="mailto:support@tronites.com"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stroke text-base text-ink hover:bg-surface transition"
          >
            <FiFlag size={14} className="text-primary-600" />
            Report an issue
          </a>
        </div>
      </section>

      <section className="bg-card border border-stroke rounded-2xl p-5">
        <h2 className="text-base font-semibold text-ink mb-1">
          Still need help?
        </h2>
        <p className="text-base text-ink-muted mb-4">
          Our support team typically responds within 1â€“2 business days.
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
