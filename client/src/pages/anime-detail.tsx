import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useCallback } from "react";
import { Star, Play, Calendar, Tv, Clock, Bookmark, BookmarkCheck, Users, Heart, ChevronRight, ExternalLink, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentsSection } from "@/components/comments-section";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnimeData, AnimeEpisode, AnimeCharacter, Bookmark as BookmarkType } from "@shared/schema";

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: animeData, isLoading } = useQuery<{ data: AnimeData }>({
    queryKey: ["/api/jikan/anime", id],
  });

  const { data: episodesData, isLoading: loadingEpisodes } = useQuery<{ data: AnimeEpisode[] }>({
    queryKey: ["/api/anime-episodes", id],
  });

  const { data: charactersData } = useQuery<{ data: AnimeCharacter[] }>({
    queryKey: ["/api/jikan/anime", id, "characters"],
  });

  const { data: seasonsData, isLoading: loadingSeasons } = useQuery<{ data: { mal_id: number; title: string; image: string }[] }>({
    queryKey: ["/api/anime-seasons", id],
  });

  const { data: recommendationsData } = useQuery<{ data: { entry: AnimeData }[] }>({
    queryKey: ["/api/jikan/anime", id, "recommendations"],
  });

  const { data: bookmarks } = useQuery<BookmarkType[]>({
    queryKey: ["/api/bookmarks"],
  });

  const isBookmarked = bookmarks?.some((b) => b.animeId === Number(id));

  const seasons = (seasonsData?.data || []).map((s, i) => ({ ...s, seasonNumber: i + 1 }));
  const hasMultipleSeasons = seasons.length > 1;
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) {
    setLastId(id);
    setSelectedSeasonId(null);
  }
  const activeSeasonId = hasMultipleSeasons
    ? selectedSeasonId
    : Number(id);

  const { data: seasonEpisodesData, isLoading: loadingSeasonEpisodes } = useQuery<{ data: AnimeEpisode[] }>({
    queryKey: ["/api/anime-episodes", activeSeasonId?.toString() ?? ""],
    enabled: activeSeasonId != null && activeSeasonId !== Number(id),
  });

  const activeEpisodes = activeSeasonId == null
    ? []
    : activeSeasonId === Number(id)
      ? (episodesData?.data || [])
      : (seasonEpisodesData?.data || []);
  const isActiveEpisodesLoading = activeSeasonId == null
    ? false
    : activeSeasonId === Number(id) ? loadingEpisodes : loadingSeasonEpisodes;
  const showSeasonPrompt = hasMultipleSeasons && selectedSeasonId == null;

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await apiRequest("DELETE", `/api/bookmarks/${id}`);
      } else {
        const anime = animeData?.data;
        if (!anime) return;
        await apiRequest("POST", "/api/bookmarks", {
          animeId: anime.mal_id,
          title: anime.title_english || anime.title,
          imageUrl: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
          score: anime.score?.toString() || null,
          episodes: anime.episodes,
          status: anime.status,
          synopsis: anime.synopsis,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: isBookmarked ? "Removed from My List" : "Added to My List",
      });
    },
  });

  const anime = animeData?.data;
  const episodes = episodesData?.data || [];
  const characters = charactersData?.data || [];
  const recommendations = recommendationsData?.data || [];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="relative h-[400px] bg-muted/20">
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-[1400px] mx-auto w-full px-6 pb-8 flex gap-6">
              <Skeleton className="w-[200px] h-[280px] rounded-2xl flex-shrink-0" />
              <div className="flex-1 pt-8">
                <Skeleton className="h-8 w-96 mb-3 rounded-lg" />
                <Skeleton className="h-5 w-64 mb-4 rounded-lg" />
                <Skeleton className="h-20 w-full max-w-lg rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/30">Anime not found</p>
      </div>
    );
  }

  const imageUrl = anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url;
  const title = anime.title_english || anime.title;

  return (
    <div className="min-h-screen" data-testid="page-anime-detail">
      <div className="relative h-[380px] md:h-[480px]">
        <div className="absolute inset-0">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          <div className="absolute inset-0 glass-refraction pointer-events-none" />
        </div>

        <div className="relative h-full flex items-end">
          <div className="max-w-[1400px] mx-auto w-full px-6 pb-6 flex gap-6">
            <div className="hidden md:block w-[180px] flex-shrink-0 -mb-24 z-10">
              <div className="relative group/cover">
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.12] transition-transform duration-500 group-hover/cover:scale-[1.02]"
                  data-testid="img-anime-cover"
                  style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}
                />
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <Play className="w-10 h-10 text-white" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {anime.score && (
                  <div className="info-chip !bg-yellow-400/10 !border-yellow-400/20">
                    <Star className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
                    <span className="text-sm font-bold text-yellow-400">{anime.score.toFixed(1)}</span>
                    {anime.scored_by && (
                      <span className="text-[10px] text-white/30 ml-0.5">({(anime.scored_by / 1000).toFixed(0)}K)</span>
                    )}
                  </div>
                )}
                {anime.rank && (
                  <div className="info-chip">
                    <span className="text-[11px] font-bold">Rank #{anime.rank}</span>
                  </div>
                )}
                {anime.type && (
                  <div className="info-chip">
                    <span className="text-[11px] uppercase tracking-wider">{anime.type}</span>
                  </div>
                )}
                {anime.status && (
                  <div className={`info-chip ${anime.status === "Currently Airing" ? "!bg-emerald-500/10 !border-emerald-500/20" : ""}`}>
                    {anime.status === "Currently Airing" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span className={`text-[11px] ${anime.status === "Currently Airing" ? "text-emerald-400" : ""}`}>{anime.status}</span>
                  </div>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-1.5 text-white drop-shadow-lg leading-tight">
                {title}
              </h1>
              {anime.title_japanese && (
                <p className="text-sm text-white/25 mb-4">{anime.title_japanese}</p>
              )}

              <div className="flex items-center gap-2.5 text-sm text-white/35 mb-5 flex-wrap">
                {anime.year && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{anime.year}</span>
                )}
                {anime.episodes && (
                  <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5" />{anime.episodes} eps</span>
                )}
                {anime.duration && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{anime.duration}</span>
                )}
                {anime.members && (
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{(anime.members / 1000).toFixed(0)}K</span>
                )}
                {anime.favorites && (
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{(anime.favorites / 1000).toFixed(1)}K</span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {episodes.length > 0 && (
                  <Link href={`/watch/${anime.mal_id}/1`}>
                    <Button size="lg" className="gap-2.5 font-bold rounded-2xl shadow-lg shadow-white/5 group/btn play-btn-pulse" data-testid="button-watch-ep1">
                      <Play className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="currentColor" />
                      Watch Episode 1
                    </Button>
                  </Link>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className={`gap-2.5 font-semibold rounded-2xl border-white/10 transition-all duration-300 backdrop-blur-xl ${isBookmarked
                    ? "bg-white/[0.10] border-white/20 text-white shadow-inner shadow-white/[0.04]"
                    : "bg-white/[0.05] hover:bg-white/[0.10] shadow-inner shadow-white/[0.02]"
                    }`}
                  onClick={() => bookmarkMutation.mutate()}
                  disabled={bookmarkMutation.isPending}
                  data-testid="button-bookmark"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-white" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  {isBookmarked ? "In My List" : "Add to My List"}
                </Button>
                <ShareButton title={title} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-8 md:pt-28">
        <div className="flex flex-wrap gap-2 mb-8">
          {anime.genres?.map((genre) => (
            <Link key={genre.mal_id} href={`/browse?genres=${genre.mal_id}`}>
              <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.08] cursor-pointer transition-all duration-300 backdrop-blur-sm">
                {genre.name}
              </span>
            </Link>
          ))}
          {anime.themes?.map((theme) => (
            <span key={theme.mal_id} className="inline-block text-xs px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-white/30 backdrop-blur-sm">
              {theme.name}
            </span>
          ))}
        </div>

        <Tabs defaultValue="overview" className="mb-12">
          <TabsList className="liquid-glass-subtle mb-8 rounded-2xl p-1" data-testid="tabs-anime">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white/[0.10] data-[state=active]:backdrop-blur-sm transition-all">Overview</TabsTrigger>
            <TabsTrigger value="episodes" className="rounded-xl data-[state=active]:bg-white/[0.10] data-[state=active]:backdrop-blur-sm transition-all" style={{ minWidth: 120 }}>
              {loadingSeasons ? (
                <span className="inline-flex items-center gap-1.5">Episodes <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" /></span>
              ) : hasMultipleSeasons ? (
                <>Total Season <span className="ml-1 text-white/30">({seasons.length})</span></>
              ) : (
                <>Episodes {episodes.length > 0 && <span className="ml-1 text-white/30">({episodes.length})</span>}</>
              )}
            </TabsTrigger>
            <TabsTrigger value="characters" className="rounded-xl data-[state=active]:bg-white/[0.10] data-[state=active]:backdrop-blur-sm transition-all">Characters</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-in fade-in duration-300">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h3 className="text-lg font-bold mb-4 text-white/90">Synopsis</h3>
                <p className="text-sm text-white/40 leading-relaxed whitespace-pre-line" data-testid="text-synopsis">
                  {anime.synopsis || "No synopsis available."}
                </p>

                <div className="mt-8">
                  <h3 className="text-sm font-bold mb-3 text-white/60">Rate this anime</h3>
                  <RatingSection animeId={anime.mal_id} />
                </div>

                {anime.trailer?.youtube_id && (
                  <div className="mt-10">
                    <h3 className="text-lg font-bold mb-4 text-white/90">Trailer</h3>
                    <div className="aspect-video rounded-2xl overflow-hidden liquid-glass-card">
                      <iframe
                        src={`https://www.youtube.com/embed/${anime.trailer.youtube_id}`}
                        className="w-full h-full"
                        allowFullScreen
                        title="Anime Trailer"
                        data-testid="iframe-trailer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="liquid-glass-card rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold mb-3 text-white/70 uppercase tracking-wider">Information</h3>
                  {anime.type && <InfoRow label="Type" value={anime.type} />}
                  {anime.episodes && <InfoRow label="Episodes" value={anime.episodes.toString()} />}
                  {anime.status && <InfoRow label="Status" value={anime.status} />}
                  {anime.aired?.string && <InfoRow label="Aired" value={anime.aired.string} />}
                  {anime.duration && <InfoRow label="Duration" value={anime.duration} />}
                  {anime.rating && <InfoRow label="Rating" value={anime.rating} />}
                  {anime.source && <InfoRow label="Source" value={anime.source} />}
                  {anime.studios && anime.studios.length > 0 && (
                    <InfoRow label="Studios" value={anime.studios.map((s) => s.name).join(", ")} />
                  )}
                </div>

                {anime.score && (
                  <div className="liquid-glass-card rounded-2xl p-5">
                    <h3 className="text-sm font-bold mb-4 text-white/70 uppercase tracking-wider">Score</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-white">{anime.score.toFixed(2)}</div>
                      <div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 transition-colors ${i < Math.round(anime.score! / 2) ? "text-yellow-400" : "text-white/10"}`}
                              fill="currentColor"
                            />
                          ))}
                        </div>
                        {anime.scored_by && (
                          <p className="text-xs text-white/25 mt-1">
                            {anime.scored_by.toLocaleString()} users
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="episodes" className="animate-in fade-in duration-300">
            {hasMultipleSeasons && (
              <div className="mb-8" data-testid="season-selector">
                <p className="text-sm text-white/40 mb-4">Select a season to view episodes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {seasons.map((s) => {
                    const isActive = selectedSeasonId === s.mal_id;
                    return (
                      <button
                        key={s.mal_id}
                        onClick={() => setSelectedSeasonId(s.mal_id)}
                        className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-400 group/season aspect-[16/9] ${isActive
                          ? "border-white/40 shadow-xl shadow-white/10 scale-[1.02]"
                          : "border-white/[0.08] hover:border-white/20 hover:shadow-lg hover:shadow-white/5 hover:scale-[1.01]"
                          }`}
                        data-testid={`season-btn-${s.seasonNumber}`}
                      >
                        {s.image && (
                          <img
                            src={s.image}
                            alt={s.title}
                            className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-110 transition-all duration-500 group-hover/season:scale-115 group-hover/season:blur-[1px]"
                          />
                        )}
                        <div className={`absolute inset-0 transition-all duration-400 ${isActive
                          ? "bg-black/35 backdrop-blur-[1px]"
                          : "bg-black/50 group-hover/season:bg-black/40 backdrop-blur-[0.5px]"
                          }`} />
                        <div className="absolute inset-0 glass-refraction pointer-events-none" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-3">
                          <span className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight drop-shadow-lg transition-all duration-300 ${isActive ? "text-white" : "text-white/80 group-hover/season:text-white"
                            }`}>
                            Season {s.seasonNumber}
                          </span>
                          <span className={`text-[10px] sm:text-xs mt-1 text-center truncate max-w-full px-2 drop-shadow transition-colors duration-300 ${isActive ? "text-white/60" : "text-white/30 group-hover/season:text-white/50"
                            }`}>{s.title}</span>
                        </div>
                        {isActive && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-lg shadow-white/30 animate-in zoom-in duration-200" />
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showSeasonPrompt ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl liquid-glass-card mx-auto mb-4 flex items-center justify-center">
                  <Tv className="w-7 h-7 text-white/[0.15]" />
                </div>
                <p className="text-white/30 text-sm">Pick a season above to see its episodes</p>
              </div>
            ) : isActiveEpisodesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : activeEpisodes.length === 0 ? (
              <p className="text-white/25 text-center py-16">No episode data available</p>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-1.5">
                  {activeEpisodes.map((ep) => (
                    <Link key={ep.mal_id} href={`/watch/${activeSeasonId}/${ep.mal_id}`}>
                      <div
                        className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group border border-transparent hover:border-white/[0.08] hover:backdrop-blur-sm"
                        data-testid={`episode-item-${ep.mal_id}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.08] transition-all border border-white/[0.06] group-hover:border-white/[0.12]">
                          <span className="text-sm font-bold text-white/30 group-hover:text-white/70 transition-colors">{ep.mal_id}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white/70 group-hover:text-white transition-colors">{ep.title || `Episode ${ep.mal_id}`}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {ep.aired && (
                              <span className="text-[11px] text-white/20">
                                {new Date(ep.aired).toLocaleDateString()}
                              </span>
                            )}
                            {ep.filler && <Badge variant="destructive" className="text-[10px] h-4 rounded-md">Filler</Badge>}
                            {ep.recap && <Badge variant="secondary" className="text-[10px] h-4 rounded-md">Recap</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <div className="w-8 h-8 rounded-full bg-white/[0.08] backdrop-blur-sm flex items-center justify-center border border-white/[0.08]">
                            <Play className="w-3.5 h-3.5 text-white/60 ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="characters" className="animate-in fade-in duration-300">
            {characters.length === 0 ? (
              <p className="text-white/25 text-center py-16">No character data available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {characters.slice(0, 18).map((char, i) => (
                  <div
                    key={char.character.mal_id}
                    className="flex items-center gap-3.5 p-3.5 liquid-glass-card rounded-2xl hover:border-white/[0.15] transition-all duration-300 group"
                    style={{ animationDelay: `${i * 30}ms` }}
                    data-testid={`character-${char.character.mal_id}`}
                  >
                    <img
                      src={char.character.images?.webp?.image_url || char.character.images?.jpg?.image_url}
                      alt={char.character.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white/[0.08] group-hover:ring-white/[0.18] transition-all"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/80 truncate group-hover:text-white transition-colors">{char.character.name}</p>
                      <p className="text-[11px] text-white/25">{char.role}</p>
                      {char.voice_actors?.[0] && (
                        <p className="text-[10px] text-white/15 truncate mt-0.5">
                          VA: {char.voice_actors[0].person.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CommentsSection animeId={anime.mal_id} />

        {recommendations.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-5 text-white/90">Recommendations</h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {recommendations.slice(0, 12).map((rec) => {
                const recAnime = rec.entry;
                const recImage = recAnime.images?.webp?.image_url || recAnime.images?.jpg?.image_url;
                return (
                  <Link key={recAnime.mal_id} href={`/anime/${recAnime.mal_id}`}>
                    <div className="w-[140px] flex-shrink-0 cursor-pointer group" data-testid={`rec-${recAnime.mal_id}`}>
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-2 border border-white/[0.06] group-hover:border-white/[0.15] transition-all duration-300 shadow-lg shadow-black/20 group-hover:shadow-xl">
                        <img
                          src={recImage}
                          alt={recAnime.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-white/50 line-clamp-2 group-hover:text-white/80 transition-colors">{recAnime.title}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/25 flex-shrink-0">{label}</span>
      <span className="text-xs text-white/60 text-right">{value}</span>
    </div>
  );
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} - AnimeCruise`, url });
        return;
      } catch { }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [title]);

  return (
    <Button
      size="lg"
      variant="outline"
      className="gap-2 font-semibold rounded-2xl border-white/10 bg-white/[0.05] hover:bg-white/[0.10] backdrop-blur-xl"
      onClick={handleShare}
      data-testid="button-share"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}

function RatingSection({ animeId }: { animeId: number }) {
  const queryClient = useQueryClient();
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();

  const { data: ratingData } = useQuery<{ userRating: number | null; community: { average: number; count: number } }>({
    queryKey: ["/api/ratings", animeId.toString()],
  });

  const ratingMutation = useMutation({
    mutationFn: async (score: number) => {
      const res = await apiRequest("POST", `/api/ratings/${animeId}`, { score });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ratings", animeId.toString()] });
      toast({ title: "Rating saved!" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Sign in to rate", variant: "destructive" });
    },
  });

  const userRating = ratingData?.userRating || 0;
  const community = ratingData?.community;
  const displayStars = hoveredStar || userRating;

  return (
    <div className="flex flex-col gap-2" data-testid="rating-section">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHoveredStar(0)}>
          {Array.from({ length: 10 }).map((_, i) => {
            const starNum = i + 1;
            return (
              <button
                key={starNum}
                className={`p-0.5 transition-all duration-150 ${starNum <= displayStars ? "text-yellow-400 scale-110" : "text-white/10 hover:text-white/25"
                  }`}
                onMouseEnter={() => setHoveredStar(starNum)}
                onClick={() => ratingMutation.mutate(starNum)}
                disabled={ratingMutation.isPending}
                data-testid={`button-rate-${starNum}`}
              >
                <Star className="w-4 h-4" fill={starNum <= displayStars ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
        {userRating > 0 && (
          <span className="text-xs text-white/30">Your rating: {userRating}/10</span>
        )}
      </div>
      {community && community.count > 0 && (
        <div className="flex items-center gap-2 text-xs text-white/20">
          <Star className="w-3 h-3 text-white/15" fill="currentColor" />
          <span>{community.average.toFixed(1)} community avg ({community.count} {community.count === 1 ? "rating" : "ratings"})</span>
        </div>
      )}
    </div>
  );
}
