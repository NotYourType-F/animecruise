import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookmarkSchema, insertWatchHistorySchema } from "@shared/schema";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { log } from "./index";
import { ANIME, SubOrSub } from "@consumet/extensions";
import { HiAnime } from "aniwatch";
import bcrypt from "bcryptjs";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

function pruneCache() {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE + 50);
    for (const [key] of toRemove) cache.delete(key);
  }
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60 * 1000);

function sanitizeInput(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getEffectiveSessionId(req: any): string {
  const userId = req.session?.userId;
  return userId ? `user:${userId}` : req.session.id;
}

const animeKai = new ANIME.AnimeKai();
const animePahe = new ANIME.AnimePahe();
const hianimeScraper = new HiAnime.Scraper();

async function fetchJikan(path: string): Promise<any> {
  const cacheKey = path;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const url = `${JIKAN_BASE}${path}`;
  log(`Fetching from Jikan: ${url}`, "jikan");

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchJikan(path);
    }
    throw new Error(`Jikan API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
  pruneCache();
  return data;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = pgSession(session);
  const isDev = process.env.NODE_ENV !== "production";
  const isCrossOrigin = !!process.env.CROSS_ORIGIN; // Set if frontend/backend on different domains

  // Enforce a real secret in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!isDev && !sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required in production!");
  }
  if (isDev && !sessionSecret) {
    console.warn("⚠️  Using default session secret. Set SESSION_SECRET env var for production.");
  }

  app.set("trust proxy", 1);
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      name: "animecruise.sid",
      secret: sessionSecret || "animecruise-dev-secret-key",
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: isDev ? "lax" as const : (isCrossOrigin ? "none" as const : "lax" as const),
        secure: !isDev,
        httpOnly: true,
      },
      proxy: !isDev,
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`register:${ip}`, 5, 60 * 1000)) {
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }
      const { username, email, password, avatarUrl } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "Username must be 3-30 characters" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ error: "Email already in use" });
        }
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const oldSessionId = req.session.id;
      const user = await storage.createUser({
        username,
        email: email || null,
        passwordHash,
        avatarUrl: avatarUrl || null,
      });
      (req.session as any).userId = user.id;
      await storage.migrateSessionData(oldSessionId, `user:${user.id}`);
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
      });
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`login:${ip}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: "Too many login attempts. Please try again later." });
      }
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const oldSessionId = req.session.id;
      (req.session as any).userId = user.id;
      await storage.migrateSessionData(oldSessionId, `user:${user.id}`);
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
      });
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    (req.session as any).userId = null;
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not logged in" });
      }
      const { username, email, avatarUrl, currentPassword, newPassword } = req.body;
      const updateData: any = {};
      if (username) {
        const existing = await storage.getUserByUsername(username);
        if (existing && existing.id !== userId) {
          return res.status(409).json({ error: "Username already taken" });
        }
        updateData.username = username;
      }
      if (email !== undefined) {
        if (email) {
          const existing = await storage.getUserByEmail(email);
          if (existing && existing.id !== userId) {
            return res.status(409).json({ error: "Email already in use" });
          }
        }
        updateData.email = email || null;
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password required to change password" });
        }
        const user = await storage.getUserById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      }
      const user = await storage.updateUser(userId, updateData);
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/anime-seasons/:id", async (req, res) => {
    try {
      const startId = parseInt(req.params.id, 10);
      const allEntries: { mal_id: number; title: string; type: string; image: string }[] = [];
      const visited = new Set<number>();

      let currentId: number | null = startId;
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const relData = await fetchJikan(`/anime/${currentId}/relations`);
        const prequels = relData?.data
          ?.filter((r: any) => r.relation === "Prequel")
          ?.flatMap((r: any) => r.entry.filter((e: any) => e.type === "anime")) || [];
        if (prequels.length > 0) {
          currentId = prequels[0].mal_id;
        } else {
          break;
        }
      }

      const firstId = currentId || startId;
      visited.clear();
      currentId = firstId;
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const animeData = await fetchJikan(`/anime/${currentId}`);
        const animeType = animeData?.data?.type || "Unknown";
        const title = animeData?.data?.title_english || animeData?.data?.title || `Entry ${allEntries.length + 1}`;
        const image = animeData?.data?.images?.jpg?.large_image_url || animeData?.data?.images?.jpg?.image_url || "";
        allEntries.push({ mal_id: currentId, title, type: animeType, image });

        const relData = await fetchJikan(`/anime/${currentId}/relations`);
        const sequels = relData?.data
          ?.filter((r: any) => r.relation === "Sequel")
          ?.flatMap((r: any) => r.entry.filter((e: any) => e.type === "anime")) || [];
        if (sequels.length > 0) {
          currentId = sequels[0].mal_id;
        } else {
          break;
        }
      }

      const tvSeasons = allEntries.filter((e) => e.type === "TV");
      res.json({ data: tvSeasons });
    } catch (error: any) {
      log(`Seasons chain error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/anime-episodes/:id", async (req, res) => {
    try {
      const animeId = parseInt(req.params.id, 10);
      const allEpisodes: any[] = [];
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const data = await fetchJikan(`/anime/${animeId}/episodes?page=${page}`);
        if (data?.data) {
          allEpisodes.push(...data.data);
        }
        hasNext = data?.pagination?.has_next_page === true;
        page++;
        if (page > 50) break;
      }

      res.json({ data: allEpisodes });
    } catch (error: any) {
      log(`All episodes error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/avatar-image/:charId", async (req, res) => {
    try {
      const charId = req.params.charId;
      const cacheKey = `avatar_img_${charId}`;
      const cached = cache.get(cacheKey);
      let imageUrl: string;
      if (cached && cached.expires > Date.now()) {
        imageUrl = cached.data;
      } else {
        const data = await fetchJikan(`/characters/${charId}`);
        imageUrl = data?.data?.images?.jpg?.image_url || data?.data?.images?.webp?.image_url || "";
        if (imageUrl) {
          cache.set(cacheKey, { data: imageUrl, expires: Date.now() + 24 * 60 * 60 * 1000 });
        }
      }
      if (!imageUrl) {
        res.status(404).json({ error: "Image not found" });
        return;
      }
      const imgRes = await fetch(imageUrl, {
        headers: { "Referer": "https://myanimelist.net/" }
      });
      if (!imgRes.ok) {
        res.status(imgRes.status).end();
        return;
      }
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400");
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const AVATAR_CHARACTERS = [
    { id: "naruto", name: "Naruto", char_id: 17 },
    { id: "sasuke", name: "Sasuke", char_id: 13 },
    { id: "sakura", name: "Sakura", char_id: 145 },
    { id: "kakashi", name: "Kakashi", char_id: 85 },
    { id: "itachi", name: "Itachi", char_id: 5806 },
    { id: "hinata", name: "Hinata", char_id: 1555 },
    { id: "goku", name: "Goku", char_id: 246 },
    { id: "vegeta", name: "Vegeta", char_id: 913 },
    { id: "luffy", name: "Luffy", char_id: 40 },
    { id: "zoro", name: "Zoro", char_id: 62 },
    { id: "tanjiro", name: "Tanjiro", char_id: 170732 },
    { id: "nezuko", name: "Nezuko", char_id: 170733 },
    { id: "gojo", name: "Gojo", char_id: 164471 },
    { id: "sukuna", name: "Sukuna", char_id: 164470 },
    { id: "levi", name: "Levi", char_id: 45627 },
    { id: "mikasa", name: "Mikasa", char_id: 40881 },
    { id: "eren", name: "Eren", char_id: 40882 },
    { id: "deku", name: "Deku", char_id: 117911 },
    { id: "todoroki", name: "Todoroki", char_id: 117909 },
    { id: "saitama", name: "Saitama", char_id: 73935 },
    { id: "killua", name: "Killua", char_id: 27 },
    { id: "gon", name: "Gon", char_id: 30 },
    { id: "ichigo", name: "Ichigo", char_id: 5 },
    { id: "edward", name: "Edward Elric", char_id: 11 },
    { id: "light", name: "Light Yagami", char_id: 80 },
    { id: "lelouch", name: "Lelouch", char_id: 417 },
    { id: "rem", name: "Rem", char_id: 118737 },
    { id: "emilia", name: "Emilia", char_id: 118739 },
    { id: "zero-two", name: "Zero Two", char_id: 155036 },
    { id: "anya", name: "Anya", char_id: 196330 },
    { id: "erza", name: "Erza", char_id: 1715 },
    { id: "natsu", name: "Natsu", char_id: 5187 },
    { id: "asuna", name: "Asuna", char_id: 36828 },
    { id: "megumin", name: "Megumin", char_id: 92067 },
    { id: "spike", name: "Spike Spiegel", char_id: 1 },
    { id: "roy", name: "Roy Mustang", char_id: 68 },
  ];

  app.get("/api/avatars", async (_req, res) => {
    res.json(AVATAR_CHARACTERS.map(c => ({
      id: c.id,
      name: c.name,
      url: `/api/avatar-image/${c.char_id}`,
    })));
  });

  app.use("/api/jikan", async (req, res, next) => {
    if (req.method !== "GET") return next();
    try {
      const jikanPath = req.url;
      const data = await fetchJikan(jikanPath);
      res.json(data);
    } catch (error: any) {
      log(`Jikan proxy error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bookmarks", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const results = await storage.getBookmarks(sessionId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const data = insertBookmarkSchema.parse({ ...req.body, sessionId });

      const existing = await storage.getBookmarkByAnimeId(sessionId, data.animeId);
      if (existing) {
        return res.json(existing);
      }

      const bookmark = await storage.createBookmark(data);
      res.status(201).json(bookmark);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/bookmarks/:animeId", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const animeId = parseInt(req.params.animeId, 10);
      await storage.deleteBookmark(sessionId, animeId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const results = await storage.getWatchHistory(sessionId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/history", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const data = insertWatchHistorySchema.parse({ ...req.body, sessionId });
      const entry = await storage.addWatchHistory(data);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/continue-watching", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const results = await storage.getContinueWatching(sessionId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/history/progress", async (req, res) => {
    try {
      const sessionId = getEffectiveSessionId(req);
      const { animeId, episodeNumber, watchProgress, videoDuration } = req.body;
      if (!animeId || !episodeNumber) {
        return res.status(400).json({ error: "Missing animeId or episodeNumber" });
      }
      await storage.updateWatchProgress(
        sessionId,
        Number(animeId),
        Number(episodeNumber),
        Math.floor(Number(watchProgress || 0)),
        Math.floor(Number(videoDuration || 0))
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/comments/:animeId/:episodeNumber", async (req, res) => {
    try {
      const animeId = Number(req.params.animeId);
      const episodeNumber = Number(req.params.episodeNumber);
      const currentUserId = req.session?.userId || undefined;
      const result = await storage.getComments(animeId, episodeNumber, currentUserId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ratings/:animeId", async (req, res) => {
    try {
      const animeId = Number(req.params.animeId);
      const community = await storage.getAverageRating(animeId);
      let userRating = null;
      if (req.session?.userId) {
        const rating = await storage.getUserRating(animeId, req.session.userId);
        userRating = rating?.score || null;
      }
      res.json({ userRating, community });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ratings/:animeId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be signed in to rate" });
      }
      const animeId = Number(req.params.animeId);
      const { score } = req.body;
      if (!score || score < 1 || score > 10) {
        return res.status(400).json({ error: "Score must be between 1 and 10" });
      }
      const rating = await storage.setRating(animeId, req.session.userId, score);
      const community = await storage.getAverageRating(animeId);
      res.json({ rating, community });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/comments/count/:animeId/:episodeNumber", async (req, res) => {
    try {
      const animeId = Number(req.params.animeId);
      const episodeNumber = Number(req.params.episodeNumber);
      const count = await storage.getCommentCount(animeId, episodeNumber);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be signed in to comment" });
      }
      const userId = req.session.userId;
      if (!checkRateLimit(`comment:${userId}`, 10, 60 * 1000)) {
        return res.status(429).json({ error: "You're commenting too fast. Please wait a moment." });
      }
      const { animeId, episodeNumber, content, parentId } = req.body;
      if (!animeId || !episodeNumber || !content?.trim()) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const trimmed = content.trim();
      if (trimmed.length > 2000) {
        return res.status(400).json({ error: "Comment is too long (max 2000 characters)" });
      }
      const comment = await storage.createComment({
        animeId: Number(animeId),
        episodeNumber: Number(episodeNumber),
        userId,
        content: sanitizeInput(trimmed),
        parentId: parentId || null,
      });
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/comments/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be signed in" });
      }
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ error: "Content required" });
      }
      const trimmed = content.trim();
      if (trimmed.length > 2000) {
        return res.status(400).json({ error: "Comment is too long (max 2000 characters)" });
      }
      const comment = await storage.updateComment(req.params.id, req.session.userId, sanitizeInput(trimmed));
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be signed in" });
      }
      await storage.deleteComment(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/comments/:id/like", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "You must be signed in to like comments" });
      }
      const result = await storage.toggleCommentLike(req.params.id, req.session.userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stream/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const provider = (req.query.provider as string) || "animekai";
      if (!query) return res.status(400).json({ error: "Query required" });

      const cacheKey = `stream-search:${provider}:${query}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return res.json(cached.data);
      }

      log(`Searching anime stream (${provider}): ${query}`, "stream");

      if (provider === "hianime") {
        const hianimeResults = await hianimeScraper.search(query);
        const enriched = {
          results: (hianimeResults?.animes || []).map((a: any) => ({
            id: a.id,
            title: a.name,
            image: a.poster,
            url: `https://hianime.to/${a.id}`,
            sub: a.episodes?.sub,
            dub: a.episodes?.dub,
          })),
          provider: "hianime",
        };
        cache.set(cacheKey, { data: enriched, expires: Date.now() + CACHE_TTL });
        return res.json(enriched);
      }

      const providerInstance = provider === "animepahe" ? animePahe : animeKai;
      const results = await providerInstance.search(query);
      const enriched = { ...results, provider };
      cache.set(cacheKey, { data: enriched, expires: Date.now() + CACHE_TTL });
      res.json(enriched);
    } catch (error: any) {
      log(`Stream search error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stream/info/:id", async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.id);
      const provider = (req.query.provider as string) || "animekai";
      const cacheKey = `stream-info:${provider}:${animeId}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return res.json(cached.data);
      }

      log(`Fetching anime info (${provider}): ${animeId}`, "stream");

      if (provider === "hianime") {
        const [epData, infoData] = await Promise.all([
          hianimeScraper.getEpisodes(animeId),
          hianimeScraper.getInfo(animeId).catch(() => null),
        ]);
        const dubCount = infoData?.anime?.info?.stats?.episodes?.dub || 0;
        const enriched = {
          id: animeId,
          title: infoData?.anime?.info?.name || animeId.replace(/-\d+$/, "").replace(/-/g, " "),
          hasDub: dubCount > 0,
          episodes: (epData?.episodes || []).map((ep: any) => ({
            id: ep.episodeId,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
            isFiller: ep.isFiller || false,
            isDubbed: ep.number <= dubCount,
          })),
          totalEpisodes: epData?.totalEpisodes || epData?.episodes?.length || 0,
          provider: "hianime",
        };
        cache.set(cacheKey, { data: enriched, expires: Date.now() + CACHE_TTL });
        return res.json(enriched);
      }

      const providerInstance = provider === "animepahe" ? animePahe : animeKai;
      const info = await providerInstance.fetchAnimeInfo(animeId);
      const enriched = { ...info, provider };
      cache.set(cacheKey, { data: enriched, expires: Date.now() + CACHE_TTL });
      res.json(enriched);
    } catch (error: any) {
      log(`Stream info error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stream/watch/:episodeId", async (req, res) => {
    try {
      const episodeId = decodeURIComponent(req.params.episodeId);
      const dubParam = req.query.dub === "true" ? "dub" : "sub";
      const provider = (req.query.provider as string) || "animekai";
      const cacheKey = `stream-watch:${provider}:${episodeId}:${dubParam}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        registerStreamDomains(cached.data);
        return res.json(cached.data);
      }

      log(`Fetching streaming sources (${provider}): ${episodeId} (${dubParam})`, "stream");

      if (provider === "hianime") {
        const servers = ["hd-1", "hd-2"];
        const category = dubParam === "dub" ? "dub" : "sub";
        let hianimeData: any = null;
        let lastErr: any = null;

        for (const server of servers) {
          try {
            log(`Trying HiAnime server: ${server}`, "stream");
            hianimeData = await hianimeScraper.getEpisodeSources(episodeId, server as any, category);
            if (hianimeData?.sources?.length) break;
          } catch (err: any) {
            log(`HiAnime server ${server} failed: ${err.message}`, "stream");
            lastErr = err;
          }
        }

        if (!hianimeData?.sources?.length) {
          throw lastErr || new Error("No streaming sources found from HiAnime");
        }

        const rawTracks = (hianimeData as any)?.tracks || (hianimeData as any)?.subtitles || (hianimeData as any)?.captions || [];
        log(`HiAnime raw tracks: ${rawTracks.length} tracks found. Kinds: ${rawTracks.map((t: any) => `${t.kind || '?'}:${t.lang || t.label || '?'}`).join(', ')}`, "stream");
        log(`HiAnime data keys: ${Object.keys(hianimeData || {}).join(', ')}`, "stream");

        const sources = {
          sources: (hianimeData.sources || []).map((s: any) => ({
            url: s.url,
            quality: s.quality || "auto",
            isM3U8: s.isM3U8 || s.type === "hls" || s.url?.includes(".m3u8"),
          })),
          subtitles: rawTracks
            .filter((t: any) => {
              if (!t.url) return false;
              const kind = (t.kind || "").toLowerCase();
              const label = (t.label || t.lang || "").toLowerCase();
              if (kind === "thumbnails" || label === "thumbnails") return false;
              return t.lang || t.label;
            })
            .map((t: any) => ({
              url: t.url,
              lang: (t.lang || t.label || "Unknown").trim(),
            })),
          headers: hianimeData?.headers || { Referer: "https://megacloud.blog/" },
          intro: hianimeData?.intro,
          outro: (hianimeData as any)?.outro,
        };

        registerStreamDomains(sources);
        cache.set(cacheKey, { data: sources, expires: Date.now() + CACHE_TTL });
        return res.json(sources);
      }

      const providerInstance = provider === "animepahe" ? animePahe : animeKai;
      const subOrDub = dubParam === "dub" ? SubOrSub.DUB : SubOrSub.SUB;

      let sources: any;
      try {
        sources = await providerInstance.fetchEpisodeSources(episodeId, undefined, subOrDub);
      } catch (primaryErr: any) {
        log(`Primary provider (${provider}) failed: ${primaryErr.message}, no fallback for source fetch`, "stream");
        throw primaryErr;
      }

      if (!sources?.sources?.length) {
        throw new Error("No streaming sources found");
      }

      if (sources?.subtitles) {
        sources.subtitles = sources.subtitles
          .filter((t: any) => {
            if (!t.url) return false;
            const kind = (t.kind || "").toLowerCase();
            const label = (t.label || t.lang || "").toLowerCase();
            if (kind === "thumbnails" || label === "thumbnails") return false;
            return t.lang || t.label;
          })
          .map((t: any) => ({
            url: t.url,
            lang: (t.lang || t.label || "Unknown").trim(),
          }));
      }

      registerStreamDomains(sources);
      cache.set(cacheKey, { data: sources, expires: Date.now() + CACHE_TTL });
      res.json(sources);
    } catch (error: any) {
      log(`Stream watch error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  const knownStreamDomains = new Set<string>([
    "megaup.cc", "anikai.to", "kwik.cx", "owocdn.top", "animepahe.si", "animepahe.com",
    "megacloud.blog", "hianime.to", "mgstatics.xyz", "lightningspark77.pro",
  ]);

  function addDomainWithBase(hostname: string) {
    knownStreamDomains.add(hostname);
    const parts = hostname.split(".");
    if (parts.length > 2) {
      knownStreamDomains.add(parts.slice(-2).join("."));
    }
  }

  function registerStreamDomains(sources: any) {
    try {
      if (sources?.sources) {
        for (const s of sources.sources) {
          if (s.url) addDomainWithBase(new URL(s.url).hostname);
        }
      }
      if (sources?.subtitles) {
        for (const s of sources.subtitles) {
          if (s.url) addDomainWithBase(new URL(s.url).hostname);
        }
      }
      if (sources?.headers?.Referer) {
        addDomainWithBase(new URL(sources.headers.Referer).hostname);
      }
    } catch { }
  }

  function isAllowedStreamUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) return false;
      if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) return false;
      if (parsed.hostname.includes("[")) return false;
      if (knownStreamDomains.has(parsed.hostname)) return true;
      const domains = Array.from(knownStreamDomains);
      for (let i = 0; i < domains.length; i++) {
        if (parsed.hostname.endsWith("." + domains[i])) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function resolveHlsUrl(relative: string, baseUrl: string): string {
    try {
      return new URL(relative, baseUrl).href;
    } catch {
      return relative.startsWith("http") ? relative : baseUrl + relative;
    }
  }

  app.get("/api/subtitle/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "URL required" });

      if (!isAllowedStreamUrl(url)) {
        return res.status(403).json({ error: "URL not allowed" });
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      };

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Subtitle fetch failed" });
      }

      const text = await response.text();
      res.setHeader("Content-Type", "text/vtt; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(text);
    } catch (error: any) {
      log(`Subtitle proxy error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stream/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      const referer = req.query.referer as string;
      if (!url) return res.status(400).json({ error: "URL required" });

      if (!isAllowedStreamUrl(url)) {
        return res.status(403).json({ error: "URL not allowed" });
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      };
      if (referer) {
        headers["Referer"] = referer;
        try { headers["Origin"] = new URL(referer).origin; } catch { }
      }

      let response = await fetch(url, { headers });
      if (!response.ok && response.status >= 500) {
        await new Promise(r => setTimeout(r, 500));
        response = await fetch(url, { headers });
      }
      if (!response.ok) {
        log(`Proxy upstream error: ${response.status} for ${new URL(url).hostname}${new URL(url).pathname.substring(0, 30)}`, "error");
        return res.status(response.status).json({ error: "Proxy fetch failed" });
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");

      const isM3U8 = url.endsWith(".m3u8") || contentType?.includes("mpegurl") || contentType?.includes("x-mpegurl");

      if (isM3U8) {
        const text = await response.text();
        const refParam = referer ? `&referer=${encodeURIComponent(referer)}` : "";
        const lines = text.split("\n");
        const proxied = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) {
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/g, (_match: string, uri: string) => {
                const fullUrl = resolveHlsUrl(uri, url);
                try { addDomainWithBase(new URL(fullUrl).hostname); } catch { }
                return `URI="/api/stream/proxy?url=${encodeURIComponent(fullUrl)}${refParam}"`;
              });
            }
            return line;
          }
          const fullUrl = resolveHlsUrl(trimmed, url);
          try { addDomainWithBase(new URL(fullUrl).hostname); } catch { }
          return `/api/stream/proxy?url=${encodeURIComponent(fullUrl)}${refParam}`;
        }).join("\n");
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(proxied);
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
      }
    } catch (error: any) {
      log(`Proxy error: ${error.message}`, "error");
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
