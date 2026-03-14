"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  MessageCircle,
  Image as ImageIcon,
  Video,
  Type,
  UploadCloud,
  Smile,
  MapPin,
  Tag,
  Radio,
  X,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityRequest } from "@stream-io/feeds-client";

type PostType = "image" | "video" | "text" | "reel" | "story";

const CAPTION_MAX = 200;
const REEL_VIDEO_MAX_MB = 100;
const REEL_VIDEO_MAX_BYTES = REEL_VIDEO_MAX_MB * 1024 * 1024;
const REEL_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const postTypes: {
  id: PostType;
  label: string;
  icon: React.ElementType;
  border: string;
  iconColor: string;
}[] = [
    { id: "image", label: "Image", icon: ImageIcon, border: "border-cyan-400", iconColor: "text-cyan-500" },
    { id: "video", label: "Video", icon: Video, border: "border-purple-500", iconColor: "text-purple-500" },
    { id: "text", label: "Text", icon: Type, border: "border-orange-400", iconColor: "text-orange-400" },
    { id: "reel", label: "Reel", icon: Video, border: "border-pink-500", iconColor: "text-pink-500" },
    { id: "story", label: "Story", icon: ImageIcon, border: "border-amber-400", iconColor: "text-amber-500" },
  ];

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, client } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType>(() =>
    searchParams.get("type") === "story" ? "story" : "image"
  );
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reelAudioTitle, setReelAudioTitle] = useState("");
  const [reelAudioArtist, setReelAudioArtist] = useState("");
  const [reelTopicTags, setReelTopicTags] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
    );
  }, []);

  const validateReelVideo = (file: File): string | null => {
    if (!REEL_VIDEO_TYPES.includes(file.type) && !file.type.startsWith("video/")) {
      return "Reels must be a video (MP4, MOV, or WebM).";
    }
    if (file.size > REEL_VIDEO_MAX_BYTES) {
      return `Video must be under ${REEL_VIDEO_MAX_MB}MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (postType === "reel") {
      const err = validateReelVideo(file);
      if (err) {
        setError(err);
        return;
      }
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setError(null);
    if (postType === "reel") {
      const err = validateReelVideo(file);
      if (err) {
        setError(err);
        return;
      }
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleShare = async () => {
    if (!user || !client) return console.log("User or client not found", { user, client });
    if (postType === "reel" && !mediaFile) {
      setError("Reels require a video.");
      return;
    }
    if (postType === "story" && !mediaFile) {
      setError("Stories require a photo or video.");
      return;
    }
    setSharing(true);
    setError(null);
    try {
      let mediaUrl: string | null = null;

      if (mediaFile) {
        if (postType === "reel") {
          const err = validateReelVideo(mediaFile);
          if (err) throw new Error(err);
        }
        if (postType === "story" && !mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
          throw new Error("Stories must be an image or video.");
        }
        const ext = mediaFile.name.split(".").pop();
        const path = `trendit_posts/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, mediaFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      const isReel = postType === "reel";
      const isStory = postType === "story";
      const topicTags = reelTopicTags
        ? reelTopicTags.split(/[\s,#]+/).filter(Boolean).slice(0, 10)
        : undefined;

      if (isStory) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const storyFeed = client.feed("story", user.id);
        await storyFeed.getOrCreate();
        const storyPayload: Omit<ActivityRequest, "feeds"> = {
          type: "post",
          text: caption || undefined,
          custom: { content_type: "story", ...(caption && { caption }) },
          expires_at: tomorrow.toISOString(),
          create_notification_activity: false,
          mentioned_user_ids: [],
          restrict_replies: undefined,
        };
        if (mediaUrl) {
          storyPayload.attachments = [{
            type: mediaFile!.type.startsWith("video/") ? "video" : "image",
            image_url: mediaUrl,
            custom: {},
          }];
        }
        const response = await storyFeed.addActivity(storyPayload);
        if (!response?.activity) throw new Error("Failed to create story.");
        router.push("/");
        return;
      }

      const createPostPayload: Omit<ActivityRequest, "feeds"> = isReel
        ? {
            type: "reel",
            text: caption,
            custom: {
              content_type: "reel",
              caption,
              ...(reelAudioTitle && { audio_title: reelAudioTitle }),
              ...(reelAudioArtist && { audio_artist: reelAudioArtist }),
              ...(topicTags?.length && { topic_tags: topicTags }),
              duration_bucket: "short",
            },
            create_notification_activity: true,
            copy_custom_to_notification: true,
            mentioned_user_ids: [],
            restrict_replies: undefined,
          }
        : {
            type: "post",
            text: caption,
            custom: { caption },
            create_notification_activity: true,
            copy_custom_to_notification: true,
            ...(location && { location }),
            mentioned_user_ids: [],
            restrict_replies: undefined,
          };

      if (mediaUrl) {
        createPostPayload.attachments = [{
          type: isReel ? "video" : postType,
          image_url: mediaUrl,
          custom: isReel ? { content_type: "reel" } : {},
        }];
      }

      const feed = client.feed("user", user.id);
      const response = await feed.addActivity(createPostPayload);

      if (!response || !response.activity) throw new Error("Failed to create post.");
      router.push(isReel ? "/reels" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share post.");
    } finally {
      setSharing(false);
    }
  };

  const acceptAttr =
    postType === "story"
      ? "image/*,video/*"
      : postType === "video" || postType === "reel"
        ? "video/*"
        : "image/*";

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
      <div className="flex-1 overflow-y-auto pb-32 px-4">
        {/* Title */}
        <div className="text-center pt-5 pb-4">
          <h2 className="text-xl font-extrabold text-gray-900">Create New Post</h2>
          <p className="text-sm text-gray-400 mt-0.5">Let&apos;s trend it with the world</p>
        </div>

        {/* Go Live */}
        <button className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-linear-to-r from-red-500 to-orange-400 text-white font-bold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition mb-4">
          <Radio className="size-5" strokeWidth={2} />
          Go Live
        </button>

        {/* Post type selector */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {postTypes.map(({ id, label, icon: Icon, border, iconColor }) => (
            <button
              key={id}
              onClick={() => {
                setPostType(id);
                clearMedia();
                if (id !== "reel") {
                  setReelAudioTitle("");
                  setReelAudioArtist("");
                  setReelTopicTags("");
                }
                if (id !== "story") setError(null);
              }}
              className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 transition ${postType === id ? border + " bg-white shadow-sm" : "border-gray-200 bg-gray-50"
                }`}
            >
              <Icon
                className={`size-6 ${postType === id ? iconColor : "text-gray-400"}`}
                strokeWidth={1.8}
              />
              <span
                className={`text-xs font-semibold ${postType === id ? "text-gray-800" : "text-gray-400"}`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Reel-only hint */}
        {postType === "reel" && (
          <p className="text-xs text-gray-500 mb-2">
            Reels are short videos. Add optional music credits and tags below.
          </p>
        )}

        {/* Story hint */}
        {postType === "story" && (
          <p className="text-xs text-gray-500 mb-2">
            Stories disappear after 24 hours. Add a photo or video.
          </p>
        )}

        {/* Upload area (hidden for text posts) */}
        {postType !== "text" && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition mb-4 overflow-hidden"
            style={{ minHeight: "160px" }}
          >
            {mediaPreview ? (
              <>
                {mediaFile?.type.startsWith("image/") ? (
                  <Image
                    src={mediaPreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-2xl"
                    unoptimized
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="w-full h-full object-cover rounded-2xl"
                    controls
                  />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); clearMedia(); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center z-10"
                >
                  <X className="size-4 text-white" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-10 px-4 text-center pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                  <UploadCloud className="size-7 text-indigo-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-700">Upload media</p>
                <p className="text-xs text-gray-400 mt-1">Drag and drop or click to browse</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Reel metadata (audio / tags) */}
        {postType === "reel" && (
          <div className="space-y-3 mb-4">
            <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
              <input
                type="text"
                value={reelAudioTitle}
                onChange={(e) => setReelAudioTitle(e.target.value)}
                placeholder="Music / audio title (optional)"
                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
              <input
                type="text"
                value={reelAudioArtist}
                onChange={(e) => setReelAudioArtist(e.target.value)}
                placeholder="Artist (optional)"
                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
              <input
                type="text"
                value={reelTopicTags}
                onChange={(e) => setReelTopicTags(e.target.value)}
                placeholder="Tags (e.g. #dance #vlog)"
                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden mb-2">
          <textarea
            value={caption}
            onChange={(e) => {
              if (e.target.value.length <= CAPTION_MAX) setCaption(e.target.value);
            }}
            placeholder="Write a caption..."
            rows={4}
            className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <Smile className="size-5 text-gray-400 cursor-pointer hover:text-gray-600 transition" strokeWidth={1.8} />
              <MapPin className="size-5 text-gray-400 cursor-pointer hover:text-gray-600 transition" strokeWidth={1.8} />
              <Tag className="size-5 text-gray-400 cursor-pointer hover:text-gray-600 transition" strokeWidth={1.8} />
            </div>
            <span className="text-xs text-gray-400">
              {caption.length}/{CAPTION_MAX}
            </span>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 text-center mt-1">{error}</p>}
      </div>

      {/* Sticky share button */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pb-3 bg-white/90 backdrop-blur-sm border-t border-gray-100">
        <button
          onClick={handleShare}
          disabled={
            sharing ||
            (postType !== "text" && !mediaFile) ||
            (postType === "reel" && !mediaFile) ||
            (postType === "story" && !mediaFile)
          }
          className="w-full mt-3 py-3.5 rounded-full bg-linear-to-r from-blue-500 to-purple-600 text-white font-bold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
        >
          {sharing ? "Sharing…" : "Share Post"}
        </button>
      </div>
    </div>
  );
}
