import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import type { WatchHistory } from "@shared/schema";

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ContinueCard({ entry }: { entry: WatchHistory }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const progress = entry.videoDuration && entry.videoDuration > 0
    ? Math.min(((entry.watchProgress || 0) / entry.videoDuration) * 100, 100)
    : 0;
  const timeLeft = entry.videoDuration && entry.watchProgress
    ? entry.videoDuration - entry.watchProgress
    : 0;

  return (
    <Link href={`/watch/${entry.animeId}/${entry.episodeNumber}`}>
      <div
        className="w-[280px] sm:w-[320px] flex-shrink-0 group cursor-pointer"
        data-testid={`card-continue-${entry.animeId}-${entry.episodeNumber}`}
      >
        <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 border border-white/[0.06]">
          <div className={`absolute inset-0 skeleton-shimmer transition-opacity duration-500 ${imageLoaded ? "opacity-0" : "opacity-100"}`} />
          {entry.imageUrl && (
            <img
              src={entry.imageUrl}
              alt={entry.title}
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-black/40 transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/20">
              <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <div className="px-3 pb-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] text-white/70 font-medium">
                  EP {entry.episodeNumber}
                </span>
                {timeLeft > 0 && (
                  <span className="text-[10px] text-white/40 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(timeLeft)} left
                  </span>
                )}
              </div>
            </div>
            {progress > 0 && (
              <div className="w-full h-[3px] bg-white/10">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold leading-tight line-clamp-1 text-white/85 group-hover:text-white transition-colors">
          {entry.title}
        </h3>
        <p className="text-[11px] text-white/25 mt-0.5">
          Episode {entry.episodeNumber}
          {entry.watchProgress && entry.watchProgress > 0 ? ` · ${formatTime(entry.watchProgress)} watched` : ""}
        </p>
      </div>
    </Link>
  );
}

function ContinueCardSkeleton() {
  return (
    <div className="w-[280px] sm:w-[320px] flex-shrink-0">
      <div className="aspect-video rounded-xl skeleton-shimmer mb-2.5 border border-white/[0.06]" />
      <div className="h-4 skeleton-shimmer rounded-lg mb-1.5 w-3/4" />
      <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
    </div>
  );
}

export function ContinueWatching() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { ref: revealRef, isVisible } = useScrollReveal();

  const { data: continueWatching, isLoading } = useQuery<WatchHistory[]>({
    queryKey: ["/api/continue-watching"],
    refetchOnMount: "always",
  });

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [continueWatching]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!isLoading && (!continueWatching || continueWatching.length === 0)) {
    return null;
  }

  return (
    <section
      ref={revealRef}
      className={`py-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      data-testid="section-continue-watching"
    >
      <div className="flex items-center justify-between gap-2 mb-6 px-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-white to-white/20 rounded-full" />
          <h2 className="text-xl font-bold tracking-tight text-white/90">Continue Watching</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-xs text-white/30 gap-1.5 group/btn rounded-xl hover:text-white/60" data-testid="link-viewall-continue-watching">
              View History
            </Button>
          </Link>
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll("left")}
            className={`rounded-xl w-8 h-8 border-white/[0.08] transition-all duration-300 backdrop-blur-sm ${canScrollLeft ? "opacity-100 text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15]" : "opacity-20 pointer-events-none text-white/30"}`}
            data-testid="button-scroll-left-continue-watching"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll("right")}
            className={`rounded-xl w-8 h-8 border-white/[0.08] transition-all duration-300 backdrop-blur-sm ${canScrollRight ? "opacity-100 text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15]" : "opacity-20 pointer-events-none text-white/30"}`}
            data-testid="button-scroll-right-continue-watching"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide px-6 pb-2 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <ContinueCardSkeleton key={i} />)
            : continueWatching?.map((entry, i) => (
                <div
                  key={`${entry.animeId}-${entry.episodeNumber}`}
                  className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: isVisible ? `${Math.min(i * 60, 400)}ms` : "0ms" }}
                >
                  <ContinueCard entry={entry} />
                </div>
              ))
          }
        </div>
      </div>
    </section>
  );
}
