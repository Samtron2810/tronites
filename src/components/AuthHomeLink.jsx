import { Link } from "react-router-dom";

const AuthHomeLink = () => (
  <Link
    to="/"
    className="inline-flex items-center gap-2 mb-6 lg:hidden"
    aria-label="Back to Tronites homepage"
  >
    <img
      src="/tronite-logo.png"
      alt=""
      className="h-10 w-auto object-contain"
    />
    <span className="text-xl font-bold text-ink">
      Tron<span className="text-primary-600">ites</span>
    </span>
  </Link>
);

export default AuthHomeLink;
