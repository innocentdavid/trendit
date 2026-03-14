"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Feed } from "@stream-io/feeds-client";

const DEFAULT_IMAGE_DURATION_MS = 5000;

type ActivityLike = {
  id: string;
  attachments?: Array<{ type?: string; image_url?: string }>;
};

export function StoryViewer({
  activities,
  feed,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onMarkWatched,
}: {
  activities: ActivityLike[];
  feed: Feed | undefined;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMarkWatched: (activityId: string) => void;
}) {
  const activity = activities[currentIndex];
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVideo = activity?.attachments?.[0]?.type === "video";
  const mediaUrl = activity?.attachments?.[0]?.image_url as string | undefined;
  const durationMs = isVideo ? undefined : DEFAULT_IMAGE_DURATION_MS;

  const advance = useCallback(() => {
    if (activity?.id && feed) onMarkWatched(activity.id);
    if (currentIndex < activities.length - 1) {
      onNext();
    } else {
      onClose();
    }
  }, [activity?.id, feed, currentIndex, activities.length, onNext, onClose, onMarkWatched]);

  useEffect(() => {
    if (!activity || !mediaUrl) return;
    setProgress(0);
    if (isVideo) {
      const video = document.querySelector<HTMLVideoElement>("[data-story-video]");
      if (video) {
        const onTimeUpdate = () => {
          if (video.duration && video.duration > 0) {
            setProgress((video.currentTime / video.duration) * 100);
          }
        };
        const onEnded = () => advance();
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);
        video.play().catch(() => {});
        return () => {
          video.removeEventListener("timeupdate", onTimeUpdate);
          video.removeEventListener("ended", onEnded);
        };
      }
    }
    if (durationMs == null) return;
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(p);
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        advance();
      }
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activity?.id, mediaUrl, isVideo, durationMs, advance]);

  useEffect(() => {
    if (paused && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [paused]);

  if (!activity) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <p className="text-white text-sm">No story</p>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white p-2">
          <X className="size-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {activities.map((_, i) => (
          <div
            key={activities[i].id}
            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
        aria-label="Close"
      >
        <X className="size-5" />
      </button>

      {/* Tap zones: left prev, right next */}
      <div className="absolute inset-0 flex z-5">
        <button
          type="button"
          className="flex-1"
          onClick={() => {
            if (currentIndex > 0) onPrev();
            else onClose();
          }}
          aria-label="Previous"
        />
        <button
          type="button"
          className="flex-1"
          onClick={advance}
          aria-label="Next"
        />
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center min-h-0 relative">
        {!mediaUrl ? (
          <p className="text-white/80 text-sm">Missing media</p>
        ) : isVideo ? (
          <video
            data-story-video
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            playsInline
            muted
          />
        ) : (
          <Image
            src={mediaUrl}
            alt="Story"
            fill
            className="object-contain"
            unoptimized
          />
        )}
      </div>
    </div>
  );
}
