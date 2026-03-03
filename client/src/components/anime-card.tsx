import { memo, useState } from "react";
import { Link } from "wouter";
import { Star, Play, Tv, Clock, Flame, TrendingUp } from "lucide-react";
import type { AnimeData } from "@shared/schema";

interface AnimeCardProps {
  anime: AnimeData;
  size?: "sm" | "md" | "lg";
  rank?: number;
}

export const AnimeCard = memo(function AnimeCard({ anime, size = "md", rank }: AnimeCardProps) {
  const imageUrl = anime.images?.webp?.image_url || anime.images?.jpg?.image_url;
  const title = anime.title_english || anime.title;
  const score = anime.score;
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-[140px]",
    md: "w-[180px]",
    lg: "w-[220px]",
  };

  const isAiring = anime.status === "Currently Airing";
  const isPopular = (anime.members || 0) > 500000;

  return (
    <Link href={`/anime/${anime.mal_id}`}>
      <div
        className={`${sizeClasses[size]} group cursor-pointer flex-shrink-0 anime-card-wrapper`}
        data-testid={`card-anime-${anime.mal_id}`}
      >
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 card-image-container">
          <div className={`absolute inset-0 skeleton-shimmer transition-opacity duration-500 ${imageLoaded ? "opacity-0" : "opacity-100"}`} />
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-110 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-black/40 transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out border border-white/20">
              <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>

          {rank && (
            <div className={`absolute -top-0.5 -left-0.5 w-10 h-10 rounded-br-xl rounded-tl-2xl flex items-center justify-center shadow-lg ${rank <= 3
                ? "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-amber-500/40 animate-pulse"
                : "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 shadow-slate-400/20"
              }`}>
              <span className="text-xs font-black text-black flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                {rank}
              </span>
            </div>
          )}

          {score && !rank && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 card-badge bg-black/50 backdrop-blur-xl border border-white/15">
              <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
              <span className="text-[11px] font-bold text-white">{score.toFixed(1)}</span>
            </div>
          )}

          {anime.type && (
            <div className="absolute top-2.5 right-2.5 card-badge bg-white/10 backdrop-blur-xl border border-white/15 text-white uppercase tracking-wider text-[9px]">
              {anime.type}
            </div>
          )}

          {isAiring && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 card-badge bg-emerald-500/80 backdrop-blur-xl border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white tracking-wide">AIRING</span>
            </div>
          )}

          {isPopular && !isAiring && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 card-badge bg-orange-500/80 backdrop-blur-xl border border-orange-400/30">
              <Flame className="w-2.5 h-2.5 text-white" fill="currentColor" />
              <span className="text-white tracking-wide">HOT</span>
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            {anime.episodes && (
              <div className="flex items-center gap-1 card-badge bg-black/50 backdrop-blur-xl border border-white/15 text-white/90">
                <Tv className="w-2.5 h-2.5" />
                <span>{anime.episodes} EP</span>
              </div>
            )}
            {anime.duration && (
              <div className="flex items-center gap-1 card-badge bg-black/50 backdrop-blur-xl border border-white/15 text-white/90">
                <Clock className="w-2.5 h-2.5" />
                <span>{anime.duration.replace(" per ep", "")}</span>
              </div>
            )}
          </div>

          {/* Synopsis overlay on hover */}
          {anime.synopsis && (
            <div className="card-synopsis-overlay absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-black/60 z-10 pointer-events-none">
              <p className="text-[10px] leading-relaxed text-white/70 line-clamp-3">
                {anime.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim()}
              </p>
              {score && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" />
                  <span className="text-[10px] font-bold text-yellow-400">{score.toFixed(1)}</span>
                  {anime.episodes && <span className="text-[10px] text-white/30">· {anime.episodes} eps</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold leading-tight line-clamp-2 text-white/85 group-hover:text-white transition-colors duration-300">
          {title}
        </h3>
        {anime.genres && anime.genres.length > 0 && (
          <p className="text-[11px] text-white/25 mt-1.5 truncate tracking-wide group-hover:text-white/35 transition-colors">
            {anime.genres.slice(0, 3).map(g => g.name).join(" · ")}
          </p>
        )}
        {score && (
          <div className="flex items-center gap-1.5 mt-1.5 md:hidden">
            <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
            <span className="text-[11px] font-semibold text-white/45">{score.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
});

export function AnimeCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-[140px]",
    md: "w-[180px]",
    lg: "w-[220px]",
  };

  return (
    <div className={`${sizeClasses[size]} flex-shrink-0`}>
      <div className="aspect-[3/4] rounded-2xl skeleton-shimmer mb-3 border border-white/[0.06]" />
      <div className="h-4 skeleton-shimmer rounded-lg mb-2" />
      <div className="h-3 skeleton-shimmer rounded-lg w-2/3" />
    </div>
  );
}
