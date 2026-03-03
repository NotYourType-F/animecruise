import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bookmark, Menu, X, Home, Compass, Clock, TrendingUp, Star, Play, Loader2, User, LogIn, HelpCircle, LayoutGrid } from "lucide-react";
const logoUrl = "/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { AnimeData } from "@shared/schema";

function SearchResultsList({ searchResults, searchQuery, selectResult, handleSearch }: {
  searchResults: AnimeData[];
  searchQuery: string;
  selectResult: (id: number) => void;
  handleSearch: (e?: React.FormEvent) => void;
}) {
  return (
    <div className="liquid-glass rounded-2xl border border-white/[0.12] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" data-testid="search-results-dropdown">
      <div className="p-2 border-b border-white/[0.06]">
        <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium px-2 py-1">
          Results for "{searchQuery}"
        </p>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {searchResults.map((anime) => {
          const img = anime.images?.webp?.image_url || anime.images?.jpg?.image_url;
          const title = anime.title_english || anime.title;
          return (
            <button
              key={anime.mal_id}
              onClick={() => selectResult(anime.mal_id)}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group/result text-left"
              data-testid={`search-result-${anime.mal_id}`}
            >
              <div className="w-11 h-[60px] rounded-lg overflow-hidden flex-shrink-0 border border-white/[0.08] group-hover/result:border-white/[0.15] transition-all shadow-sm">
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-cover group-hover/result:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate group-hover/result:text-white transition-colors">
                  {title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {anime.score && (
                    <span className="flex items-center gap-0.5 text-[11px] text-yellow-400">
                      <Star className="w-2.5 h-2.5" fill="currentColor" />
                      {anime.score.toFixed(1)}
                    </span>
                  )}
                  {anime.type && (
                    <span className="text-[10px] text-white/25">{anime.type}</span>
                  )}
                  {anime.episodes && (
                    <span className="text-[10px] text-white/20">{anime.episodes} eps</span>
                  )}
                  {anime.year && (
                    <span className="text-[10px] text-white/20">{anime.year}</span>
                  )}
                </div>
                {anime.genres && anime.genres.length > 0 && (
                  <p className="text-[10px] text-white/15 mt-0.5 truncate">
                    {anime.genres.slice(0, 3).map(g => g.name).join(" · ")}
                  </p>
                )}
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-all flex-shrink-0 border border-white/[0.06]">
                <Play className="w-3 h-3 text-white/50 ml-0.5" fill="currentColor" />
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => handleSearch()}
        className="w-full p-2.5 text-center text-xs text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all border-t border-white/[0.06]"
        data-testid="search-view-all"
      >
        View all results for "{searchQuery}"
      </button>
    </div>
  );
}

function SearchNoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="liquid-glass rounded-2xl border border-white/[0.12] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-6 text-center">
      <Search className="w-6 h-6 text-white/10 mx-auto mb-2" />
      <p className="text-sm text-white/30">No results found</p>
      <p className="text-[11px] text-white/15 mt-1">Try a different search term</p>
    </div>
  );
}

export function Header() {
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchResults, setSearchResults] = useState<AnimeData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasDropdown = showResults && (searchResults.length > 0 || (searchQuery.trim().length >= 2 && !isSearching));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
        setSearchResults([]);
        setShowResults(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Ctrl+K / ⌘K shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideDesktop = searchContainerRef.current?.contains(target);
      const clickedInsideMobile = mobileOverlayRef.current?.contains(target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jikan/anime?q=${encodeURIComponent(query)}&limit=2&sfw=true`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data || []);
          setShowResults(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSearch = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery, setLocation]);

  const selectResult = useCallback((animeId: number) => {
    setLocation(`/anime/${animeId}`);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [setLocation]);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: Compass },
    { href: "/genres", label: "Genres", icon: LayoutGrid },
    { href: "/trending", label: "Trending", icon: TrendingUp },
    { href: "/bookmarks", label: "My List", icon: Bookmark },
    { href: "/history", label: "History", icon: Clock },
    { href: "/support", label: "Support", icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const searchInputElement = (isMobile: boolean) => (
    <form onSubmit={handleSearch}>
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        )}
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
          placeholder="Search anime..."
          className="w-full h-9 pl-9 pr-16 bg-white/[0.06] border-white/[0.12] text-sm rounded-xl text-white placeholder:text-white/25 focus:bg-white/[0.10] focus:border-white/20 transition-all backdrop-blur-md shadow-inner shadow-black/20"
          data-testid={isMobile ? "input-search-mobile" : "input-search"}
          autoFocus={isMobile}
        />
        {!isMobile && !searchQuery && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="text-[10px] text-white/20 bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </div>
        )}
      </div>
    </form>
  );

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "liquid-glass border-b border-white/[0.08] shadow-xl shadow-black/30" : "bg-black/20 backdrop-blur-xl border-b border-transparent"}`}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between gap-3 h-16">
            <div className="flex items-center gap-5 flex-shrink-0">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer group/logo" data-testid="link-logo">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-purple-400/30 shadow-lg shadow-purple-500/20 group-hover/logo:shadow-purple-500/40 group-hover/logo:scale-105 transition-all duration-300 flex-shrink-0">
                    <img
                      src={logoUrl}
                      alt="AnimeCruise"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-heading font-extrabold text-lg tracking-tight text-white drop-shadow-sm bg-gradient-to-r from-purple-300 via-white to-blue-300 bg-clip-text text-transparent">
                    AnimeCruise
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-0.5">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`relative text-sm rounded-xl px-3 transition-all duration-300 ${isActive(item.href)
                        ? "text-white font-semibold bg-white/[0.08] backdrop-blur-sm"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                        }`}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="w-3.5 h-3.5 mr-1.5" />
                      {item.label}
                      {isActive(item.href) && (
                        <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent rounded-full nav-indicator" />
                      )}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Mobile search icon */}
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden rounded-xl text-white/40 hover:bg-white/[0.06] min-w-[44px] min-h-[44px]"
                onClick={() => { setMobileSearchOpen(true); setShowResults(false); }}
                data-testid="button-search-mobile"
              >
                <Search className="w-5 h-5" />
              </Button>
              {/* Desktop search bar */}
              <div ref={searchContainerRef} className="relative hidden md:block flex-1 max-w-sm">
                {searchInputElement(false)}

                {/* Desktop dropdown - absolute under search bar */}
                <div className="hidden md:block">
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-auto right-0 mt-2 w-[400px] z-[100]">
                      <SearchResultsList
                        searchResults={searchResults}
                        searchQuery={searchQuery}
                        selectResult={selectResult}
                        handleSearch={handleSearch}
                      />
                    </div>
                  )}
                  {showResults && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                    <div className="absolute top-full left-auto right-0 mt-2 w-[400px] z-[100]">
                      <SearchNoResults searchQuery={searchQuery} />
                    </div>
                  )}
                </div>
              </div>

              <Link href={isLoggedIn ? "/profile" : "/login"}>
                <button
                  className="hidden md:flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all duration-300 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]"
                  data-testid="button-profile"
                >
                  {isLoggedIn && user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-7 h-7 rounded-lg object-cover border border-white/[0.12]" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
                      <User className="w-3.5 h-3.5 text-white/30" />
                    </div>
                  )}
                  <span className="text-sm text-white/50">
                    {isLoggedIn ? user?.username : "Sign In"}
                  </span>
                </button>
              </Link>

              <Link href={isLoggedIn ? "/profile" : "/login"}>
                <button
                  className="md:hidden w-10 h-10 rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center bg-white/[0.04]"
                  data-testid="button-profile-mobile"
                >
                  {isLoggedIn && user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white/30" />
                  )}
                </button>
              </Link>

              <Button
                size="icon"
                variant="ghost"
                className="md:hidden rounded-xl text-white/40 hover:bg-white/[0.06]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] liquid-glass mobile-menu-slide">
            <nav className="flex flex-col p-3 gap-0.5">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className={`w-full justify-start rounded-xl transition-all ${isActive(item.href)
                      ? "text-white bg-white/[0.08] font-semibold border border-white/[0.12] backdrop-blur-sm shadow-inner shadow-white/[0.03]"
                      : "text-white/40 hover:bg-white/[0.05]"
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="w-4 h-4 mr-2.5" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile fixed overlay: search bar + results pinned to top of screen */}
      {(hasDropdown || mobileSearchOpen) && (
        <div ref={mobileOverlayRef} className="md:hidden fixed inset-x-0 top-0 z-[200] bg-black/90 backdrop-blur-2xl border-b border-white/[0.08]" data-testid="mobile-search-overlay">
          <div className="px-3 pt-3 pb-2 flex items-center gap-2">
            <div className="flex-1">
              {searchInputElement(true)}
            </div>
            <button
              onClick={() => {
                setShowResults(false);
                setSearchQuery("");
                setSearchResults([]);
                setMobileSearchOpen(false);
              }}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.12] transition-all"
              data-testid="button-close-search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 pb-3">
            {searchResults.length > 0 ? (
              <SearchResultsList
                searchResults={searchResults}
                searchQuery={searchQuery}
                selectResult={selectResult}
                handleSearch={handleSearch}
              />
            ) : (
              searchQuery.trim().length >= 2 && !isSearching && (
                <SearchNoResults searchQuery={searchQuery} />
              )
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/[0.08] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/browse", label: "Browse", icon: Compass },
            { href: "/trending", label: "Trending", icon: TrendingUp },
            { href: "/bookmarks", label: "My List", icon: Bookmark },
            { href: "/history", label: "History", icon: Clock },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px] ${isActive(item.href) ? "text-purple-400" : "text-white/35 active:text-white/60"}`}
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
