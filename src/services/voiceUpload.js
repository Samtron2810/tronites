// Voice-note recorder + uploader — sibling to videoUpload.js but records
// via MediaRecorder instead of picking a file. Same signed-upload contract:
// POST /messages/signature/voice for params, then a direct XHR to
// Cloudinary, then the caller creates the message via
// POST /messages/:userId/voice with the finished asset.

import api from "./api";

export const MAX_VOICE_DURATION_SECONDS = 120; // 2 minutes, enforced client-side
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

// Picks the first MIME type this browser's MediaRecorder actually supports.
// Safari lacks audio/webm entirely, hence the audio/mp4 fallback.
export const getSupportedVoiceMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export const isVoiceRecordingSupported = () =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined";

// Downsamples a recorded Blob into a fixed-length array of 0–1 amplitude
// values via Web Audio's offline decode — purely cosmetic (drives the
// static waveform bar rendered in the sent bubble, mirroring WhatsApp/
// Telegram). Never blocks sending if it fails; caller falls back to [].
export const computeWaveform = async (blob, samples = 40) => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples) || 1;
    const waveform = [];
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      waveform.push(sum / blockSize);
    }
    audioCtx.close();
    const max = Math.max(...waveform, 0.0001);
    return waveform.map((v) => Math.min(1, v / max));
  } catch {
    return [];
  }
};

// Thin wrapper around MediaRecorder that exposes start/stop/cancel plus a
// live elapsed-seconds callback. One instance per in-progress recording —
// Chat.jsx creates a fresh one each time the mic button is pressed.
export class VoiceRecorder {
  constructor({ onTick, onMaxDuration } = {}) {
    this.onTick = onTick;
    this.onMaxDuration = onMaxDuration;
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.startedAt = null;
    this.tickInterval = null;
    this.mimeType = getSupportedVoiceMimeType();
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(
      this.stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined,
    );
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
    this.startedAt = Date.now();
    this.tickInterval = setInterval(() => {
      const elapsed = (Date.now() - this.startedAt) / 1000;
      this.onTick?.(elapsed);
      if (elapsed >= MAX_VOICE_DURATION_SECONDS) {
        this.onMaxDuration?.();
      }
    }, 200);
  }

  _cleanupStream() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  // Resolves with { blob, durationSeconds } once the recorder has fully
  // flushed its last chunk.
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        reject(new Error("Recorder not active"));
        return;
      }
      const durationSeconds = (Date.now() - this.startedAt) / 1000;
      this.recorder.onstop = () => {
        this._cleanupStream();
        const blob = new Blob(this.chunks, {
          type: this.mimeType || "audio/webm",
        });
        resolve({ blob, durationSeconds });
      };
      this.recorder.stop();
    });
  }

  // Discards the in-progress recording without resolving a Blob.
  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this._cleanupStream();
  }
}

// Uploads the recorded Blob to Cloudinary. Same signed-params contract as
// uploadVideoMessageToCloudinary — only the endpoint/folder differ, and
// there's no `eager` param since nothing needs trimming/transcoding.
export const uploadVoiceMessageToCloudinary = async ({ blob, onProgress }) => {
  const { data: config } = await api.post("/messages/signature/voice");
  const { signature, timestamp, apiKey, cloudName, folder } = config;

  const formData = new FormData();
  const extension = blob.type.includes("mp4") ? "m4a" : "webm";
  formData.append("file", blob, `voice-note.${extension}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Unexpected response from Cloudinary"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(
          new Error(body?.error?.message || "Voice note upload failed — try again"),
        );
      }
    };
    xhr.onerror = () =>
      reject(new Error("Network error during upload — check your connection"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.send(formData);
  });

  if (!response.public_id || !response.secure_url) {
    throw new Error("Upload succeeded but the response was incomplete");
  }

  return {
    publicId: response.public_id,
    url: response.secure_url,
    durationSeconds: response.duration ?? null,
  };
};
