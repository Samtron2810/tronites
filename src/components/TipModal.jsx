import { useState } from "react";
import { FaTimes, FaHeart, FaLock } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";
import ModalPortal from "./ModalPortal";
import useBackButtonClose from "../hooks/useBackButtonClose";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const TipModal = ({ creator, postId = null, onClose }) => {
  useBackButtonClose(true, onClose);
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedAmount = amount || customAmount;
  const amountNgn = Number(selectedAmount);
  const valid = amountNgn >= 50 && amountNgn <= 100_000;

  const handleTip = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const { data } = await api.post("/creator-monetization/tips/initiate", {
        creatorId: creator._id,
        amountNgn,
        message: message.trim(),
        isAnonymous,
        postId,
      });
      window.location.href = data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not initiate tip.");
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
    <div data-modal-layer className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-stroke shadow-2xl overflow-y-auto max-h-[95dvh] pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stroke">
          <div className="flex items-center gap-3">
            {creator.profilePic ? (
              <img
                src={creator.profilePic}
                alt={creator.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base">
                {creator.name?.[0] || "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-ink leading-none">
                Tip {creator.name}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">@{creator.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition p-1"
            aria-label="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Preset amounts */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
              Choose amount (₦)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAmount(String(a));
                    setCustomAmount("");
                  }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    amount === String(a)
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-stroke text-ink hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  ₦{a.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-2">
              Or enter custom
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-medium">
                ₦
              </span>
              <input
                type="number"
                min="50"
                max="100000"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount("");
                }}
                placeholder="e.g. 3000"
                className="w-full pl-8 pr-4 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
              />
            </div>
            {amountNgn > 0 && !valid && (
              <p className="text-xs text-red-500 mt-1">
                Minimum ₦50 · Maximum ₦100,000
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-2">
              Add a note (optional)
            </p>
            <textarea
              rows={2}
              maxLength={150}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice…"
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition resize-none"
            />
            <p className="text-right text-xs text-ink-muted mt-1">
              {150 - message.length}
            </p>
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isAnonymous ? "bg-primary-600" : "bg-stroke"
              }`}
              onClick={() => setIsAnonymous((v) => !v)}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  isAnonymous ? "translate-x-4.5" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm text-ink-muted">Send anonymously</span>
          </label>

          {/* Secure note */}
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <FaLock size={10} /> Payments secured by Paystack
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleTip}
            disabled={!valid || loading}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary-700 transition"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FaHeart size={13} />
                Send ₦{amountNgn > 0 ? amountNgn.toLocaleString() : "—"} tip
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default TipModal;
