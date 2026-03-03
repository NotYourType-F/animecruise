export const JIKAN_BASE = "/api/jikan";

export const GENRES = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 8, name: "Drama" },
  { id: 10, name: "Fantasy" },
  { id: 14, name: "Horror" },
  { id: 7, name: "Mystery" },
  { id: 22, name: "Romance" },
  { id: 24, name: "Sci-Fi" },
  { id: 36, name: "Slice of Life" },
  { id: 30, name: "Sports" },
  { id: 37, name: "Supernatural" },
  { id: 41, name: "Thriller" },
  { id: 25, name: "Shoujo" },
  { id: 27, name: "Shounen" },
];

export const ANIME_TYPES = [
  { value: "tv", label: "TV" },
  { value: "movie", label: "Movie" },
  { value: "ova", label: "OVA" },
  { value: "special", label: "Special" },
  { value: "ona", label: "ONA" },
];

export const ANIME_STATUS = [
  { value: "airing", label: "Airing" },
  { value: "complete", label: "Completed" },
  { value: "upcoming", label: "Upcoming" },
];

export const ORDER_OPTIONS = [
  { value: "score", label: "Top Rated" },
  { value: "popularity", label: "Most Popular" },
  { value: "members", label: "Most Members" },
  { value: "favorites", label: "Most Favorited" },
  { value: "start_date", label: "Newest" },
];
