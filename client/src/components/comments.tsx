import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  MessageCircle,
  Heart,
  Reply,
  MoreHorizontal,
  Send,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  LogIn,
} from "lucide-react";
import type { CommentWithUser } from "@shared/schema";

function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function UserAvatar({ user, size = "sm" }: { user: { username: string; avatarUrl?: string | null }; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        className={`${sizeClass} rounded-full object-cover border border-white/10`}
        data-testid={`avatar-${user.username}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center font-bold text-white/60`}
      data-testid={`avatar-${user.username}`}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
}

function CommentInput({
  onSubmit,
  isPending,
  placeholder,
  autoFocus,
  onCancel,
  initialValue = "",
}: {
  onSubmit: (content: string) => void;
  isPending: boolean;
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  initialValue?: string;
}) {
  const [content, setContent] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!content.trim() || isPending) return;
    onSubmit(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  const MAX_LENGTH = 2000;

  return (
    <div className="flex gap-3 items-end" data-testid="comment-input-wrapper">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          maxLength={MAX_LENGTH}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors min-h-[44px] max-h-[120px]"
          style={{ fieldSizing: "content" } as any}
          data-testid="comment-textarea"
        />
        {content.length > 1800 && (
          <span className={`absolute bottom-1 right-2 text-[10px] ${content.length >= MAX_LENGTH ? "text-red-400" : "text-white/20"}`}>
            {content.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
      <div className="flex gap-2 pb-0.5">
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white/30 hover:text-white/60 rounded-lg h-9"
            data-testid="button-cancel-comment"
          >
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending || content.length > MAX_LENGTH}
          className="gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/[0.08] h-9 px-4"
          data-testid="button-submit-comment"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SingleComment({
  comment,
  animeId,
  episodeNumber,
  isReply = false,
}: {
  comment: CommentWithUser;
  animeId: number;
  episodeNumber: number;
  isReply?: boolean;
}) {
  const { user: currentUser, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = currentUser?.id === comment.userId;
  const replyCount = comment.replies?.length || 0;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/comments/${comment.id}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId, episodeNumber] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/comments", {
        animeId,
        episodeNumber,
        content,
        parentId: comment.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId, episodeNumber] });
      setShowReplyInput(false);
      setShowReplies(true);
    },
  });

  const editMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("PATCH", `/api/comments/${comment.id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId, episodeNumber] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId, episodeNumber] });
    },
  });

  return (
    <div className={`group ${isReply ? "" : ""}`} data-testid={`comment-${comment.id}`}>
      <div className="flex gap-3">
        <UserAvatar user={comment.user} size={isReply ? "sm" : "md"} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white/80" data-testid={`comment-username-${comment.id}`}>
              {comment.user.username}
            </span>
            <span className="text-[11px] text-white/20">
              {timeAgo(comment.createdAt!)}
            </span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-[10px] text-white/15 italic">edited</span>
            )}
          </div>

          {editing ? (
            <div className="mb-2">
              <CommentInput
                onSubmit={(content) => editMutation.mutate(content)}
                isPending={editMutation.isPending}
                placeholder="Edit your comment..."
                autoFocus
                onCancel={() => setEditing(false)}
                initialValue={comment.content}
              />
            </div>
          ) : (
            <p className="text-sm text-white/60 leading-relaxed mb-2 whitespace-pre-wrap break-words" data-testid={`comment-content-${comment.id}`}>
              {comment.content}
            </p>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => isLoggedIn && likeMutation.mutate()}
              disabled={!isLoggedIn || likeMutation.isPending}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                comment.isLiked
                  ? "text-red-400 hover:text-red-300"
                  : "text-white/20 hover:text-white/40"
              } ${!isLoggedIn ? "cursor-default" : "cursor-pointer hover:bg-white/[0.04]"}`}
              data-testid={`button-like-${comment.id}`}
            >
              <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
              {(comment.likes || 0) > 0 && <span>{comment.likes}</span>}
            </button>

            {isLoggedIn && !isReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}

            {isOwner && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-md text-white/15 hover:text-white/40 hover:bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-all"
                  data-testid={`button-menu-${comment.id}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[140px]">
                      <button
                        onClick={() => { setEditing(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                        data-testid={`button-edit-${comment.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { deleteMutation.mutate(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                        data-testid={`button-delete-${comment.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {replyCount > 0 && !isReply && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 mt-2 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
              data-testid={`button-toggle-replies-${comment.id}`}
            >
              {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}

          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-4 pl-2 border-l border-white/[0.06]">
              {comment.replies.map((reply) => (
                <SingleComment
                  key={reply.id}
                  comment={reply}
                  animeId={animeId}
                  episodeNumber={episodeNumber}
                  isReply
                />
              ))}
            </div>
          )}

          {showReplyInput && (
            <div className="mt-3">
              <CommentInput
                onSubmit={(content) => replyMutation.mutate(content)}
                isPending={replyMutation.isPending}
                placeholder={`Reply to ${comment.user.username}...`}
                autoFocus
                onCancel={() => setShowReplyInput(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentsSection({
  animeId,
  episodeNumber,
}: {
  animeId: number;
  episodeNumber: number;
}) {
  const { user, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  const { data: comments, isLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/comments", animeId, episodeNumber],
    queryFn: async () => {
      const res = await fetch(`/api/comments/${animeId}/${episodeNumber}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/comments", {
        animeId,
        episodeNumber,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", animeId, episodeNumber] });
    },
  });

  const totalComments = (comments || []).reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <div className="mt-6 bg-white/[0.02] rounded-xl border border-white/[0.05]" data-testid="comments-section">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
        data-testid="button-toggle-comments"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-white/40" />
          <h3 className="font-bold text-white/90">Comments</h3>
          <span className="text-sm text-white/25">({totalComments})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/25" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/25" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {isLoggedIn ? (
            <div className="flex gap-3 items-start">
              <UserAvatar user={{ username: user!.username, avatarUrl: user!.avatarUrl }} size="md" />
              <div className="flex-1">
                <CommentInput
                  onSubmit={(content) => postMutation.mutate(content)}
                  isPending={postMutation.isPending}
                  placeholder="Share your thoughts on this episode..."
                />
              </div>
            </div>
          ) : (
            <Link href="/login">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors" data-testid="link-login-to-comment">
                <LogIn className="w-5 h-5 text-white/30" />
                <p className="text-sm text-white/40">
                  <span className="text-white/60 font-medium">Sign in</span> to join the discussion
                </p>
              </div>
            </Link>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-5">
              {comments.map((comment) => (
                <SingleComment
                  key={comment.id}
                  comment={comment}
                  animeId={animeId}
                  episodeNumber={episodeNumber}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="no-comments">
              <MessageCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25">No comments yet</p>
              <p className="text-xs text-white/15 mt-1">Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
