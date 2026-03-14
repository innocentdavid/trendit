"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, Grid3X3, Bookmark, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase/client";
import { UserProfile } from "@/types/global";

type Tab = "posts" | "saved" | "liked";

// type RawActivity = {
//   "feed": {
//       "group_id": "user",
//       "id": "c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//       "feed": "user:c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//       "name": "",
//       "description": "",
//       "visibility": "visible",
//       "created_by": {
//           "id": "c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//           "name": "dev_cent",
//           "custom": {
//               "full_name": "Innocent Paul"
//           },
//           "language": "",
//           "role": "user",
//           "teams": [],
//           "created_at": "2026-03-13T15:58:10.770Z",
//           "updated_at": "2026-03-13T15:58:10.783Z",
//           "banned": false,
//           "online": true,
//           "blocked_user_ids": []
//       },
//       "member_count": 0,
//       "follower_count": 0,
//       "following_count": 0,
//       "activity_count": 1,
//       "pin_count": 0,
//       "own_capabilities": [
//           "add-activity",
//           "add-activity-bookmark",
//           "add-activity-reaction",
//           "add-comment",
//           "add-comment-reaction",
//           "delete-feed",
//           "delete-own-activity",
//           "delete-own-activity-bookmark",
//           "delete-own-activity-reaction",
//           "delete-own-comment",
//           "delete-own-comment-reaction",
//           "follow",
//           "query-feed-members",
//           "query-follows",
//           "read-feed",
//           "unfollow",
//           "update-feed",
//           "update-feed-followers",
//           "update-feed-members",
//           "update-own-activity",
//           "update-own-activity-bookmark",
//           "update-own-comment"
//       ],
//       "created_at": "2026-03-13T17:24:03.350Z",
//       "updated_at": "2026-03-13T17:24:03.350Z"
//   },
//   "activities": [
//       {
//           "id": "fa5a8369-e5ee-4ca7-92da-f260a450ed9c",
//           "type": "post",
//           "user": {
//               "id": "c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//               "name": "dev_cent",
//               "custom": {
//                   "full_name": "Innocent Paul"
//               },
//               "language": "",
//               "role": "user",
//               "teams": [],
//               "created_at": "2026-03-13T15:58:10.770Z",
//               "updated_at": "2026-03-13T15:58:10.783Z",
//               "banned": false,
//               "online": true,
//               "blocked_user_ids": []
//           },
//           "feeds": [
//               "user:c9fcb62c-9d60-46fe-98ba-0a59ad9c1784"
//           ],
//           "visibility": "public",
//           "restrict_replies": "everyone",
//           "created_at": "2026-03-13T17:24:03.361Z",
//           "updated_at": "2026-03-13T17:24:03.361Z",
//           "attachments": [
//               {
//                   "type": "image",
//                   "image_url": "https://hiwkoiswivlqjdoesjti.supabase.co/storage/v1/object/public/media/trendit_posts/c9fcb62c-9d60-46fe-98ba-0a59ad9c1784/1773422643765.jpg",
//                   "custom": {}
//               }
//           ],
//           "mentioned_users": [],
//           "custom": {
//               "caption": "Happy birthday!"
//           },
//           "popularity": 0,
//           "score": 0,
//           "comments": [],
//           "text": "Happy birthday!",
//           "location": {
//               "lat": 7.138323783874156,
//               "lng": 3.391168117527896
//           },
//           "search_data": {},
//           "filter_tags": [],
//           "interest_tags": [],
//           "comment_count": 0,
//           "bookmark_count": 0,
//           "share_count": 0,
//           "reaction_count": 0,
//           "latest_reactions": [],
//           "reaction_groups": {},
//           "own_reactions": [],
//           "own_bookmarks": [],
//           "collections": {},
//           "current_feed": {
//               "group_id": "user",
//               "id": "c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//               "feed": "user:c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//               "name": "",
//               "description": "",
//               "visibility": "visible",
//               "created_by": {
//                   "id": "c9fcb62c-9d60-46fe-98ba-0a59ad9c1784",
//                   "name": "dev_cent",
//                   "custom": {
//                       "full_name": "Innocent Paul"
//                   },
//                   "language": "",
//                   "role": "user",
//                   "teams": [],
//                   "created_at": "2026-03-13T15:58:10.770Z",
//                   "updated_at": "2026-03-13T15:58:10.783Z",
//                   "banned": false,
//                   "online": true,
//                   "blocked_user_ids": []
//               },
//               "member_count": 0,
//               "follower_count": 0,
//               "following_count": 0,
//               "activity_count": 1,
//               "pin_count": 0,
//               "own_capabilities": [
//                   "add-activity",
//                   "add-activity-bookmark",
//                   "add-activity-reaction",
//                   "add-comment",
//                   "add-comment-reaction",
//                   "delete-feed",
//                   "delete-own-activity",
//                   "delete-own-activity-bookmark",
//                   "delete-own-activity-reaction",
//                   "delete-own-comment",
//                   "delete-own-comment-reaction",
//                   "follow",
//                   "query-feed-members",
//                   "query-follows",
//                   "read-feed",
//                   "unfollow",
//                   "update-feed",
//                   "update-feed-followers",
//                   "update-feed-members",
//                   "update-own-activity",
//                   "update-own-activity-bookmark",
//                   "update-own-comment"
//               ],
//               "created_at": "2026-03-13T17:24:03.350Z",
//               "updated_at": "2026-03-13T17:24:03.350Z"
//           },
//           "hidden": false,
//           "preview": false
//       }
//   ],
//   "aggregated_activities": [],
//   "members": [],
//   "followers": [],
//   "following": [],
//   "pinned_activities": [],
//   "created": false,
//   "duration": "95.91ms",
//   "metadata": {
//       "client_request_id": "0240858f-0f6f-46b7-bcce-e74c8010e097",
//       "response_headers": {
//           "cache-control": "no-cache",
//           "content-length": "886",
//           "content-type": "application/json;charset=utf-8",
//           "x-ratelimit-limit": "10000",
//           "x-ratelimit-remaining": "9999",
//           "x-ratelimit-reset": "1773423780"
//       },
//       "response_code": 201,
//       "rate_limit": {
//           "rate_limit": 10000,
//           "rate_limit_remaining": 9999,
//           "rate_limit_reset": "2026-03-13T17:43:00.000Z"
//       }
//   }
// }

type PostActivity = {
  id: string;
  text: string;
  custom?: { caption?: string };
  attachments?: Array<{ type: string; image_url?: string }>;
  created_at?: string;
  reaction_counts?: { like?: number; comment?: number; share?: number };
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, client } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  const displayName = profileData?.full_name ?? user?.user_metadata?.full_name ?? "User";
  const username = profileData?.username ?? user?.user_metadata?.username ?? "user";
  const avatarUrl = profileData?.avatar_url ?? user?.user_metadata?.avatar_url as string | undefined;

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "liked", icon: Heart, label: "Liked" },
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user?.id).single()
        if (error) throw error
        setProfileData(data as UserProfile)
      } catch (error) {
        console.log("failed to fetch user profile data")
        console.error(error)
      }
    }
    fetchUserProfile()
  }, [user?.id])

  const [fetching, setFetching] = useState(true)
  const [posts, setPosts] = useState<PostActivity[]>([])

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!client || !user) return
      try {
        setFetching(true)
        // Create a feed (or get its data if exists)
        const feed = client.feed("user", user.id);
        // Subscribe to WebSocket events for state updates
        const response = await feed.getOrCreate({ watch: true });
        // console.log("response")
        // console.log(response)

        setPosts(response.activities.map((activity) => ({
          id: activity.id,
          text: activity.text ?? "",
          attachments: activity.attachments,
          created_at: activity.created_at,
          reaction_counts: {
            comment: activity.comment_count ?? 0,
            like: activity.reaction_count ?? 0,
            share: activity.share_count ?? 0,
          },
        } as any)))
      } catch (error) {
        console.log("failed to fetch user profile data")
        console.error(error)
      } finally {
        setFetching(false)
      }
    }
    fetchUserPosts()
  }, [user?.id])

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
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Profile info row */}
        <div className="px-4 pt-5">
          <div className="flex items-end gap-4">
            {/* Bio */}
            <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-1">
              {profileData?.bio ?? "No bio yet"}
            </p>

            <div className="">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={78}
                      height={78}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-gray-600 to-gray-900 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold select-none">
                        {displayName[0]}
                      </span>
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>

              {/* Name + username */}
              <div className="mt-3">
                <h2 className="text-xl font-extrabold text-gray-900">{displayName}</h2>
                <p className="text-sm text-gray-400 mt-0.5">@{username}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Stats */}
        <div className="flex items-center mt-5 mx-4 py-4 border-y border-gray-100">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xl font-extrabold text-gray-900">347</span>
            <span className="text-xs text-gray-500 mt-0.5">Posts</span>
          </div>
          <div className="flex-1 flex flex-col items-center border-x border-gray-100">
            <span className="text-xl font-extrabold text-gray-900">12.5K</span>
            <span className="text-xs text-gray-500 mt-0.5">Followers</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xl font-extrabold text-gray-900">900</span>
            <span className="text-xs text-gray-500 mt-0.5">Following</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-4 mt-4">
          <button
            onClick={() => router.push("/profile/edit")}
            className="flex-1 py-2.5 rounded-full bg-linear-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm shadow-sm hover:opacity-90 transition active:scale-[0.98]"
          >
            Edit Profile
          </button>
          <button className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition active:scale-[0.98]">
            Share Profile
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-gray-100 mt-5 px-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 flex-1 justify-center py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-400"
                }`}
            >
              <Icon className="size-4" strokeWidth={activeTab === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-px bg-gray-100 mt-px">
            {posts.map((post, i) => (
              <div key={i} className="aspect-square relative bg-gray-200">
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
            <p className="text-sm font-medium text-gray-400">No saved posts yet</p>
          </div>
        )}

        {activeTab === "liked" && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Heart className="size-12 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-400">No liked posts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
