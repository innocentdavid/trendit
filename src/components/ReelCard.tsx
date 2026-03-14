"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Send,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import {
  ActivityResponse,
  CommentResponse,
  Feed,
} from "@stream-io/feeds-client";
import { useActivityComments } from "@stream-io/feeds-client/react-bindings";

type StreamActor =
  | string
  | { id: string; name?: string; image?: string; custom?: Record<string, string> };

function timeAgo(dateStr?: string | Date): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getActorInfo(actor: StreamActor) {
  if (typeof actor === "string") {
    const id = actor.split(":").pop() ?? actor;
    return { id, username: id, fullName: id, avatar: null as string | null };
  }
  return {
    id: actor.id,
    username: actor.name ?? actor.id,
    fullName: actor.custom?.full_name ?? actor.name ?? actor.id,
    avatar: actor.image ?? null,
  };
}

function AvatarPlaceholder({ seed }: { seed: string | number }) {
  const colors = [
    "bg-linear-to-br from-blue-400 to-purple-600",
    "bg-linear-to-br from-pink-400 to-rose-600",
    "bg-linear-to-br from-emerald-400 to-teal-600",
    "bg-linear-to-br from-amber-400 to-orange-500",
    "bg-linear-to-br from-violet-400 to-indigo-600",
  ];
  const idx = typeof seed === "number" ? seed : seed.charCodeAt(0);
  return <div className={`w-full h-full ${colors[idx % colors.length]}`} />;
}

type CommentLike = { user?: { id?: string } };
type CommentRowData = {
  id: string;
  user: StreamActor;
  text: string;
  created_at?: string | Date;
  reaction_count?: number;
  own_reactions?: CommentLike[];
  reply_count?: number;
};

function CommentRow({
  comment,
  onLike,
  onReply,
  replyingToId,
  hasLiked,
  likeCount,
  showReplyCta = true,
  isOwnComment = false,
  isEditing = false,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  comment: CommentRowData;
  onLike: () => void;
  onReply: () => void;
  replyingToId: string | null;
  hasLiked: boolean;
  likeCount: number;
  showReplyCta?: boolean;
  isOwnComment?: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onSaveEdit?: (newText: string) => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
}) {
  const actor = getActorInfo(comment.user);
  const createdAt =
    comment.created_at instanceof Date
      ? comment.created_at.toISOString()
      : comment.created_at ?? "";
  const [editText, setEditText] = useState(comment.text ?? "");

  useEffect(() => {
    if (isEditing) setEditText(comment.text ?? "");
  }, [isEditing, comment.text]);

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
        {actor.avatar ? (
          <Image
            src={actor.avatar}
            alt={actor.username}
            width={32}
            height={32}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <AvatarPlaceholder seed={actor.id} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editText.trim()) {
                  onSaveEdit?.(editText.trim());
                } else if (e.key === "Escape") {
                  onCancelEdit?.();
                }
              }}
              className="w-full text-sm bg-gray-50 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-purple-200"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => editText.trim() && onSaveEdit?.(editText.trim())}
                disabled={!editText.trim()}
                className="flex items-center gap-1 text-[11px] text-purple-600 font-medium disabled:opacity-40"
              >
                <Check className="size-3" strokeWidth={2.5} />
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"
              >
                <X className="size-3" strokeWidth={2.5} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-800 leading-snug">
              <span className="font-semibold mr-1">{actor.username}</span>
              {comment.text}
            </p>
            <div className="flex items-center gap-3 mt-0.5 group">
              <span className="text-[11px] text-gray-400">
                {timeAgo(createdAt)}
              </span>
              <button
                type="button"
                onClick={onLike}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={
                    hasLiked
                      ? "size-3.5 fill-red-500 text-red-500"
                      : "size-3.5 text-gray-500 transition-colors"
                  }
                  strokeWidth={hasLiked ? 0 : 1.8}
                />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
              {showReplyCta && (
                <button
                  type="button"
                  onClick={onReply}
                  className="text-[11px] text-gray-500 hover:text-purple-600 font-medium"
                >
                  Reply
                </button>
              )}
              {isOwnComment && (
                <div className="flex items-center gap-2 opacity-0 select-none group-hover:select-auto group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={onStartEdit}
                    className="flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-purple-600 font-medium"
                  >
                    <Pencil className="size-3" strokeWidth={1.8} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex items-center gap-0.5 text-[11px] text-red-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 className="size-3" strokeWidth={1.8} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CommentReplies({
  feed,
  activity,
  parentComment,
  currentUserId,
  replyingToId,
  onReplyClick,
  toggleCommentReaction,
  editingCommentId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  feed: Feed | undefined;
  activity: ActivityResponse;
  parentComment: CommentResponse;
  currentUserId: string | undefined;
  replyingToId: string | null;
  onReplyClick: (id: string, username: string) => void;
  toggleCommentReaction: (id: string, type: "like" | "dislike") => void;
  editingCommentId: string | null;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, newText: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const {
    comments: replies,
    has_next_page,
    is_loading_next_page,
    loadNextPage,
  } = useActivityComments({
    feed,
    parentComment,
    activity,
  });

  useEffect(() => {
    loadNextPage();
  }, [loadNextPage]);

  const commentList = replies ?? [];
  if (commentList.length === 0 && !is_loading_next_page) return null;

  return (
    <div className="ml-8 mt-2 pl-3 border-l-2 border-gray-100 space-y-3">
      {commentList.length === 0 && is_loading_next_page && (
        <div className="flex items-center justify-center py-2">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
      {commentList.map((reply) => {
        const rc = reply as unknown as CommentRowData;
        const hasLiked = !!rc.own_reactions?.some(
          (r) => (r as { user?: { id?: string } }).user?.id === currentUserId
        );
        const likeCount = rc.reaction_count ?? 0;
        const actor = getActorInfo(reply.user);
        const isOwn =
          typeof reply.user !== "string" && reply.user?.id === currentUserId;
        return (
          <CommentRow
            key={reply.id}
            comment={rc}
            hasLiked={hasLiked}
            likeCount={likeCount}
            replyingToId={replyingToId}
            onLike={() =>
              toggleCommentReaction(reply.id, hasLiked ? "dislike" : "like")
            }
            onReply={() => onReplyClick(reply.id, actor.username)}
            showReplyCta
            isOwnComment={isOwn}
            isEditing={editingCommentId === reply.id}
            onStartEdit={() => onStartEdit(reply.id)}
            onSaveEdit={(newText) => onSaveEdit(reply.id, newText)}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(reply.id)}
          />
        );
      })}
      {has_next_page && (
        <button
          type="button"
          onClick={() => loadNextPage()}
          disabled={is_loading_next_page}
          className="text-xs text-blue-500 font-medium disabled:opacity-50"
        >
          {is_loading_next_page ? "Loading…" : "Load more replies"}
        </button>
      )}
    </div>
  );
}

export type ReelCardProps = {
  feed: Feed | undefined;
  activity: ActivityResponse;
  isActive: boolean;
};

export function ReelCard({ feed, activity, isActive }: ReelCardProps) {
  const { user, client } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(
    new Set()
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const { username, fullName, avatar, id: actorId } = getActorInfo(
    activity.user
  );
  const caption =
    (activity.custom as Record<string, string> | undefined)?.caption ??
    activity.text ??
    "";
  const videoUrl = activity.attachments?.[0]?.image_url as string | undefined;
  const likeCount = activity.reaction_count ?? 0;
  const commentCount = activity.comment_count ?? 0;
  const hasLiked = !!activity.own_reactions?.filter(
    (r) =>
      r.activity_id === activity.id &&
      (r.user as { id?: string })?.id === user?.id
  )[0];
  const hasBookmarked = !!activity.own_bookmarks?.filter(
    (b) =>
      b.activity?.id === activity.id &&
      (b.user as { id?: string })?.id === user?.id
  )[0];

  const custom = (activity.custom ?? {}) as Record<string, unknown>;
  const audioTitle = custom.audio_title as string | undefined;
  const audioArtist = custom.audio_artist as string | undefined;
  const topicTags = (custom.topic_tags as string[] | undefined) ?? [];
  const hashtags = caption.match(/#\w+/g) ?? [];
  const captionText = caption.replace(/#\w+/g, "").trim();
  const isOwnPost = actorId === user?.id;

  const {
    comments,
    has_next_page,
    is_loading_next_page,
    loadNextPage,
  } = useActivityComments({
    feed,
    parentComment: undefined,
    activity,
  });

  useEffect(() => {
    loadNextPage();
  }, [loadNextPage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  async function toggleReaction(type: "like" | "dislike") {
    if (!client || !activity.id) return;
    if (type === "like") {
      await client.addActivityReaction({
        activity_id: activity.id,
        type: "like",
        custom: { emoji: "❤️" },
      });
    } else {
      await client.deleteActivityReaction({
        activity_id: activity.id,
        type: "like",
      });
    }
  }

  async function addComment(
    activity_id: string,
    comment: string,
    parent_id?: string
  ) {
    if (!client || !activity_id || !comment) return;
    await client.addComment(
      parent_id
        ? { comment, parent_id }
        : { comment, object_id: activity_id, object_type: "activity" }
    );
  }

  async function toggleCommentReaction(
    comment_id: string,
    reaction_type: "like" | "dislike"
  ) {
    if (!client || !comment_id) return;
    if (reaction_type === "like") {
      await client.addCommentReaction({ id: comment_id, type: "like" });
    } else {
      await client.deleteCommentReaction({ id: comment_id, type: "like" });
    }
  }

  async function handleEditComment(commentId: string, newText: string) {
    if (!client || !commentId || !newText) return;
    await client.updateComment({ id: commentId, comment: newText });
    setEditingCommentId(null);
  }

  async function handleDeleteComment(commentId: string) {
    if (!client || !commentId) return;
    if (!window.confirm("Delete this comment?")) return;
    await client.deleteComment({ id: commentId });
  }

  async function addBookmark() {
    if (!client || !activity.id) return;
    await client.addBookmark({ activity_id: activity.id });
  }

  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <p className="text-sm text-gray-400">No video</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full h-full min-h-0 flex flex-col bg-black snap-start snap-always">
        {/* Video */}
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            loop
            playsInline
            muted={muted}
          />
        </div>

        {/* Gradient overlay for bottom text */}
        <div
          className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/70 via-transparent to-transparent"
          aria-hidden
        />

        {/* Mute toggle */}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX className="size-5" strokeWidth={2} />
          ) : (
            <Volume2 className="size-5" strokeWidth={2} />
          )}
        </button>

        {/* Author header */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 min-w-0">
          <Link
            href={isOwnPost ? "/profile" : `/profile/${actorId}`}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 shrink-0 ring-2 ring-white/30">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={username}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <AvatarPlaceholder seed={actorId} />
              )}
            </div>
            <span className="text-sm font-semibold text-white truncate">
              @{username}
            </span>
          </Link>
        </div>

        {/* Right action rail */}
        <div className="absolute bottom-24 right-2 z-10 flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => toggleReaction(hasLiked ? "dislike" : "like")}
            className="flex flex-col items-center gap-0.5 text-white"
          >
            <Heart
              className={`size-8 transition-colors ${
                hasLiked ? "fill-red-500 text-red-500" : ""
              }`}
              strokeWidth={hasLiked ? 0 : 1.8}
            />
            <span className="text-xs font-medium">{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="flex flex-col items-center gap-0.5 text-white"
          >
            <MessageCircle className="size-8" strokeWidth={1.8} />
            <span className="text-xs font-medium">{commentCount}</span>
          </button>
          <button type="button" className="flex flex-col items-center gap-0.5 text-white">
            <Share2 className="size-8" strokeWidth={1.8} />
            <span className="text-xs font-medium">Share</span>
          </button>
          <button
            type="button"
            onClick={addBookmark}
            className="flex flex-col items-center gap-0.5 text-white"
          >
            <Bookmark
              className={`size-8 ${
                hasBookmarked ? "fill-white text-white" : ""
              }`}
              strokeWidth={hasBookmarked ? 0 : 1.8}
            />
          </button>
        </div>

        {/* Caption + audio meta (bottom left) */}
        <div className="absolute bottom-4 left-4 right-14 z-10 text-white space-y-1">
          {(audioTitle || audioArtist) && (
            <p className="text-xs font-medium opacity-90">
              {[audioTitle, audioArtist].filter(Boolean).join(" · ")}
            </p>
          )}
          {(captionText || hashtags.length > 0 || topicTags.length > 0) && (
            <p className="text-sm leading-snug">
              {captionText && (
                <span>
                  <span className="font-semibold">@{username}</span> {captionText}
                </span>
              )}
              {(hashtags.length > 0 || topicTags.length > 0) && (
                <span className="ml-1">
                  {[...hashtags, ...topicTags.map((t) => `#${t}`)].join(" ")}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Comments Drawer */}
      <Drawer
        open={commentsOpen}
        onOpenChange={(open) => {
          setCommentsOpen(open);
          if (!open) {
            setReplyingToComment(null);
            setEditingCommentId(null);
          }
        }}
      >
        <DrawerContent className="flex flex-col max-h-[75vh]">
          <DrawerHeader className="border-b border-gray-100 pb-3">
            <DrawerTitle className="text-base font-semibold text-gray-900">
              Comments
              {commentCount > 0 && (
                <span className="text-gray-400 font-normal ml-1">
                  ({commentCount})
                </span>
              )}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {(comments ?? []).length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                No comments yet. Be the first!
              </p>
            ) : (
              (comments ?? []).map((comment) => {
                const hasLiked = !!comment.own_reactions?.some(
                  (r) => r.user?.id === user?.id
                );
                const likeCount = comment.reaction_count ?? 0;
                const replyCount = comment.reply_count ?? 0;
                const isExpanded = expandedReplyIds.has(comment.id);
                const actor = getActorInfo(comment.user);
                const isOwn =
                  typeof comment.user !== "string" &&
                  comment.user?.id === user?.id;
                return (
                  <div key={comment.id} className="space-y-1">
                    <CommentRow
                      comment={comment as CommentRowData}
                      hasLiked={hasLiked}
                      likeCount={likeCount}
                      replyingToId={replyingToComment?.id ?? null}
                      onLike={() =>
                        toggleCommentReaction(
                          comment.id,
                          hasLiked ? "dislike" : "like"
                        )
                      }
                      onReply={() =>
                        setReplyingToComment({
                          id: comment.id,
                          username: actor.username,
                        })
                      }
                      showReplyCta
                      isOwnComment={isOwn}
                      isEditing={editingCommentId === comment.id}
                      onStartEdit={() => setEditingCommentId(comment.id)}
                      onSaveEdit={(newText) =>
                        handleEditComment(comment.id, newText)
                      }
                      onCancelEdit={() => setEditingCommentId(null)}
                      onDelete={() => handleDeleteComment(comment.id)}
                    />
                    {replyCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedReplyIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(comment.id)) next.delete(comment.id);
                            else next.add(comment.id);
                            return next;
                          });
                        }}
                        className="text-xs text-gray-500 hover:text-purple-600 font-medium ml-11"
                      >
                        {isExpanded
                          ? "Hide replies"
                          : `View ${replyCount} ${
                              replyCount === 1 ? "reply" : "replies"
                            }`}
                      </button>
                    )}
                    {isExpanded && (
                      <CommentReplies
                        feed={feed}
                        activity={activity}
                        parentComment={comment}
                        currentUserId={user?.id}
                        replyingToId={replyingToComment?.id ?? null}
                        onReplyClick={(id, username) =>
                          setReplyingToComment({ id, username })
                        }
                        toggleCommentReaction={toggleCommentReaction}
                        editingCommentId={editingCommentId}
                        onStartEdit={(id) => setEditingCommentId(id)}
                        onSaveEdit={(id, newText) =>
                          handleEditComment(id, newText)
                        }
                        onCancelEdit={() => setEditingCommentId(null)}
                        onDelete={handleDeleteComment}
                      />
                    )}
                  </div>
                );
              })
            )}

            {comments?.length && comments.length > 0 && has_next_page && (
              <button
                onClick={() => loadNextPage()}
                disabled={is_loading_next_page}
                className="w-full text-sm text-blue-500 font-medium py-2 disabled:opacity-50"
              >
                {is_loading_next_page ? "Loading…" : "Load more comments"}
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
            {replyingToComment && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Reply to @{replyingToComment.username}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingToComment(null)}
                  className="text-xs text-purple-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (
                    e.key === "Enter" &&
                    commentDraft.trim() &&
                    !isSubmittingComment
                  ) {
                    setIsSubmittingComment(true);
                    await addComment(
                      activity.id,
                      commentDraft.trim(),
                      replyingToComment?.id
                    );
                    setCommentDraft("");
                    setReplyingToComment(null);
                    setIsSubmittingComment(false);
                  }
                }}
                placeholder={
                  replyingToComment
                    ? `Reply to @${replyingToComment.username}…`
                    : "Add a comment…"
                }
                className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-purple-200 placeholder:text-gray-400"
              />
              <button
                disabled={!commentDraft.trim() || isSubmittingComment}
                onClick={async () => {
                  setIsSubmittingComment(true);
                  await addComment(
                    activity.id,
                    commentDraft.trim(),
                    replyingToComment?.id
                  );
                  setCommentDraft("");
                  setReplyingToComment(null);
                  setIsSubmittingComment(false);
                }}
                className="shrink-0 w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
              >
                {isSubmittingComment ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="size-4 text-white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
