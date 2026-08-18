import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stroke p-8 max-w-md w-full text-center">
        <p className="text-6xl font-black text-primary-400 mb-2">404</p>
        <h1 className="text-xl font-bold text-ink">Page not found</h1>
        <p className="text-ink-muted text-sm mt-2">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to={user ? "/" : "/login"}
          className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-800 text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {user ? "Back to feed" : "Back to login"}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
