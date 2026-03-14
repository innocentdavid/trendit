"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Feed } from "@stream-io/feeds-client";
import { StoryViewer } from "@/components/StoryViewer";

type ActivityLike = {
  id: string;
  attachments?: Array<{ type?: string; image_url?: string }>;
};

export default function StoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const { user: currentUser, client } = useAuth();
  const [feed, setFeed] = useState<Feed | undefined>(undefined);
  const [activities, setActivities] = useState<ActivityLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!userId || !client) {
      if (!userId) router.replace("/");
      setLoading(false);
      return;
    }
    setLoading(true);
    const storyFeed = client.feed("story", userId);
    storyFeed
      .getOrCreate({ watch: true, limit: 100 })
      .then((res) => {
        setFeed(storyFeed);
        const acts = (res.activities ?? []) as ActivityLike[];
        setActivities(acts.slice().reverse());
        setCurrentIndex(0);
      })
      .catch(() => {
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [client, userId, router]);

  const markWatched = useCallback(
    async (activityId: string) => {
      if (!feed) return;
      try {
        await feed.markActivity({ mark_watched: [activityId] });
      } catch {
        // ignore
      }
    },
    [feed]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(activities.length - 1, i + 1));
  }, [activities.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId || activities.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4">
        <p className="text-white/80 text-sm">No stories to view</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-white underline text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <StoryViewer
      activities={activities}
      feed={feed}
      currentIndex={currentIndex}
      onClose={handleClose}
      onPrev={handlePrev}
      onNext={handleNext}
      onMarkWatched={markWatched}
    />
  );
}
