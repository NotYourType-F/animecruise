import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Flame, Crown, Film, Star } from "lucide-react";
import { AnimeRow } from "@/components/anime-row";
import type { AnimeData } from "@shared/schema";

function StatCardSkeleton() {
  return (
    <div
      className="flex items-center gap-4 p-4 liquid-glass-card rounded-2xl"
      data-testid="skeleton-stat-card"
    >
      <div className="w-10 h-10 rounded-xl skeleton-shimmer border border-white/[0.06]" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-20 skeleton-shimmer rounded-md" />
        <div className="h-4 w-40 skeleton-shimmer rounded-md" />
      </div>
      <div className="h-5 w-12 skeleton-shimmer rounded-md" />
    </div>
  );
}

export default function Trending() {
  const { data: topScore, isLoading: loading1 } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?limit=20&type=tv"],
  });

  const { data: topAiring, isLoading: loading2 } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?filter=airing&limit=20"],
  });

  const { data: topFavorite, isLoading: loading3 } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?filter=favorite&limit=20"],
  });

  const { data: topMovies, isLoading: loading4 } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?type=movie&limit=20"],
  });

  const statsLoading = loading1 || loading2;

  const stats = [
    { icon: Crown, label: "Top Rated", value: topScore?.data?.[0]?.title_english || topScore?.data?.[0]?.title || "—", score: topScore?.data?.[0]?.score },
    { icon: Flame, label: "Most Popular", value: topAiring?.data?.[0]?.title_english || topAiring?.data?.[0]?.title || "—", score: topAiring?.data?.[0]?.score },
  ];

  return (
    <div className="min-h-screen py-10" data-testid="page-trending">
      <div className="max-w-[1400px] mx-auto px-6 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl liquid-glass-card flex items-center justify-center">
            <TrendingUp className="w-4.5 h-4.5 text-white/60" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white/95">Trending Anime</h1>
            <p className="text-white/25 text-sm">The hottest anime right now</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {statsLoading
            ? Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 liquid-glass-card rounded-2xl hover:border-white/[0.14] transition-all group"
                  data-testid={`stat-card-${i}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors backdrop-blur-sm">
                    <stat.icon className="w-4.5 h-4.5 text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/25 uppercase tracking-wider font-medium">{stat.label}</p>
                    <p className="text-sm font-bold text-white/80 truncate">{stat.value}</p>
                  </div>
                  {stat.score && (
                    <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                      {stat.score.toFixed(1)}
                    </div>
                  )}
                </div>
              ))
          }
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-2">
        <AnimeRow title="Top Rated TV Series" anime={topScore?.data || []} isLoading={loading1} showRank />
        <AnimeRow title="Currently Airing" anime={topAiring?.data || []} isLoading={loading2} />
        <AnimeRow title="Fan Favorites" anime={topFavorite?.data || []} isLoading={loading3} />
        <AnimeRow title="Top Movies" anime={topMovies?.data || []} isLoading={loading4} />
      </div>
    </div>
  );
}
