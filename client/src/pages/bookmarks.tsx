import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bookmark, Trash2, Play, Star, Library, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Bookmark as BookmarkType } from "@shared/schema";

export default function Bookmarks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookmarks, isLoading } = useQuery<BookmarkType[]>({
    queryKey: ["/api/bookmarks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (animeId: number) => {
      await apiRequest("DELETE", `/api/bookmarks/${animeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({ title: "Removed from My List" });
    },
  });

  return (
    <div className="min-h-screen max-w-[1400px] mx-auto px-4 md:px-6 py-10" data-testid="page-bookmarks">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl liquid-glass-card flex items-center justify-center">
            <Bookmark className="w-4.5 h-4.5 text-white/60" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white/95">My List</h1>
            <p className="text-white/25 text-sm">
              {bookmarks?.length ? `${bookmarks.length} anime saved` : "Your bookmarked anime collection"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : !bookmarks || bookmarks.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 rounded-3xl liquid-glass-card mx-auto mb-6 flex items-center justify-center animate-float animate-border-glow border border-white/[0.06]">
            <Library className="w-10 h-10 text-white/[0.15]" />
          </div>
          <p className="text-lg font-bold mb-2 text-white/50">Your list is empty</p>
          <p className="text-sm text-white/20 mb-8 max-w-sm mx-auto">
            Browse anime and add them to your list to keep track of what you want to watch
          </p>
          <Link href="/browse">
            <Button className="rounded-2xl font-semibold gap-2 shadow-lg shadow-white/5" data-testid="button-browse-anime">
              <Sparkles className="w-4 h-4" />
              Browse Anime
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bookmark, i) => (
            <div
              key={bookmark.id}
              className="flex gap-4 p-4 liquid-glass-card rounded-2xl group hover:border-white/[0.14] transition-all duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
              data-testid={`bookmark-${bookmark.animeId}`}
            >
              <Link href={`/anime/${bookmark.animeId}`}>
                <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border border-white/[0.06] group-hover:border-white/[0.14] transition-all shadow-lg shadow-black/20">
                  <img
                    src={bookmark.imageUrl || ""}
                    alt={bookmark.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <Link href={`/anime/${bookmark.animeId}`}>
                  <h3 className="text-sm font-bold truncate cursor-pointer text-white/70 hover:text-white transition-colors">
                    {bookmark.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {bookmark.score && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400">
                      <Star className="w-3 h-3" fill="currentColor" />
                      {bookmark.score}
                    </span>
                  )}
                  {bookmark.episodes && (
                    <span className="text-xs text-white/20">{bookmark.episodes} eps</span>
                  )}
                  {bookmark.status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border backdrop-blur-sm ${bookmark.status === "Currently Airing"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/70"
                        : "bg-white/[0.04] border-white/[0.08] text-white/30"
                      }`}>{bookmark.status}</span>
                  )}
                </div>
                <p className="text-xs text-white/20 line-clamp-2 mt-1.5 leading-relaxed">
                  {bookmark.synopsis}
                </p>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Link href={`/anime/${bookmark.animeId}`}>
                    <Button size="sm" variant="secondary" className="gap-1.5 text-xs rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/60 hover:text-white hover:bg-white/[0.12] transition-all backdrop-blur-sm" data-testid={`button-watch-${bookmark.animeId}`}>
                      <Play className="w-3 h-3" /> Watch
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    onClick={() => deleteMutation.mutate(bookmark.animeId)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-remove-${bookmark.animeId}`}
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
