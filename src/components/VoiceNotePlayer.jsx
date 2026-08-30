import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

const formatVoiceDuration = (seconds) => {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// Playback bubble for a sent voice note — static waveform bars (from
// message.voice.waveform) double as a scrubber: bars before the playhead
// fill solid, bars after stay muted. Tapping a bar seeks there. Falls back
// to a plain progress line when no waveform was captured (e.g. an older
// browser that skipped computeWaveform).
const VoiceNotePlayer = ({ voice, isMine }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [duration, setDuration] = useState(voice?.durationSeconds || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (ratio) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const bars = voice?.waveform?.length ? voice.waveform : null;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl w-[75%] min-w-56 max-w-72 ${
        isMine
          ? "bg-primary-600 text-white self-end rounded-br-sm"
          : "bg-card text-ink border border-stroke self-start rounded-bl-sm"
      }`}
    >
      <audio ref={audioRef} src={voice.url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
          isMine
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-primary-600/10 hover:bg-primary-600/20 text-primary-600"
        }`}
      >
        {isPlaying ? (
          <FaPause size={11} />
        ) : (
          <FaPlay size={11} className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {bars ? (
          <div
            className="flex items-center gap-[2px] h-6 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
            }}
          >
            {bars.map((amp, i) => {
              const played = i / bars.length <= progress;
              return (
                <span
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    isMine
                      ? played
                        ? "bg-white"
                        : "bg-white/35"
                      : played
                        ? "bg-primary-600"
                        : "bg-stroke"
                  }`}
                  style={{ height: `${Math.max(15, amp * 100)}%` }}
                />
              );
            })}
          </div>
        ) : (
          <div
            className={`h-1 rounded-full overflow-hidden cursor-pointer ${
              isMine ? "bg-white/25" : "bg-stroke"
            }`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
            }}
          >
            <div
              className={`h-full ${isMine ? "bg-white" : "bg-primary-600"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        <span
          className={`text-[11px] mt-1 block ${
            isMine ? "text-white/75" : "text-ink-muted"
          }`}
        >
          {formatVoiceDuration(isPlaying || progress ? duration * progress : duration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
