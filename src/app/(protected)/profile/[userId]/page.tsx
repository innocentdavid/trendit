"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Bell, MessageCircle, Grid3X3, Bookmark, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnFollowings } from "@stream-io/feeds-client/react-bindings";

type Tab = "posts" | "saved" | "liked";

type PostActivity = {
  id: string;
  text: string;
  custom?: { caption?: string };
  attachments?: Array<{ type: string; image_url?: string }>;
  created_at?: string;
  reaction_counts?: { like?: number; comment?: number; share?: number };
};

function getDisplayInfo(createdBy: { id: string; name?: string; image?: string; custom?: Record<string, string> } | undefined) {
  if (!createdBy) return { fullName: "User", username: "user", avatar: null as string | null };
  return {
    fullName: createdBy.custom?.full_name ?? createdBy.name ?? createdBy.id,
    username: createdBy.name ?? createdBy.id,
    avatar: createdBy.image ?? null,
  };
}

export default function OtherUserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const { user: currentUser, client } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<PostActivity[]>([]);
  const [fetching, setFetching] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [feedMeta, setFeedMeta] = useState<{
    follower_count: number;
    following_count: number;
    activity_count: number;
    created_by?: { id: string; name?: string; image?: string; custom?: Record<string, string> };
  } | null>(null);
  const timelineFeed = currentUser && client ? client.feed("timeline", currentUser.id) : undefined;
  const { own_followings } = useOwnFollowings(timelineFeed) ?? {};
  const isFollowing = !!userId && !!own_followings?.some(
    (f) => f.target_feed?.id === userId || f.target_feed?.feed === `user:${userId}`
  );
  const isOwnProfile = userId === currentUser?.id;

  const { fullName, username, avatar } = getDisplayInfo(feedMeta?.created_by);

  useEffect(() => {
    if (isOwnProfile && userId) {
      router.replace("/profile");
      return;
    }
  }, [isOwnProfile, userId, router]);

  useEffect(() => {
    const loadUserFeed = async () => {
      if (!client || !userId) return;
      try {
        setFetching(true);
        const feed = client.feed("user", userId);
        const response = await feed.getOrCreate({ watch: true });
        const feedData = response.feed;
        if (feedData) {
          setFeedMeta({
            follower_count: feedData.follower_count ?? 0,
            following_count: feedData.following_count ?? 0,
            activity_count: feedData.activity_count ?? 0,
            created_by: feedData.created_by,
          });
        }
        const activities = response.activities ?? [];
        setPosts(activities.map((activity) => ({
          id: activity.id,
          text: activity.text ?? "",
          attachments: activity.attachments as PostActivity["attachments"],
          created_at: activity.created_at instanceof Date ? activity.created_at.toISOString() : undefined,
          reaction_counts: {
            comment: activity.comment_count ?? 0,
            like: activity.reaction_count ?? 0,
            share: activity.share_count ?? 0,
          },
        })));
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setFetching(false);
      }
    };
    loadUserFeed();
  }, [client, userId]);

  async function toggleFollow() {
    if (!client || !currentUser?.id || !userId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await client.unfollow({ source: `timeline:${currentUser.id}`, target: `user:${userId}` });
      } else {
        await client.follow({ source: `timeline:${currentUser.id}`, target: `user:${userId}` });
      }
    } finally {
      setFollowLoading(false);
    }
  }

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "liked", icon: Heart, label: "Liked" },
  ];

  if (!userId) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center gap-4">
        <p className="text-gray-500">Invalid profile</p>
        <Link href="/" className="text-purple-600 font-medium">Go home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 flex items-center gap-1 text-gray-700"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {fullName}
        </h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-4 pt-5">
              <div className="flex items-end gap-4">
                <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-1">
                  No bio
                </p>
                <div>
                  <div className="relative shrink-0">
                    <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md">
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt={fullName}
                          width={78}
                          height={78}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-gray-600 to-gray-900 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold select-none">
                            {fullName[0] ?? "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="mt-3">
                    <h2 className="text-xl font-extrabold text-gray-900">{fullName}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">@{username}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center mt-5 mx-4 py-4 border-y border-gray-100">
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xl font-extrabold text-gray-900">{feedMeta?.activity_count ?? 0}</span>
                <span className="text-xs text-gray-500 mt-0.5">Posts</span>
              </div>
              <div className="flex-1 flex flex-col items-center border-x border-gray-100">
                <span className="text-xl font-extrabold text-gray-900">{feedMeta?.follower_count ?? 0}</span>
                <span className="text-xs text-gray-500 mt-0.5">Followers</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xl font-extrabold text-gray-900">{feedMeta?.following_count ?? 0}</span>
                <span className="text-xs text-gray-500 mt-0.5">Following</span>
              </div>
            </div>

            <div className="flex gap-3 px-4 mt-4">
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followLoading}
                className={`flex-1 py-2.5 rounded-full font-semibold text-sm transition disabled:opacity-50 ${
                  isFollowing
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-linear-to-r from-blue-500 to-purple-600 text-white shadow-sm hover:opacity-90"
                }`}
              >
                {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition"
              >
                Message
              </button>
            </div>

            <div className="flex items-center border-b border-gray-100 mt-5 px-1">
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === id ? "border-purple-600 text-purple-600" : "border-transparent text-gray-400"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={activeTab === id ? 2.5 : 2} />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "posts" && (
              <div className="grid grid-cols-3 gap-px bg-gray-100 mt-px">
                {posts.map((post, i) => (
                  <div key={post.id} className="aspect-square relative bg-gray-200">
                    <Image
                      src={post.attachments?.[0]?.image_url ?? ""}
                      alt={`Post ${i + 1}`}
                      fill
                      sizes="33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "saved" && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <Bookmark className="size-12 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-400">No saved posts</p>
              </div>
            )}

            {activeTab === "liked" && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <Heart className="size-12 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-400">No liked posts</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
