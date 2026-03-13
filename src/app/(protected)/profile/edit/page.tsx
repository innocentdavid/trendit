"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase/client";
import axios from "axios";

const BIO_MAX = 150;

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: (user?.user_metadata?.full_name as string) ?? "",
    username: (user?.user_metadata?.username as string) ?? "",
    bio: (user?.user_metadata?.bio as string) ?? "",
    website: (user?.user_metadata?.website as string) ?? "",
    email: user?.email ?? "",
    phone: (user?.user_metadata?.phone as string) ?? "",
    gender: (user?.user_metadata?.gender as string) ?? "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    (user?.user_metadata?.avatar_url as string) ?? null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoadingProfile(true)
        const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user?.id).single()
        if (error) throw error
        setForm((prev) => ({
          ...prev, ...{
            fullName: data.full_name,
            username: data.username,
            bio: data.bio,
            website: data.website,
            phone: data.phone,
            gender: data.gender,
          }
        }))
        setAvatarPreview(data.avatar_url)
      } catch (error) {
        console.log("failed to fetch user profile data")
        console.error(error)
      } finally {
        setLoadingProfile(false)
      }
    }
    fetchUserProfile()
  }, [user?.id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "bio" && value.length > BIO_MAX) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user?.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("user_profiles")
        .upsert({
          id: user?.id,
          full_name: form.fullName,
          username: form.username,
          bio: form.bio,
          website: form.website,
          phone: form.phone,
          gender: form.gender,
          avatar_url: avatarUrl,
        }, { onConflict: "id" });

      if (updateError) throw updateError;
      await supabase.auth.updateUser({
        phone: form.phone,
        data: {
          full_name: form.fullName,
          username: form.username,
          avatar_url: avatarUrl,
        },
      });
      await axios.post("/api/get_stream/user_management", {
        full_name: form.fullName,
        username: form.username,
        avatar_url: avatarUrl,
      });
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.fullName || "A";

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {loadingProfile && (
        <div className="absolute z-50 inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="size-6 animate-spin text-gray-500" />
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Done"}
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-40">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-6 pb-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 shadow-md">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  unoptimized={avatarPreview.startsWith("blob:")}
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-gray-600 to-gray-900 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold select-none">
                    {displayName[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handlePhotoClick}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center border-2 border-white shadow"
            >
              <Camera className="size-3.5 text-white" />
            </button>
          </div>
          <button
            onClick={handlePhotoClick}
            className="mt-2 text-xs font-medium text-purple-600 hover:underline"
          >
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="mx-4 text-xs text-red-500 text-center mb-2">{error}</p>
        )}

        {/* Basic Information */}
        <Section title="Basic Information">
          <Field label="Name">
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Your full name"
              className={inputClass}
            />
          </Field>
          <Field label="Username">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                @
              </span>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="username"
                className={`${inputClass} pl-7`}
              />
            </div>
          </Field>
          <Field label="Bio">
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell the world about yourself…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="text-right text-[11px] text-gray-400 mt-1">
              {form.bio.length}/{BIO_MAX}
            </p>
          </Field>
          <Field label="Website">
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="yourwebsite.com"
              className={inputClass}
            />
          </Field>
        </Section>

        {/* Private Information */}
        <Section
          title="Private Information"
          subtitle="This information won't be shown on your profile"
        >
          <Field label="Email">
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="email@example.com"
              className={inputClass}
              disabled
              readOnly
            />
          </Field>
          <Field label="Phone">
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              placeholder="+1 234 567 8900"
              className={inputClass}
            />
          </Field>
          <Field label="Gender">
            <div className="relative">
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={`${inputClass} appearance-none pr-8 cursor-pointer`}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        </Section>

        {/* Account Settings */}
        <Section title="Account Settings">
          {[
            { label: "Change Password", href: "/profile/change-password" },
            { label: "Privacy and Security", href: "/profile/privacy" },
            { label: "Notifications", href: "/profile/notifications" },
          ].map(({ label }) => (
            <button
              key={label}
              className="flex items-center justify-between w-full py-3.5 text-sm text-gray-800 font-medium border-b border-gray-100 last:border-0"
            >
              {label}
              <ChevronRight className="size-4 text-gray-400" />
            </button>
          ))}
          <button className="flex items-center gap-2 w-full pt-3.5 text-sm font-semibold text-red-500 hover:text-red-600 transition">
            <Trash2 className="size-4" />
            Delete Account
          </button>
        </Section>
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pb-3 bg-white/90 backdrop-blur-sm border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-full bg-linear-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 mt-3"
        >
          {saving ? "Saving changes…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 px-4">
      <p className="text-sm font-bold text-gray-900 mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
      <div className={`mt-3 space-y-3 ${!subtitle ? "mt-3" : ""}`}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
