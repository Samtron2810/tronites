import { Link } from "react-router-dom";

// Splits text on #hashtag and @mention tokens and renders them as links.
// Hashtags -> /explore?tag=xyz (hashtag browse), mentions -> /profile
// lookup isn't possible client-side without an id, so mentions link to
// a search page pre-filled with the username instead.
const TOKEN_RE = /(#[a-zA-Z0-9_]{1,50}|@[a-zA-Z0-9_]{3,20})/g;

const TextWithLinks = ({ text, className = "" }) => {
  if (!text) return null;

  const parts = text.split(TOKEN_RE);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              to={`/hashtag/${tag}`}
              className="text-primary-600 font-medium hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          const uname = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              to={`/u/${uname}`}
              className="text-primary-600 font-medium hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default TextWithLinks;
