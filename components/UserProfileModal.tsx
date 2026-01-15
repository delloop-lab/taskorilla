"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ReportModal from "./ReportModal";
import { User as UserIcon } from "lucide-react";
import { useUserRatings, getUserRatingsById } from "@/lib/useUserRatings";
import CompactUserRatingsDisplay from "@/components/CompactUserRatingsDisplay";

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
  languages?: string[] | null;
}

export default function UserProfileModal({
  userId,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const { users: userRatings } = useUserRatings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRatingsSummary, setUserRatingsSummary] = useState<any>(null);

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
        console.log("📋 UserProfileModal: Loaded profile:", {
          userId,
          is_helper: data?.is_helper,
          profile_slug: data?.profile_slug,
          full_name: data?.full_name
        });
        setProfile(data);
      }
      setLoading(false);
    };

    loadProfile();
  }, [isOpen, userId]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Update ratings summary when userRatings or userId changes
  useEffect(() => {
    if (userId && userRatings.length > 0) {
      const ratingsMap = new Map(userRatings.map((r: any) => [r.reviewee_id, r]));
      const rating = getUserRatingsById(userId, ratingsMap);
      setUserRatingsSummary(rating || null);
    } else {
      setUserRatingsSummary(null);
    }
  }, [userId, userRatings]);

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
              <Link
                href={`/user/${profile.profile_slug || userId}`}
                onClick={onClose}
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 aspect-square rounded-full bg-gray-200 overflow-hidden flex-shrink-0 min-w-[48px] min-h-[48px] cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                style={{ aspectRatio: '1 / 1' }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Tasker avatar"}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400" />
                  </div>
                )}
              </Link>
              <div className="flex-1">
                <Link
                  href={`/user/${profile.profile_slug || userId}`}
                  onClick={onClose}
                  className="text-lg font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {profile.full_name || "Unnamed Tasker"}
                </Link>
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

            {/* Ratings */}
            {userRatingsSummary && (
              <div className="mt-4 pt-4 border-t">
                <CompactUserRatingsDisplay 
                  ratings={userRatingsSummary} 
                  size="sm"
                />
              </div>
            )}
            
            {/* View Full Profile Button - Show for all users */}
            {userId && (
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/user/${profile.profile_slug || userId}`}
                  onClick={onClose}
                  className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium transition-colors"
                >
                  View Full Profile →
                </Link>
              </div>
            )}

            {/* Report Button - Only show if user is logged in and not viewing their own profile */}
            {currentUserId && currentUserId !== userId && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => {
                    setReportModalOpen(true);
                  }}
                  className="w-full text-center text-red-600 hover:text-red-700 px-4 py-2 rounded-md border border-red-300 hover:border-red-400 font-medium transition-colors"
                >
                  Report User
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No profile information available.</p>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportType="user"
        targetId={userId || ''}
        targetName={profile?.full_name || undefined}
        onReportSubmitted={() => {
          setReportModalOpen(false);
        }}
      />
    </div>
  );
}

