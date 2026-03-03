import { useRef, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeCard, AnimeCardSkeleton } from "./anime-card";
import { ErrorRetry } from "./error-retry";
import type { AnimeData } from "@shared/schema";
import { Link } from "wouter";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface AnimeRowProps {
  title: string;
  anime: AnimeData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  viewAllHref?: string;
  showRank?: boolean;
}

export function AnimeRow({ title, anime, isLoading, isError, onRetry, viewAllHref, showRank }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { ref: revealRef, isVisible } = useScrollReveal();

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
  }, [anime]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const dedupedAnime = useMemo(() => {
    const seen = new Set<number>();
    return anime.filter((a) => {
      if (seen.has(a.mal_id)) return false;
      seen.add(a.mal_id);
      return true;
    });
  }, [anime]);

  return (
    <section
      ref={revealRef}
      className={`py-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between gap-2 mb-6 px-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-white to-white/20 rounded-full" />
          <h2 className="text-xl font-bold tracking-tight text-white/90">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {viewAllHref && (
            <Link href={viewAllHref}>
              <Button variant="ghost" size="sm" className="text-xs text-white/30 gap-1.5 group/btn rounded-xl hover:text-white/60" data-testid={`link-viewall-${title.toLowerCase().replace(/\s+/g, "-")}`}>
                View All
                <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll("left")}
            className={`rounded-xl w-8 h-8 border-white/[0.08] transition-all duration-300 backdrop-blur-sm ${canScrollLeft ? "opacity-100 text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15]" : "opacity-20 pointer-events-none text-white/30"}`}
            data-testid={`button-scroll-left-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => scroll("right")}
            className={`rounded-xl w-8 h-8 border-white/[0.08] transition-all duration-300 backdrop-blur-sm ${canScrollRight ? "opacity-100 text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15]" : "opacity-20 pointer-events-none text-white/30"}`}
            data-testid={`button-scroll-right-${title.toLowerCase().replace(/\s+/g, "-")}`}
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
          {isError && onRetry
            ? <div className="w-full"><ErrorRetry message={`Failed to load ${title}`} onRetry={onRetry} /></div>
            : isLoading
              ? Array.from({ length: 8 }).map((_, i) => <AnimeCardSkeleton key={i} />)
              : dedupedAnime.map((a, i) => (
                <div
                  key={a.mal_id}
                  className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: isVisible ? `${Math.min(i * 60, 400)}ms` : "0ms" }}
                >
                  <AnimeCard anime={a} rank={showRank ? i + 1 : undefined} />
                </div>
              ))
          }
        </div>
      </div>
    </section>
  );
}
