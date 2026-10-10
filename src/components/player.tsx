"use client";

import { useEffect, useRef, useState } from "react";
import type { EpisodeSource } from "@/lib/dle";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Gauge,
} from "lucide-react";

type Props = {
  source?: EpisodeSource;
  poster?: string;
  autoPlay: boolean;
  startAt?: number;
  progressEvery?: number;
  follow?: { nonce: number; time: number } | null;
  onProgress?: (time: number, duration: number) => void;
  onEnded?: () => void;
};

type Level = { index: number; label: string; height?: number; bitrate?: number };

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function isPlaylist(url: string) {
  return /\.m3u8?(?:$|[?#])/i.test(url);
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hours ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(secs).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function Player({ source, poster, autoPlay, startAt = 0, progressEvery = 15000, follow = null, onProgress, onEnded }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void; currentLevel: number; levels: { height?: number }[] } | null>(null);
  const progressRef = useRef(onProgress);
  const endedRef = useRef(onEnded);
  const startRef = useRef(startAt);
  const everyRef = useRef(progressEvery);
  everyRef.current = progressEvery;
  const autoRef = useRef(autoPlay);
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);
  const rateRef = useRef(1);
  const idleRef = useRef(false);
  const hideRef = useRef(0);
  progressRef.current = onProgress;
  endedRef.current = onEnded;
  autoRef.current = autoPlay;

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [quality, setQuality] = useState(-1);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [full, setFull] = useState(false);
  const [pip, setPip] = useState(false);
  const [idle, setIdle] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canPip, setCanPip] = useState(false);

  // Settings Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "quality" | "speed">("main");

  // Hover states for timeline preview tooltip
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  idleRef.current = idle;
  volumeRef.current = volume;
  mutedRef.current = muted;
  rateRef.current = rate;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !follow) return;
    if (Math.abs((video.currentTime || 0) - follow.time) > 4) video.currentTime = follow.time;
  }, [follow]);

  useEffect(() => {
    const savedVolume = Number(stored("ab-volume"));
    const savedRate = Number(stored("ab-rate"));
    if (Number.isFinite(savedVolume)) setVolume(Math.min(1, Math.max(0, savedVolume)));
    setMuted(stored("ab-muted") === "1");
    if (speeds.includes(savedRate)) setRate(savedRate);
    setCanPip(!!document.pictureInPictureEnabled);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted || volume === 0;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || source?.kind !== "hls") return;
    let dead = false;
    let recoveries = 0;
    const url = source.url;
    setFailed("");
    setWaiting(true);
    setStarted(false);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setBuffered(0);
    setLevels([]);
    setQuality(-1);
    setActiveLevel(-1);

    const seek = () => {
      const start = startRef.current;
      if (!(start > 5) || !Number.isFinite(video.duration) || start >= video.duration - 10) return;
      video.currentTime = start;
      startRef.current = 0;
    };

    const play = async () => {
      if (!autoRef.current || dead) return;
      try {
        await video.play();
      } catch (error) {
        if (dead || (error instanceof DOMException && error.name === "AbortError")) return;
        video.muted = true;
        setMuted(true);
        try {
          await video.play();
        } catch {
          /* autoplay blocked until a click */
        }
      }
    };

    const fail = (message: string) => {
      if (dead) return;
      setFailed(message);
      setWaiting(false);
    };

    const attachFile = () => {
      video.src = url;
      video.addEventListener("loadedmetadata", seek, { once: true });
      video.addEventListener("canplay", () => void play(), { once: true });
    };

    const attach = async () => {
      video.volume = volumeRef.current;
      video.muted = mutedRef.current || volumeRef.current === 0;
      video.playbackRate = rateRef.current;

      if (!isPlaylist(url)) {
        attachFile();
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (dead) return;

      if (Hls.isSupported()) {
        const start = startRef.current;
        const hls = new Hls({
          capLevelToPlayerSize: true,
          enableWorker: true,
          startPosition: start > 5 ? start : -1,
          maxBufferLength: 30,
          backBufferLength: 30,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        const updateLevels = () => {
          if (dead || !hls.levels || !hls.levels.length) return;
          const next = hls.levels.map((level, index) => {
            const height = level.height ? `${level.height}p` : "";
            const kbps = level.bitrate ? `${Math.round(level.bitrate / 1000)} kbps` : "";
            const twins = hls.levels.filter((item) => item.height && item.height === level.height).length > 1;
            return {
              index,
              label: height && twins ? `${height} · ${kbps}` : height || kbps || `Level ${index + 1}`,
              height: level.height,
              bitrate: level.bitrate,
            };
          });
          setLevels(next);
        };

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          updateLevels();
          seek();
          void play();
        });
        hls.on(Hls.Events.LEVEL_LOADED, updateLevels);
        hls.on(Hls.Events.LEVELS_UPDATED, updateLevels);
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          if (!dead) setActiveLevel(data.level);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal || dead) return;
          const manifest =
            data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR;
          if (manifest) {
            hls.destroy();
            hlsRef.current = null;
            attachFile();
            return;
          }
          recoveries += 1;
          if (recoveries <= 3 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (recoveries <= 3 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          hls.destroy();
          hlsRef.current = null;
          fail("ვიდეოს ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა ან აირჩიეთ სხვა სერვერი.");
        });
      } else {
        attachFile();
      }
    };

    let last = 0;
    const report = (force = false) => {
      if (!video.duration || !Number.isFinite(video.duration)) return;
      const now = Date.now();
      if (!force && now - last < everyRef.current) return;
      last = now;
      progressRef.current?.(video.currentTime, video.duration);
    };
    const onTime = () => {
      setTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      const end = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
      setBuffered(end);
      report();
    };
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      setWaiting(false);
    };
    const onPause = () => {
      setPlaying(false);
      setWaiting(false);
      report(true);
    };
    const onWait = () => setWaiting(true);
    const onReady = () => setWaiting(false);
    const onEnd = () => {
      setPlaying(false);
      report(true);
      endedRef.current?.();
    };
    const onError = () => {
      if (hlsRef.current) return;
      fail("ვიდეოს ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა ან აირჩიეთ სხვა სერვერი.");
    };
    video.addEventListener("loadedmetadata", seek);
    video.addEventListener("durationchange", seek);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onTime);
    video.addEventListener("progress", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWait);
    video.addEventListener("canplay", onReady);
    video.addEventListener("ended", onEnd);
    video.addEventListener("error", onError);
    void attach();

    return () => {
      dead = true;
      report(true);
      video.removeEventListener("loadedmetadata", seek);
      video.removeEventListener("durationchange", seek);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onTime);
      video.removeEventListener("progress", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWait);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("error", onError);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [source, attempt]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === rootRef.current);
    const onPip = () => setPip(document.pictureInPictureElement === videoRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    videoRef.current?.addEventListener("enterpictureinpicture", onPip);
    videoRef.current?.addEventListener("leavepictureinpicture", onPip);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      videoRef.current?.removeEventListener("enterpictureinpicture", onPip);
      videoRef.current?.removeEventListener("leavepictureinpicture", onPip);
    };
  }, [source]);

  useEffect(() => {
    if (source?.kind !== "hls") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (target?.closest("button, a") && (event.key === " " || event.key === "Enter")) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const video = videoRef.current;
      if (!video) return;
      const key = event.key.toLowerCase();
      if (event.key === " " || key === "k") {
        event.preventDefault();
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        video.currentTime = Math.min(video.duration || video.currentTime + 5, video.currentTime + 5);
      } else if (key === "j") {
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (key === "l") {
        event.preventDefault();
        video.currentTime = Math.min(video.duration || video.currentTime + 10, video.currentTime + 10);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMuted(false);
        setVolume((value) => {
          const next = Math.min(1, value + 0.05);
          remember("ab-volume", String(next));
          remember("ab-muted", "0");
          return next;
        });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setVolume((value) => {
          const next = Math.max(0, value - 0.05);
          remember("ab-volume", String(next));
          if (next === 0) {
            setMuted(true);
            remember("ab-muted", "1");
          }
          return next;
        });
      } else if (key === "m") {
        event.preventDefault();
        setMuted((value) => {
          remember("ab-muted", value ? "0" : "1");
          return !value;
        });
      } else if (key === "f") {
        event.preventDefault();
        void toggleFull();
      } else if (/^[0-9]$/.test(event.key) && Number.isFinite(video.duration)) {
        event.preventDefault();
        video.currentTime = (Number(event.key) / 10) * video.duration;
      } else if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [source]);

  function wake() {
    setIdle(false);
    window.clearTimeout(hideRef.current);
    const video = videoRef.current;
    if (video && !video.paused && !menuOpen) hideRef.current = window.setTimeout(() => setIdle(true), 2500);
  }

  useEffect(() => {
    wake();
    return () => window.clearTimeout(hideRef.current);
  }, [playing, menuOpen]);

  function toggle() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds));
  }

  async function toggleFull() {
    const root = rootRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!root || !video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (typeof root.requestFullscreen === "function") {
        await root.requestFullscreen();
        return;
      }
    } catch {
      /* iOS fallback */
    }
    if (!video.webkitEnterFullscreen) return;
    video.controls = true;
    const restore = () => {
      video.controls = false;
      video.removeEventListener("webkitendfullscreen", restore);
    };
    video.addEventListener("webkitendfullscreen", restore);
    video.webkitEnterFullscreen();
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }

  function chooseQuality(index: number) {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = index;
    setQuality(index);
    setSettingsView("main");
  }

  function chooseRate(next: number) {
    setRate(next);
    remember("ab-rate", String(next));
    setSettingsView("main");
  }

  function changeVolume(next: number) {
    setVolume(next);
    setMuted(next === 0);
    remember("ab-volume", String(next));
    remember("ab-muted", next === 0 ? "1" : "0");
  }

  function toggleMute() {
    if (volume === 0) {
      setVolume(1);
      setMuted(false);
      remember("ab-volume", "1");
      remember("ab-muted", "0");
      return;
    }
    setMuted((value) => {
      remember("ab-muted", value ? "0" : "1");
      return !value;
    });
  }

  function commitSeek(next: number) {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, Math.max(0, next));
    setTime(next);
    setScrub(null);
  }

  function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    video.currentTime = targetTime;
    setTime(targetTime);
    setScrub(null);
  }

  function handleSeekMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * duration);
  }

  function handleSeekMouseLeave() {
    setHoverTime(null);
  }

  if (!source) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center bg-neutral-950">
        {poster ? <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 filter blur-sm" /> : null}
        <div className="relative z-10 max-w-sm rounded-2xl bg-black/60 p-6 backdrop-blur-md border border-white/10 shadow-2xl">
          <Sparkles className="w-10 h-10 text-rose-500 mx-auto mb-3 opacity-80" />
          <p className="text-lg font-semibold text-white">ეს ეპიზოდი ჯერ ხელმისაწვდომი არ არის</p>
          <p className="mt-1 text-sm text-white/60">გთხოვთ შეამოწმოთ მოგვიანებით.</p>
        </div>
      </div>
    );
  }

  if (source.kind === "embed") {
    return (
      <iframe
        key={source.url}
        src={source.url}
        title="ეპიზოდის პლეერი"
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    );
  }

  const shown = scrub ?? time;
  const length = duration || 0;
  const played = length ? Math.min(100, (shown / length) * 100) : 0;
  const cached = length ? Math.min(100, (buffered / length) * 100) : 0;

  const activeLabel = levels.find((level) => level.index === activeLevel)?.label;
  const qualityBadgeText =
    quality === -1
      ? activeLabel
        ? `ავტო (${activeLabel.split("·")[0].trim()})`
        : "ავტო"
      : levels.find((level) => level.index === quality)?.label.split("·")[0].trim() ?? "ავტო";

  return (
    <div
      ref={rootRef}
      className={`ab-player group absolute inset-0 overflow-hidden bg-black select-none ${idle && playing ? "is-idle" : ""}`}
      onMouseMove={wake}
      onMouseLeave={() => playing && !menuOpen && setIdle(true)}
    >
      {/* Main Video Tag */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain bg-black" poster={poster} playsInline preload="metadata" />

      {/* Poster image preview before play */}
      {poster && !started ? <img src={poster} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" /> : null}

      {/* Click layer for pause/play toggle */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 z-[1] cursor-pointer"
        onClick={() => {
          setMenuOpen(false);
          if (window.matchMedia("(pointer: coarse)").matches && idleRef.current) wake();
          else toggle();
        }}
      />

      {/* Modern Spinner */}
      {waiting && !failed ? (
        <div className="pointer-events-none absolute inset-0 z-[3] grid place-items-center bg-black/20 backdrop-blur-[2px]">
          <div className="relative grid place-items-center">
            <div className="h-12 w-12 rounded-full border-3 border-white/20 border-t-rose-500 animate-spin" />
          </div>
        </div>
      ) : null}

      {/* Center Big Play Button */}
      {!playing && !waiting && !failed ? (
        <button
          type="button"
          className="ab-big-play absolute inset-0 z-[3] m-auto grid h-16 w-16 place-items-center rounded-full bg-rose-600/90 hover:bg-rose-500 text-white backdrop-blur-md border border-white/20 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          aria-label="დაკვრა"
          onClick={toggle}
        >
          <Play className="w-8 h-8 fill-current ml-1" />
        </button>
      ) : null}

      {/* Failure Overlay */}
      {failed ? (
        <div className="absolute inset-0 z-[5] grid place-items-center bg-black/85 px-6 text-center backdrop-blur-md">
          <div className="max-w-md rounded-2xl bg-neutral-900/90 p-6 border border-white/10 shadow-2xl">
            <p className="text-base font-semibold text-white mb-3">{failed}</p>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
              onClick={() => setAttempt((value) => value + 1)}
            >
              ხელახლა ცდა
            </button>
          </div>
        </div>
      ) : null}

      {/* Controls UI Bar */}
      <div className="ab-ui absolute bottom-0 inset-x-0 z-[4] flex flex-col gap-2 px-4 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300">
        
        {/* Timeline Bar (Item #1 & #2: Small clean white dot, no glowing shadows, enlarged click hit area) */}
        <div
          className="ab-seekwrap relative h-7 py-1.5 flex items-center cursor-pointer group/seek"
          onClick={handleSeekClick}
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={handleSeekMouseLeave}
        >
          {/* Hover Preview Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="ab-time-tooltip absolute bottom-8 -translate-x-1/2 rounded-md bg-black/90 px-2 py-0.5 text-[11px] font-medium text-white border border-white/10 backdrop-blur-md shadow-lg pointer-events-none z-20"
              style={{ left: `${hoverPos}%` }}
            >
              {clock(hoverTime)}
            </div>
          )}

          {/* Timeline Background Tracks */}
          <div className="ab-seekbg relative w-full h-1 group-hover/seek:h-1.5 rounded-full bg-white/20 overflow-hidden transition-all duration-150">
            <span className="ab-cached absolute top-0 bottom-0 left-0 bg-white/30" style={{ width: `${cached}%` }} />
            <span className="ab-played absolute top-0 bottom-0 left-0 bg-rose-500" style={{ width: `${played}%` }} />
          </div>

          {/* Range Slider Input taking full h-7 height so clicking near timeline triggers seek */}
          <input
            className="ab-seek absolute -inset-y-1 inset-x-0 w-full h-auto opacity-0 cursor-pointer z-10"
            type="range"
            min={0}
            max={length || 0}
            step={0.1}
            value={Math.min(shown, length || 0)}
            aria-label="გადახვევა"
            disabled={!length}
            onInput={(event) => setScrub(Number(event.currentTarget.value))}
            onChange={(event) => commitSeek(Number(event.currentTarget.value))}
          />

          {/* Small Clean White Dot Handle (Item #1 - No neon shadow, no extra red glow) */}
          {length > 0 && (
            <div
              className="ab-thumb pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-md transition-all duration-75"
              style={{ left: `${played}%` }}
            />
          )}
        </div>

        {/* Control Bar Buttons Row */}
        <div className="ab-bar flex items-center gap-1.5 sm:gap-2">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            className="ab-btn group/btn relative grid h-9 w-9 place-items-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            aria-label={playing ? "პაუზა" : "დაკვრა"}
            onClick={toggle}
          >
            {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Quick Skip Buttons */}
          <button
            type="button"
            className="ab-btn hidden sm:grid h-9 w-9 place-items-center rounded-xl text-white/75 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="-10 წამი"
            onClick={() => skip(-10)}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="ab-btn hidden sm:grid h-9 w-9 place-items-center rounded-xl text-white/75 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="+10 წამი"
            onClick={() => skip(10)}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time Display */}
          <span className="ab-time text-xs font-semibold tabular-nums text-white/90 px-1.5">
            {clock(shown)} <span className="text-white/50 font-normal">/ {clock(length)}</span>
          </span>

          {/* Volume Controls (Item #4: Red filled progress line with small white dot handle) */}
          <div className="ab-volume flex items-center group/vol relative">
            <button
              type="button"
              className="ab-btn grid h-9 w-9 place-items-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
              aria-label={muted || volume === 0 ? "ხმის ჩართვა" : "დადუმება"}
              onClick={toggleMute}
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-rose-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div className="w-0 group-hover/vol:w-24 group-focus-within/vol:w-24 overflow-hidden transition-all duration-200 flex items-center pr-2">
              <div className="relative w-20 h-5 flex items-center cursor-pointer">
                {/* Background Track */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  {/* Red Filled Bar */}
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${muted ? 0 : volume * 100}%` }}
                  />
                </div>
                {/* Small White Dot Handle (Shows only on hover) */}
                <div
                  className="pointer-events-none absolute w-2.5 h-2.5 bg-white rounded-full shadow -translate-x-1/2 opacity-0 group-hover/vol:opacity-100 group-focus-within/vol:opacity-100 transition-opacity duration-150"
                  style={{ left: `${muted ? 0 : volume * 100}%` }}
                />
                {/* Input Slider */}
                <input
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  aria-label="ხმა"
                  onInput={(event) => changeVolume(Number(event.currentTarget.value))}
                  onChange={(event) => changeVolume(Number(event.currentTarget.value))}
                />
              </div>
            </div>
          </div>

          <span className="flex-1" />

          {/* Unified Settings Gear Icon & Menu (Item #3 & #5) */}
          <div className="ab-popwrap relative">
            <button
              type="button"
              className={`ab-btn grid h-9 w-9 place-items-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer ${
                menuOpen ? "bg-white/15 text-white" : ""
              }`}
              aria-label="პარამეტრები"
              title="პარამეტრები"
              onClick={() => {
                setMenuOpen((prev) => {
                  if (!prev) setSettingsView("main");
                  return !prev;
                });
              }}
            >
              <Settings className={`w-5 h-5 transition-transform duration-300 ${menuOpen ? "rotate-45 text-rose-500" : ""}`} />
            </button>

            {/* Unified Settings Dropdown Menu */}
            {menuOpen && (
              <div className="ab-pop absolute right-0 bottom-11 z-30 min-w-[200px] rounded-xl bg-neutral-900/95 p-1.5 border border-white/10 backdrop-blur-md shadow-xl text-sm font-medium">
                {settingsView === "main" && (
                  <div className="flex flex-col gap-0.5">
                    {/* Quality Sub-menu item */}
                    <button
                      type="button"
                      className="flex items-center justify-between w-full h-9 px-3 rounded-lg text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      onClick={() => setSettingsView("quality")}
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                        <span>ხარისხი</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/50 text-[11px]">
                        <span>{qualityBadgeText}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Speed Sub-menu item */}
                    <button
                      type="button"
                      className="flex items-center justify-between w-full h-9 px-3 rounded-lg text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      onClick={() => setSettingsView("speed")}
                    >
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-rose-500" />
                        <span>სიჩქარე</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/50 text-[11px]">
                        <span>{rate === 1 ? "ჩვეულებრივი" : `${rate}x`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>
                )}

                {settingsView === "quality" && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full h-8 px-2.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 mb-1 border-b border-white/10 pb-1 cursor-pointer"
                      onClick={() => setSettingsView("main")}
                    >
                      <ChevronLeft className="w-4 h-4 text-rose-500" />
                      <span>ხარისხი</span>
                    </button>
                    
                    <button
                      type="button"
                      className={`flex items-center justify-between w-full h-8 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        quality === -1 ? "bg-rose-500/20 text-rose-400 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => chooseQuality(-1)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>ავტო</span>
                        {activeLabel && <span className="text-[10px] text-white/40">({activeLabel.split("·")[0].trim()})</span>}
                      </span>
                      {quality === -1 && <Check className="w-4 h-4 text-rose-500" />}
                    </button>

                    {levels.length > 0 ? (
                      [...levels].reverse().map((level) => (
                        <button
                          key={level.index}
                          type="button"
                          className={`flex items-center justify-between w-full h-8 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            quality === level.index ? "bg-rose-500/20 text-rose-400 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => chooseQuality(level.index)}
                        >
                          <span>{level.label}</span>
                          {quality === level.index && <Check className="w-4 h-4 text-rose-500" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-white/50 text-center">
                        სხვა ხარისხი მიუწვდომელია
                      </div>
                    )}
                  </div>
                )}

                {settingsView === "speed" && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full h-8 px-2.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 mb-1 border-b border-white/10 pb-1 cursor-pointer"
                      onClick={() => setSettingsView("main")}
                    >
                      <ChevronLeft className="w-4 h-4 text-rose-500" />
                      <span>სიჩქარე</span>
                    </button>
                    
                    {speeds.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`flex items-center justify-between w-full h-8 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          rate === item ? "bg-rose-500/20 text-rose-400 font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                        onClick={() => chooseRate(item)}
                      >
                        <span>{item === 1 ? "ჩვეულებრივი (1x)" : `${item}x`}</span>
                        {rate === item && <Check className="w-4 h-4 text-rose-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Picture in Picture */}
          {canPip && (
            <button
              type="button"
              className={`ab-btn grid h-9 w-9 place-items-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer ${
                pip ? "text-rose-400 bg-white/10" : ""
              }`}
              aria-label="სურათი სურათში"
              title="სურათი სურათში"
              onClick={() => void togglePip()}
            >
              <PictureInPicture2 className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            className="ab-btn grid h-9 w-9 place-items-center rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            aria-label={full ? "სრული ეკრანიდან გამოსვლა" : "სრული ეკრანი"}
            title={full ? "სრული ეკრანიდან გამოსვლა" : "სრული ეკრანი"}
            onClick={() => void toggleFull()}
          >
            {full ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

