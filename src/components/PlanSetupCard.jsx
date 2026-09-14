import { useState, useEffect } from "react";
import { FaStar, FaSpinner, FaCheckCircle } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

// Embeddable card for creating/updating a creator's subscription plan.
// Drop it anywhere inside a creator-gated page (e.g. CreatorDashboard).
const PlanSetupCard = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [priceNgn, setPriceNgn] = useState("");
  const [perks, setPerks] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api
      .get("/creator-monetization/plan/me")
      .then((r) => {
        const p = r.data?.plan;
        if (p) {
          setPlan(p);
          setName(p.name);
          setPriceNgn(String(p.priceNgn));
          setPerks(p.perks || "");
          setActive(p.active);
        } else {
          setEditing(true); // no plan yet — open form immediately
        }
      })
      .catch(() => setEditing(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const price = Number(priceNgn);
    if (!name.trim()) return toast.error("Plan name required.");
    if (!price || price < 100) return toast.error("Minimum price is ₦100.");
    setSaving(true);
    try {
      const { data } = await api.post("/creator-monetization/plan", {
        name: name.trim(),
        priceNgn: price,
        perks: perks.trim(),
        active,
      });
      setPlan(data.plan);
      setEditing(false);
      toast.success(plan ? "Plan updated." : "Subscription plan created!");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save plan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-stroke rounded-2xl p-5 flex items-center justify-center py-8">
        <FaSpinner size={18} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-stroke rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaStar size={14} className="text-primary-500" />
          <h3 className="font-semibold text-ink text-sm">Subscription plan</h3>
        </div>
        {plan && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary-600 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {/* Plan display */}
      {plan && !editing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">{plan.name}</p>
            <p className="text-lg font-bold text-ink">
              ₦{plan.priceNgn?.toLocaleString()}
              <span className="text-xs text-ink-muted font-normal">/mo</span>
            </p>
          </div>
          {plan.perks && <p className="text-xs text-ink-muted">{plan.perks}</p>}
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
            plan.active
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : "bg-surface text-ink-muted"
          }`}>
            {plan.active ? <><FaCheckCircle size={10} /> Active</> : "Paused"}
          </div>
        </div>
      )}

      {/* Edit / create form */}
      {editing && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Plan name</label>
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Supporter, Inner Circle…"
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Monthly price (₦)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm">₦</span>
              <input
                type="number"
                min={100}
                max={50000}
                value={priceNgn}
                onChange={(e) => setPriceNgn(e.target.value)}
                placeholder="500"
                className="w-full pl-8 pr-4 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">What subscribers get</label>
            <textarea
              rows={2}
              maxLength={300}
              value={perks}
              onChange={(e) => setPerks(e.target.value)}
              placeholder="Subscriber-only posts, early access, direct support…"
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-primary-600"
            />
            <span className="text-xs text-ink-muted">Accept new subscribers</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <FaSpinner size={12} className="animate-spin" /> : null}
              {saving ? "Saving…" : plan ? "Update plan" : "Create plan"}
            </button>
            {plan && (
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-stroke text-ink-muted text-sm hover:bg-surface transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSetupCard;
