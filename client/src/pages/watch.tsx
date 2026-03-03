import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, List, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import VideoPlayer from "@/components/video-player";
import CommentsSection from "@/components/comments";
import type { AnimeData, AnimeEpisode, WatchHistory } from "@shared/schema";

interface StreamSearchResult {
  id: string;
  title: string;
  image?: string;
  url?: string;
}

interface StreamEpisode {
  id: string;
  number: number;
  title?: string;
  isDubbed?: boolean;
  isSubbed?: boolean;
}

interface StreamInfo {
  id: string;
  title: string;
  episodes: StreamEpisode[];
  subOrDub?: string;
  hasSub?: boolean;
  hasDub?: boolean;
}

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface TimeRange {
  start: number;
  end: number;
}

interface StreamData {
  sources: StreamSource[];
  subtitles?: Array<{ url: string; lang: string }>;
  headers?: Record<string, string>;
  intro?: TimeRange;
  outro?: TimeRange;
}

export default function Watch() {
  const { animeId, episodeNum } = useParams<{ animeId: string; episodeNum: string }>();
  const currentEp = parseInt(episodeNum || "1", 10);
  const [, navigate] = useLocation();
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [audioLang, setAudioLang] = useState<"sub" | "dub">("sub");
  const [activeProvider, setActiveProvider] = useState<string>("animekai");
  const [triedProviders, setTriedProviders] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: animeData, isLoading: loadingAnime } = useQuery<{ data: AnimeData }>({
    queryKey: ["/api/jikan/anime", animeId],
  });

  const { data: episodesData, isLoading: loadingEpisodes } = useQuery<{ data: AnimeEpisode[] }>({
    queryKey: ["/api/anime-episodes", animeId],
  });

  const anime = animeData?.data;
  const episodes = episodesData?.data || [];
  const currentEpisode = episodes.find((ep) => ep.mal_id === currentEp);
  const title = anime ? (anime.title_english || anime.title) : "Loading...";
  const imageUrl = anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url;

  const totalEpisodes = anime?.episodes || episodes.length;
  const hasNext = currentEp < totalEpisodes;
  const hasPrev = currentEp > 1;

  const navigateToNextEpisode = useCallback(() => {
    if (hasNext) {
      navigate(`/watch/${animeId}/${currentEp + 1}`);
    }
  }, [hasNext, animeId, currentEp, navigate]);

  const providerChain = ["animekai", "animepahe", "hianime"];

  const switchToNextProvider = () => {
    const currentIdx = providerChain.indexOf(activeProvider);
    const nextProvider = providerChain[currentIdx + 1];
    if (nextProvider && !triedProviders.has(nextProvider)) {
      setTriedProviders(prev => { const next = new Set(Array.from(prev)); next.add(activeProvider); return next; });
      setActiveProvider(nextProvider);
      setSelectedStreamId(null);
      setStreamError(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    setActiveProvider("animekai");
    setTriedProviders(new Set());
    setSelectedStreamId(null);
  }, [animeId]);

  const searchQuery = anime ? (anime.title_english || anime.title) : "";
  const { data: streamSearchData, isLoading: searchingStream, error: searchError } = useQuery<{ results: StreamSearchResult[]; provider?: string }>({
    queryKey: ["/api/stream/search", searchQuery, activeProvider],
    queryFn: async () => {
      if (!searchQuery) return { results: [] };
      const res = await fetch(`/api/stream/search?q=${encodeURIComponent(searchQuery)}&provider=${activeProvider}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!searchQuery,
    retry: false,
  });

  const streamAnimeId = selectedStreamId || streamSearchData?.results?.[0]?.id;

  const { data: streamInfo, isLoading: loadingStreamInfo, error: streamInfoError } = useQuery<StreamInfo & { provider?: string }>({
    queryKey: ["/api/stream/info", streamAnimeId, activeProvider],
    queryFn: async () => {
      if (!streamAnimeId) throw new Error("No stream ID");
      const res = await fetch(`/api/stream/info/${encodeURIComponent(streamAnimeId)}?provider=${activeProvider}`);
      if (!res.ok) throw new Error("Info fetch failed");
      return res.json();
    },
    enabled: !!streamAnimeId,
    retry: false,
  });

  const streamEpisode = streamInfo?.episodes?.find((ep: StreamEpisode) => ep.number === currentEp);
  const streamEpisodeId = streamEpisode?.id;
  const hasDub = streamEpisode?.isDubbed || streamInfo?.hasDub || false;

  const { data: streamData, isLoading: loadingStream, error: streamFetchError } = useQuery<StreamData>({
    queryKey: ["/api/stream/watch", streamEpisodeId, audioLang, activeProvider],
    queryFn: async () => {
      if (!streamEpisodeId) throw new Error("No episode ID");
      const dubParam = audioLang === "dub" ? "&dub=true" : "";
      const res = await fetch(`/api/stream/watch/${encodeURIComponent(streamEpisodeId)}?provider=${activeProvider}${dubParam}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Stream fetch failed");
      }
      return res.json();
    },
    enabled: !!streamEpisodeId,
    retry: false,
  });

  useEffect(() => {
    if ((searchError || streamFetchError || streamInfoError) && providerChain.indexOf(activeProvider) < providerChain.length - 1) {
      switchToNextProvider();
    }
  }, [searchError, streamFetchError, streamInfoError, activeProvider]);

  useEffect(() => {
    if (streamInfo && !streamEpisode && providerChain.indexOf(activeProvider) < providerChain.length - 1) {
      switchToNextProvider();
    }
  }, [streamInfo, streamEpisode, activeProvider]);

  const rawStreamUrl = streamData?.sources?.find((s) => s.quality === "1080p" || s.quality === "default" || s.isM3U8)?.url
    || streamData?.sources?.[0]?.url;

  const referer = streamData?.headers?.Referer || "";
  const streamUrl = rawStreamUrl
    ? `/api/stream/proxy?url=${encodeURIComponent(rawStreamUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`
    : undefined;

  const { data: continueData } = useQuery<WatchHistory[]>({
    queryKey: ["/api/continue-watching"],
  });

  const savedProgress = continueData?.find(
    (h) => h.animeId === Number(animeId) && h.episodeNumber === currentEp
  );
  const initialTime = savedProgress?.watchProgress || 0;

  const historyMutation = useMutation({
    mutationFn: async () => {
      if (!anime) return;
      await apiRequest("POST", "/api/history", {
        animeId: Number(animeId),
        episodeNumber: currentEp,
        title: anime.title_english || anime.title,
        imageUrl: imageUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/continue-watching"] });
    },
  });

  const progressThrottleRef = useRef<number>(0);
  const lastProgressRef = useRef<{ currentTime: number; duration: number } | null>(null);

  const saveProgressNow = useCallback((ct?: number, dur?: number) => {
    const currentTime = ct ?? lastProgressRef.current?.currentTime;
    const videoDuration = dur ?? lastProgressRef.current?.duration;
    if (!currentTime || !videoDuration || currentTime <= 0) return;
    const payload = JSON.stringify({
      animeId: Number(animeId),
      episodeNumber: currentEp,
      watchProgress: Math.floor(currentTime),
      videoDuration: Math.floor(videoDuration),
    });
    // Use sendBeacon for reliability during page unload, fetch otherwise
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/history/progress", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/history/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => { });
    }
  }, [animeId, currentEp]);

  const handleProgressUpdate = useCallback((currentTime: number, videoDuration: number) => {
    lastProgressRef.current = { currentTime, duration: videoDuration };
    const now = Date.now();
    if (now - progressThrottleRef.current < 5000) return;
    progressThrottleRef.current = now;
    fetch("/api/history/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animeId: Number(animeId),
        episodeNumber: currentEp,
        watchProgress: Math.floor(currentTime),
        videoDuration: Math.floor(videoDuration),
      }),
    }).catch(() => { });
  }, [animeId, currentEp]);

  // Save progress on tab close, navigate away, or tab hide
  useEffect(() => {
    const onBeforeUnload = () => saveProgressNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveProgressNow();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      // Save one last time when component unmounts (navigation away)
      saveProgressNow();
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [saveProgressNow]);

  useEffect(() => {
    if (anime && animeId && currentEp) {
      historyMutation.mutate();
    }
  }, [animeId, currentEp, anime?.mal_id]);

  useEffect(() => {
    setStreamError(false);
  }, [animeId, currentEp, audioLang, activeProvider]);

  const handleLanguageChange = (lang: "sub" | "dub") => {
    setAudioLang(lang);
    setStreamError(false);
  };

  const isLoadingVideo = searchingStream || loadingStreamInfo || loadingStream;

  if (loadingAnime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-4xl px-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="page-watch">
      <div className="bg-white/[0.02] border-b border-white/[0.05] px-4 md:px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/anime/${animeId}`}>
              <Button size="icon" variant="ghost" className="rounded-lg text-white/40" data-testid="button-back-to-anime">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate text-white/90" data-testid="text-anime-title">{title}</h1>
              <p className="text-xs text-white/25">
                Episode {currentEp}{currentEpisode?.title ? ` - ${currentEpisode.title}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowEpisodeList(!showEpisodeList)}
              className="md:hidden rounded-lg text-white/40"
              data-testid="button-toggle-episodes"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row">
        <div className="flex-1 p-4 md:p-6">
          <div className="mb-5" data-testid="video-player-area">
            {streamUrl && !streamError ? (
              <VideoPlayer
                src={streamUrl}
                poster={imageUrl}
                subtitles={streamData?.subtitles}
                onError={() => {
                  if (!switchToNextProvider()) {
                    setStreamError(true);
                  }
                }}
                onLanguageChange={handleLanguageChange}
                currentLanguage={audioLang}
                hasDub={hasDub}
                onProgressUpdate={handleProgressUpdate}
                initialTime={initialTime}
                intro={streamData?.intro}
                outro={streamData?.outro}
                onNextEpisode={navigateToNextEpisode}
                hasNextEpisode={hasNext}
                autoPlayNext={true}
              />
            ) : isLoadingVideo && !streamError ? (
              <div className="aspect-video bg-black rounded-xl flex items-center justify-center border border-white/[0.04]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-white/60 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-white/25">Finding episode stream...</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-black rounded-xl flex items-center justify-center border border-white/[0.04]">
                <div className="text-center p-8">
                  <AlertCircle className="w-12 h-12 text-white/15 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white/70 mb-2">Stream Not Available</h3>
                  <p className="text-sm text-white/25 max-w-md mx-auto mb-4">
                    This episode is not available for streaming right now. Try a different episode or check back later.
                  </p>
                  {streamSearchData?.results && streamSearchData.results.length > 1 && (
                    <div className="mt-4">
                      <p className="text-xs text-white/20 mb-2">Try a different version:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {streamSearchData.results.slice(0, 5).map((r) => (
                          <Button
                            key={r.id}
                            size="sm"
                            variant={streamAnimeId === r.id ? "secondary" : "outline"}
                            onClick={() => setSelectedStreamId(r.id)}
                            className={`text-xs rounded-lg ${streamAnimeId === r.id
                                ? "border-white/20 bg-white/[0.08] text-white"
                                : "border-white/[0.06] text-white/30"
                              }`}
                            data-testid={`stream-option-${r.id}`}
                          >
                            {r.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {anime?.trailer?.youtube_id && (
                    <div className="mt-4">
                      <p className="text-xs text-white/20 mb-2">Watch trailer instead:</p>
                      <iframe
                        src={`https://www.youtube.com/embed/${anime.trailer.youtube_id}?autoplay=0`}
                        className="w-full max-w-lg mx-auto aspect-video rounded-lg border border-white/[0.06]"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title={`${title} Trailer`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {streamSearchData?.results && streamSearchData.results.length > 1 && streamUrl && !streamError && (
            <div className="mb-5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-white/20 uppercase tracking-wider">Source</span>
              {streamSearchData.results.slice(0, 5).map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={streamAnimeId === r.id ? "secondary" : "outline"}
                  onClick={() => setSelectedStreamId(r.id)}
                  className={`text-xs rounded-lg ${streamAnimeId === r.id
                      ? "border-white/20 bg-white/[0.08] text-white"
                      : "border-white/[0.06] text-white/30"
                    }`}
                  data-testid={`stream-source-${r.id}`}
                >
                  {r.title}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mb-6">
            <Link href={hasPrev ? `/watch/${animeId}/${currentEp - 1}` : "#"}>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                className="gap-1.5 rounded-lg border-white/[0.06] text-white/50"
                data-testid="button-prev-episode"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
            </Link>
            <span className="text-sm text-white/25 tabular-nums">
              Episode <span className="text-white/60">{currentEp}</span> of {totalEpisodes || "?"}
            </span>
            <Link href={hasNext ? `/watch/${animeId}/${currentEp + 1}` : "#"}>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                className="gap-1.5 rounded-lg border-white/[0.06] text-white/50"
                data-testid="button-next-episode"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-5">
            <h2 className="font-bold mb-2 text-white/90">
              Episode {currentEp}{currentEpisode?.title ? `: ${currentEpisode.title}` : ""}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              {currentEpisode?.aired && (
                <span className="text-xs text-white/20">
                  Aired: {new Date(currentEpisode.aired).toLocaleDateString()}
                </span>
              )}
              {currentEpisode?.filler && <Badge variant="destructive" className="text-[10px]">Filler</Badge>}
              {currentEpisode?.recap && <Badge variant="secondary" className="text-[10px]">Recap</Badge>}
            </div>
            <p className="text-sm text-white/30 leading-relaxed">
              {anime?.synopsis?.slice(0, 300)}...
            </p>
          </div>

          <CommentsSection animeId={Number(animeId)} episodeNumber={currentEp} />
        </div>

        <div className={`w-full md:w-80 border-l border-white/[0.04] bg-white/[0.01] ${showEpisodeList ? "block" : "hidden md:block"}`}>
          <div className="p-4 border-b border-white/[0.05]">
            <h3 className="font-bold text-sm text-white/80">Episodes</h3>
            <p className="text-xs text-white/20">{totalEpisodes} episodes</p>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-2 space-y-0.5">
              {loadingEpisodes ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full mb-1 rounded-lg" />
                ))
              ) : episodes.length > 0 ? (
                episodes.map((ep) => (
                  <Link key={ep.mal_id} href={`/watch/${animeId}/${ep.mal_id}`}>
                    <div
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${ep.mal_id === currentEp
                          ? "bg-white/[0.07] border border-white/[0.08]"
                          : "hover:bg-white/[0.03] border border-transparent"
                        }`}
                      data-testid={`episode-link-${ep.mal_id}`}
                    >
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${ep.mal_id === currentEp ? "bg-white text-black" : "bg-white/[0.04] text-white/30"
                        }`}>
                        {ep.mal_id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${ep.mal_id === currentEp ? "text-white" : "text-white/50"}`}>{ep.title || `Episode ${ep.mal_id}`}</p>
                        {ep.filler && <span className="text-[10px] text-red-400">Filler</span>}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                Array.from({ length: Math.min(totalEpisodes || 0, 100) }, (_, i) => i + 1).map((epNum) => (
                  <Link key={epNum} href={`/watch/${animeId}/${epNum}`}>
                    <div
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${epNum === currentEp
                          ? "bg-white/[0.07] border border-white/[0.08]"
                          : "hover:bg-white/[0.03] border border-transparent"
                        }`}
                      data-testid={`episode-link-${epNum}`}
                    >
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${epNum === currentEp ? "bg-white text-black" : "bg-white/[0.04] text-white/30"
                        }`}>
                        {epNum}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${epNum === currentEp ? "text-white" : "text-white/50"}`}>Episode {epNum}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
