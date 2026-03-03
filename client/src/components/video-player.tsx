import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Loader2,
  ChevronRight, ChevronLeft, Languages, Subtitles, MonitorPlay,
  SkipForward, SkipBack, Gauge, PictureInPicture2, RotateCcw
} from "lucide-react";

interface TimeRange {
  start: number;
  end: number;
}

interface VideoPlayerProps {
  src: string;
  subtitles?: Array<{ url: string; lang: string }>;
  poster?: string;
  onError?: () => void;
  onLanguageChange?: (lang: "sub" | "dub") => void;
  currentLanguage?: "sub" | "dub";
  hasDub?: boolean;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  intro?: TimeRange;
  outro?: TimeRange;
  autoPlayNext?: boolean;
  hasNextEpisode?: boolean;
}

type SettingsPanel = "main" | "quality" | "subtitles" | "language" | "speed";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({
  src, subtitles, poster, onError, onLanguageChange,
  currentLanguage = "sub", hasDub = false, onNextEpisode, onPrevEpisode,
  onProgressUpdate, initialTime, intro, outro, autoPlayNext = true, hasNextEpisode = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<number[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>("main");
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [showSkipIndicator, setShowSkipIndicator] = useState<"forward" | "backward" | null>(null);
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(null);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [outroDismissed, setOutroDismissed] = useState(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval>>();
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const skipIndicatorTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastTapTime = useRef<number>(0);
  const lastTapSide = useRef<"left" | "right" | "center" | null>(null);
  const tapTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setPlaying(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if ((src.includes(".m3u8") || src.includes("proxy")) && Hls.isSupported()) {
      let retryCount = 0;
      const MAX_RETRIES = 3;
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setLoading(false);
        retryCount = 0;
        const levels = data.levels.map((l: any) => l.height);
        setQualities(levels);
        setCurrentQuality(-1);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            setLoading(false);
            onError?.();
            return;
          }
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => hls.startLoad(), 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setLoading(false);
              onError?.();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => setLoading(false));
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", () => setLoading(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !initialTime || initialTime <= 0) return;
    const seekToInitial = () => {
      if (video.duration && video.duration > 0 && initialTime < video.duration * 0.9) {
        video.currentTime = initialTime;
      }
      video.removeEventListener("loadedmetadata", seekToInitial);
      video.removeEventListener("canplay", seekToInitial);
    };
    video.addEventListener("loadedmetadata", seekToInitial);
    video.addEventListener("canplay", seekToInitial);
    return () => {
      video.removeEventListener("loadedmetadata", seekToInitial);
      video.removeEventListener("canplay", seekToInitial);
    };
  }, [src, initialTime]);

  useEffect(() => {
    if (!onProgressUpdate) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.currentTime > 0 && video.duration > 0) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [onProgressUpdate]);

  useEffect(() => {
    if (subtitles && subtitles.length > 0 && !activeSubtitle) {
      const englishSub = subtitles.find(s => s?.lang?.toLowerCase?.()?.includes("english"));
      if (englishSub) {
        setActiveSubtitle(englishSub.lang);
      }
    }
  }, [subtitles]);

  useEffect(() => {
    const el = settingsMenuRef.current;
    if (!el) return;
    const stopTouch = (e: TouchEvent) => {
      e.stopPropagation();
    };
    el.addEventListener("touchstart", stopTouch, { passive: true });
    el.addEventListener("touchmove", stopTouch, { passive: true });
    el.addEventListener("touchend", stopTouch, { passive: true });
    return () => {
      el.removeEventListener("touchstart", stopTouch);
      el.removeEventListener("touchmove", stopTouch);
      el.removeEventListener("touchend", stopTouch);
    };
  }, [showSettings, settingsPanel]);

  const [subtitleCues, setSubtitleCues] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [currentCueText, setCurrentCueText] = useState<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = "hidden";
    }
  }, [activeSubtitle, subtitles]);

  useEffect(() => {
    if (!activeSubtitle || !subtitles?.length) {
      setSubtitleCues([]);
      setCurrentCueText("");
      return;
    }
    const sub = subtitles.find(s => s?.lang === activeSubtitle);
    if (!sub?.url) return;

    const proxyUrl = sub.url.startsWith("/") ? sub.url : `/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`;

    const parseVttTime = (timeStr: string): number => {
      const parts = timeStr.split(":");
      if (parts.length === 3) {
        const [h, m, rest] = parts;
        const [s, ms] = rest.split(/[.,]/);
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      } else if (parts.length === 2) {
        const [m, rest] = parts;
        const [s, ms] = rest.split(/[.,]/);
        return parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      }
      return 0;
    };

    fetch(proxyUrl)
      .then(r => r.text())
      .then(text => {
        const cues: Array<{ start: number; end: number; text: string }> = [];
        const blocks = text.split(/\n\s*\n/);
        for (const block of blocks) {
          const lines = block.trim().split("\n");
          for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
            if (match) {
              const start = parseVttTime(match[1]);
              const end = parseVttTime(match[2]);
              const textLines = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
              if (textLines) cues.push({ start, end, text: textLines });
              break;
            }
          }
        }
        setSubtitleCues(cues);
      })
      .catch(() => setSubtitleCues([]));
  }, [activeSubtitle, subtitles]);

  useEffect(() => {
    if (!subtitleCues.length || !activeSubtitle) {
      setCurrentCueText("");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      const t = video.currentTime;
      const cue = subtitleCues.find(c => t >= c.start && t <= c.end);
      setCurrentCueText(cue?.text || "");
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [subtitleCues, activeSubtitle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      // Save progress immediately on pause
      if (onProgressUpdate && video.currentTime > 0 && video.duration > 0) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  useEffect(() => {
    setIntroDismissed(false);
    setOutroDismissed(false);
    setAutoPlayCountdown(null);
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  }, [src]);

  useEffect(() => {
    if (intro && intro.start < intro.end && !introDismissed) {
      setShowSkipIntro(currentTime >= intro.start && currentTime < intro.end);
    } else {
      setShowSkipIntro(false);
    }

    if (outro && outro.start < outro.end && !outroDismissed) {
      setShowSkipOutro(currentTime >= outro.start && currentTime < outro.end);
    } else {
      setShowSkipOutro(false);
    }
  }, [currentTime, intro, outro, introDismissed, outroDismissed]);

  const skipIntro = useCallback(() => {
    const video = videoRef.current;
    if (video && intro) {
      video.currentTime = intro.end;
      setShowSkipIntro(false);
      setIntroDismissed(true);
    }
  }, [intro]);

  const skipOutro = useCallback(() => {
    if (hasNextEpisode && onNextEpisode) {
      onNextEpisode();
    } else {
      const video = videoRef.current;
      if (video && outro) {
        video.currentTime = outro.end;
        setShowSkipOutro(false);
        setOutroDismissed(true);
      }
    }
  }, [outro, hasNextEpisode, onNextEpisode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      if (autoPlayNext && hasNextEpisode && onNextEpisode) {
        setAutoPlayCountdown(5);
        autoPlayTimerRef.current = setInterval(() => {
          setAutoPlayCountdown(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(autoPlayTimerRef.current);
              onNextEpisode();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [autoPlayNext, hasNextEpisode, onNextEpisode]);

  useEffect(() => {
    const onFsChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setFullscreen(isFull);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      const handleBack = (e: PopStateEvent) => {
        e.preventDefault();
        setFullscreen(false);
      };
      window.history.pushState({ fullscreen: true }, "");
      window.addEventListener("popstate", handleBack);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("popstate", handleBack);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [fullscreen]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    setShowSkipIndicator(seconds > 0 ? "forward" : "backward");
    if (skipIndicatorTimeout.current) clearTimeout(skipIndicatorTimeout.current);
    skipIndicatorTimeout.current = setTimeout(() => setShowSkipIndicator(null), 600);
  }, [duration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          skip(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          skip(10);
          break;
        case "arrowup":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case "arrowdown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [skip]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      setMuted(true);
      video.muted = true;
    } else if (muted) {
      setMuted(false);
      video.muted = false;
    }
  };

  const seekToPosition = useCallback((clientX: number) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
  }, [duration]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    seekToPosition(e.clientX);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setSeekPreview(pos * duration);
  };

  const isSeeking = useRef(false);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    isSeeking.current = true;
    const touch = e.touches[0];
    seekToPosition(touch.clientX);
  }, [seekToPosition]);

  const handleProgressTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSeeking.current) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    seekToPosition(touch.clientX);
  }, [seekToPosition]);

  const handleProgressTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    isSeeking.current = false;
  }, []);

  const isIOS = useCallback(() => {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }, []);

  const isAndroid = useCallback(() => {
    return /Android/i.test(navigator.userAgent);
  }, []);

  const isMobileOrIOS = useCallback(() => {
    return isIOS() || isAndroid();
  }, [isIOS, isAndroid]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!container || !video) return;

    if (isIOS()) {
      const v = video as any;
      if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      } else if (v.webkitRequestFullscreen) {
        v.webkitRequestFullscreen();
      }
      return;
    }

    const doc = document as any;
    const el = container as any;
    const nativeFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);

    if (!nativeFullscreen) {
      const enterFs = el.requestFullscreen
        ? el.requestFullscreen()
        : el.webkitRequestFullscreen
          ? Promise.resolve(el.webkitRequestFullscreen())
          : Promise.reject();

      enterFs
        .then(() => {
          if (isAndroid()) {
            const screenOrientation = (screen as any).orientation;
            if (screenOrientation?.lock) {
              screenOrientation.lock("landscape").catch(() => { });
            }
          }
        })
        .catch(() => {
          setFullscreen(true);
          if (isAndroid()) {
            const screenOrientation = (screen as any).orientation;
            if (screenOrientation?.lock) {
              screenOrientation.lock("landscape").catch(() => { });
            }
          }
        });
    } else {
      if (isAndroid()) {
        const screenOrientation = (screen as any).orientation;
        if (screenOrientation?.unlock) {
          try { screenOrientation.unlock(); } catch { }
        }
      }
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => setFullscreen(false));
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else {
        setFullscreen(false);
      }
    }
  }, [isIOS, isAndroid]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP not supported:", err);
    }
  };

  const setQualityLevel = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
    }
    setShowSettings(false);
    setSettingsPanel("main");
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
    setSettingsPanel("main");
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const handleTouchOnVideo = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-controls]") || (e.target as HTMLElement).closest("[data-settings]")) {
      return;
    }

    const now = Date.now();
    const container = containerRef.current;
    if (!container) return;

    const touch = e.touches[0] || e.changedTouches[0];
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const third = rect.width / 3;

    let side: "left" | "right" | "center";
    if (x < third) side = "left";
    else if (x > third * 2) side = "right";
    else side = "center";

    const timeSinceLastTap = now - lastTapTime.current;
    const isDoubleTap = timeSinceLastTap < 350 && lastTapSide.current === side;

    if (isDoubleTap && side !== "center") {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      if (side === "right") {
        skip(10);
        setDoubleTapSide("right");
      } else {
        skip(-10);
        setDoubleTapSide("left");
      }
      setTimeout(() => setDoubleTapSide(null), 500);
      lastTapTime.current = 0;
      lastTapSide.current = null;
    } else {
      lastTapTime.current = now;
      lastTapSide.current = side;

      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      tapTimeout.current = setTimeout(() => {
        if (side === "center") {
          togglePlay();
        } else {
          setShowControls(prev => {
            const next = !prev;
            if (next && playing) {
              if (hideTimeout.current) clearTimeout(hideTimeout.current);
              hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
            }
            return next;
          });
        }
        lastTapSide.current = null;
      }, 300);
    }
  }, [skip, togglePlay, playing]);

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const openSettings = () => {
    setShowSettings(!showSettings);
    setSettingsPanel("main");
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  const validSubtitles = subtitles?.filter(sub => sub && sub.lang && sub.url) || [];
  const uniqueSubtitles = validSubtitles.filter((sub, index, self) =>
    index === self.findIndex(s => s.lang === sub.lang)
  ).map(sub => ({
    ...sub,
    url: sub.url.startsWith("/") ? sub.url : `/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`,
  }));

  return (
    <div
      ref={containerRef}
      className={`w-full bg-black group cursor-pointer player-container ${fullscreen ? "rounded-none flex flex-col items-center justify-center overflow-hidden" : "relative aspect-video rounded-xl"}`}
      style={fullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, width: '100vw', height: '100dvh' } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => {
        if (showSettings && !(e.target as HTMLElement).closest("[data-settings]")) {
          setShowSettings(false);
          setSettingsPanel("main");
        }
      }}
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        className={`w-full ${fullscreen ? "flex-1 object-contain max-h-full" : "h-full object-contain"}`}
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        data-testid="video-element"
      >
        {uniqueSubtitles?.map((sub, i) => (
          <track key={`${sub.lang}-${i}`} kind="subtitles" src={sub.url} srcLang={sub.lang.slice(0, 2).toLowerCase()} label={sub.lang} />
        ))}
      </video>

      <div
        className={`absolute inset-0 ${showSettings ? "z-0 pointer-events-none" : "z-10"}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-controls]") || (e.target as HTMLElement).closest("[data-settings]")) return;
          togglePlay();
        }}
        onTouchEnd={handleTouchOnVideo}
        data-testid="video-touch-area"
      />

      {doubleTapSide && (
        <div className={`absolute top-0 bottom-0 ${doubleTapSide === "right" ? "right-0" : "left-0"} w-1/3 flex items-center justify-center z-20 pointer-events-none`}>
          <div className="flex flex-col items-center gap-1 animate-skip-indicator">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {doubleTapSide === "right" ? (
                <SkipForward className="w-6 h-6 text-white" />
              ) : (
                <SkipBack className="w-6 h-6 text-white" />
              )}
            </div>
            <span className="text-xs font-bold text-white/80">10s</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 pointer-events-none">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-white/90 animate-spin" />
            <div className="absolute -inset-2 rounded-full border border-white/10 animate-pulse" />
          </div>
        </div>
      )}

      {!playing && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl shadow-black/40 play-btn-pulse ring-4 ring-white/10">
            <Play className="w-8 h-8 text-black ml-1" fill="black" />
          </div>
        </div>
      )}

      {showSkipIndicator && (
        <div className={`absolute top-1/2 -translate-y-1/2 ${showSkipIndicator === "forward" ? "right-16" : "left-16"} flex flex-col items-center gap-1.5 animate-skip-indicator z-20 pointer-events-none`}>
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center ring-1 ring-white/10">
            {showSkipIndicator === "forward" ? (
              <SkipForward className="w-7 h-7 text-white" />
            ) : (
              <SkipBack className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="text-[11px] font-bold text-white/70 tracking-wide">10s</span>
        </div>
      )}

      {showSkipIntro && (
        <button
          onClick={(e) => { e.stopPropagation(); skipIntro(); }}
          className="absolute z-50 px-6 py-3 bg-white text-black font-bold text-sm rounded-lg shadow-2xl hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 skip-btn-animate border border-white/20"
          style={{ bottom: showControls ? "90px" : "24px", right: "16px", transition: "bottom 0.3s ease" }}
          data-testid="button-skip-intro"
        >
          Skip Intro
          <SkipForward className="w-4 h-4" />
        </button>
      )}

      {showSkipOutro && !showSkipIntro && (
        <button
          onClick={(e) => { e.stopPropagation(); skipOutro(); }}
          className="absolute z-50 px-6 py-3 bg-white text-black font-bold text-sm rounded-lg shadow-2xl hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 skip-btn-animate border border-white/20"
          style={{ bottom: showControls ? "90px" : "24px", right: "16px", transition: "bottom 0.3s ease" }}
          data-testid="button-skip-outro"
        >
          {hasNextEpisode ? "Next Episode" : "Skip Outro"}
          <SkipForward className="w-4 h-4" />
        </button>
      )}

      {autoPlayCountdown !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center mb-4 mx-auto relative">
              <span className="text-3xl font-bold text-white">{autoPlayCountdown}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="37"
                  fill="none" stroke="white" strokeWidth="4"
                  strokeDasharray={`${(autoPlayCountdown / 5) * 232.5} 232.5`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            </div>
            <p className="text-white/80 text-sm font-medium mb-4">Next episode starting...</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setAutoPlayCountdown(null);
                  if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
                }}
                className="px-5 py-2 bg-white/10 border border-white/20 text-white text-sm rounded-lg hover:bg-white/20 transition-all"
                data-testid="button-cancel-autoplay"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setAutoPlayCountdown(null);
                  if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
                  onNextEpisode?.();
                }}
                className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-all"
                data-testid="button-play-now"
              >
                Play Now
              </button>
            </div>
          </div>
        </div>
      )}

      {currentCueText && activeSubtitle && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-25"
          style={{ bottom: showControls ? "80px" : "24px", transition: "bottom 0.3s ease" }}
        >
          <div
            className="px-4 py-1.5 rounded-lg max-w-[85%] text-center"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: fullscreen ? "clamp(16px, 2.5vw, 28px)" : "clamp(12px, 1.8vw, 18px)",
              lineHeight: 1.4,
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)",
              whiteSpace: "pre-line",
            }}
            data-testid="subtitle-overlay"
          >
            {currentCueText}
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-30 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        data-controls
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-t from-black via-black/70 to-transparent px-3 sm:px-5 pb-3 sm:pb-4 pt-16 sm:pt-20">
          <div className="relative mb-3 sm:mb-4" style={{ touchAction: "none" }}>
            <div
              className="absolute inset-x-0 -top-3 -bottom-3 z-10 cursor-pointer"
              onClick={handleSeek}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setSeekPreview(null)}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
              onTouchEnd={handleProgressTouchEnd}
            />
            <div
              ref={progressRef}
              className="w-full h-1.5 sm:h-1 bg-white/10 rounded-full group/bar relative"
              data-testid="progress-bar"
            >
              <div
                className="absolute h-full bg-white/15 rounded-full transition-all"
                style={{ width: `${bufferedProgress}%` }}
              />
              <div
                className="h-full progress-gradient rounded-full relative z-[1] transition-all"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-lg shadow-white/25 transition-all ring-2 ring-white/20" />
              </div>
              {seekPreview !== null && (
                <div
                  className="absolute -top-9 transform -translate-x-1/2 glass-panel text-white text-[11px] px-2.5 py-1 rounded-lg font-mono pointer-events-none tabular-nums"
                  style={{ left: `${(seekPreview / duration) * 100}%` }}
                >
                  {formatTime(seekPreview)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {onPrevEpisode && (
              <button onClick={onPrevEpisode} className="player-btn hidden sm:flex" title="Previous Episode" data-testid="button-prev-episode">
                <SkipBack className="w-4.5 h-4.5" />
              </button>
            )}

            <button onClick={() => skip(-10)} className="player-btn" title="Back 10s (J)" data-testid="button-skip-back">
              <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            <button onClick={togglePlay} className="player-btn-primary" data-testid="button-play-pause">
              {playing ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5 ml-0.5" fill="white" />}
            </button>

            <button onClick={() => skip(10)} className="player-btn" title="Forward 10s (L)" data-testid="button-skip-forward">
              <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {onNextEpisode && (
              <button onClick={onNextEpisode} className="player-btn hidden sm:flex" title="Next Episode" data-testid="button-next-episode">
                <SkipForward className="w-4.5 h-4.5" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 group/vol ml-1">
              <button onClick={toggleMute} className="player-btn">
                {muted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
              </button>
              <div className="w-0 group-hover/vol:w-20 transition-all overflow-hidden">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-primary h-1"
                />
              </div>
            </div>

            <span className="text-white/60 text-[11px] font-mono ml-1 sm:ml-2 tabular-nums tracking-tight">
              <span className="text-white/90">{formatTime(currentTime)}</span>
              <span className="mx-0.5 sm:mx-1 text-white/30">/</span>
              {formatTime(duration)}
            </span>

            {playbackSpeed !== 1 && (
              <span className="text-white/90 text-[11px] font-bold ml-1.5 bg-white/10 px-1.5 py-0.5 rounded hidden sm:inline">{playbackSpeed}x</span>
            )}

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <button onClick={togglePiP} className="player-btn hidden sm:flex" title="Picture in Picture" data-testid="button-pip">
                <PictureInPicture2 className="w-4.5 h-4.5" />
              </button>

              <div className="relative" data-settings>
                <button
                  onClick={openSettings}
                  className={`player-btn ${showSettings ? "text-white" : ""}`}
                  data-testid="button-settings"
                >
                  <Settings className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${showSettings ? "rotate-45" : ""}`} />
                </button>
                {showSettings && (
                  <div
                    ref={settingsMenuRef}
                    className="absolute bottom-10 right-0 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl min-w-[220px] shadow-2xl settings-panel-animate settings-scroll-container"
                    data-testid="settings-menu"
                  >
                    {settingsPanel === "main" && (
                      <div className="p-1.5">
                        {qualities.length > 0 && (
                          <button
                            onClick={() => setSettingsPanel("quality")}
                            className="settings-item"
                            data-testid="settings-quality-btn"
                          >
                            <span className="flex items-center gap-2.5">
                              <MonitorPlay className="w-4 h-4 text-white" />
                              Quality
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              {currentQuality === -1 ? "Auto" : `${qualities[currentQuality]}p`}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => setSettingsPanel("speed")}
                          className="settings-item"
                          data-testid="settings-speed-btn"
                        >
                          <span className="flex items-center gap-2.5">
                            <Gauge className="w-4 h-4 text-white" />
                            Speed
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                        {onLanguageChange && (
                          <button
                            onClick={() => setSettingsPanel("language")}
                            className="settings-item"
                            data-testid="settings-language-btn"
                          >
                            <span className="flex items-center gap-2.5">
                              <Languages className="w-4 h-4 text-white" />
                              Language
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              {currentLanguage === "sub" ? "Sub" : "Dub"}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        )}
                        {uniqueSubtitles && uniqueSubtitles.length > 0 && (
                          <button
                            onClick={() => setSettingsPanel("subtitles")}
                            className="settings-item"
                            data-testid="settings-subtitles-btn"
                          >
                            <span className="flex items-center gap-2.5">
                              <Subtitles className="w-4 h-4 text-white" />
                              Subtitles
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              {activeSubtitle || "Off"}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {settingsPanel === "quality" && (
                      <div className="p-1.5">
                        <button onClick={() => setSettingsPanel("main")} className="settings-back-btn">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Quality
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={() => setQualityLevel(-1)} className={`settings-option ${currentQuality === -1 ? "text-white font-semibold" : "text-white/60"}`}>
                          Auto
                        </button>
                        {qualities.map((q, i) => (
                          <button key={q} onClick={() => setQualityLevel(i)} className={`settings-option ${currentQuality === i ? "text-white font-semibold" : "text-white/60"}`}>
                            {q}p
                          </button>
                        ))}
                      </div>
                    )}

                    {settingsPanel === "speed" && (
                      <div className="p-1.5">
                        <button onClick={() => setSettingsPanel("main")} className="settings-back-btn">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Speed
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        {SPEEDS.map((s) => (
                          <button key={s} onClick={() => changeSpeed(s)} className={`settings-option ${playbackSpeed === s ? "text-white font-semibold" : "text-white/60"}`}>
                            {s === 1 ? "Normal" : `${s}x`}
                          </button>
                        ))}
                      </div>
                    )}

                    {settingsPanel === "language" && (
                      <div className="p-1.5">
                        <button onClick={() => setSettingsPanel("main")} className="settings-back-btn">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Language
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => { onLanguageChange?.("sub"); setShowSettings(false); setSettingsPanel("main"); }}
                          className={`settings-option ${currentLanguage === "sub" ? "text-white font-semibold" : "text-white/60"}`}
                          data-testid="lang-sub"
                        >
                          Japanese (Sub)
                        </button>
                        {hasDub && (
                          <button
                            onClick={() => { onLanguageChange?.("dub"); setShowSettings(false); setSettingsPanel("main"); }}
                            className={`settings-option ${currentLanguage === "dub" ? "text-white font-semibold" : "text-white/60"}`}
                            data-testid="lang-dub"
                          >
                            English (Dub)
                          </button>
                        )}
                      </div>
                    )}

                    {settingsPanel === "subtitles" && (
                      <div className="p-1.5">
                        <button onClick={() => setSettingsPanel("main")} className="settings-back-btn">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Subtitles
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={() => { setActiveSubtitle(null); setShowSettings(false); setSettingsPanel("main"); }}
                          className={`settings-option ${activeSubtitle === null ? "text-white font-semibold" : "text-white/60"}`}
                          data-testid="subtitle-off"
                        >
                          Off
                        </button>
                        {uniqueSubtitles?.map((sub, i) => (
                          <button
                            key={`${sub.lang}-${i}`}
                            onClick={() => { setActiveSubtitle(sub.lang); setShowSettings(false); setSettingsPanel("main"); }}
                            className={`settings-option ${activeSubtitle === sub.lang ? "text-white font-semibold" : "text-white/60"}`}
                            data-testid={`subtitle-${sub.lang}`}
                          >
                            {sub.lang}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={toggleFullscreen} className="player-btn" data-testid="button-fullscreen">
                {fullscreen ? <Minimize className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Maximize className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
