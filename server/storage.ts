import { type Bookmark, type InsertBookmark, type WatchHistory, type InsertWatchHistory, type User, type InsertUser, type Comment, type InsertComment, type CommentLike, type CommentWithUser, type Rating, type InsertRating, bookmarks, watchHistory, users, comments, commentLikes, ratings } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, isNull } from "drizzle-orm";

export interface IStorage {
  getBookmarks(sessionId: string): Promise<Bookmark[]>;
  getBookmarkByAnimeId(sessionId: string, animeId: number): Promise<Bookmark | undefined>;
  createBookmark(data: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(sessionId: string, animeId: number): Promise<void>;
  getWatchHistory(sessionId: string): Promise<WatchHistory[]>;
  addWatchHistory(data: InsertWatchHistory): Promise<WatchHistory>;
  updateWatchProgress(sessionId: string, animeId: number, episodeNumber: number, progress: number, duration: number): Promise<void>;
  getContinueWatching(sessionId: string): Promise<WatchHistory[]>;
  createUser(data: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<Pick<User, "username" | "email" | "avatarUrl" | "passwordHash">>): Promise<User>;
  migrateSessionData(oldSessionId: string, newSessionId: string): Promise<void>;
  getComments(animeId: number, episodeNumber: number, currentUserId?: string): Promise<CommentWithUser[]>;
  createComment(data: InsertComment): Promise<Comment>;
  deleteComment(commentId: string, userId: string): Promise<void>;
  updateComment(commentId: string, userId: string, content: string): Promise<Comment>;
  toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; likes: number }>;
  getCommentCount(animeId: number, episodeNumber: number): Promise<number>;
  getUserRating(animeId: number, userId: string): Promise<Rating | undefined>;
  setRating(animeId: number, userId: string, score: number): Promise<Rating>;
  getAverageRating(animeId: number): Promise<{ average: number; count: number }>;
}

export class DatabaseStorage implements IStorage {
  async getBookmarks(sessionId: string): Promise<Bookmark[]> {
    return db.select().from(bookmarks).where(eq(bookmarks.sessionId, sessionId));
  }

  async getBookmarkByAnimeId(sessionId: string, animeId: number): Promise<Bookmark | undefined> {
    const results = await db.select().from(bookmarks).where(
      and(eq(bookmarks.sessionId, sessionId), eq(bookmarks.animeId, animeId))
    );
    return results[0];
  }

  async createBookmark(data: InsertBookmark): Promise<Bookmark> {
    const [result] = await db.insert(bookmarks).values(data).returning();
    return result;
  }

  async deleteBookmark(sessionId: string, animeId: number): Promise<void> {
    await db.delete(bookmarks).where(
      and(eq(bookmarks.sessionId, sessionId), eq(bookmarks.animeId, animeId))
    );
  }

  async getWatchHistory(sessionId: string): Promise<WatchHistory[]> {
    return db.select().from(watchHistory)
      .where(eq(watchHistory.sessionId, sessionId))
      .orderBy(desc(watchHistory.watchedAt))
      .limit(50);
  }

  async addWatchHistory(data: InsertWatchHistory): Promise<WatchHistory> {
    const existing = await db.select().from(watchHistory).where(
      and(
        eq(watchHistory.sessionId, data.sessionId),
        eq(watchHistory.animeId, data.animeId),
        eq(watchHistory.episodeNumber, data.episodeNumber)
      )
    );

    if (existing.length > 0) {
      const [result] = await db.update(watchHistory)
        .set({
          watchedAt: new Date(),
          imageUrl: data.imageUrl,
          title: data.title,
          watchProgress: data.watchProgress ?? existing[0].watchProgress,
          videoDuration: data.videoDuration ?? existing[0].videoDuration,
        })
        .where(eq(watchHistory.id, existing[0].id))
        .returning();
      return result;
    }

    const [result] = await db.insert(watchHistory).values(data).returning();
    return result;
  }

  async updateWatchProgress(sessionId: string, animeId: number, episodeNumber: number, progress: number, duration: number): Promise<void> {
    const existing = await db.select().from(watchHistory).where(
      and(
        eq(watchHistory.sessionId, sessionId),
        eq(watchHistory.animeId, animeId),
        eq(watchHistory.episodeNumber, episodeNumber)
      )
    );

    if (existing.length > 0) {
      await db.update(watchHistory)
        .set({
          watchProgress: progress,
          videoDuration: duration,
          watchedAt: new Date(),
        })
        .where(eq(watchHistory.id, existing[0].id));
    } else {
      await db.insert(watchHistory).values({
        animeId,
        episodeNumber,
        title: "Unknown",
        sessionId,
        watchProgress: progress,
        videoDuration: duration,
      });
    }
  }

  async getContinueWatching(sessionId: string): Promise<WatchHistory[]> {
    const allHistory = await db.select().from(watchHistory)
      .where(eq(watchHistory.sessionId, sessionId))
      .orderBy(desc(watchHistory.watchedAt));

    const latestPerAnime = new Map<number, WatchHistory>();
    for (const entry of allHistory) {
      if (!latestPerAnime.has(entry.animeId)) {
        latestPerAnime.set(entry.animeId, entry);
      }
    }

    return Array.from(latestPerAnime.values())
      .filter(entry => {
        if (!entry.videoDuration || entry.videoDuration === 0) return true;
        const progressPercent = (entry.watchProgress || 0) / entry.videoDuration;
        return progressPercent < 0.9;
      })
      .slice(0, 20);
  }

  async createUser(data: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(data).returning();
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async updateUser(id: string, data: Partial<Pick<User, "username" | "email" | "avatarUrl" | "passwordHash">>): Promise<User> {
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }

  async migrateSessionData(oldSessionId: string, newSessionId: string): Promise<void> {
    await db.update(bookmarks).set({ sessionId: newSessionId }).where(eq(bookmarks.sessionId, oldSessionId));
    await db.update(watchHistory).set({ sessionId: newSessionId }).where(eq(watchHistory.sessionId, oldSessionId));
  }

  async getComments(animeId: number, episodeNumber: number, currentUserId?: string): Promise<CommentWithUser[]> {
    const allComments = await db.select().from(comments)
      .where(and(eq(comments.animeId, animeId), eq(comments.episodeNumber, episodeNumber)))
      .orderBy(desc(comments.createdAt));

    const userIds = [...new Set(allComments.map(c => c.userId))];
    const usersMap = new Map<string, Pick<User, "id" | "username" | "avatarUrl">>();
    for (const uid of userIds) {
      const u = await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
        .from(users).where(eq(users.id, uid));
      if (u[0]) usersMap.set(uid, u[0]);
    }

    let likedSet = new Set<string>();
    if (currentUserId) {
      const likes = await db.select().from(commentLikes).where(eq(commentLikes.userId, currentUserId));
      likedSet = new Set(likes.map(l => l.commentId));
    }

    const commentsWithUser: CommentWithUser[] = allComments.map(c => ({
      ...c,
      user: usersMap.get(c.userId) || { id: c.userId, username: "Unknown", avatarUrl: null },
      isLiked: likedSet.has(c.id),
    }));

    const topLevel = commentsWithUser.filter(c => !c.parentId);
    const repliesMap = new Map<string, CommentWithUser[]>();
    for (const c of commentsWithUser) {
      if (c.parentId) {
        const existing = repliesMap.get(c.parentId) || [];
        existing.push(c);
        repliesMap.set(c.parentId, existing);
      }
    }

    return topLevel.map(c => ({
      ...c,
      replies: (repliesMap.get(c.id) || []).sort((a, b) =>
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      ),
    }));
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [result] = await db.insert(comments).values(data).returning();
    return result;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    await db.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
    const replies = await db.select().from(comments).where(eq(comments.parentId, commentId));
    for (const reply of replies) {
      await db.delete(commentLikes).where(eq(commentLikes.commentId, reply.id));
    }
    await db.delete(comments).where(eq(comments.parentId, commentId));
    await db.delete(comments).where(and(eq(comments.id, commentId), eq(comments.userId, userId)));
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    const [result] = await db.update(comments)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
      .returning();
    return result;
  }

  async toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    const existing = await db.select().from(commentLikes).where(
      and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId))
    );

    if (existing.length > 0) {
      await db.delete(commentLikes).where(eq(commentLikes.id, existing[0].id));
      await db.update(comments).set({ likes: sql`GREATEST(${comments.likes} - 1, 0)` }).where(eq(comments.id, commentId));
      const [updated] = await db.select().from(comments).where(eq(comments.id, commentId));
      return { liked: false, likes: updated.likes || 0 };
    } else {
      await db.insert(commentLikes).values({ commentId, userId });
      await db.update(comments).set({ likes: sql`${comments.likes} + 1` }).where(eq(comments.id, commentId));
      const [updated] = await db.select().from(comments).where(eq(comments.id, commentId));
      return { liked: true, likes: updated.likes || 0 };
    }
  }

  async getCommentCount(animeId: number, episodeNumber: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(comments)
      .where(and(eq(comments.animeId, animeId), eq(comments.episodeNumber, episodeNumber)));
    return Number(result[0].count);
  }

  async getUserRating(animeId: number, userId: string): Promise<Rating | undefined> {
    const results = await db.select().from(ratings)
      .where(and(eq(ratings.animeId, animeId), eq(ratings.userId, userId)));
    return results[0];
  }

  async setRating(animeId: number, userId: string, score: number): Promise<Rating> {
    const existing = await this.getUserRating(animeId, userId);
    if (existing) {
      const [updated] = await db.update(ratings).set({ score }).where(eq(ratings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(ratings).values({ animeId, userId, score }).returning();
    return created;
  }

  async getAverageRating(animeId: number): Promise<{ average: number; count: number }> {
    const result = await db.select({
      average: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
      count: sql<number>`count(*)`
    }).from(ratings).where(eq(ratings.animeId, animeId));
    return { average: Number(result[0].average), count: Number(result[0].count) };
  }
}

export const storage = new DatabaseStorage();
