import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import NotificationSkeleton from "../components/NotificationSkeleton";
import api from "../services/api";
import { useSocket } from "../context/useSocket";
import { FaHeart, FaRegComment, FaUserPlus, FaAt, FaReply, FaBell, FaShieldAlt, FaExclamationTriangle } from "react-icons/fa";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const typeConfig = {
  like:    { icon: FaHeart, color: "text-red-500", label: "liked your post" },
  comment: { icon: FaRegComment, color: "text-primary-600", label: "commented on your post" },
  follow:  { icon: FaUserPlus, color: "text-primary-600", label: "started following you" },
  mention: { icon: FaAt, color: "text-primary-600", label: "mentioned you" },
  reply:   { icon: FaReply, color: "text-primary-600", label: "replied to your comment" },
  commentLike: { icon: FaHeart, color: "text-red-500", label: "liked your comment" },
  // Phase 4 — rendered through a dedicated branch below: no sender link,
  // shield avatar, reason text from n.message. The warned user must not
  // see WHICH moderator issued the warning.
  moderator_warning: { icon: FaExclamationTriangle, color: "text-amber-500", label: "" },
};

// Builds the "Ada, Bob and 12 others liked your post" line from a
// grouped row's actors[]/othersCount — mirrors how Instagram/Twitter
// phrase collapsed activity. Falls back gracefully for the single-actor
// case so it reads identically to the old ungrouped copy.
const actorsLine = (row, label) => {
  const names = row.actors.map((a) => a?.name || "Someone");
  const totalOtherActors = row.othersCount;

  if (names.length === 0) return <span className="text-ink-sub">{label}</span>;

  if (names.length === 1 && totalOtherActors === 0) {
    return <span className="text-ink-sub">{label}</span>;
  }

  const displayNames =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  const suffix =
    totalOtherActors > 0
      ? ` and ${totalOtherActors} other${totalOtherActors === 1 ? "" : "s"}`
      : "";

  return (
    <>
      <span className="font-semibold">{displayNames}</span>
      {suffix && <span className="font-semibold">{suffix}</span>}{" "}
      <span className="text-ink-sub">{label}</span>
    </>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/notifications", { params: { page: 1, limit: 20 } });
        setNotifications(res.data.notifications);
        setPage(res.data.currentPage);
        setHasMore(res.data.hasMore);
        await api.put("/notifications/mark-read");
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get("/notifications", { params: { page: page + 1, limit: 20 } });
      setNotifications((prev) => [...prev, ...res.data.notifications]);
      setPage(res.data.currentPage);
      setHasMore(res.data.hasMore);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load more notifications. Try again.");
    } finally { setLoadingMore(false); }
  };

  useEffect(() => {
    if (!socket) return;
    // The socket delivers one raw Notification doc per event (server-side
    // emitToUser call sites aren't grouped — grouping only happens on the
    // GET /notifications read path). Wrap it into the same row shape the
    // grouped list renders, as a singleton group, so it displays
    // correctly when live-prepended rather than needing a second render
    // branch for "raw" vs "grouped" items.
    const handle = async (newNotif) => {
      const row = {
        _id: newNotif._id,
        type: newNotif.type,
        post: newNotif.post,
        comment: newNotif.comment,
        message: newNotif.message,
        read: true,
        createdAt: newNotif.createdAt,
        actors: newNotif.sender ? [newNotif.sender] : [],
        othersCount: 0,
        groupSize: 1,
        memberIds: [newNotif._id],
      };
      setNotifications((prev) =>
        prev.some((n) => n._id === row._id) ? prev : [row, ...prev]
      );
      try { await api.put("/notifications/mark-read"); } catch (e) { console.error(e); }
    };
    socket.on("newNotification", handle);
    return () => socket.off("newNotification", handle);
  }, [socket]);

  return (
    <MainLayout>
      <div className="bg-card border border-stroke rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke">
          <h1 className="text-lg font-semibold text-ink">Notifications</h1>
        </div>

        {loading && (
          <div className="divide-y divide-stroke">
            <NotificationSkeleton /><NotificationSkeleton /><NotificationSkeleton />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="py-16 text-center">
            <FaBell className="text-3xl mb-2 mx-auto text-ink-muted" />
            <p className="text-base text-ink-muted">No notifications yet.</p>
          </div>
        )}

        <div className="divide-y divide-stroke">
          {notifications.map((row) => {
            const cfg = typeConfig[row.type] || { icon: FaBell, color: "text-ink-muted", label: "" };
            const Icon = cfg.icon;
            const primaryActor = row.actors[0];
            const profileTarget = row.actors.length === 1 ? primaryActor?._id : null;
            return (
              <div
                key={row._id}
                className={`flex items-center gap-3 px-5 py-4 transition ${
                  row.read
                    ? ""
                    : row.type === "moderator_warning"
                      ? "bg-amber-50"
                      : "bg-primary-50"
                }`}
              >
                {row.type === "moderator_warning" ? (
                  // Phase 4 — no sender identity: a shield avatar instead
                  // of the issuing moderator's profile pic/link, so the
                  // warned user learns the reason but not who sent it.
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center ring-2 ring-amber-200 shrink-0">
                    <FaShieldAlt className="text-amber-600" size={16} />
                  </div>
                ) : row.actors.length > 1 ? (
                  // Grouped row — stacked avatars for the actors shown,
                  // no single profile link (there's no one destination
                  // that makes sense for "3 people liked this").
                  <div className="flex -space-x-3 shrink-0">
                    {row.actors.map((actor, i) => (
                      <img
                        key={actor?._id || i}
                        src={resizedImageUrl(actor?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
                        alt={actor?.name || "User"}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-card"
                        style={{ zIndex: row.actors.length - i }}
                      />
                    ))}
                  </div>
                ) : (
                  <Link to={`/profile/${profileTarget}`} className="shrink-0">
                    <img
                      src={resizedImageUrl(primaryActor?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
                      alt={primaryActor?.name || "User"}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
                    />
                  </Link>
                )}
                {row.type === "moderator_warning" ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-ink">
                      <span className="font-semibold">Moderation team</span>{" "}
                      <span className="text-ink-sub">
                        sent you a formal warning
                      </span>
                    </p>
                    {row.message && (
                      <p className="text-base text-ink-sub mt-1">
                        "{row.message}"
                      </p>
                    )}
                    <p className="text-sm text-ink-muted mt-0.5">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-ink">
                      {row.actors.length === 1 ? (
                        <>
                          <Link
                            to={`/profile/${profileTarget}`}
                            className="font-semibold hover:text-primary-600 transition"
                          >
                            {primaryActor?.name || "Someone"}
                          </Link>
                          {primaryActor?.username && (
                            <span className="text-ink-muted text-sm"> @{primaryActor.username}</span>
                          )}{" "}
                          <span className="text-ink-sub">{cfg.label}</span>
                        </>
                      ) : (
                        actorsLine(row, cfg.label)
                      )}
                    </p>
                    <p className="text-sm text-ink-muted mt-0.5">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
                <Icon className={`${cfg.color} shrink-0`} size={16} />
              </div>
            );
          })}
        </div>

        {!loading && hasMore && (
          <div className="text-center py-4 border-t border-stroke">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-base font-semibold text-primary-600 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
