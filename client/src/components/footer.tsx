import { Heart, Mail, Send, ArrowUp, Sparkles } from "lucide-react";
import { Link } from "wouter";
const logoUrl = "/logo.png";

export function Footer() {
  return (
    <footer className="relative mt-16">
      {/* Animated gradient top border */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      <div className="bg-gradient-to-b from-transparent to-black/30">
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer mb-4 group/logo" data-testid="footer-logo">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-purple-400/30 shadow-lg shadow-purple-500/20 group-hover/logo:shadow-purple-500/40 group-hover/logo:scale-105 transition-all duration-300 flex-shrink-0">
                    <img
                      src={logoUrl}
                      alt="AnimeCruise"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-heading font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-300 via-white to-blue-300 bg-clip-text text-transparent">
                    AnimeCruise
                  </span>
                </div>
              </Link>
              <p className="text-sm text-white/25 leading-relaxed max-w-sm">
                Your gateway to the anime universe. Discover, watch, and track your favorite anime all in one place.
              </p>
            </div>

            <div>
              <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Explore</h4>
              <nav className="flex flex-col gap-2.5">
                {[
                  { href: "/browse", label: "Browse Anime" },
                  { href: "/trending", label: "Trending" },
                  { href: "/browse?type=movie&order_by=score&sort=desc", label: "Top Movies" },
                  { href: "/genres", label: "Genres" },
                  { href: "/browse?status=upcoming", label: "Upcoming" },
                ].map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span className="text-sm text-white/30 hover:text-white/70 transition-colors duration-300 cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Your Library</h4>
              <nav className="flex flex-col gap-2.5">
                {[
                  { href: "/bookmarks", label: "My List" },
                  { href: "/history", label: "Watch History" },
                  { href: "/profile", label: "Profile" },
                ].map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span className="text-sm text-white/30 hover:text-white/70 transition-colors duration-300 cursor-pointer">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Support</h4>
              <nav className="flex flex-col gap-3">
                <a
                  href="https://t.me/FNxELECTRA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/30 hover:text-white/70 transition-colors duration-300 group"
                  data-testid="link-telegram-support"
                >
                  <Send className="w-3.5 h-3.5 text-white/20 group-hover:text-blue-400 transition-colors" />
                  <span className="group-hover:translate-x-0.5 transition-transform">Telegram</span>
                </a>
                <a
                  href="mailto:electraop09@gmail.com"
                  className="flex items-center gap-2 text-sm text-white/30 hover:text-white/70 transition-colors duration-300 group"
                  data-testid="link-email-support"
                >
                  <Mail className="w-3.5 h-3.5 text-white/20 group-hover:text-red-400 transition-colors" />
                  <span className="group-hover:translate-x-0.5 transition-transform">Email</span>
                </a>
                <Link href="/support">
                  <span className="flex items-center gap-2 text-sm text-white/30 hover:text-white/70 transition-colors duration-300 cursor-pointer">
                    Report an Issue
                  </span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Trending Anime Marquee */}
          <div className="py-4 border-t border-white/[0.04] mb-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3 text-purple-400/50" />
              <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">Trending Now</span>
            </div>
            <div className="relative">
              <div className="animate-marquee whitespace-nowrap flex gap-8">
                {["Solo Leveling", "Jujutsu Kaisen", "One Piece", "Demon Slayer", "Attack on Titan", "My Hero Academia", "Chainsaw Man", "Spy × Family", "Bleach", "Dragon Ball",
                  "Solo Leveling", "Jujutsu Kaisen", "One Piece", "Demon Slayer", "Attack on Titan", "My Hero Academia", "Chainsaw Man", "Spy × Family", "Bleach", "Dragon Ball"
                ].map((name, i) => (
                  <span key={i} className="text-xs text-white/10 font-medium">{name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20 flex items-center gap-1.5">
              Made with <Heart className="w-3 h-3 text-red-400/50" fill="currentColor" /> for anime fans
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-white/15">
                Data provided by Jikan API (MyAnimeList)
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-xs text-white/20 hover:text-white/50 transition-colors flex items-center gap-1 group"
              >
                <ArrowUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
