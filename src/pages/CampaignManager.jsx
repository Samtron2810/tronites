import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft, FiPlus, FiZap, FiLoader, FiTarget, FiBarChart2,
  FiEye, FiMousePointer, FiTrendingUp, FiDownload, FiTrash2,
  FiPlay, FiCreditCard, FiX, FiCheck, FiChevronRight,
  FiRefreshCw, FiCalendar, FiUsers,
} from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { canPromote } from "../utils/tierLimits";

const AVAILABLE_INTERESTS = [
  "technology","music","art","sports","gaming","science",
  "politics","food","travel","fashion","finance","health",
  "education","entertainment","news","business","nature",
  "photography","fitness","books",
];

const STATUS_STYLES = {
  draft:     { cls: "bg-surface text-ink-muted border-stroke",    label: "Draft" },
  active:    { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" },
  paused:    { cls: "bg-yellow-50 text-yellow-700 border-yellow-200",   label: "Paused" },
  completed: { cls: "bg-blue-50 text-blue-600 border-blue-200",         label: "Completed" },
  cancelled: { cls: "bg-red-50 text-red-500 border-red-200",            label: "Cancelled" },
};

const TIER_INFO = {
  basic:    { label: "Basic",    color: "text-blue-600",   days: 3,  price: null },
  standard: { label: "Standard", color: "text-violet-600", days: 7,  price: null },
  premium:  { label: "Premium",  color: "text-amber-600",  days: 14, price: null },
};

// ── Status chip ───────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
};

// ── Campaign card ─────────────────────────────────────────────────────────
const CampaignCard = ({ campaign, onPay, onCancel, onExport, onRefresh }) => {
  const totalPosts = campaign.posts?.length ?? 0;
  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="bg-card border border-stroke rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-ink text-sm truncate">{campaign.name}</h3>
            <StatusChip status={campaign.status} />
            {campaign.tier && (
              <span className={`text-[11px] font-bold ${TIER_INFO[campaign.tier]?.color ?? ""}`}>
                {TIER_INFO[campaign.tier]?.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {totalPosts} post{totalPosts !== 1 ? "s" : ""} · ₦{campaign.totalBudgetNgn?.toLocaleString()} budget
          </p>
        </div>
      </div>

      {/* Stats */}
      {campaign.status !== "draft" && (
        <div className="grid grid-cols-3 gap-px border-t border-stroke">
          {[
            { icon: FiEye,         label: "Impressions",  value: (campaign.impressions ?? 0).toLocaleString() },
            { icon: FiMousePointer,label: "Clicks",       value: (campaign.clicks ?? 0).toLocaleString() },
            { icon: FiTrendingUp,  label: "CTR",          value: `${ctr}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-surface px-3 py-2.5 text-center">
              <Icon size={12} className="mx-auto text-ink-muted mb-1" />
              <p className="text-sm font-bold text-ink">{value}</p>
              <p className="text-[10px] text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Targeting summary */}
      {(campaign.targeting?.location || campaign.targeting?.interests?.length > 0) && (
        <div className="px-4 py-2.5 border-t border-stroke flex flex-wrap gap-1.5">
          <FiTarget size={11} className="text-primary-500 mt-0.5 shrink-0" />
          {campaign.targeting.location && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-stroke text-ink-muted">
              📍 {campaign.targeting.location}
            </span>
          )}
          {campaign.targeting.interests?.slice(0, 3).map((i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-stroke text-ink-muted">{i}</span>
          ))}
          {(campaign.targeting.interests?.length ?? 0) > 3 && (
            <span className="text-[11px] text-ink-muted">+{campaign.targeting.interests.length - 3} more</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-stroke">
        {campaign.status === "draft" && (
          <>
            <button
              onClick={() => onPay(campaign)}
              className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <FiCreditCard size={12} />Pay & Launch
            </button>
            <button
              onClick={() => onCancel(campaign._id)}
              className="py-2 px-3 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition"
            >
              <FiTrash2 size={12} />
            </button>
          </>
        )}
        {campaign.status === "active" && (
          <>
            <button
              onClick={() => onExport(campaign._id)}
              className="flex-1 py-2 rounded-xl border border-stroke text-ink-sub text-xs font-semibold hover:bg-surface flex items-center justify-center gap-1.5 transition"
            >
              <FiDownload size={12} />Export CSV
            </button>
            <button
              onClick={() => onCancel(campaign._id)}
              className="py-2 px-3 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition"
            >
              <FiX size={12} />
            </button>
          </>
        )}
        {["completed","cancelled"].includes(campaign.status) && (
          <button
            onClick={() => onExport(campaign._id)}
            className="flex-1 py-2 rounded-xl border border-stroke text-ink-sub text-xs font-semibold hover:bg-surface flex items-center justify-center gap-1.5 transition"
          >
            <FiDownload size={12} />Export report
          </button>
        )}
      </div>
    </div>
  );
};

// ── Create campaign modal ─────────────────────────────────────────────────
const CreateCampaignModal = ({ onClose, onCreated, tiers }) => {
  const [step, setStep] = useState(1); // 1=basics, 2=targeting, 3=review
  const [name, setName] = useState("");
  const [selectedTier, setSelectedTier] = useState("basic");
  const [postIds, setPostIds] = useState([]);
  const [targetLocation, setTargetLocation] = useState("");
  const [targetInterests, setTargetInterests] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get("/posts/user/me", { params: { limit: 20 } })
      .then((r) => setMyPosts(r.data.posts || []))
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, []);

  const togglePost = (id) => {
    setPostIds((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Campaign name is required."); return; }
    if (postIds.length === 0) { toast.error("Select at least one post."); return; }
    setCreating(true);
    try {
      const res = await api.post("/campaigns", {
        name: name.trim(),
        postIds,
        tier: selectedTier,
        targeting: { location: targetLocation.trim(), interests: targetInterests },
      });
      toast.success("Campaign created as draft.");
      onCreated(res.data.campaign);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't create campaign.");
    } finally { setCreating(false); }
  };

  const tierConfig = tiers?.[selectedTier];
  const budget = tierConfig ? tierConfig.amountNgn * postIds.length : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-stroke rounded-2xl w-full max-w-md shadow-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stroke sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <FiZap size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">New campaign</h2>
              <p className="text-[11px] text-ink-muted">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface transition"><FiX size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-muted">Campaign name</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition"
                  placeholder="e.g. Sallah Sales Push"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-muted">Promotion package</label>
                {tiers && Object.entries(tiers).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${
                      selectedTier === key
                        ? "border-primary-500 bg-primary-50"
                        : "border-stroke bg-surface hover:border-primary-300"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-ink">{cfg.label}</span>
                      <span className="text-sm font-bold text-ink">₦{cfg.amountNgn?.toLocaleString()}/post</span>
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {cfg.impressionCap ? `Up to ${cfg.impressionCap.toLocaleString()} impressions` : "Unlimited impressions"}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-muted">
                  Select posts <span className="font-normal">({postIds.length}/10 selected)</span>
                </label>
                {loadingPosts ? (
                  <div className="flex items-center gap-2 text-sm text-ink-muted py-4 justify-center">
                    <FiLoader size={14} className="animate-spin" />Loading your posts…
                  </div>
                ) : myPosts.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No posts yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {myPosts.map((post) => {
                      const snippet = post.text?.slice(0, 70) || (post.images?.length ? "📷 Image" : "🎬 Video");
                      const selected = postIds.includes(post._id);
                      return (
                        <button
                          key={post._id}
                          onClick={() => togglePost(post._id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center gap-2 ${
                            selected ? "border-primary-400 bg-primary-50" : "border-stroke bg-surface hover:border-primary-300"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                            selected ? "bg-primary-600 border-primary-600" : "border-stroke"
                          }`}>
                            {selected && <FiCheck size={10} className="text-white" />}
                          </span>
                          <span className="text-xs text-ink line-clamp-1 flex-1">{snippet}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-ink-muted">Targeting is optional. Leave blank to reach all users.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-muted flex items-center gap-1.5">
                  📍 Location
                </label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition"
                  placeholder="e.g. Lagos, Abuja, Nigeria"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-muted">Interests</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => setTargetInterests((prev) =>
                        prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
                      )}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                        targetInterests.includes(interest)
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-surface text-ink-muted border-stroke hover:border-primary-400"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-surface border border-stroke rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Campaign summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-ink-muted">Name</span><span className="font-semibold text-ink">{name}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Package</span><span className="font-semibold text-ink">{tiers?.[selectedTier]?.label}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Posts</span><span className="font-semibold text-ink">{postIds.length}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Per post</span><span className="font-semibold text-ink">₦{tiers?.[selectedTier]?.amountNgn?.toLocaleString()}</span></div>
                  {(targetLocation || targetInterests.length > 0) && (
                    <div className="flex justify-between"><span className="text-ink-muted">Targeting</span><span className="font-semibold text-ink text-right text-xs">{[targetLocation, ...targetInterests.slice(0,2)].filter(Boolean).join(", ")}{targetInterests.length > 2 ? "…" : ""}</span></div>
                  )}
                  <div className="flex justify-between border-t border-stroke pt-2 mt-2">
                    <span className="font-bold text-ink">Total budget</span>
                    <span className="font-bold text-primary-600 text-base">₦{budget.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted">
                Campaign will be created as a draft. You'll pay on the next screen to launch it. Payment is via Paystack.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-5 pb-5 flex gap-2 border-t border-stroke pt-4">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
              Back
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
              Cancel
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && (!name.trim() || postIds.length === 0)) {
                  toast.error("Enter a name and select at least one post.");
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              Next <FiChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <><FiLoader size={13} className="animate-spin" />Creating…</> : <><FiCheck size={13} />Create campaign</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const CampaignManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tiers, setTiers] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cRes, fRes] = await Promise.all([
        api.get("/campaigns"),
        api.get("/posts/promote/fees"),
      ]);
      setCampaigns(cRes.data.campaigns);
      setTiers(fRes.data.tiers);
    } catch {
      toast.error("Couldn't load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canPromote(user)) {
    return (
      <MainLayout>
        <div className="py-20 text-center space-y-2 text-ink-muted">
          <FiBarChart2 size={32} className="mx-auto text-primary-400" />
          <p className="font-semibold text-ink">Business accounts only</p>
          <p className="text-sm">Ad campaigns are available to verified Business tier accounts.</p>
        </div>
      </MainLayout>
    );
  }

  const handlePay = async (campaign) => {
    setPayingId(campaign._id);
    try {
      const res = await api.post(`/campaigns/${campaign._id}/pay`);
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't initiate payment.");
      setPayingId(null);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success("Campaign cancelled.");
      setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, status: "cancelled" } : c));
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't cancel campaign.");
    }
  };

  const handleExport = async (id) => {
    try {
      const res = await api.get(`/campaigns/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${id}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export report.");
    }
  };

  const totalSpend = campaigns
    .filter((c) => c.paymentStatus === "paid")
    .reduce((s, c) => s + (c.amountPaidNgn ?? 0), 0);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} className="p-2 rounded-xl text-ink-muted hover:bg-surface hover:text-ink transition">
            <FiArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-ink">Ad Campaigns</h1>
            <p className="text-sm text-ink-muted">Schedule and manage multi-post campaigns</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition"
          >
            <FiPlus size={16} />New
          </button>
        </div>

        {/* Summary strip */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: FiPlay,         label: "Active",      value: activeCampaigns.length },
              { icon: FiEye,          label: "Impressions", value: totalImpressions.toLocaleString() },
              { icon: FiCreditCard,   label: "Total spent", value: `₦${totalSpend.toLocaleString()}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card border border-stroke rounded-2xl p-3 text-center">
                <Icon size={16} className="mx-auto text-primary-500 mb-1" />
                <p className="text-base font-bold text-ink">{value}</p>
                <p className="text-[10px] text-ink-muted font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-muted">
            <FiLoader size={24} className="animate-spin text-primary-500" />
            <p className="text-sm">Loading campaigns…</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-card border border-stroke rounded-2xl p-12 text-center space-y-3">
            <span className="text-4xl">📣</span>
            <p className="font-semibold text-ink">No campaigns yet</p>
            <p className="text-sm text-ink-muted">Create a campaign to promote multiple posts with a shared budget, schedule and audience.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              <FiPlus size={14} />Create first campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c._id} className={payingId === c._id ? "opacity-60 pointer-events-none" : ""}>
                <CampaignCard
                  campaign={c}
                  onPay={handlePay}
                  onCancel={handleCancel}
                  onExport={handleExport}
                  onRefresh={load}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && tiers && (
        <CreateCampaignModal
          tiers={tiers}
          onClose={() => setShowCreate(false)}
          onCreated={(newCampaign) => setCampaigns((prev) => [newCampaign, ...prev])}
        />
      )}
    </MainLayout>
  );
};

export default CampaignManager;
