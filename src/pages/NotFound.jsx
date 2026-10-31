import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import SeoHead from "../components/SeoHead";
import { AuthCenter } from "../components/AuthLayout";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <AuthCenter>
      <SeoHead title="Page Not Found" robots="noindex, nofollow" />
      <div className="text-center">
        <p className="font-display text-8xl font-extrabold leading-none tracking-[-0.05em] text-primary-600">
          404
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-ink">
          Page not found
        </h1>
        <p className="mt-2 text-base text-ink-sub">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to={user ? "/home" : "/"}
          className="btn btn-primary btn-lg mt-6"
        >
          {user ? "Back to feed" : "Back to Tronites"}
        </Link>
      </div>
    </AuthCenter>
  );
};

export default NotFound;
