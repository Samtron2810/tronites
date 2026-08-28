import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  FiSmartphone,
  FiTablet,
  FiMonitor,
  FiMapPin,
  FiClock,
  FiLogOut,
  FiShield,
} from "react-icons/fi";

const DEVICE_ICONS = {
  mobile: FiSmartphone,
  tablet: FiTablet,
  desktop: FiMonitor,
};

// Relative "last active" — mirrors the granularity used elsewhere in the
// app (e.g. notification timestamps) rather than a raw ISO string, which
// means more to a user scanning a device list at a glance.
const formatLastActive = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Active now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
    <div className="w-10 h-10 rounded-xl bg-surface shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-32 bg-surface rounded" />
      <div className="h-3 w-24 bg-surface rounded" />
    </div>
  </div>
);

const SecuritySessions = () => {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState(null); // session obj or "all"

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get("/users/me/sessions");
      setSessions(res.data);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevokeOne = async (session) => {
    setRevokingId(session.id);
    try {
      await api.delete(`/users/me/sessions/${session.id}`);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success(`Signed out of ${session.device}.`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't revoke that session. Try again.");
    } finally {
      setRevokingId(null);
      setPendingRevoke(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      const res = await api.delete("/users/me/sessions");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(
        res.data.count > 0
          ? `Signed out of ${res.data.count} other device${res.data.count === 1 ? "" : "s"}.`
          : "No other devices to sign out.",
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't sign out other devices. Try again.");
    } finally {
      setRevokingAll(false);
      setPendingRevoke(null);
    }
  };

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];
  const currentSession = sessions?.find((s) => s.isCurrent);

  return (
    <MainLayout>
      <div className="flex items-center gap-2.5 mb-1">
        <FiShield size={20} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-ink">Sessions & devices</h1>
      </div>
      <p className="text-base text-ink-muted mb-6">
        Everywhere you're currently signed in to Tronites.
      </p>

      {error && (
        <div className="bg-card border border-stroke rounded-2xl p-6 text-center">
          <p className="text-base text-ink-muted mb-3">
            Couldn't load your sessions.
          </p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl border border-stroke text-sm font-medium text-ink hover:bg-surface transition"
          >
            Try again
          </button>
        </div>
      )}

      {!error && sessions === null && (
        <div className="bg-card border border-stroke rounded-2xl overflow-hidden divide-y divide-stroke">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {!error && sessions !== null && (
        <>
          {currentSession && (
            <section className="bg-card border border-stroke rounded-2xl overflow-hidden mb-4">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide px-5 pt-4 pb-2">
                This device
              </h2>
              <SessionRow session={currentSession} />
            </section>
          )}

          <section className="bg-card border border-stroke rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
                Other devices
              </h2>
              {otherSessions.length > 0 && (
                <button
                  onClick={() => setPendingRevoke("all")}
                  className="text-sm font-medium text-red-600 hover:text-red-700 transition"
                >
                  Sign out all
                </button>
              )}
            </div>

            {otherSessions.length === 0 ? (
              <p className="text-base text-ink-muted px-5 pb-5">
                No other devices are signed in.
              </p>
            ) : (
              <div className="divide-y divide-stroke">
                {otherSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onRevoke={() => setPendingRevoke(session)}
                    revoking={revokingId === session.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {pendingRevoke === "all" && (
        <ConfirmDeleteModal
          title="Sign out other devices"
          message={`This will immediately sign out ${otherSessions.length} other device${otherSessions.length === 1 ? "" : "s"}. They'll need to log in again.`}
          confirmLabel={revokingAll ? "Signing out..." : "Sign out all"}
          onConfirm={handleRevokeAllOthers}
          onCancel={() => setPendingRevoke(null)}
        />
      )}

      {pendingRevoke && pendingRevoke !== "all" && (
        <ConfirmDeleteModal
          title="Sign out device"
          message={`This will immediately sign out "${pendingRevoke.device}". It'll need to log in again.`}
          confirmLabel="Sign out"
          onConfirm={() => handleRevokeOne(pendingRevoke)}
          onCancel={() => setPendingRevoke(null)}
        />
      )}
    </MainLayout>
  );
};

const SessionRow = ({ session, onRevoke, revoking }) => {
  const Icon = DEVICE_ICONS[session.deviceType] || FiMonitor;

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-ink truncate">
          {session.device}
          {session.isCurrent && (
            <span className="ml-2 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full align-middle">
              This device
            </span>
          )}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-ink-muted">
          <span className="flex items-center gap-1">
            <FiClock size={12} />
            {formatLastActive(session.lastUsedAt)}
          </span>
          {session.ip && (
            <span className="flex items-center gap-1">
              <FiMapPin size={12} />
              {session.ip}
            </span>
          )}
        </div>
      </div>
      {!session.isCurrent && (
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stroke text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 transition"
        >
          <FiLogOut size={13} />
          {revoking ? "Signing out..." : "Sign out"}
        </button>
      )}
    </div>
  );
};

export default SecuritySessions;
