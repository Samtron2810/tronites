import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaWallet,
  FaArrowDown,
  FaHeart,
  FaStar,
  FaUniversity,
  FaSpinner,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaChevronLeft,
  FaUsers,
} from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const fmt = (kobo) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const StatusPill = ({ status }) => {
  const map = {
    verified: { cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", label: "Received" },
    initiated: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", label: "Pending" },
    failed: { cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", label: "Failed" },
    paid: { cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", label: "Paid" },
    pending: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", label: "Pending" },
    processing: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", label: "Processing" },
  };
  const { cls, label } = map[status] || { cls: "bg-surface text-ink-muted", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ─── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, accent = "primary" }) => {
  const accents = {
    primary: "bg-primary-50 text-primary-600 dark:bg-primary-950/40",
    green: "bg-green-50 text-green-600 dark:bg-green-950/40",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
    slate: "bg-surface text-ink-muted",
  };
  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accents[accent]}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-lg font-bold text-ink leading-tight">{value}</p>
      </div>
    </div>
  );
};

// ─── Bank account form ───────────────────────────────────────────────────────
const BankForm = ({ existing, onSaved }) => {
  const [bankName, setBankName] = useState(existing?.bankName || "");
  const [accountName, setAccountName] = useState(existing?.accountName || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState(existing?.bankCode || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!bankName || !accountName || !accountNumber || !bankCode) {
      toast.error("All fields are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/creator-monetization/bank-account", {
        bankName,
        accountName,
        accountNumber,
        bankCode,
      });
      toast.success("Bank account saved.");
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save bank account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-stroke rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-ink text-sm">Bank account for payouts</h3>
      {existing?.accountNumberLast4 && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
          <FaCheckCircle size={11} />
          Saved: {existing.bankName} ···{existing.accountNumberLast4} · {existing.accountName}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        {[
          { label: "Bank name", val: bankName, set: setBankName, ph: "e.g. Zenith Bank" },
          { label: "Account name", val: accountName, set: setAccountName, ph: "Exactly as on your bank account" },
          { label: "Account number (10 digits)", val: accountNumber, set: setAccountNumber, ph: "0123456789", type: "tel", maxLength: 10 },
          { label: "Bank code", val: bankCode, set: setBankCode, ph: "e.g. 057", maxLength: 6 },
        ].map(({ label, val, set, ph, type = "text", maxLength }) => (
          <div key={label}>
            <label className="block text-xs text-ink-muted mb-1">{label}</label>
            <input
              type={type}
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder={ph}
              maxLength={maxLength}
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <FaSpinner size={13} className="animate-spin" /> : null}
        {saving ? "Saving…" : "Save bank account"}
      </button>
    </div>
  );
};

// ─── Payout request ──────────────────────────────────────────────────────────
const PayoutRequest = ({ availableKobo, minPayoutNgn, hasBankAccount, onRequested }) => {
  const [amountNgn, setAmountNgn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    const n = Number(amountNgn);
    if (!n || n < minPayoutNgn) {
      toast.error(`Minimum payout is ₦${minPayoutNgn}.`);
      return;
    }
    if (n * 100 > availableKobo) {
      toast.error("Amount exceeds available balance.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/creator-monetization/payout/request", { amountNgn: n });
      toast.success("Payout request submitted.");
      setAmountNgn("");
      onRequested?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-stroke rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-ink text-sm flex items-center gap-2">
        <FaArrowDown size={13} className="text-primary-500" />
        Withdraw earnings
      </h3>
      {!hasBankAccount && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl">
          Add your bank account above before requesting a payout.
        </p>
      )}
      <div>
        <label className="block text-xs text-ink-muted mb-1">Amount (₦)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm">₦</span>
          <input
            type="number"
            min={minPayoutNgn}
            value={amountNgn}
            onChange={(e) => setAmountNgn(e.target.value)}
            placeholder={`Min ₦${minPayoutNgn}`}
            className="w-full pl-8 pr-4 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
          />
        </div>
        <p className="text-xs text-ink-muted mt-1">
          Available: {fmt(availableKobo)}
        </p>
      </div>
      <button
        onClick={handleRequest}
        disabled={loading || !hasBankAccount || availableKobo === 0}
        className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? <FaSpinner size={13} className="animate-spin" /> : null}
        {loading ? "Submitting…" : "Request payout"}
      </button>
    </div>
  );
};

// ─── Paginated list loader (tips / subscribers) ──────────────────────────────
const usePaginatedList = (endpoint, dataKey) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const limit = 15;

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { params: { page: p, limit } });
      setItems(res.data[dataKey] || []);
      setTotal(res.data.total || 0);
      setPage(p);
      setLoaded(true);
    } catch {
      toast.error("Could not load list.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  return { items, page, total, limit, loading, loaded, fetchPage };
};
// ─── Pagination footer ────────────────────────────────────────────────────────
const PageFooter = ({ page, limit, total, onPage, loading }) => {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1 || loading}
        className="px-3 py-1.5 rounded-lg border border-stroke text-xs font-semibold text-ink disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-xs text-ink-muted">{page} / {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages || loading}
        className="px-3 py-1.5 rounded-lg border border-stroke text-xs font-semibold text-ink disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
};

const CreatorEarnings = () => {
  const [data, setData] = useState(null);
  const [bankAccount, setBankAccount] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | tips | subscribers | payouts | bank

  const tipsList = usePaginatedList("/tips/received", "tips");
  const subsList = usePaginatedList("/creator-monetization/subscribers", "subscribers");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [earningsRes, bankRes, payoutsRes] = await Promise.all([
        api.get("/creator-monetization/earnings"),
        api.get("/creator-monetization/bank-account"),
        api.get("/creator-monetization/payout/history"),
      ]);
      setData(earningsRes.data);
      setBankAccount(bankRes.data.bankAccount);
      setPayoutHistory(payoutsRes.data.payouts || []);
    } catch {
      toast.error("Could not load earnings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "tips" && !tipsList.loaded) tipsList.fetchPage(1);
    if (tab === "subscribers" && !subsList.loaded) subsList.fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner size={22} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const e = data?.earnings || {};
  const subCount = data?.activeSubscriberCount || 0;
  const minPayoutNgn = data?.minPayoutNgn || 500;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "tips", label: "Tips" },
    { id: "subscribers", label: "Subscribers" },
    { id: "payouts", label: "Payouts" },
    { id: "bank", label: "Bank" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/creator-dashboard" className="text-ink-muted hover:text-ink transition">
          <FaChevronLeft size={14} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink">Earnings</h1>
          <p className="text-xs text-ink-muted">Tips · subscriptions · payouts</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-stroke rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === t.id
                ? "bg-card text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total earned" value={fmt(e.totalEarnedKobo || 0)} icon={FaHeart} accent="primary" />
            <StatCard label="Available" value={fmt(e.availableKobo || 0)} icon={FaWallet} accent="green" />
            <StatCard label="Active subscribers" value={subCount.toLocaleString()} icon={FaStar} accent="amber" />
            <StatCard label="Paid out" value={fmt(e.paidPayoutKobo || 0)} icon={FaCheckCircle} accent="slate" />
          </div>
          <div className="bg-card border border-stroke rounded-2xl p-4 text-xs text-ink-muted space-y-1">
            <p>Platform fee: <span className="text-ink font-medium">{e.platformFeePct || 10}%</span> deducted from gross earnings</p>
            <p>Net after fee: <span className="text-ink font-medium">{fmt(e.netEarnedKobo || 0)}</span></p>
            {(e.pendingPayoutKobo || 0) > 0 && (
              <p>Pending payout: <span className="text-amber-600 font-medium">{fmt(e.pendingPayoutKobo)}</span></p>
            )}
          </div>

          <Link
            to="/creator-dashboard"
            className="block text-center text-sm font-semibold text-primary-600 hover:underline"
          >
            View full analytics →
          </Link>
        </div>
      )}

      {/* Tips */}
      {tab === "tips" && (
        <div className="space-y-3">
          {tipsList.loading && tipsList.items.length === 0 ? (
            <div className="flex justify-center py-12">
              <FaSpinner size={18} className="animate-spin text-primary-500" />
            </div>
          ) : tipsList.items.length === 0 ? (
            <div className="text-center py-12 text-ink-muted text-sm">
              No tips received yet.
            </div>
          ) : (
            <>
              {tipsList.items.map((tip) => (
                <div
                  key={tip._id}
                  className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  {tip.sender ? (
                    <img
                      src={tip.sender.profilePic || ""}
                      alt={tip.sender.name}
                      className="w-9 h-9 rounded-full object-cover bg-surface shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0">
                      <FaHeart size={13} className="text-ink-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-none">
                      {tip.sender ? tip.sender.name : "Anonymous"}
                    </p>
                    {tip.message && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate">"{tip.message}"</p>
                    )}
                    <p className="text-xs text-ink-muted mt-0.5">
                      {new Date(tip.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-600">{fmt(tip.amountKobo)}</p>
                    <StatusPill status={tip.status} />
                  </div>
                </div>
              ))}
              <PageFooter {...tipsList} onPage={tipsList.fetchPage} />
            </>
          )}
        </div>
      )}

      {/* Subscribers */}
      {tab === "subscribers" && (
        <div className="space-y-3">
          {subsList.loading && subsList.items.length === 0 ? (
            <div className="flex justify-center py-12">
              <FaSpinner size={18} className="animate-spin text-primary-500" />
            </div>
          ) : subsList.items.length === 0 ? (
            <div className="text-center py-12 text-ink-muted text-sm">
              No active subscribers yet.
            </div>
          ) : (
            <>
              {subsList.items.map((sub) => (
                <div
                  key={sub._id}
                  className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <img
                    src={sub.subscriber?.profilePic || ""}
                    alt={sub.subscriber?.name}
                    className="w-9 h-9 rounded-full object-cover bg-surface shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-none">
                      {sub.subscriber?.name}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      @{sub.subscriber?.username}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-ink-muted flex items-center gap-1 justify-end">
                      <FaUsers size={10} />Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              <PageFooter {...subsList} onPage={subsList.fetchPage} />
            </>
          )}
        </div>
      )}

      {/* Payouts */}
      {tab === "payouts" && (
        <div className="space-y-4">
          <PayoutRequest
            availableKobo={e.availableKobo || 0}
            minPayoutNgn={minPayoutNgn}
            hasBankAccount={!!bankAccount}
            onRequested={load}
          />
          {payoutHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-widest px-1">History</h3>
              {payoutHistory.map((p) => (
                <div
                  key={p._id}
                  className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    p.status === "paid" ? "bg-green-100 text-green-600" :
                    p.status === "failed" ? "bg-red-100 text-red-500" :
                    "bg-amber-100 text-amber-600"
                  }`}>
                    {p.status === "paid" ? <FaCheckCircle size={13} /> :
                     p.status === "failed" ? <FaTimesCircle size={13} /> :
                     <FaClock size={13} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">{fmt(p.amountKobo)}</p>
                    <p className="text-xs text-ink-muted">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank account */}
      {tab === "bank" && (
        <BankForm existing={bankAccount} onSaved={load} />
      )}
    </div>
  );
};

export default CreatorEarnings;
