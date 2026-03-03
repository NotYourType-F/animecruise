import { Link } from "wouter";
import { GENRES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import {
  Swords,
  Mountain,
  Laugh,
  Theater,
  Wand2,
  Skull,
  SearchCode,
  HeartHandshake,
  Rocket,
  Coffee,
  Trophy,
  Ghost,
  Crosshair,
  Flower2,
  Flame,
  LayoutGrid,
} from "lucide-react";

const genreIcons: Record<number, typeof Swords> = {
  1: Swords,
  2: Mountain,
  4: Laugh,
  8: Theater,
  10: Wand2,
  14: Skull,
  7: SearchCode,
  22: HeartHandshake,
  24: Rocket,
  36: Coffee,
  30: Trophy,
  37: Ghost,
  41: Crosshair,
  25: Flower2,
  27: Flame,
};

const genreColors: Record<number, string> = {
  1: "from-red-500/20 to-red-900/10 border-red-500/15",
  2: "from-emerald-500/20 to-emerald-900/10 border-emerald-500/15",
  4: "from-yellow-500/20 to-yellow-900/10 border-yellow-500/15",
  8: "from-blue-500/20 to-blue-900/10 border-blue-500/15",
  10: "from-purple-500/20 to-purple-900/10 border-purple-500/15",
  14: "from-gray-500/20 to-gray-900/10 border-gray-500/15",
  7: "from-indigo-500/20 to-indigo-900/10 border-indigo-500/15",
  22: "from-pink-500/20 to-pink-900/10 border-pink-500/15",
  24: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/15",
  36: "from-amber-500/20 to-amber-900/10 border-amber-500/15",
  30: "from-orange-500/20 to-orange-900/10 border-orange-500/15",
  37: "from-violet-500/20 to-violet-900/10 border-violet-500/15",
  41: "from-rose-500/20 to-rose-900/10 border-rose-500/15",
  25: "from-fuchsia-500/20 to-fuchsia-900/10 border-fuchsia-500/15",
  27: "from-sky-500/20 to-sky-900/10 border-sky-500/15",
};

const genreIconColors: Record<number, string> = {
  1: "text-red-400",
  2: "text-emerald-400",
  4: "text-yellow-400",
  8: "text-blue-400",
  10: "text-purple-400",
  14: "text-gray-400",
  7: "text-indigo-400",
  22: "text-pink-400",
  24: "text-cyan-400",
  36: "text-amber-400",
  30: "text-orange-400",
  37: "text-violet-400",
  41: "text-rose-400",
  25: "text-fuchsia-400",
  27: "text-sky-400",
};

export default function Genres() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LayoutGrid className="w-6 h-6 text-white/50" />
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white" data-testid="text-genres-title">
            Browse by Genre
          </h1>
        </div>
        <p className="text-sm text-white/30 ml-9" data-testid="text-genres-subtitle">
          Explore anime by your favorite genres and categories
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {GENRES.map((genre) => {
          const Icon = genreIcons[genre.id] || LayoutGrid;
          const colorClasses = genreColors[genre.id] || "from-white/10 to-white/5 border-white/10";
          const iconColor = genreIconColors[genre.id] || "text-white/50";

          return (
            <Link key={genre.id} href={`/browse?genres=${genre.id}`}>
              <Card
                className={`group cursor-pointer bg-gradient-to-br ${colorClasses} border backdrop-blur-sm rounded-xl p-5 md:p-6 flex flex-col items-center justify-center gap-3 text-center transition-all duration-300 hover:scale-[1.05] hover:shadow-xl hover:shadow-black/30 overflow-visible hover:border-opacity-40`}
                data-testid={`card-genre-${genre.id}`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/[0.06] flex items-center justify-center ${iconColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-white/[0.06] group-hover:border-white/[0.12] group-hover:bg-white/[0.10] group-hover:shadow-lg`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-sm md:text-base font-semibold text-white/80 group-hover:text-white transition-colors duration-300" data-testid={`text-genre-name-${genre.id}`}>
                  {genre.name}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
