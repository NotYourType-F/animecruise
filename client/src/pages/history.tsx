import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Clock, Play, Tv, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WatchHistory } from "@shared/schema";

export default function History() {
  const { data: history, isLoading } = useQuery<WatchHistory[]>({
    queryKey: ["/api/history"],
  });

  const formatTimeAgo = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen max-w-[1400px] mx-auto px-4 md:px-6 py-10" data-testid="page-history">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl liquid-glass-card flex items-center justify-center">
            <Clock className="w-4.5 h-4.5 text-white/60" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white/95">Watch History</h1>
            <p className="text-white/25 text-sm">
              {history?.length ? `${history.length} episodes watched` : "Your recently watched episodes"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 rounded-3xl liquid-glass-card mx-auto mb-6 flex items-center justify-center animate-float animate-border-glow border border-white/[0.06]">
            <Tv className="w-10 h-10 text-white/[0.15]" />
          </div>
          <p className="text-lg font-bold mb-2 text-white/50">No watch history yet</p>
          <p className="text-sm text-white/20 mb-8 max-w-sm mx-auto">
            Start watching anime and your history will appear here
          </p>
          <Link href="/browse">
            <Button className="rounded-2xl font-semibold gap-2 shadow-lg shadow-white/5" data-testid="button-start-watching">
              <Sparkles className="w-4 h-4" />
              Start Watching
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item, i) => (
            <Link key={item.id} href={`/watch/${item.animeId}/${item.episodeNumber}`}>
              <div
                className="flex items-center gap-4 p-3.5 liquid-glass-card rounded-2xl hover:border-white/[0.14] transition-all duration-300 cursor-pointer group"
                data-testid={`history-${item.id}`}
              >
                <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.06] group-hover:border-white/[0.14] transition-all relative shadow-lg shadow-black/20">
                  <img
                    src={item.imageUrl || ""}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                    <Play className="w-4 h-4 text-white" fill="currentColor" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate text-white/70 group-hover:text-white transition-colors">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08] backdrop-blur-sm">
                      Episode {item.episodeNumber}
                    </span>
                    {item.watchedAt && (
                      <span className="text-xs text-white/15">
                        {formatTimeAgo(item.watchedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/[0.08] group-hover:bg-white/[0.10] backdrop-blur-sm">
                  <Play className="w-4 h-4 text-white/60 ml-0.5" fill="currentColor" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
