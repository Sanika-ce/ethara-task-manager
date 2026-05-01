"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Settings, User, Bell, Moon, Save, Mail } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { UserRole } from "@/types";

type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskUpdates, setTaskUpdates] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoading(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        toast.error("Unable to load profile.");
        setIsLoading(false);
        return;
      }

      const role = (user.user_metadata?.role as UserRole) || UserRole.MEMBER;
      const fullName =
        (user.user_metadata?.full_name as string) ||
        user.email.split("@")[0] ||
        "Team Member";

      const profileData: UserProfile = {
        id: user.id,
        email: user.email,
        fullName,
        role
      };

      setProfile(profileData);
      setDisplayName(fullName);
      setIsLoading(false);
    };

    void loadUserProfile();
  }, [supabase]);

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim() }
    });

    if (error) {
      toast.error("Failed to update profile.");
      setIsSaving(false);
      return;
    }

    // Also update the profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: displayName.trim() })
      .eq("id", profile.id);

    if (profileError) {
      console.error("Profile table update error:", profileError);
    }

    setProfile({
      ...profile,
      fullName: displayName.trim()
    });

    setIsSaving(false);
    toast.success("Profile updated successfully!");
  }

  if (isLoading) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl animate-pulse">
          <div className="h-6 w-32 bg-slate-700 rounded mb-3"></div>
          <div className="h-8 w-48 bg-slate-700 rounded mb-3"></div>
          <div className="h-4 w-full bg-slate-700 rounded"></div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <p className="text-sm text-slate-400">Failed to load profile. Please try again.</p>
      </main>
    );
  }

  const getRoleBadgeColor = (role: UserRole) => {
    return role === UserRole.ADMIN
      ? "border-amber-300/30 bg-amber-500/10 text-amber-200"
      : "border-blue-300/30 bg-blue-500/10 text-blue-200";
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-200/70">
          <Settings size={14} />
          Settings
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Workspace preferences</h1>
        <p className="mt-2 text-sm text-slate-300">
          Manage your profile, notifications, and appearance settings.
        </p>
      </section>

      {/* Profile Settings */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-4 py-2.5 text-white placeholder-slate-400 outline-none focus:border-indigo-300/50 focus:bg-slate-900/80 transition"
            />
            <p className="mt-1 text-xs text-slate-400">This is your public display name in the workspace.</p>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-lg border border-white/20 bg-slate-950/50 px-4 py-2.5 pl-10 text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Your email cannot be changed here. Contact support for changes.</p>
          </div>

          {/* Role Badge */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Role</label>
            <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${getRoleBadgeColor(profile.role)}`}>
              {profile.role}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {profile.role === UserRole.ADMIN
                ? "You have admin access to create projects and manage the team."
                : "You have member access to view and update assigned tasks."}
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving || displayName === profile.fullName}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </section>

      {/* Appearance Settings */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-5">
          <Moon size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Appearance</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">Dark Mode</p>
              <p className="text-xs text-slate-400 mt-1">Use dark theme for better visibility at night</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                darkMode ? "bg-indigo-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all ${
                  darkMode ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Notification Settings */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>

        <div className="space-y-3">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">Email Notifications</p>
              <p className="text-xs text-slate-400 mt-1">Receive email updates about your tasks and projects</p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                emailNotifications ? "bg-emerald-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all ${
                  emailNotifications ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Task Updates Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">Task Updates</p>
              <p className="text-xs text-slate-400 mt-1">Get notified when tasks are assigned or status changes</p>
            </div>
            <button
              onClick={() => setTaskUpdates(!taskUpdates)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                taskUpdates ? "bg-emerald-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all ${
                  taskUpdates ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Account Info */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">User ID</span>
            <span className="text-sm font-mono text-slate-300">{profile.id.substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Workspace Role</span>
            <span className="text-sm font-semibold text-indigo-200">{profile.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Member Since</span>
            <span className="text-sm text-slate-300">Day 1</span>
          </div>
        </div>
      </section>
    </main>
  );
}
