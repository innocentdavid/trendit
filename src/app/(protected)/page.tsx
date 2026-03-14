"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityResponse } from "@stream-io/feeds-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StreamActor =
  | string
  | {
    id: string;
    name?: string;
    image?: string;
    custom?: Record<string, string>;
  };

type PostActivity = {
  id: string;
  actor: StreamActor;
  text?: string;
  custom?: { caption?: string };
  attachments?: Array<{ type: string; image_url?: string }>;
  created_at?: string;
  time?: string;
  reaction_counts?: { like?: number; comment?: number };
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

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  activity,
  liked,
  bookmarked,
  onToggleLike,
  onToggleBookmark,
}: {
  activity: ActivityResponse;
  liked: boolean;
  bookmarked: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
}) {
  const { username, fullName, avatar, id: actorId } = getActorInfo(activity.user);
  const caption = activity.custom?.caption ?? activity.text ?? "";
  const image = activity.attachments?.[0]?.image_url;
  const likeCount = (activity.reaction_count ?? 0) + (liked ? 1 : 0);
  const commentCount = activity.comment_count ?? 0;
  const hashtags = caption.match(/#\w+/g) ?? [];
  const captionText = caption.replace(/#\w+/g, "").trim();
  const dateStr = activity.created_at;

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
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
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {fullName}
            </p>
            <p className="text-[11px] text-gray-400">{timeAgo(dateStr?.toISOString() ?? "")}</p>
          </div>
        </div>
        <button className="p-1 -mr-1">
          <MoreHorizontal className="size-5 text-gray-400" />
        </button>
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
            onClick={onToggleLike}
            className="flex items-center gap-1.5 active:scale-90 transition-transform"
          >
            <Heart
              className={`size-5 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-gray-600"
                }`}
              strokeWidth={liked ? 0 : 1.8}
            />
            {likeCount > 0 && (
              <span className="text-sm text-gray-600">{likeCount}</span>
            )}
          </button>
          <button className="flex items-center gap-1.5">
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
          onClick={onToggleBookmark}
          className="active:scale-90 transition-transform"
        >
          <Bookmark
            className={`size-5 transition-colors ${bookmarked ? "fill-gray-900 text-gray-900" : "text-gray-600"
              }`}
            strokeWidth={bookmarked ? 0 : 1.8}
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
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  const fetchFeed = useCallback(async () => {
    if (!client || !user) return;
    setLoading(true);
    try {
      // Timeline feed aggregates posts from people the user follows
      const feed = client.feed("timeline", user.id);
      // const result = await (feed as any).getActivities({
      //   limit: 20,
      //   withReactionCounts: true,
      //   enrich: true,
      // });
      const response = await feed.getOrCreate({ watch: true, limit: 20 });
      const activities = response.activities ?? [];
      if (activities.length > 0) {
        setActivities(activities);
      } else {
        throw new Error("No activities found");
      }
    } catch {
      try {
        // Fall back to the user's own feed
        const feed = client.feed("user", user.id);
        // const result = await (feed as any).getActivities({
        //   limit: 20,
        //   withReactionCounts: true,
        //   enrich: true,
        // });
        const response = await feed.getOrCreate({ watch: true, limit: 20 });
        const activities = response.activities ?? [];
        setActivities(activities);
      } catch {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const toggleLike = (id: string) =>
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleBookmark = (id: string) =>
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));

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
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-1 text-gray-400">
              <p className="text-sm font-semibold">No posts yet</p>
              <p className="text-xs">Follow people or create your first post!</p>
            </div>
          ) : (
            activities.map((activity) => (
              <PostCard
                key={activity.id}
                activity={activity}
                liked={!!liked[activity.id]}
                bookmarked={!!bookmarked[activity.id]}
                onToggleLike={() => toggleLike(activity.id)}
                onToggleBookmark={() => toggleBookmark(activity.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
