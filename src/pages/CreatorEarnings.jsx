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
    <div className="card p-4 flex items-center gap-4">
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
// Bank comes from Paystack's list and the account holder name is resolved by
// the bank — neither is typed by hand, so a typo can't reach a payout.
const BankForm = ({ existing, onSaved }) => {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankCode, setBankCode] = useState(existing?.bankCode || "");
  const [accountNumber, setAccountNumber] = useState("");
  // Result of the last account lookup, tagged with the bank+number it was for
  // so a stale result is ignored as soon as either input changes.
  const [lookup, setLookup] = useState({ key: null, name: "", error: "" });
  const [saving, setSaving] = useState(false);
  // With a saved account the form stays closed until "Change" is clicked.
  const hasSaved = !!existing?.accountNumberLast4;
  const [open, setOpen] = useState(!hasSaved);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .get("/creator-monetization/banks")
      .then((r) => !cancelled && setBanks(r.data?.banks || []))
      .catch(() => !cancelled && toast.error("Couldn't load the bank list."))
      .finally(() => !cancelled && setBanksLoading(false));
    return () => { cancelled = true; };
  }, [open]);

  // Look the account up as soon as a bank and 10 digits are present.
  const lookupKey =
    bankCode && /^\d{10}$/.test(accountNumber) ? `${bankCode}:${accountNumber}` : null;

  useEffect(() => {
    if (!lookupKey) return;
    const [code, number] = lookupKey.split(":");
    let cancelled = false;
    api
      .post("/creator-monetization/bank-account/resolve", {
        accountNumber: number,
        bankCode: code,
      })
      .then((r) => {
        if (!cancelled)
          setLookup({ key: lookupKey, name: r.data?.accountName || "", error: "" });
      })
      .catch((e) => {
        if (!cancelled)
          setLookup({
            key: lookupKey,
            name: "",
            error: e.response?.data?.message || "Could not verify this account.",
          });
      });
    return () => { cancelled = true; };
  }, [lookupKey]);

  const settled = lookup.key === lookupKey;
  const resolving = Boolean(lookupKey) && !settled;
  const resolvedName = settled ? lookup.name : "";
  const resolveError = settled ? lookup.error : "";

  const handleSave = async () => {
    if (!resolvedName) return;
    setSaving(true);
    try {
      await api.post("/creator-monetization/bank-account", { accountNumber, bankCode });
      toast.success("Bank account saved.");
      setAccountNumber("");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save bank account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-ink text-sm">Bank account for payouts</h3>
      {hasSaved && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
          <FaCheckCircle size={11} className="shrink-0" />
          <span className="flex-1 min-w-0">
            {existing.bankName} ···{existing.accountNumberLast4} · {existing.accountName}
          </span>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="font-semibold underline underline-offset-2 shrink-0"
            >
              Change
            </button>
          )}
        </div>
      )}
      {open && (<>
      {hasSaved && (
        <p className="text-xs text-ink-muted">
          Saving a new account replaces this one for future payout requests.
          Requests you've already submitted still go to the account they were made with.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs text-ink-muted mb-1">Bank</label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            disabled={banksLoading}
            className="field w-full py-2.5"
          >
            <option value="">{banksLoading ? "Loading banks…" : "Select your bank"}</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">Account number (10 digits)</label>
          <input
            type="tel"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
            maxLength={10}
            className="field w-full py-2.5"
          />
        </div>

        {resolving && (
          <p className="text-xs text-ink-muted flex items-center gap-2">
            <FaSpinner size={11} className="animate-spin" /> Verifying account…
          </p>
        )}
        {resolvedName && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-xs text-green-700 dark:text-green-400">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Account name</p>
            <p className="font-semibold text-sm">{resolvedName}</p>
            <p className="mt-0.5">Make sure this is your account before saving.</p>
          </div>
        )}
        {resolveError && <p className="text-xs text-red-600">{resolveError}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || resolving || !resolvedName}
          className="btn btn-primary flex-1"
        >
          {saving ? <FaSpinner size={13} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save bank account"}
        </button>
        {hasSaved && (
          <button
            onClick={() => { setOpen(false); setAccountNumber(""); setBankCode(existing?.bankCode || ""); }}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-stroke text-ink-muted text-sm hover:bg-surface transition"
          >
            Cancel
          </button>
        )}
      </div>
      </>)}
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
    <div className="card p-5 space-y-4">
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
            className="field w-full pl-8 pr-4 py-2.5"
          />
        </div>
        <p className="text-xs text-ink-muted mt-1">
          Available: {fmt(availableKobo)}
        </p>
      </div>
      <button
        onClick={handleRequest}
        disabled={loading || !hasBankAccount || availableKobo === 0}
        className="btn btn-primary btn-block"
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

  const tipsList = usePaginatedList("/creator-monetization/tips/received", "tips");
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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens inside the async load fn, not in this effect body.
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
          <div className="card p-4 text-xs text-ink-muted space-y-1">
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
                  className="card px-4 py-3 flex items-center gap-3"
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
                  className="card px-4 py-3 flex items-center gap-3"
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
                  className="card px-4 py-3 flex items-center gap-3"
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
