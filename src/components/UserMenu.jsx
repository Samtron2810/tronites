import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUser,
  FaCog,
  FaChartBar,
  FaBullhorn,
  FaQuestionCircle,
  FaFileContract,
  FaSignOutAlt,
  FaShieldAlt,
  FaUserShield,
  FaRegBookmark,
  FaMoon,
  FaSun,
  FaClipboardList,
} from "react-icons/fa";
import defaultAvatar from "../assets/defaultAvatar";
import { useTheme } from "../context/useTheme";

const UserMenu = ({ user, onLogoutClick }) => {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const menuItems = [
    {
      icon: FaUser,
      label: "Profile",
      href: `/profile/${user._id}`,
      disabled: false,
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    {
      icon: FaCog,
      label: "Settings",
      href: "/settings",
      disabled: false,
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    {
      icon: theme === "dark" ? FaSun : FaMoon,
      label: theme === "dark" ? "Light mode" : "Dark mode",
      disabled: false,
      isLink: false,
      onClick: () => {
        setIsOpen(false);
        toggleTheme();
      },
    },
    {
      icon: FaRegBookmark,
      label: "Saved posts",
      href: "/bookmarks",
      disabled: false,
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    // Only shown to moderators/admins — role isn't in toPublicUserDTO,
    // so this can never appear for a viewer looking at someone else's
    // menu; `user` here is always the logged-in account's own data.
    ...(["moderator", "admin"].includes(user.role)
      ? [
          {
            icon: FaShieldAlt,
            label: "Moderation queue",
            href: "/moderation",
            disabled: false,
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    // Role management is admin-only (stricter than the moderator gate
    // above) — a moderator promoting peers to admin would be a
    // privilege-escalation path.
    ...(user.role === "admin"
      ? [
          {
            icon: FaUserShield,
            label: "Manage roles",
            href: "/admin/users",
            disabled: false,
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    // Audit log (Phase 3/5): admins always; moderators only when granted
    // view_audit_log via the permission editor.
    ...(user.role === "admin" || user.permissions?.includes("view_audit_log")
      ? [
          {
            icon: FaClipboardList,
            label: "Audit log",
            href: "/admin/audit-log",
            disabled: false,
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    {
      icon: FaChartBar,
      label: "Dashboard",
      disabled: true,
      isLink: false,
    },
    {
      icon: FaBullhorn,
      label: "Ads",
      disabled: true,
      isLink: false,
    },
    {
      icon: FaQuestionCircle,
      label: "Help and Support",
      disabled: true,
      isLink: false,
    },
    {
      icon: FaFileContract,
      label: "Privacy & Terms of Use",
      disabled: true,
      isLink: false,
    },
    {
      icon: FaSignOutAlt,
      label: "Logout",
      disabled: false,
      isLink: false,
      onClick: () => {
        setIsOpen(false);
        onLogoutClick();
      },
      isLogout: true,
    },
  ];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 flex items-center justify-center w-9 h-9 rounded-full border-2 border-primary-600 text-ink-sub hover:text-ink hover:bg-primary-50 transition-all duration-200"
        title="User menu"
      >
        <img
          src={user.profilePic || defaultAvatar}
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLastItem = index === menuItems.length - 1;

            // Add separator before logout
            const addSeparator = isLastItem && index > 0;

            return (
              <div key={index}>
                {addSeparator && <div className="h-px bg-stroke my-1" />}

                {item.isLink ? (
                  <Link
                    to={item.href}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary-50 transition"
                  >
                    <Icon className="text-base text-primary-600" />
                    <span className="text-ink font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                      item.isLogout
                        ? "text-red-600 hover:bg-red-50"
                        : item.disabled
                          ? "text-ink-muted cursor-not-allowed"
                          : "hover:bg-primary-50"
                    }`}
                  >
                    <Icon
                      className={`text-base ${
                        item.isLogout
                          ? "text-red-600"
                          : item.disabled
                            ? "text-ink-muted"
                            : "text-primary-600"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMenu;
