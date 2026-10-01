import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSend,
  FiSearch,
  FiX,
  FiCheck,
  FiMail,
  FiAlertTriangle,
  FiEye,
  FiRotateCw,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { hasPermission } from "../constants/permissions";
import {
  AUDIENCE_SECTIONS,
  GROUP_LABELS,
  ACTIVE_CAMPAIGN_STATUSES,
} from "../constants/broadcast";
import useBackButtonClose from "../hooks/useBackButtonClose";

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_STYLE = {
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  sending: "bg-primary-50 text-primary-600 border-primary-200",
  paused: "bg-orange-50 text-orange-700 border-orange-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-surface text-ink-muted border-stroke",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium transition ${
      active
        ? "bg-primary-600 border-primary-600 text-white"
        : "bg-card border-stroke text-ink hover:border-primary-400"
    }`}
  >
    {active && <FiCheck size={13} />}
    {children}
  </button>
);

const Step = ({ n, title, sub, children }) => (
  <section className="bg-card border border-stroke rounded-2xl">
    <header className="flex items-center gap-3 px-5 py-4 border-b border-stroke rounded-t-2xl">
      <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 text-sm font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink leading-tight">{title}</h2>
        {sub && <p className="text-sm text-ink-muted">{sub}</p>}
      </div>
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-stroke bg-surface text-base text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition";

// ── Confirm modal ───────────────────────────────────────────────────────
const ConfirmSendModal = ({ count, labels, type, sending, onConfirm, onCancel }) => {
  const [typed, setTyped] = useState("");
  useBackButtonClose(true, onCancel);
  const needsTyping = count >= 20;
  const ready = !needsTyping || typed.trim() === String(count);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-70 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <FiSend className="text-primary-600" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">Send this broadcast?</h2>
        </div>

        <p className="text-base text-ink mb-1">
          <span className="font-semibold">{count.toLocaleString()}</span> recipient
          {count === 1 ? "" : "s"}
        </p>
        <p className="text-sm text-ink-muted mb-4">{labels || "—"}</p>

        {type === "critical" && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex gap-2">
            <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
            Critical notice — delivered even to users who unsubscribed.
          </p>
        )}

        <p className="text-sm text-ink-muted mb-4">
          Once queued, emails go out gradually. You can cancel any time before
          they're all sent, but delivered emails can't be recalled.
        </p>

        {needsTyping && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1.5">
              Type <span className="font-bold">{count}</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              inputMode="numeric"
              className={inputCls}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready || sending}
            className="flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? "Queuing…" : "Send now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── History ─────────────────────────────────────────────────────────────
const HistoryTab = () => {
  const [data, setData] = useState({ campaigns: [], pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [failures, setFailures] = useState([]);

  const [tick, setTick] = useState(0);
  const hasLoaded = useRef(false);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/admin/broadcasts", { params: { page } });
        if (!cancelled) {
          setData(res.data);
          hasLoaded.current = true;
        }
      } catch (err) {
        // Polling failures stay silent after the first successful load.
        if (!cancelled && !hasLoaded.current) {
          toast.error(errMsg(err, "Could not load broadcasts."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, tick]);

  const hasActive = data.campaigns.some((c) =>
    ACTIVE_CAMPAIGN_STATUSES.includes(c.status),
  );
  useEffect(() => {
    if (!hasActive) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, [hasActive]);

  const toggle = async (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setFailures([]);
    try {
      const res = await api.get(`/admin/broadcasts/${id}`);
      setFailures(res.data.failures || []);
    } catch {
      /* detail is optional */
    }
  };

  const act = async (id, action) => {
    try {
      await api.post(`/admin/broadcasts/${id}/${action}`);
      toast.success(action === "cancel" ? "Broadcast cancelled" : "Resumed");
      refresh();
    } catch (err) {
      toast.error(errMsg(err, "Action failed."));
    }
  };

  if (loading) return <p className="text-ink-muted text-sm py-10 text-center">Loading…</p>;
  if (!data.campaigns.length)
    return (
      <div className="text-center py-14 text-ink-muted">
        <FiMail size={28} className="mx-auto mb-3 opacity-50" />
        <p className="text-base">No broadcasts sent yet.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {data.campaigns.map((c) => {
        const done = c.sentCount + c.failedCount;
        const pct = c.recipientCount ? Math.min(100, (done / c.recipientCount) * 100) : 0;
        const isActive = ACTIVE_CAMPAIGN_STATUSES.includes(c.status);
        return (
          <div key={c._id} className="bg-card border border-stroke rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle(c._id)}
              className="w-full text-left px-5 py-4 hover:bg-surface/60 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-ink truncate">{c.subject}</p>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status] || STATUS_STYLE.cancelled}`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-ink-muted mt-0.5">
                {fmtTime(c.createdAt)} · {c.createdBy?.name || "Unknown"}
                {c.type === "critical" && " · critical"}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${c.status === "failed" ? "bg-red-500" : "bg-primary-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-ink-muted mt-1.5">
                {c.sentCount.toLocaleString()} sent
                {c.failedCount > 0 && ` · ${c.failedCount} failed`} of{" "}
                {c.recipientCount.toLocaleString()}
              </p>
            </button>

            {openId === c._id && (
              <div className="px-5 pb-4 pt-1 border-t border-stroke text-sm space-y-3">
                <p className="text-ink-muted pt-3">
                  To:{" "}
                  <span className="text-ink">
                    {[
                      ...(c.audience?.groups || []).map((g) => GROUP_LABELS[g] || g),
                      ...(c.audience?.userIds?.length
                        ? [`${c.audience.userIds.length} selected user${c.audience.userIds.length === 1 ? "" : "s"}`]
                        : []),
                    ].join(", ")}
                  </span>
                </p>
                {c.lastError && (
                  <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 break-words">
                    {c.lastError}
                  </p>
                )}
                {failures.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto divide-y divide-stroke border border-stroke rounded-lg">
                    {failures.map((f) => (
                      <li key={f._id} className="px-3 py-2">
                        <span className="text-ink">{f.email}</span>
                        <span className="block text-xs text-ink-muted truncate">{f.error}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  {c.status === "paused" && (
                    <button
                      onClick={() => act(c._id, "resume")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition"
                    >
                      <FiPlay size={13} /> Resume
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => act(c._id, "cancel")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold transition"
                    >
                      <FiPause size={13} /> Cancel broadcast
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl border border-stroke text-sm font-medium text-ink disabled:opacity-40"
          >
            Newer
          </button>
          <span className="text-sm text-ink-muted">
            {page} / {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl border border-stroke text-sm font-medium text-ink disabled:opacity-40"
          >
            Older
          </button>
        </div>
      )}
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────
const AdminBroadcast = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = hasPermission(user, "send_broadcasts");

  const [tab, setTab] = useState("compose");
  const [groups, setGroups] = useState([]);
  const [picked, setPicked] = useState([]);
  const [type, setType] = useState("announcement");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [html, setHtml] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const bodyRef = useRef(null);

  // Live recipient count + quota (debounced).
  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.post("/admin/broadcasts/preview", {
          groups,
          userIds: picked.map((u) => u._id),
          type,
        });
        if (!cancelled) setPreview(res.data);
      } catch (err) {
        if (!cancelled) toast.error(errMsg(err, "Could not load audience."));
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [allowed, groups, picked, type]);

  // Rendered email preview.
  useEffect(() => {
    if (!allowed || !showHtml) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await api.post("/admin/broadcasts/render", {
          type,
          subject,
          body,
          ctaLabel,
          ctaUrl,
        });
        if (!cancelled) setHtml(res.data.html);
      } catch {
        /* preview is best-effort */
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [allowed, showHtml, type, subject, body, ctaLabel, ctaUrl]);

  // Single-user search.
  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        if (!cancelled) setResults(null);
        return;
      }
      try {
        const res = await api.get("/admin/broadcasts/users/search", {
          params: { q: query.trim() },
        });
        if (!cancelled) setResults(res.data.users || []);
      } catch {
        if (!cancelled) setResults(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [allowed, query]);

  const toggleGroup = (value) =>
    setGroups((prev) => {
      if (prev.includes(value)) return prev.filter((g) => g !== value);
      if (value === "all") return ["all"];
      return [...prev.filter((g) => g !== "all"), value];
    });

  const addUser = (u) => {
    setPicked((prev) =>
      prev.some((p) => p._id === u._id) || prev.length >= 50 ? prev : [...prev, u],
    );
    setQuery("");
    setResults(null);
  };

  const wrapSelection = (before, after = before) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = body.slice(0, s) + before + body.slice(s, e) + after + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  };

  const ctaOk =
    (!ctaLabel.trim() && !ctaUrl.trim()) ||
    (ctaLabel.trim() && /^https:\/\/\S+$/i.test(ctaUrl.trim()));
  const count = preview?.count || 0;
  const quota = preview?.quota;
  const overQuota = quota ? count > quota.available : false;
  const contentOk = subject.trim() && body.trim() && ctaOk;
  const canSend = Boolean(contentOk && count > 0 && !overQuota && !previewLoading);
  const blockedReason = canSend
    ? ""
    : !groups.length && !picked.length
      ? query.trim()
        ? "Tap the matching user in the search results to add them."
        : "Choose who receives this."
      : count === 0 && !previewLoading
        ? "No active recipients match this audience."
        : !subject.trim()
          ? "Add a subject."
          : !body.trim()
            ? "Write a message."
            : !ctaOk
              ? "Fix the button label/link."
              : overQuota
                ? "Not enough sends left today."
                : "";

  const audienceLabels = useMemo(
    () =>
      [
        ...groups.map((g) => GROUP_LABELS[g]),
        ...(picked.length ? [`${picked.length} selected user${picked.length === 1 ? "" : "s"}`] : []),
      ].join(", "),
    [groups, picked],
  );

  const payload = () => ({
    groups,
    userIds: picked.map((u) => u._id),
    type,
    subject: subject.trim(),
    body: body.trim(),
    ctaLabel: ctaLabel.trim(),
    ctaUrl: ctaUrl.trim(),
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const { groups: _g, userIds: _u, ...content } = payload();
      const res = await api.post("/admin/broadcasts/test", content);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(errMsg(err, "Could not send test email."));
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post("/admin/broadcasts", payload(), { timeout: 60000 });
      toast.success("Broadcast queued");
      setConfirmOpen(false);
      setGroups([]);
      setPicked([]);
      setSubject("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      setTab("history");
    } catch (err) {
      toast.error(errMsg(err, "Could not queue broadcast."));
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  };

  if (!allowed) return <Navigate to="/more" replace />;

  const capacity = quota ? Math.max(1, quota.limit - quota.reserve) : 1;
  const usedPct = quota ? Math.min(100, ((quota.sentLast24h + quota.queued) / capacity) * 100) : 0;

  return (
    <MainLayout>
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/more"))}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={14} /> Back
      </button>

      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Email broadcast</h1>
          <p className="text-base text-ink-muted">Write once, send to the right people.</p>
        </div>
        <div className="flex bg-surface rounded-xl p-1 shrink-0">
          {[
            ["compose", "Compose"],
            ["history", "History"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === v ? "bg-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" ? (
        <HistoryTab />
      ) : (
        <div className="space-y-4 pb-28">
          <Step n={1} title="Who gets it" sub="Pick one or more groups — recipients are combined, never duplicated.">
            <div className="space-y-4">
              {AUDIENCE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">
                    {section.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <Chip
                        key={item.value}
                        active={groups.includes(item.value)}
                        onClick={() => toggleGroup(item.value)}
                      >
                        {item.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">
                  Specific people
                </p>
                {picked.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {picked.map((u) => (
                      <span
                        key={u._id}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary-100 text-primary-800 text-sm font-medium"
                      >
                        {u.username ? `@${u.username}` : u.name}
                        <button
                          onClick={() => setPicked((p) => p.filter((x) => x._id !== u._id))}
                          aria-label={`Remove ${u.name}`}
                          className="hover:text-red-600"
                        >
                          <FiX size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && results?.length) {
                        e.preventDefault();
                        addUser(results[0]);
                      }
                    }}
                    placeholder="Search name, username or email"
                    className={`${inputCls} pl-10`}
                  />
                  {results?.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-1.5 bg-card border border-stroke rounded-xl shadow-xl overflow-hidden">
                      {results.map((u) => (
                        <li key={u._id}>
                          <button
                            onClick={() => addUser(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-surface transition"
                          >
                            <span className="block text-base font-medium text-ink truncate">{u.name}</span>
                            <span className="block text-sm text-ink-muted truncate">
                              {u.username ? `@${u.username} · ` : ""}
                              {u.email}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {results && results.length === 0 && (
                  <p className="text-sm text-amber-700 mt-2">
                    No active user matches "{query.trim()}". Only existing, non-banned accounts can be emailed.
                  </p>
                )}
                {!picked.length && !results && (
                  <p className="text-xs text-ink-muted mt-2">
                    Type 2+ characters, then tap a result (or press Enter) to add it.
                  </p>
                )}
              </div>
            </div>
          </Step>

          <Step n={2} title="Delivery type">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["announcement", "Announcement", "Skips users who unsubscribed. Includes an unsubscribe link."],
                ["critical", "Critical notice", "Policy or security changes. Reaches everyone, even unsubscribed."],
              ].map(([v, title, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  className={`text-left rounded-xl border p-3.5 transition ${
                    type === v
                      ? v === "critical"
                        ? "border-amber-400 bg-amber-50"
                        : "border-primary-400 bg-primary-50"
                      : "border-stroke hover:border-primary-200"
                  }`}
                >
                  <span className={`block text-base font-semibold ${type === v && v === "critical" ? "text-amber-800" : "text-ink"}`}>
                    {title}
                  </span>
                  <span className={`block text-sm mt-0.5 ${type === v && v === "critical" ? "text-amber-700" : "text-ink-muted"}`}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </Step>

          <Step n={3} title="Message" sub="Plain text. Blank line = new paragraph.">
            <div className="space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
                placeholder="Subject"
                className={inputCls}
              />
              <div>
                <div className="flex gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => wrapSelection("**")}
                    className="px-2.5 py-1 rounded-lg border border-stroke text-sm font-bold text-ink hover:bg-surface transition"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection("{{firstName}}", "")}
                    className="px-2.5 py-1 rounded-lg border border-stroke text-sm font-medium text-ink hover:bg-surface transition"
                  >
                    + First name
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  rows={9}
                  placeholder={"Hi {{firstName}},\n\nWrite your message here…"}
                  className={`${inputCls} resize-y leading-relaxed`}
                />
                <p className="text-xs text-ink-muted text-right mt-1">{body.length}/5000</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  maxLength={40}
                  placeholder="Button label (optional)"
                  className={inputCls}
                />
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://… button link"
                  className={`${inputCls} ${ctaUrl && !ctaOk ? "border-red-400" : ""}`}
                />
              </div>
              {!ctaOk && (
                <p className="text-sm text-red-600">Button needs a label and an https:// link.</p>
              )}

              <button
                type="button"
                onClick={() => setShowHtml((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"
              >
                <FiEye size={14} /> {showHtml ? "Hide" : "Show"} email preview
              </button>
              {showHtml && (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={html}
                  className="w-full h-[520px] rounded-xl border border-stroke bg-white"
                />
              )}
            </div>
          </Step>
        </div>
      )}

      {tab === "compose" && (
        <div className="sticky bottom-3 z-30">
          <div className="bg-card border border-stroke rounded-2xl shadow-xl p-3.5 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-base font-semibold text-ink flex items-center gap-2">
                {previewLoading ? (
                  <FiRotateCw className="animate-spin text-ink-muted" size={14} />
                ) : null}
                Reaches {count.toLocaleString()} {count === 1 ? "person" : "people"}
              </p>
              {blockedReason && (
                <p className="text-xs text-amber-700 mt-0.5">{blockedReason}</p>
              )}
              {quota && (
                <div className="mt-1.5">
                  <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overQuota ? "bg-red-500" : "bg-primary-400"}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${overQuota ? "text-red-600 font-medium" : "text-ink-muted"}`}>
                    {overQuota
                      ? `Over today's capacity — ${quota.available} sends left`
                      : `${quota.available} of ${capacity} sends left in the last 24h`}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleTest}
              disabled={!contentOk || testing}
              className="px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {testing ? "Sending…" : "Send test"}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FiSend size={15} /> Review & send
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmSendModal
          count={count}
          labels={audienceLabels}
          type={type}
          sending={sending}
          onConfirm={handleSend}
          onCancel={() => !sending && setConfirmOpen(false)}
        />
      )}
    </MainLayout>
  );
};

export default AdminBroadcast;
