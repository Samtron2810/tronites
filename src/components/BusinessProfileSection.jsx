import { useState, useEffect } from "react";
import {
  FiMapPin, FiPhone, FiGlobe, FiMail, FiEdit2, FiX, FiLoader,
  FiCheck, FiPlus, FiTrash2, FiClock, FiMessageSquare, FiPackage,
  FiChevronDown, FiChevronUp,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  open: "09:00",
  close: "18:00",
  closed: day === "Sun",
}));

// ── Catalog item editor ───────────────────────────────────────────────────
const CatalogItemRow = ({ item, index, onChange, onRemove }) => (
  <div className="flex gap-2 items-start bg-surface rounded-xl p-3 border border-stroke">
    <div className="flex-1 space-y-2 min-w-0">
      <input
        className="w-full px-2.5 py-1.5 rounded-lg border border-stroke bg-card text-sm text-ink focus:outline-none focus:border-primary-400 transition"
        placeholder="Item name"
        value={item.name}
        onChange={(e) => onChange(index, "name", e.target.value)}
        maxLength={100}
      />
      <div className="flex gap-2">
        <input
          className="w-24 px-2.5 py-1.5 rounded-lg border border-stroke bg-card text-sm text-ink focus:outline-none focus:border-primary-400 transition"
          placeholder="Price"
          type="number"
          min="0"
          value={item.price ?? ""}
          onChange={(e) => onChange(index, "price", e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-stroke bg-card text-sm text-ink focus:outline-none focus:border-primary-400 transition"
          placeholder="Description (optional)"
          value={item.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          maxLength={300}
        />
      </div>
    </div>
    <button onClick={() => onRemove(index)} className="mt-1 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition">
      <FiTrash2 size={14} />
    </button>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────
const BusinessProfileSection = ({ isOwnProfile, businessProfile: initialProfile }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const [form, setForm] = useState({
    address: "", city: "", state: "", country: "",
    phone: "", whatsapp: "", website: "", email: "", category: "",
    hours: DEFAULT_HOURS,
    catalog: [],
  });

  // Hydrate form from prop
  useEffect(() => {
    if (initialProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates the edit form from the profile prop; re-runs when the profile request resolves, and the form is user-editable, so it cannot be derived during render.
      setForm({
        address:   initialProfile.address   || "",
        city:      initialProfile.city      || "",
        state:     initialProfile.state     || "",
        country:   initialProfile.country   || "",
        phone:     initialProfile.phone     || "",
        whatsapp:  initialProfile.whatsapp  || "",
        website:   initialProfile.website   || "",
        email:     initialProfile.email     || "",
        category:  initialProfile.category  || "",
        hours:     initialProfile.hours?.length ? initialProfile.hours : DEFAULT_HOURS,
        catalog:   initialProfile.catalog   || [],
      });
    }
  }, [initialProfile]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleHourChange = (idx, field, value) => {
    const updated = [...form.hours];
    updated[idx] = { ...updated[idx], [field]: value };
    set("hours", updated);
  };

  const addCatalogItem = () => {
    if (form.catalog.length >= 50) return;
    set("catalog", [...form.catalog, { name: "", price: null, currency: "NGN", description: "" }]);
  };

  const updateCatalogItem = (idx, field, val) => {
    const updated = [...form.catalog];
    updated[idx] = { ...updated[idx], [field]: val };
    set("catalog", updated);
  };

  const removeCatalogItem = (idx) => {
    set("catalog", form.catalog.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/me/business-profile", {
        ...form,
        catalog: form.catalog.filter((item) => item.name.trim()),
      });
      toast.success("Business profile updated.");
      setEditing(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Read-only view ───────────────────────────────────────────────────
  const hasAnyData =
    form.address || form.phone || form.website || form.whatsapp ||
    form.email || form.category || form.catalog.length > 0;

  if (!editing) {
    const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayHours = form.hours.find((h) => h.day === todayName);

    return (
      <div className="space-y-3">
        {/* If own profile, show edit button */}
        {isOwnProfile && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">Business info</span>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
            >
              <FiEdit2 size={12} />Edit
            </button>
          </div>
        )}

        {!hasAnyData && isOwnProfile && (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-3 rounded-xl border border-dashed border-primary-300 text-sm text-primary-600 font-semibold hover:bg-primary-50 transition flex items-center justify-center gap-2"
          >
            <FiPlus size={14} />Add business info (address, hours, catalog…)
          </button>
        )}

        {hasAnyData && (
          <div className="bg-card border border-stroke rounded-2xl p-4 space-y-3">
            {form.category && (
              <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {form.category}
              </span>
            )}

            {(form.address || form.city) && (
              <div className="flex items-start gap-2.5 text-sm text-ink-sub">
                <FiMapPin size={14} className="mt-0.5 text-ink-muted shrink-0" />
                <span>{[form.address, form.city, form.state, form.country].filter(Boolean).join(", ")}</span>
              </div>
            )}

            {todayHours && (
              <div className="flex items-center gap-2.5 text-sm text-ink-sub">
                <FiClock size={14} className="text-ink-muted shrink-0" />
                {todayHours.closed ? (
                  <span className="text-red-500">Closed today</span>
                ) : (
                  <span>Today: <span className="font-medium text-ink">{todayHours.open} – {todayHours.close}</span></span>
                )}
              </div>
            )}

            {form.phone && (
              <a href={`tel:${form.phone}`} className="flex items-center gap-2.5 text-sm text-primary-600 hover:underline">
                <FiPhone size={14} className="shrink-0" />{form.phone}
              </a>
            )}

            {form.whatsapp && (
              <a
                href={`https://wa.me/${form.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-emerald-600 hover:underline"
              >
                <FaWhatsapp size={15} className="shrink-0" />Chat on WhatsApp
              </a>
            )}

            {form.website && (
              <a
                href={form.website.startsWith("http") ? form.website : `https://${form.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-primary-600 hover:underline truncate"
              >
                <FiGlobe size={14} className="shrink-0" />{form.website}
              </a>
            )}

            {form.email && (
              <a href={`mailto:${form.email}`} className="flex items-center gap-2.5 text-sm text-primary-600 hover:underline truncate">
                <FiMail size={14} className="shrink-0" />{form.email}
              </a>
            )}

            {form.catalog.length > 0 && (
              <div className="pt-2 border-t border-stroke space-y-2">
                <button
                  onClick={() => setShowCatalog((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition"
                >
                  <FiPackage size={12} />{form.catalog.length} items in catalog
                  {showCatalog ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                </button>
                {showCatalog && (
                  <div className="space-y-2">
                    {form.catalog.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 bg-surface rounded-xl px-3 py-2.5 border border-stroke">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{item.name}</p>
                          {item.description && <p className="text-[11px] text-ink-muted mt-0.5">{item.description}</p>}
                        </div>
                        {item.price !== null && item.price !== undefined && (
                          <span className="text-sm font-bold text-ink shrink-0">₦{Number(item.price).toLocaleString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Edit form ───────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-ink">Edit business info</span>
        <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface transition">
          <FiX size={16} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-muted">Business category</label>
          <input
            className="w-full px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition"
            placeholder="e.g. Restaurant, Fashion, Tech"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted flex items-center gap-1.5"><FiMapPin size={11} />Address</label>
          <input className="w-full px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="Street address" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
          <div className="grid grid-cols-3 gap-2">
            <input className="px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
            <input className="px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={100} />
            <input className="px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} maxLength={100} />
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted">Contact</label>
          <div className="flex items-center gap-2">
            <FiPhone size={14} className="text-ink-muted shrink-0" />
            <input className="flex-1 px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="Phone number" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
          </div>
          <div className="flex items-center gap-2">
            <FaWhatsapp size={15} className="text-emerald-500 shrink-0" />
            <input className="flex-1 px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="WhatsApp number (e.g. 2348012345678)" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} maxLength={20} />
          </div>
          <div className="flex items-center gap-2">
            <FiGlobe size={14} className="text-ink-muted shrink-0" />
            <input className="flex-1 px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="Website URL" value={form.website} onChange={(e) => set("website", e.target.value)} maxLength={255} />
          </div>
          <div className="flex items-center gap-2">
            <FiMail size={14} className="text-ink-muted shrink-0" />
            <input className="flex-1 px-3 py-2 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition" placeholder="Business email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} />
          </div>
        </div>

        {/* Hours — collapsible */}
        <div className="border border-stroke rounded-xl overflow-hidden">
          <button onClick={() => setShowHours((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-surface transition">
            <span className="flex items-center gap-2"><FiClock size={14} className="text-primary-500" />Business hours</span>
            {showHours ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {showHours && (
            <div className="border-t border-stroke divide-y divide-stroke">
              {form.hours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-8 text-xs font-bold text-ink-muted">{h.day}</span>
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                    <input type="checkbox" checked={h.closed} onChange={(e) => handleHourChange(i, "closed", e.target.checked)} className="rounded" />
                    Closed
                  </label>
                  {!h.closed && (
                    <>
                      <input type="time" value={h.open} onChange={(e) => handleHourChange(i, "open", e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-stroke bg-surface text-xs text-ink focus:outline-none focus:border-primary-400" />
                      <span className="text-xs text-ink-muted">–</span>
                      <input type="time" value={h.close} onChange={(e) => handleHourChange(i, "close", e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-stroke bg-surface text-xs text-ink focus:outline-none focus:border-primary-400" />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog — collapsible */}
        <div className="border border-stroke rounded-xl overflow-hidden">
          <button onClick={() => setShowCatalog((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-surface transition">
            <span className="flex items-center gap-2">
              <FiPackage size={14} className="text-primary-500" />
              Catalog / menu
              <span className="text-[11px] text-ink-muted font-normal">({form.catalog.length}/50)</span>
            </span>
            {showCatalog ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {showCatalog && (
            <div className="border-t border-stroke px-4 py-3 space-y-2">
              {form.catalog.map((item, i) => (
                <CatalogItemRow key={i} item={item} index={i} onChange={updateCatalogItem} onRemove={removeCatalogItem} />
              ))}
              {form.catalog.length < 50 && (
                <button onClick={addCatalogItem} className="w-full py-2 rounded-xl border border-dashed border-primary-300 text-xs text-primary-600 font-semibold hover:bg-primary-50 transition flex items-center justify-center gap-1.5">
                  <FiPlus size={12} />Add item
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="px-4 py-3 flex gap-2">
        <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><FiLoader size={14} className="animate-spin" />Saving…</> : <><FiCheck size={14} />Save changes</>}
        </button>
      </div>
    </div>
  );
};

export default BusinessProfileSection;
