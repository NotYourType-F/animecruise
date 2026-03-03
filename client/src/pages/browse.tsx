import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { GENRES, ANIME_TYPES, ANIME_STATUS, ORDER_OPTIONS } from "@/lib/constants";
import type { AnimeData } from "@shared/schema";

export default function Browse() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(searchString);
  const initialQuery = params.get("q") || "";
  const initialGenre = params.get("genres") || "";
  const initialType = params.get("type") || "";
  const initialStatus = params.get("status") || "";
  const initialOrder = params.get("order_by") || "score";
  const initialSort = params.get("sort") || "desc";
  const initialPage = parseInt(params.get("page") || "1", 10);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [orderBy, setOrderBy] = useState(initialOrder);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const buildApiUrl = () => {
    const p = new URLSearchParams();
    if (searchQuery) p.set("q", searchQuery);
    if (selectedGenre) p.set("genres", selectedGenre);
    if (selectedType) p.set("type", selectedType);
    if (selectedStatus) p.set("status", selectedStatus);
    if (!searchQuery) {
      if (orderBy) p.set("order_by", orderBy);
      if (sort) p.set("sort", sort);
    }
    p.set("page", page.toString());
    p.set("limit", "24");
    p.set("sfw", "true");
    return `/api/jikan/anime?${p.toString()}`;
  };

  const { data, isLoading } = useQuery<{ data: AnimeData[]; pagination: { last_visible_page: number; has_next_page: boolean } }>({
    queryKey: [buildApiUrl()],
  });

  useEffect(() => {
    const p = new URLSearchParams();
    if (searchQuery) p.set("q", searchQuery);
    if (selectedGenre) p.set("genres", selectedGenre);
    if (selectedType) p.set("type", selectedType);
    if (selectedStatus) p.set("status", selectedStatus);
    if (!searchQuery) {
      if (orderBy) p.set("order_by", orderBy);
      if (sort) p.set("sort", sort);
    }
    if (page > 1) p.set("page", page.toString());
    const qs = p.toString();
    setLocation(`/browse${qs ? `?${qs}` : ""}`, { replace: true });
  }, [searchQuery, selectedGenre, selectedType, selectedStatus, orderBy, sort, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenre("");
    setSelectedType("");
    setSelectedStatus("");
    setOrderBy("score");
    setSort("desc");
    setPage(1);
  };

  const hasActiveFilters = selectedGenre || selectedType || selectedStatus || searchQuery;
  const activeFilterCount = [selectedGenre, selectedType, selectedStatus, searchQuery].filter(Boolean).length;

  return (
    <div className="min-h-screen max-w-[1400px] mx-auto px-4 md:px-6 py-10" data-testid="page-browse">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl liquid-glass-card flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white/60" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white/95">Browse Anime</h1>
            <p className="text-white/25 text-sm">Discover your next favorite anime from thousands of titles</p>
          </div>
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search anime by title..."
              className="pl-10 bg-white/[0.04] border-white/[0.08] h-11 rounded-2xl text-white placeholder:text-white/20 focus:border-white/18 focus:bg-white/[0.06] transition-all backdrop-blur-md shadow-inner shadow-black/10"
              data-testid="input-browse-search"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`gap-2 rounded-2xl transition-all duration-300 backdrop-blur-md ${
              filtersOpen
                ? "bg-white/[0.10] border-white/18 text-white shadow-inner shadow-white/[0.04]"
                : "border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
            }`}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </form>

        <div className={`overflow-hidden transition-all duration-400 ease-out ${filtersOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 liquid-glass-card rounded-2xl">
            <div>
              <label className="text-[11px] text-white/25 mb-1.5 block uppercase tracking-wider font-medium">Genre</label>
              <Select value={selectedGenre} onValueChange={(v) => { setSelectedGenre(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.10] rounded-xl backdrop-blur-sm" data-testid="select-genre">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {GENRES.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] text-white/25 mb-1.5 block uppercase tracking-wider font-medium">Type</label>
              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.10] rounded-xl backdrop-blur-sm" data-testid="select-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ANIME_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] text-white/25 mb-1.5 block uppercase tracking-wider font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.10] rounded-xl backdrop-blur-sm" data-testid="select-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ANIME_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] text-white/25 mb-1.5 block uppercase tracking-wider font-medium">Sort By</label>
              <Select value={orderBy} onValueChange={(v) => { setOrderBy(v); setPage(1); }}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.10] rounded-xl backdrop-blur-sm" data-testid="select-order">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="col-span-2 md:col-span-4 pt-1">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-white/25 gap-1.5 hover:text-white/50" data-testid="button-clear-filters">
                  <X className="w-3 h-3" /> Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {selectedGenre && (
          <div className="flex flex-wrap gap-2">
            {selectedGenre.split(",").map((gId) => {
              const genre = GENRES.find((g) => g.id.toString() === gId);
              return genre ? (
                <span key={gId} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.10] text-white/60 hover:border-white/[0.18] transition-all backdrop-blur-sm">
                  {genre.name}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => {
                      const remaining = selectedGenre.split(",").filter((id) => id !== gId).join(",");
                      setSelectedGenre(remaining);
                      setPage(1);
                    }}
                  />
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 md:gap-7">
        {isLoading
          ? Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex justify-center">
                <AnimeCardSkeleton />
              </div>
            ))
          : data?.data?.map((anime, i) => (
              <div
                key={anime.mal_id}
                className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(i * 30, 500)}ms`, animationFillMode: "backwards" }}
              >
                <AnimeCard anime={anime} />
              </div>
            ))
        }
      </div>

      {data?.data?.length === 0 && !isLoading && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-2xl liquid-glass-card mx-auto mb-6 flex items-center justify-center">
            <Search className="w-8 h-8 text-white/[0.10]" />
          </div>
          <p className="text-white/40 text-lg mb-2">No anime found</p>
          <p className="text-sm text-white/20">Try adjusting your search or filters</p>
        </div>
      )}

      {data?.pagination && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="gap-1.5 rounded-2xl border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.06] transition-all backdrop-blur-sm"
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-2xl liquid-glass-subtle">
            {Array.from({ length: Math.min(data.pagination.last_visible_page, 5) }).map((_, i) => {
              const pageNum = page <= 3 ? i + 1 : page - 2 + i;
              if (pageNum > data.pagination.last_visible_page || pageNum < 1) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all duration-300 ${
                    pageNum === page
                      ? "bg-white text-black font-bold shadow-lg shadow-white/10"
                      : "text-white/30 hover:text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.has_next_page}
            onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="gap-1.5 rounded-2xl border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.06] transition-all backdrop-blur-sm"
            data-testid="button-next-page"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
