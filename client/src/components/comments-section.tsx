import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Heart, Send, Trash2, Edit2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Comment {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    content: string;
    likes: number;
    isLiked?: boolean;
    createdAt: string;
    updatedAt?: string;
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

export function CommentsSection({ animeId }: { animeId: number }) {
    const { isLoggedIn, user } = useAuth();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const { data: comments = [], isLoading } = useQuery<Comment[]>({
        queryKey: ["/api/comments", animeId.toString(), "0"],
    });

    const postMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await apiRequest("POST", "/api/comments", {
                animeId,
                episodeNumber: 0,
                content,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId.toString(), "0"] });
            setNewComment("");
        },
    });

    const editMutation = useMutation({
        mutationFn: async ({ id, content }: { id: string; content: string }) => {
            const res = await apiRequest("PATCH", `/api/comments/${id}`, { content });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId.toString(), "0"] });
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/comments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId.toString(), "0"] });
        },
    });

    const likeMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("POST", `/api/comments/${id}/like`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId.toString(), "0"] });
        },
    });

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newComment.trim();
        if (!trimmed || postMutation.isPending) return;
        postMutation.mutate(trimmed);
    }, [newComment, postMutation]);

    const handleEdit = useCallback((id: string) => {
        const trimmed = editContent.trim();
        if (!trimmed || editMutation.isPending) return;
        editMutation.mutate({ id, content: trimmed });
    }, [editContent, editMutation]);

    return (
        <div className="mb-12" data-testid="comments-section">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-purple-400/20 rounded-full" />
                <h3 className="text-lg font-bold text-white/90">
                    Comments
                    {comments.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-white/30">({comments.length})</span>
                    )}
                </h3>
            </div>

            {/* Comment input */}
            <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        {isLoggedIn && user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <MessageCircle className="w-4 h-4 text-white/20" />
                        )}
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={isLoggedIn ? "Share your thoughts..." : "Sign in to comment"}
                            disabled={!isLoggedIn}
                            maxLength={2000}
                            rows={2}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            data-testid="input-comment"
                        />
                        {newComment.trim() && (
                            <Button
                                type="submit"
                                size="sm"
                                disabled={postMutation.isPending}
                                className="absolute bottom-3 right-3 rounded-xl gap-1.5 h-8 px-3 bg-purple-500/80 hover:bg-purple-500 text-white text-xs"
                                data-testid="button-submit-comment"
                            >
                                <Send className="w-3 h-3" />
                                Post
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            {/* Comments list */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-24 bg-white/[0.06] rounded" />
                                <div className="h-4 w-full bg-white/[0.04] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-12">
                    <MessageCircle className="w-10 h-10 text-white/[0.06] mx-auto mb-3" />
                    <p className="text-sm text-white/20">No comments yet. Be the first!</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="flex gap-3 p-3 rounded-2xl hover:bg-white/[0.02] transition-colors group"
                            data-testid={`comment-${comment.id}`}
                        >
                            <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {comment.avatarUrl ? (
                                    <img src={comment.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-white/30">
                                        {(comment.username || "?")[0].toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-white/60">{comment.username || "Anonymous"}</span>
                                    <span className="text-[10px] text-white/15">{timeAgo(comment.createdAt)}</span>
                                    {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                        <span className="text-[10px] text-white/10">(edited)</span>
                                    )}
                                </div>

                                {editingId === comment.id ? (
                                    <div className="flex gap-2 items-end">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="flex-1 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-white/80 resize-none focus:outline-none focus:border-white/[0.2] transition-all"
                                            rows={2}
                                            maxLength={2000}
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-emerald-400" onClick={() => handleEdit(comment.id)}>
                                            <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-white/30" onClick={() => setEditingId(null)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                                )}

                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={() => likeMutation.mutate(comment.id)}
                                        className={`flex items-center gap-1 text-[11px] transition-colors ${comment.isLiked ? "text-pink-400" : "text-white/15 hover:text-pink-400/60"
                                            }`}
                                        disabled={!isLoggedIn}
                                        data-testid={`button-like-${comment.id}`}
                                    >
                                        <Heart className="w-3 h-3" fill={comment.isLiked ? "currentColor" : "none"} />
                                        {comment.likes > 0 && comment.likes}
                                    </button>

                                    {isLoggedIn && user && comment.userId === user.id?.toString() && editingId !== comment.id && (
                                        <>
                                            <button
                                                onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                                                className="text-[11px] text-white/10 hover:text-white/40 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => deleteMutation.mutate(comment.id)}
                                                className="text-[11px] text-white/10 hover:text-red-400/60 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
