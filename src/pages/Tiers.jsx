import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import BadgeSeal from "../components/BadgeSeal";
import { useAuth } from "../context/useAuth";
import { getActiveTier } from "../utils/tierLimits";
import {
  TIER_INFO,
  TIER_FEATURES,
  tierBenefits,
} from "../constants/tierBenefits";
import { FiArrowLeft, FiCheck, FiChevronRight } from "react-icons/fi";

// One badge card — all five badge types plus the unverified baseline, so
// visitors can compare every tier instead of only the one they hold.
const TierCard = ({ info, features, isCurrent }) => (
  <div
    className={`bg-card border rounded-2xl p-5 ${
      isCurrent ? "border-primary-400 ring-2 ring-primary-100" : "border-stroke"
    }`}
  >
    <div className="flex items-start gap-2.5">
      <BadgeSeal color={info.color} size={28} />
      <div className="min-w-0">
        <p className="text-base font-bold text-ink leading-tight flex items-center gap-2 flex-wrap">
          {info.name}
          {isCurrent && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded-full">
              Your tier
            </span>
          )}
        </p>
        <p className="text-[12px] text-ink-muted">{info.label}</p>
      </div>
    </div>

    <p className="text-sm text-ink-muted mt-2 leading-snug">{info.claim}</p>

    <ul className="mt-3 pt-1 border-t border-stroke divide-y divide-stroke">
      {features.map((f) => (
        <li key={f.id} className="flex items-center gap-2.5 py-2">
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
              f.enabled ? "text-white" : "bg-surface"
            }`}
            style={f.enabled ? { backgroundColor: info.color } : undefined}
          >
            {f.enabled ? (
              <FiCheck size={12} />
            ) : (
              <span className="w-1 h-1 rounded-full bg-ink-muted" />
            )}
          </span>
          <span className="flex-1 min-w-0">
            <span
              className={`block text-sm font-medium ${f.enabled ? "text-ink" : "text-ink-muted"}`}
            >
              {f.label}
            </span>
            <span className="block text-[11px] text-ink-muted">{f.hint}</span>
          </span>
          <span
            className={`text-sm font-semibold shrink-0 ${
              f.enabled ? "text-ink" : "text-ink-muted"
            }`}
          >
            {f.value}
          </span>
        </li>
      ))}
    </ul>

    {info.note && (
      <p className="mt-3 pt-2 text-[12px] text-ink-muted leading-snug border-t border-stroke">
        {info.note}
      </p>
    )}
  </div>
);

const Tiers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const current = getActiveTier(user);
  const currentInfo = TIER_INFO.find((t) => t.id === current) || TIER_INFO[0];
  const currentFeatures = tierBenefits(current);
  const currentChips = currentFeatures.filter(
    (f) => f.enabled || f.value !== "—",
  );

  return (
    <MainLayout>
      <button
        onClick={() =>
          window.history.length > 1 ? navigate(-1) : navigate("/")
        }
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">Tiers & benefits</h1>
      <p className="text-base text-ink-muted mb-5 leading-snug">
        Every verification badge and what it unlocks — you can read them all,
        not just the tier you're on today.
      </p>

      {/* Your current tier — always visible so visitors see where they
          stand, while the matrix and cards below show the rest. */}
      <section
        className="bg-card border rounded-2xl p-5 mb-6"
        style={{ borderColor: `${currentInfo.color}55` }}
      >
        <div className="flex items-center gap-3">
          <BadgeSeal color={currentInfo.color} size={30} />
          <div>
            <p className="text-[12px] text-ink-muted font-semibold uppercase tracking-wide">
              Your current tier
            </p>
            <p className="text-lg font-bold text-ink leading-tight">
              {currentInfo.label}
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-muted mt-2 leading-snug">
          {currentInfo.claim}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {currentChips.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink bg-surface border border-stroke rounded-full px-2.5 py-1"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: currentInfo.color }}
              />
              {b.label}: {b.value}
            </span>
          ))}
        </div>
        <Link
          to="/settings"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          {current === "unverified"
            ? "Apply for a badge"
            : "Manage verification"}
          <FiChevronRight size={14} />
        </Link>
      </section>
      {/* At-a-glance comparison matrix — every badge in one table. */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-ink mb-1">At a glance</h2>
        <p className="text-sm text-ink-muted mb-3">
          Compare every tier side by side. Your tier is highlighted.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-stroke bg-card">
          <table className="w-full min-w-175 border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">
                  Benefit
                </th>
                {TIER_INFO.map((t) => (
                  <th key={t.id} className="px-1 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <BadgeSeal color={t.color} size={18} />
                      <span className="text-xs font-semibold text-ink">
                        {t.name}
                      </span>
                      {t.id === current && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 rounded-full px-1.5 py-0.5">
                          You
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_FEATURES.map((f) => (
                <tr key={f.id} className="border-t border-stroke">
                  <td className="px-4 py-2.5 align-top">
                    <p className="text-sm font-medium text-ink">{f.label}</p>
                    <p className="text-[11px] text-ink-muted">{f.hint}</p>
                  </td>
                  {TIER_INFO.map((t) => {
                    const val = f.format(t.id);
                    const isYou = t.id === current;
                    return (
                      <td
                        key={t.id}
                        className={`text-center px-1 py-2.5 text-sm font-semibold ${
                          isYou ? "bg-primary-50" : ""
                        } ${val === "—" ? "text-ink-muted" : "text-ink"}`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail cards for EVERY tier — the requested full breakdown. */}
      <section>
        <h2 className="text-base font-bold text-ink mb-1">
          Every tier, in full
        </h2>
        <p className="text-sm text-ink-muted mb-3">
          What you're entitled to at each level, including the free baseline.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIER_INFO.map((info) => (
            <TierCard
              key={info.id}
              info={info}
              features={tierBenefits(info.id)}
              isCurrent={info.id === current}
            />
          ))}
        </div>
      </section>
    </MainLayout>
  );
};

export default Tiers;
