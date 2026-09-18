import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiCheck, FiArrowRight } from "react-icons/fi";

const ALL_TOPICS = [
  { id: "technology", label: "Technology", emoji: "💻" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "art", label: "Art", emoji: "🎨" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "politics", label: "Politics", emoji: "🏛️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "finance", label: "Finance", emoji: "📈" },
  { id: "health", label: "Health", emoji: "🩺" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "news", label: "News", emoji: "📰" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "books", label: "Books", emoji: "📖" },
];

const ChooseInterests = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTopic = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length >= 10
        ? prev
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.put("/users/interests", { interests: selected });
      updateUser?.({ interests: selected });
      navigate("/", { replace: true });
    } catch {
      toast.error("Couldn't save interests. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => navigate("/", { replace: true });

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-ink font-bold text-4xl">
            Tron<span className="text-primary-600">ites</span>
          </span>
          <h2 className="text-2xl font-bold text-ink mt-4 mb-1">
            What are you into?
          </h2>
          <p className="text-ink-muted text-sm">
            Pick 5–10 topics. We'll personalise your feed around them.{" "}
            {selected.length >= 10 && (
              <span className="text-amber-500 font-medium">Max 10 reached</span>
            )}
          </p>
        </div>

        {/* Topic grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          {ALL_TOPICS.map((topic) => {
            const isSelected = selected.includes(topic.id);
            const isDisabled = !isSelected && selected.length >= 10;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                disabled={isDisabled}
                className={`relative flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-primary-50 border-primary-600 text-ink"
                    : isDisabled
                    ? "border-stroke text-ink-muted opacity-40 cursor-not-allowed"
                    : "border-stroke text-ink hover:border-primary-400 hover:bg-surface"
                }`}
              >
                <span className="text-xl shrink-0">{topic.emoji}</span>
                <span className="text-sm font-medium truncate">{topic.label}</span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                    <FiCheck size={9} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs text-ink-muted">
            {selected.length} / 10 topics selected
            {selected.length < 5 && selected.length > 0 && (
              <span className="text-amber-500"> (pick at least 5)</span>
            )}
          </p>
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i < selected.length ? "bg-primary-600" : "bg-stroke"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {submitting ? "Saving…" : (
              <>
                Continue
                <FiArrowRight size={15} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-sm text-ink-muted hover:text-ink transition py-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseInterests;
