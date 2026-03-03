import { useState, useEffect, useCallback } from "react";
import { Play, Info, Star, Calendar, Tv, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { AnimeData } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroSectionProps {
  anime: AnimeData[];
  isLoading?: boolean;
}

export function HeroSection({ anime, isLoading }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const heroItems = anime.slice(0, 5);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setProgress(0);
    setTimeout(() => {
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 400);
  }, [isTransitioning]);

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % heroItems.length);
  }, [activeIndex, heroItems.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((activeIndex - 1 + heroItems.length) % heroItems.length);
  }, [activeIndex, heroItems.length, goTo]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goNext();
          return 0;
        }
        return prev + 1.25;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [goNext, heroItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, heroItems.length]);

  if (isLoading || heroItems.length === 0) {
    return (
      <div className="relative h-[540px] md:h-[620px] bg-muted/30">
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1400px] mx-auto w-full px-6 pb-16">
            <Skeleton className="h-6 w-32 mb-4 rounded-full" />
            <Skeleton className="h-14 w-[420px] mb-4 rounded-lg" />
            <Skeleton className="h-5 w-72 mb-3 rounded-lg" />
            <Skeleton className="h-20 w-[500px] mb-7 rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-13 w-40 rounded-xl" />
              <Skeleton className="h-13 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = heroItems[activeIndex];
  if (!current) return null;

  const title = current.title_english || current.title;

  return (
    <div className="relative h-[540px] md:h-[620px] overflow-hidden group/hero" data-testid="hero-section">
      {heroItems.map((item, i) => {
        const img = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url;
        return (
          <div
            key={item.mal_id}
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              opacity: i === activeIndex && !isTransitioning ? 1 : 0,
              transform: i === activeIndex ? "scale(1.02)" : "scale(1.08)",
              zIndex: i === activeIndex ? 1 : 0,
            }}
          >
            <img
              src={img}
              alt={item.title_english || item.title}
              className="w-full h-full object-cover object-top hero-image-zoom"
            />
          </div>
        );
      })}

      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black via-black/85 to-black/10" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 z-[2] bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      <div className="absolute inset-0 z-[2] hero-particles" />
      <div className="absolute inset-0 z-[2] glass-refraction pointer-events-none" />

      <div className="relative z-[3] h-full flex items-end">
        <div className="max-w-[1400px] mx-auto w-full px-6 pb-20">
          <div
            className={`max-w-2xl transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="info-chip !bg-white/10 !border-white/20 !backdrop-blur-xl">
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-[11px] font-bold text-white tracking-widest uppercase">Featured</span>
              </div>
              {current.status === "Currently Airing" && (
                <div className="info-chip !bg-emerald-500/15 !border-emerald-500/25 !backdrop-blur-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wide">AIRING</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-4 sm:mb-5 leading-[1.05] text-white drop-shadow-lg hero-title-glow">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-[length:200%_auto] animate-gradient-text">
                {title}
              </span>
            </h1>

            <div className="flex items-center gap-2.5 mb-5 flex-wrap">
              {current.score && (
                <div className="info-chip !bg-yellow-400/10 !border-yellow-400/20">
                  <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
                  <span className="text-sm font-bold text-yellow-400">{current.score.toFixed(1)}</span>
                </div>
              )}
              {current.year && (
                <div className="info-chip">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-sm">{current.year}</span>
                </div>
              )}
              {current.episodes && (
                <div className="info-chip">
                  <Tv className="w-3.5 h-3.5" />
                  <span className="text-sm">{current.episodes} episodes</span>
                </div>
              )}
              {current.type && (
                <div className="info-chip">
                  <span className="text-sm">{current.type}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {current.genres?.slice(0, 4).map((genre) => (
                <span key={genre.mal_id} className="text-xs text-white/40 border border-white/10 rounded-full px-3 py-1 bg-white/[0.04] backdrop-blur-sm">
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="text-sm md:text-base text-white/50 line-clamp-3 mb-8 leading-relaxed max-w-lg">
              {current.synopsis}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link href={`/anime/${current.mal_id}`}>
                <Button size="lg" className="gap-2.5 font-bold text-base h-13 px-8 rounded-2xl shadow-lg shadow-white/5 group/btn play-btn-pulse backdrop-blur-sm" data-testid="button-hero-watch">
                  <Play className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="currentColor" />
                  Watch Now
                </Button>
              </Link>
              <Link href={`/anime/${current.mal_id}`}>
                <Button size="lg" variant="outline" className="gap-2.5 font-semibold h-13 px-8 rounded-2xl border-white/15 text-white bg-white/[0.06] hover:bg-white/[0.10] group/btn backdrop-blur-xl shadow-inner shadow-white/[0.04]" data-testid="button-hero-details">
                  <Info className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                  More Info
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {heroItems.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[4] w-11 h-11 rounded-2xl liquid-glass-subtle flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all opacity-0 group-hover/hero:opacity-100 hover:scale-110"
            data-testid="button-hero-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[4] w-11 h-11 rounded-2xl liquid-glass-subtle flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all opacity-0 group-hover/hero:opacity-100 hover:scale-110"
            data-testid="button-hero-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2.5 px-4 py-2 rounded-2xl liquid-glass-subtle">
            {heroItems.map((item, i) => (
              <button
                key={item.mal_id}
                onClick={() => goTo(i)}
                className="relative group/dot"
                data-testid={`hero-dot-${i}`}
              >
                <div className={`h-1.5 rounded-full transition-all duration-500 overflow-hidden ${i === activeIndex ? "w-10 bg-white/20" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}>
                  {i === activeIndex && (
                    <div
                      className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
