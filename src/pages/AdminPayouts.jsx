import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import {
  FiArrowLeft, FiClock, FiCheckCircle, FiAlertCircle, FiLoader,
  FiRefreshCw, FiXCircle, FiSend,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed / rejected" },
  { value: "", label: "All" },
];

const STATUS_MAP = {
  pending:    { label: "Pending",    icon: FiAlertCircle, cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  processing: { label: "Processing", icon: FiClock,       cls: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:       { label: "Paid",       icon: FiCheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed:     { label: "Failed",     icon: FiXCircle,     cls: "bg-red-50 text-red-600 border-red-200" },
};

const naira = (kobo) => `₦${((kobo || 0) / 100).toLocaleString()}`;

const StatusBadge = ({ status }) => {
  const { label, icon: Icon, cls } = STATUS_MAP[status] || STATUS_MAP.failed;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-mono text-[11px] font-medium uppercase tracking-wider ${cls}`}>
      <Icon size={11} />{label}
    </span>
  );
};

const PayoutRow = ({ payout, onChanged }) => {
  // null | "approve" | "reject"
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { creator, bank } = payout;
  const ready = bank?.transferReady;

  const run = async (action, body) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/payouts/${payout._id}/${action}`, body);
      if (data.warning) toast(data.warning, { icon: "⚠️", duration: 8000 });
      else if (action === "approve") toast.success("Transfer started.");
      else if (action === "reject") toast.success("Payout rejected.");
      else toast.success(`Status: ${data.payout?.status || "updated"}.`);
      setMode(null);
      setReason("");
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || "Something went wrong.");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <img
          src={resizedImageUrl(creator?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
          alt={creator?.name || "Creator"}
          className="w-10 h-10 rounded-lg object-cover border-2 border-line shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {creator?.name || "Deleted user"}
            {creator?.username && (
              <span className="text-ink-muted font-normal"> @{creator.username}</span>
            )}
          </p>
          <p className="text-xs text-ink-muted">
            Requested {new Date(payout.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-ink">{naira(payout.amountKobo)}</p>
          <StatusBadge status={payout.status} />
        </div>
      </div>

      <div className="rounded-xl bg-surface border border-stroke px-3 py-2 text-xs text-ink-sub">
        {bank ? (
          <>
            <span className="font-semibold text-ink">{bank.accountName}</span>
            {" · "}{bank.bankName}{" · "}•••• {bank.accountNumberLast4}
            <span className="block mt-1 text-ink-muted">
              {bank.lockedAtRequest
                ? "Destination locked when requested — later bank changes don't affect it."
                : "Older request: sends to the creator's current saved account."}
            </span>
            {!ready && (
              <span className="block mt-1 text-amber-600">
                Not registered for transfers — the creator must re-save their bank details.
              </span>
            )}
          </>
        ) : (
          <span className="text-amber-600">No bank account on file.</span>
        )}
      </div>

      {payout.failureReason && payout.status !== "paid" && (
        <p className="text-xs text-red-600">{payout.failureReason}</p>
      )}
      {payout.reviewedBy && (
        <p className="text-xs text-ink-muted">
          Reviewed by {payout.reviewedBy.name}
          {payout.reviewedAt && ` · ${new Date(payout.reviewedAt).toLocaleString()}`}
          {payout.paystackStatus && ` · Paystack: ${payout.paystackStatus}`}
        </p>
      )}

      {payout.status === "pending" && mode === null && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("approve")}
            disabled={!ready}
            className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <FiSend size={14} /> Approve
          </button>
          <button
            onClick={() => setMode("reject")}
            className="px-4 py-2 rounded-xl border border-stroke text-ink-sub text-sm font-semibold hover:bg-surface transition"
          >
            Reject
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 space-y-2">
          <p className="text-sm text-ink">
            Send <span className="font-semibold">{naira(payout.amountKobo)}</span> to{" "}
            {bank?.accountName} ({bank?.bankName} •••• {bank?.accountNumberLast4}) from your Paystack balance?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => run("approve")}
              disabled={busy}
              className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <FiLoader size={13} className="animate-spin" />}
              {busy ? "Sending…" : "Confirm & send"}
            </button>
            <button
              onClick={() => setMode(null)}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-stroke text-ink-sub text-sm hover:bg-surface transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="rounded-xl border border-stroke p-3 space-y-2">
          <input
            type="text"
            maxLength={250}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the creator)"
            className="field"
          />
          <div className="flex gap-2">
            <button
              onClick={() => run("reject", { reason })}
              disabled={busy || reason.trim().length < 3}
              className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40"
            >
              {busy ? "Rejecting…" : "Reject payout"}
            </button>
            <button
              onClick={() => { setMode(null); setReason(""); }}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-stroke text-ink-sub text-sm hover:bg-surface transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {payout.status === "processing" && (
        <button
          onClick={() => run("sync")}
          disabled={busy}
          className="w-full py-2 rounded-xl border border-stroke text-ink-sub text-sm font-semibold hover:bg-surface transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <FiRefreshCw size={13} className={busy ? "animate-spin" : ""} />
          Check status with Paystack
        </button>
      )}
    </div>
  );
};

const AdminPayouts = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState("pending");
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async (s, p = 1) => {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      const { data } = await api.get("/admin/payouts", {
        params: { status: s || undefined, page: p, limit: 20 },
      });
      setPayouts((prev) => (p === 1 ? data.payouts : [...prev, ...data.payouts]));
      setSummary(data.summary || {});
      setHasMore(data.hasMore);
      setPage(p);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load payouts.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void Promise.resolve().then(() => load(status, 1));
  }, [isAdmin, status, load]);

  if (user && !isAdmin) return <Navigate to="/home" replace />;

  const pending = summary.pending;

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : null)}
            className="p-2 rounded-xl text-ink-muted hover:bg-surface hover:text-ink transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="display-md">Creator payouts</h1>
            <p className="text-sm text-ink-muted">
              {pending?.count
                ? `${pending.count} awaiting review · ${naira(pending.amountKobo)}`
                : "Review and send creator withdrawals"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition ${
                status === tab.value
                  ? "bg-primary-50 border-primary-300 text-primary-600"
                  : "border-stroke text-ink-sub hover:border-primary-300"
              }`}
            >
              {tab.label}
              {tab.value && summary[tab.value]?.count ? ` (${summary[tab.value].count})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-muted">
            <FiLoader size={24} className="animate-spin text-primary-500" />
            <p className="text-sm">Loading payouts…</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="card p-12 text-center space-y-2">
            <p className="font-semibold text-ink">No payouts here</p>
            <p className="text-sm text-ink-muted">Nothing matches this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <PayoutRow key={p._id} payout={p} onChanged={() => load(status, 1)} />
            ))}
            {hasMore && (
              <button
                onClick={() => load(status, page + 1)}
                disabled={loadingMore}
                className="w-full py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-800 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminPayouts;
