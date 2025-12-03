"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  postcode: string | null;
  country: string | null;
  is_helper?: boolean;
  profile_slug?: string | null;
}

export default function UserProfileModal({
  userId,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, company_name, postcode, country, is_helper, profile_slug")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        setError("Unable to load profile");
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    loadProfile();
  }, [isOpen, userId]);

  if (!isOpen || !userId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Tasker Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading profile…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : profile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Tasker avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                    {(profile.full_name?.[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.full_name || "Unnamed Tasker"}
                </p>
                {profile.company_name && (
                  <p className="text-sm text-gray-500">{profile.company_name}</p>
                )}
                {(profile.postcode || profile.country) && (
                  <p className="text-sm text-gray-500">
                    {[profile.postcode, profile.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            
            {profile.is_helper && (
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/helper/${profile.profile_slug || userId}`}
                  onClick={onClose}
                  className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
                >
                  View Full Helper Profile →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No profile information available.</p>
        )}
      </div>
    </div>
  );
}

