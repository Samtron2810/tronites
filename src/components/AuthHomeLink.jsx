import { Link } from "react-router-dom";

const AuthHomeLink = () => (
  <Link
    to="/"
    className="mb-6 inline-flex items-center text-sm font-medium text-ink-muted transition hover:text-primary-600 lg:hidden"
  >
    <span aria-hidden="true">←</span>
    <span className="ml-1.5">Back to homepage</span>
  </Link>
);

export default AuthHomeLink;
