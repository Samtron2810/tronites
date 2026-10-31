import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaShieldAlt,
  FaUserShield,
  FaMoon,
  FaSun,
  FaClipboardList,
  FaEllipsisH,
  FaWallet,
} from "react-icons/fa";
import { FiChevronUp } from "react-icons/fi";
import { FiZap } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { useTheme } from "../context/useTheme";
import { hasPermission } from "../constants/permissions";
import { isCreator } from "../utils/creator";
import FloatingMenu from "./FloatingMenu";

// variant: "avatar" (round avatar button — mobile top bar)
//          "chip"   (full-width name + handle row — desktop sidebar footer)
const UserMenu = ({ user, onLogoutClick, variant = "avatar" }) => {
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

  // Core items every user sees. Anything that used to be a permanently
  // disabled stub (Dashboard, Ads, Help, Privacy/Terms) now lives on the
  // /more page instead of padding this dropdown out indefinitely — see
  // pages/More.jsx. That page is where new lower-frequency features
  // should be added going forward, not here.
  const menuItems = [
    {
      icon: FaUser,
      label: "Profile",
      href: `/profile/${user._id}`,
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    // Earnings: creator-only, same gate as the /creator-earnings tile on
    // the More page. Gives mobile (no sidebar) a path to it.
    ...(isCreator(user)
      ? [
          {
            icon: FaWallet,
            label: "Earnings",
            href: "/creator-earnings",
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    {
      icon: theme === "dark" ? FaSun : FaMoon,
      label: theme === "dark" ? "Light mode" : "Dark mode",
      isLink: false,
      onClick: () => {
        setIsOpen(false);
        toggleTheme();
      },
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
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    // Promotions management — moderator (via manage_content, default-
    // granted) or admin, same gate as PostCard's canAdminPromoteThisPost.
    ...(hasPermission(user, "manage_content")
      ? [
          {
            icon: FiZap,
            label: "Promotions",
            href: "/admin/promotions",
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
            isLink: true,
            onClick: () => setIsOpen(false),
          },
        ]
      : []),
    // Settings and More sit at the bottom, right above Logout — the
    // lowest-frequency top-level actions in the list.
    {
      icon: FaCog,
      label: "Settings",
      href: "/settings",
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    {
      icon: FaEllipsisH,
      label: "More",
      href: "/more",
      isLink: true,
      onClick: () => setIsOpen(false),
    },
    {
      icon: FaSignOutAlt,
      label: "Logout",
      isLink: false,
      onClick: () => {
        setIsOpen(false);
        onLogoutClick();
      },
      isLogout: true,
    },
  ];

  const avatarSrc =
    resizedImageUrl(user.profilePic, IMAGE_SIZES.avatarTiny) || defaultAvatar;
  const isChip = variant === "chip";

  return (
    <div className={isChip ? "relative w-full" : "relative"}>
      {/* Trigger Button */}
      {isChip ? (
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[#f4eee1] transition hover:bg-white/5"
          title="User menu"
        >
          <img
            src={avatarSrc}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg border-2 border-[#f4eee1]/80 object-cover"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold leading-tight">
              {user.name}
            </span>
            <span className="block truncate font-mono text-[11px] text-[#f4eee1]/60">
              @{user.username}
            </span>
          </span>
          <FiChevronUp
            size={16}
            className={`shrink-0 text-[#f4eee1]/60 transition-transform ${
              isOpen ? "" : "rotate-180"
            }`}
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line transition hover:bg-sand"
          title="User menu"
        >
          <img
            src={avatarSrc}
            alt={user.name}
            className="h-full w-full rounded-full object-cover"
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <FloatingMenu
          open
          anchorRef={triggerRef}
          menuRef={menuRef}
          align={isChip ? "left" : "right"}
          placement={isChip ? "top" : "auto"}
          offset={8}
          className="w-60 rounded-xl py-1.5"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLastItem = index === menuItems.length - 1;

            // Add separator before logout
            const addSeparator = isLastItem && index > 0;

            return (
              <div key={index}>
                {addSeparator && <div className="my-1 h-px bg-stroke" />}

                {item.isLink ? (
                  <Link
                    to={item.href}
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-base transition hover:bg-sand"
                  >
                    <Icon className="text-lg text-primary-600" />
                    <span className="font-medium text-ink">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-base transition ${
                      item.isLogout
                        ? "text-red-600 hover:bg-red-50"
                        : "hover:bg-sand"
                    }`}
                  >
                    <Icon
                      className={`text-lg ${
                        item.isLogout ? "text-red-600" : "text-primary-600"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            );
          })}
        </FloatingMenu>
      )}
    </div>
  );
};

export default UserMenu;
