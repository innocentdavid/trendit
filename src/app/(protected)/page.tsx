"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Bell,
  MessageCircle,
  Heart,
  MessageCircle as CommentIcon,
  Share2,
  Bookmark,
  MoreHorizontal,
  Plus,
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
import Link from "next/link";
import { useActivityComments, useFeedActivities, useOwnFollowings } from "@stream-io/feeds-client/react-bindings";

// ─── Types ────────────────────────────────────────────────────────────────────

type StreamActor =
  | string
  | {
    id: string;
    name?: string;
    image?: string;
    custom?: Record<string, string>;
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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

// ─── Avatar placeholder ───────────────────────────────────────────────────────

function AvatarPlaceholder({ seed }: { seed: string | number }) {
  const colors = [
    "bg-linear-to-br from-blue-400 to-purple-600",
    "bg-linear-to-br from-pink-400 to-rose-600",
    "bg-linear-to-br from-emerald-400 to-teal-600",
    "bg-linear-to-br from-amber-400 to-orange-500",
    "bg-linear-to-br from-violet-400 to-indigo-600",
  ];
  const idx = typeof seed === "number" ? seed : seed.charCodeAt(0);
  return (
    <div
      className={`w-full h-full ${colors[idx % colors.length]}`}
    />
  );
}

// ─── Comment reply row (used in list and in CommentReplies) ────────────────────

type CommentLike = { user?: { id?: string } };
/** Minimal comment shape for display; API may return more (e.g. CommentResponse). */
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
                    className="flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-red-500 font-medium"
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

// ─── Nested replies (loads when expanded) ───────────────────────────────────────
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
  onReplyClick: (commentId: string, username: string) => void;
  toggleCommentReaction: (commentId: string, type: "like" | "dislike") => void;
  editingCommentId: string | null;
  onStartEdit: (commentId: string) => void;
  onSaveEdit: (commentId: string, newText: string) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
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
  }, []);

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
        const isOwn = typeof reply.user !== "string" && reply.user?.id === currentUserId;
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
            showReplyCta={true}
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

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  feed,
  activity,
}: {
  feed: Feed | undefined;
  activity: ActivityResponse;
}) {
  const { user, client } = useAuth();
  const { username, fullName, avatar, id: actorId } = getActorInfo(activity.user);
  const caption = activity.custom?.caption ?? activity.text ?? "";
  const image = activity.attachments?.[0]?.image_url;
  const likeCount = (activity.reaction_count ?? 0);
  const commentCount = activity.comment_count ?? 0;
  const hashtags = caption.match(/#\w+/g) ?? [];
  const captionText = caption.replace(/#\w+/g, "").trim();
  const dateStr = activity.created_at;
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
  const {
    comments,
    has_next_page,
    is_loading_next_page,
    loadNextPage,
  } = useActivityComments({ feed, parentComment: undefined, activity });
  const hasLiked = !!activity.own_reactions?.filter((reaction) => (reaction.activity_id === activity.id && reaction.user.id === user?.id))[0];
  const hasBookmarked = !!activity.own_bookmarks?.filter((bookmark) => (bookmark.activity?.id === activity.id && bookmark.user?.id === user?.id))[0];
  const { own_followings } = useOwnFollowings(feed) ?? {};
  const isFollowing = !!own_followings?.some(
    (f) => f.target_feed?.id === actorId || f.target_feed?.feed === `user:${actorId}`
  );
  const isOwnPost = actorId === user?.id;
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!client) return;
    loadNextPage()
  }, [])

  async function toggleFollow() {
    if (!client || !user?.id || isOwnPost || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await client.unfollow({ source: `timeline:${user.id}`, target: `user:${actorId}` });
      } else {
        await client.follow({ source: `timeline:${user.id}`, target: `user:${actorId}` });
      }
    } finally {
      setFollowLoading(false);
    }
  }


  async function toggleActivityReaction(activity_id: string, reaction_type: "like" | "dislike") {
    if (!client || !activity_id) return;
    await (reaction_type === "like" ? client.addActivityReaction : client.deleteActivityReaction)({
      activity_id: activity_id,
      type: "like",
      ...(reaction_type === "like" ? {
        custom: {
          emoji: "❤️",
        }
      } : {}),
    });
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

  async function addBookmark(activity_id: string) {
    if (!client || !activity_id) return;
    await client.addBookmark({
      activity_id: activity_id,
    });
  }

  return (
    <>
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={isOwnPost ? "/profile" : `/profile/${actorId}`} className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 shrink-0">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={username}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <AvatarPlaceholder seed={actorId} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                {fullName}
              </p>
              <p className="text-[11px] text-gray-400">{timeAgo(dateStr?.toISOString() ?? "")}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {!isOwnPost && (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition disabled:opacity-50 ${
                  isFollowing
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-purple-500 text-white hover:opacity-90"
                }`}
              >
                {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <button className="p-1 -mr-1" type="button">
              <MoreHorizontal className="size-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Media */}
        {image && (
          <div className="mx-4 rounded-2xl overflow-hidden aspect-square relative bg-gray-100">
            <Image
              src={image}
              alt="Post media"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-5">
            <button
              onClick={() => toggleActivityReaction(activity.id, hasLiked ? "dislike" : "like")}
              className="flex items-center gap-1.5 active:scale-90 transition-transform"
            >
              <Heart
                className={`size-5 transition-colors ${hasLiked ? "fill-red-500 text-red-500" : "text-gray-600"
                  }`}
                strokeWidth={hasLiked ? 0 : 1.8}
              />
              {likeCount > 0 && (
                <span className="text-sm text-gray-600">{likeCount}</span>
              )}
            </button>
            <button
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-1.5 active:scale-90 transition-transform"
            >
              <CommentIcon className="size-5 text-gray-600" strokeWidth={1.8} />
              {commentCount > 0 && (
                <span className="text-sm text-gray-600">{commentCount}</span>
              )}
            </button>
            <button className="active:scale-90 transition-transform">
              <Share2 className="size-5 text-gray-600" strokeWidth={1.8} />
            </button>
          </div>
          <button
            onClick={() => addBookmark(activity.id)}
            className="active:scale-90 transition-transform"
          >
            <Bookmark
              className={`size-5 transition-colors ${hasBookmarked ? "fill-gray-900 text-gray-900" : "text-gray-600"
                }`}
              strokeWidth={hasBookmarked ? 0 : 1.8}
            />
          </button>
        </div>

        {/* Caption + hashtags */}
        {(captionText || hashtags.length > 0) && (
          <div className="px-4 pb-4">
            {captionText && (
              <p className="text-sm text-gray-800 leading-snug">
                <span className="font-semibold">@{username}</span>{" "}
                {captionText}
              </p>
            )}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {hashtags.map((tag: string, i: number) => (
                  <span key={i} className="text-sm text-blue-500 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
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
              Comments{commentCount > 0 && (
                <span className="text-gray-400 font-normal ml-1">({commentCount})</span>
              )}
            </DrawerTitle>
          </DrawerHeader>

          {/* Comment list */}
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
                const isOwn = typeof comment.user !== "string" && comment.user?.id === user?.id;
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
                      showReplyCta={true}
                      isOwnComment={isOwn}
                      isEditing={editingCommentId === comment.id}
                      onStartEdit={() => setEditingCommentId(comment.id)}
                      onSaveEdit={(newText) => handleEditComment(comment.id, newText)}
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
                          : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
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
                        onSaveEdit={(id, newText) => handleEditComment(id, newText)}
                        onCancelEdit={() => setEditingCommentId(null)}
                        onDelete={(id) => handleDeleteComment(id)}
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

          {/* Compose */}
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

// ─── Stories ──────────────────────────────────────────────────────────────────

const PLACEHOLDER_STORIES = [
  { id: "1", username: "Alex ROV" },
  { id: "2", username: "Alex ROV" },
  { id: "3", username: "Alex ROV" },
  { id: "4", username: "Alex ROV" },
];

function StoriesRow({ userAvatar }: { userAvatar?: string }) {
  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-gray-100 shrink-0">
      {/* Your Story */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt="Your story"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-gray-200 to-gray-300" />
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
            <Plus className="size-3 text-white" strokeWidth={3} />
          </div>
        </div>
        <span className="text-[10px] text-gray-500 w-14 text-center truncate">
          Your Story
        </span>
      </div>

      {/* Other stories */}
      {PLACEHOLDER_STORIES.map((story, i) => (
        <div key={story.id} className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-14 h-14 rounded-full p-0.5 bg-linear-to-br from-blue-400 to-purple-600">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gray-800">
              <AvatarPlaceholder seed={i + 1} />
            </div>
          </div>
          <span className="text-[10px] text-gray-500 w-14 text-center truncate">
            {story.username}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, client } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<Feed | undefined>(undefined);
  const { activities, loadNextPage, has_next_page, is_loading } = useFeedActivities(feed);
  const limit = 2;

  const fetchFeed = useCallback(async () => {
    if (!client || !user) return;
    setLoading(true);
    try {
      const feed = client.feed("timeline", user.id);
      const response = await feed.getOrCreate({
        watch: true,
        limit,
        filter: { activity_type: "post" },
      });
      const activities = response.activities ?? [];
      if (activities.length > 0) {
        setFeed(feed);
      } else {
        throw new Error("No activities found");
      }
    } catch {
      try {
        const feed = client.feed("user", user.id);
        const response = await feed.getOrCreate({
          watch: true,
          limit,
          filter: { activity_type: "post" },
        });
        response.activities ?? [];
        setFeed(feed);
      } catch {
        setFeed(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const userAvatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          TrendIt
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <MessageCircle className="size-6 text-gray-700" strokeWidth={1.8} />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              2
            </span>
          </div>
          <div className="relative">
            <Bell className="size-6 text-gray-700" strokeWidth={1.8} />
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              5
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        <StoriesRow userAvatar={userAvatar} />

        {/* Feed */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : (activities?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-1 text-gray-400">
              <p className="text-sm font-semibold">No posts yet</p>
              <p className="text-xs">Follow people or create your first post!</p>
            </div>
          ) : (
            <>
              {activities?.map((activity) => (
                <PostCard
                  feed={feed}
                  key={activity.id}
                  activity={activity}
                />
              ))}
              {is_loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
              {(activities?.length ?? 0) > 0 && has_next_page && (
                <button
                  onClick={() => loadNextPage()}
                  disabled={is_loading}
                  className="w-full text-sm text-blue-500 font-medium py-2 disabled:opacity-50"
                >
                  {is_loading ? "Loading…" : "Load more posts"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
