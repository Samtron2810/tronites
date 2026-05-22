import { Link } from "react-router-dom";
import { FaHome, FaCompass, FaUser, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, logout } = useAuth();

  // Prevent crash while auth is loading
  if (!user) return null;

  return (
    <nav className="bg-orange-300/80 backdrop-blur-md border-b border-orange-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      {/* Logo */}
      <Link to="/" className="text-3xl font-extrabold text-gray-900">
        Tron<span className="text-blue-500">ites</span>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-6">
        <Link to="/" className="text-gray-800 hover:text-blue-500 font-medium">
          Feed
        </Link>
        <Link
          to="/explore"
          className="text-gray-800 hover:text-blue-500 font-medium"
        >
          Explore
        </Link>
        <Link
          to={`/profile/${user._id}`}
          className="text-gray-800 hover:text-blue-500 font-medium"
        >
          Profile
        </Link>

        <NotificationBell />

        <button
          onClick={logout}
          className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
        >
          Logout <FaUser />
        </button>
      </div>

      {/* Mobile Icons */}
      <div className="flex md:hidden items-center gap-5 text-xl">
        <Link to="/" className="text-gray-800 hover:text-blue-500">
          <FaHome />
        </Link>

        <Link to="/explore" className="text-gray-800 hover:text-blue-500">
          <FaCompass />
        </Link>

        <Link
          to={`/profile/${user._id}`}
          className="text-gray-800 hover:text-blue-500"
        >
          <FaUser />
        </Link>

        <NotificationBell />

        <button
          onClick={logout}
          className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
        >
          <FaArrowLeft />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
