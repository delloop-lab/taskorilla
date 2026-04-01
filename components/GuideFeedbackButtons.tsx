"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface GuideFeedbackButtonsProps {
  guideId: string;
  guideTitle: string;
  guideSlug: string;
  language: string;
}

export default function GuideFeedbackButtons({
  guideId,
  guideTitle,
  guideSlug,
  language,
}: GuideFeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getSessionKey = () => {
    if (typeof window === "undefined") return null;
    const keyName = "guide_feedback_session_key";
    const existing = localStorage.getItem(keyName);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(keyName, generated);
    return generated;
  };

  const handleFeedback = async (value: "yes" | "no") => {
    if (submitting || feedback) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/help/guide-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId,
          guideTitle,
          guideSlug,
          feedback: value,
          language,
          sessionKey: getSessionKey(),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save feedback");
      }
      setFeedback(value);
      setMessage(
        value === "yes"
          ? "Thanks for letting us know this guide helped!"
          : "Thanks for your honesty. We’ll keep improving this guide."
      );
    } catch {
      setMessage("Could not save feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const baseClasses =
    "flex items-center gap-2 px-6 py-3 border-2 rounded-lg transition-all";

  return (
    <div className="text-center">
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => handleFeedback("yes")}
          disabled={!!feedback || submitting}
          className={`${baseClasses} ${
            feedback === "yes"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
          } ${feedback || submitting ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <ThumbsUp className="w-5 h-5" />
          Yes, helpful
        </button>
        <button
          type="button"
          onClick={() => handleFeedback("no")}
          disabled={!!feedback || submitting}
          className={`${baseClasses} ${
            feedback === "no"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-gray-300 text-gray-700 hover:border-red-500 hover:bg-red-50 hover:text-red-700"
          } ${feedback || submitting ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <ThumbsDown className="w-5 h-5" />
          Needs improvement
        </button>
      </div>
      {message && (
        <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
}


