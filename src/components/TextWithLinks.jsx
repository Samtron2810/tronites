import { Link } from "react-router-dom";

// Splits text on #hashtag / @mention tokens and raw URLs, rendering each
// as a link. Hashtags -> /hashtag/xyz, mentions -> /u/username, URLs ->
// external <a target="_blank"> so they open in a new tab and never
// navigate the app away from the current view.
//
// URL_RE deliberately requires a scheme (http/https) or a leading "www."
// — bare domains like "example.com" inside normal sentence text would
// false-positive too often ("check out site.io for details" reads fine
// as prose; auto-linkifying every dotted word would not).
const TOKEN_RE =
  /(#[a-zA-Z0-9_]{1,50}|@[a-zA-Z0-9_]{3,20}|(?:https?:\/\/|www\.)[^\s<>"']+)/g;

// Trailing punctuation that's almost always sentence punctuation, not
// part of the URL itself (e.g. "check this out: https://x.com." or
// "(https://x.com)") — stripped from the end of the matched token and
// re-appended as plain text after the link.
const TRAILING_PUNCT_RE = /[).,!?;:'"]+$/;

const splitTrailingPunctuation = (token) => {
  const match = token.match(TRAILING_PUNCT_RE);
  if (!match) return [token, ""];
  return [token.slice(0, -match[0].length), match[0]];
};

const toHref = (url) => (url.startsWith("www.") ? `https://${url}` : url);

// linkClassName overrides link color independently of the surrounding
// text color — needed on colored surfaces like the "my message" chat
// bubble (bg-primary-600), where the default teal link color would be
// nearly invisible against a teal background.
const TextWithLinks = ({ text, className = "", linkClassName = "" }) => {
  if (!text) return null;

  const parts = text.split(TOKEN_RE);
  const linkClass =
    linkClassName || "text-primary-600 font-medium hover:underline";

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link key={i} to={`/hashtag/${tag}`} className={linkClass}>
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          const uname = part.slice(1).toLowerCase();
          return (
            <Link key={i} to={`/u/${uname}`} className={linkClass}>
              {part}
            </Link>
          );
        }
        if (
          part.startsWith("http://") ||
          part.startsWith("https://") ||
          part.startsWith("www.")
        ) {
          const [url, trailing] = splitTrailingPunctuation(part);
          return (
            <span key={i}>
              <a
                href={toHref(url)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => e.stopPropagation()}
                className={`${linkClass} break-all`}
              >
                {url}
              </a>
              {trailing}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default TextWithLinks;
