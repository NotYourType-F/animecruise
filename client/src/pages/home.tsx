import { useQuery } from "@tanstack/react-query";
import { HeroSection } from "@/components/hero-section";
import { AnimeRow } from "@/components/anime-row";
import { ContinueWatching } from "@/components/continue-watching";
import type { AnimeData } from "@shared/schema";

export default function Home() {
  const { data: topAiring, isLoading: loadingAiring, isError: errorAiring, refetch: refetchAiring } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?filter=airing&limit=20"],
  });

  const { data: topPopular, isLoading: loadingPopular, isError: errorPopular, refetch: refetchPopular } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?filter=bypopularity&limit=20"],
  });

  const { data: topUpcoming, isLoading: loadingUpcoming, isError: errorUpcoming, refetch: refetchUpcoming } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?filter=upcoming&limit=20"],
  });

  const { data: topMovies, isLoading: loadingMovies, isError: errorMovies, refetch: refetchMovies } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/top/anime?type=movie&limit=20"],
  });

  const { data: seasonNow, isLoading: loadingSeason, isError: errorSeason, refetch: refetchSeason } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/seasons/now?limit=25&order_by=start_date&sort=desc"],
  });

  const { data: seasonPopular, isLoading: loadingSeasonPopular, isError: errorSeasonPopular, refetch: refetchSeasonPopular } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/seasons/now?limit=25&order_by=score&sort=desc"],
  });

  const { data: recentAnime, isLoading: loadingRecent, isError: errorRecent, refetch: refetchRecent } = useQuery<{ data: AnimeData[] }>({
    queryKey: ["/api/jikan/anime?status=airing&order_by=start_date&sort=desc&limit=25&sfw=true"],
  });

  const heroAnime = topAiring?.data?.slice(0, 5) || [];

  return (
    <div className="min-h-screen" data-testid="page-home">
      <HeroSection anime={heroAnime} isLoading={loadingAiring} />

      <div className="max-w-[1400px] mx-auto space-y-2">
        <ContinueWatching />

        <AnimeRow
          title="New This Season"
          anime={seasonNow?.data || []}
          isLoading={loadingSeason}
          isError={errorSeason}
          onRetry={() => refetchSeason()}
          viewAllHref="/browse?status=airing&order_by=start_date&sort=desc"
        />

        <AnimeRow
          title="Recently Started Airing"
          anime={recentAnime?.data || []}
          isLoading={loadingRecent}
          isError={errorRecent}
          onRetry={() => refetchRecent()}
          viewAllHref="/browse?status=airing&order_by=start_date&sort=desc"
        />

        <AnimeRow
          title="Top Airing"
          anime={topAiring?.data || []}
          isLoading={loadingAiring}
          isError={errorAiring}
          onRetry={() => refetchAiring()}
          viewAllHref="/browse?status=airing&order_by=score&sort=desc"
          showRank
        />

        <AnimeRow
          title="Popular This Season"
          anime={seasonPopular?.data || []}
          isLoading={loadingSeasonPopular}
          isError={errorSeasonPopular}
          onRetry={() => refetchSeasonPopular()}
          viewAllHref="/browse?status=airing&order_by=popularity&sort=asc"
        />

        <AnimeRow
          title="Most Popular"
          anime={topPopular?.data || []}
          isLoading={loadingPopular}
          isError={errorPopular}
          onRetry={() => refetchPopular()}
          viewAllHref="/browse?order_by=popularity&sort=asc"
          showRank
        />

        <AnimeRow
          title="Top Movies"
          anime={topMovies?.data || []}
          isLoading={loadingMovies}
          isError={errorMovies}
          onRetry={() => refetchMovies()}
          viewAllHref="/browse?type=movie&order_by=score&sort=desc"
        />

        <AnimeRow
          title="Upcoming"
          anime={topUpcoming?.data || []}
          isLoading={loadingUpcoming}
          isError={errorUpcoming}
          onRetry={() => refetchUpcoming()}
          viewAllHref="/browse?status=upcoming&order_by=popularity&sort=asc"
        />
      </div>
    </div>
  );
}
