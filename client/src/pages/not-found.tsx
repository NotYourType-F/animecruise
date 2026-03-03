import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Home, Compass, TrendingUp, Clock, Bookmark, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GENRES } from "@/lib/constants";

const quickLinks = [
  { title: "Home", href: "/", icon: Home, description: "Back to the main page" },
  { title: "Browse", href: "/browse", icon: Compass, description: "Explore all anime" },
  { title: "Trending", href: "/trending", icon: TrendingUp, description: "See what's popular" },
  { title: "History", href: "/history", icon: Clock, description: "Your watch history" },
  { title: "Bookmarks", href: "/bookmarks", icon: Bookmark, description: "Your saved anime" },
  { title: "Support", href: "/support", icon: HelpCircle, description: "Get help" },
];

const popularGenres = GENRES.slice(0, 6);

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-16 relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1 opacity-30" />
        <div className="orb orb-2 opacity-20" />
        <div className="absolute top-[20%] left-[10%] w-1 h-1 bg-purple-400/40 rounded-full animate-float" style={{ animationDelay: "0s", animationDuration: "4s" }} />
        <div className="absolute top-[40%] right-[15%] w-1.5 h-1.5 bg-blue-400/30 rounded-full animate-float" style={{ animationDelay: "1s", animationDuration: "5s" }} />
        <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-pink-400/30 rounded-full animate-float" style={{ animationDelay: "2s", animationDuration: "3.5s" }} />
        <div className="absolute top-[60%] right-[30%] w-0.5 h-0.5 bg-white/20 rounded-full animate-float" style={{ animationDelay: "0.5s", animationDuration: "4.5s" }} />
        <div className="absolute top-[15%] right-[40%] w-1 h-1 bg-cyan-400/25 rounded-full animate-float" style={{ animationDelay: "1.5s", animationDuration: "5.5s" }} />
      </div>

      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        <div className="space-y-3">
          <h1
            className="text-8xl md:text-9xl font-heading font-black tracking-tight animate-glitch bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient-text"
            data-testid="text-404-heading"
          >
            404
          </h1>
          <h2
            className="text-2xl font-heading font-semibold text-foreground"
            data-testid="text-404-title"
          >
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto" data-testid="text-404-description">
            The page you're looking for doesn't exist or may have been moved. Try searching for what you need or use the links below.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.10] rounded-xl backdrop-blur-sm"
              data-testid="input-404-search"
            />
          </div>
          <Button type="submit" className="rounded-xl" data-testid="button-404-search">
            Search
          </Button>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <div
                  className="flex items-center gap-3 p-3 rounded-xl liquid-glass-card cursor-pointer group hover:scale-[1.03] transition-all duration-300"
                  data-testid={`link-404-${link.title.toLowerCase()}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors border border-white/[0.08]">
                    <link.icon className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Popular Genres
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {popularGenres.map((genre) => (
              <Link key={genre.id} href={`/browse?genres=${genre.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.15] hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  data-testid={`link-404-genre-${genre.id}`}
                >
                  {genre.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl group" data-testid="link-404-go-home">
              <Home className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
