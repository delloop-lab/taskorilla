"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface GuideFeedbackButtonsProps {
  guideTitle: string;
}

export default function GuideFeedbackButtons({
  guideTitle,
}: GuideFeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [message, setMessage] = useState("");

  const handleFeedback = (value: "yes" | "no") => {
    setFeedback(value);
    setMessage(
      value === "yes"
        ? "Thanks for letting us know this guide helped!"
        : "Thanks for your honesty. We’ll keep improving this guide."
    );
    // Hook for future analytics call
    // sendFeedback({ guideTitle, feedback: value })
  };

  const baseClasses =
    "flex items-center gap-2 px-6 py-3 border-2 rounded-lg transition-all";

  return (
    <div className="text-center">
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => handleFeedback("yes")}
          className={`${baseClasses} ${
            feedback === "yes"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
          Yes, helpful
        </button>
        <button
          type="button"
          onClick={() => handleFeedback("no")}
          className={`${baseClasses} ${
            feedback === "no"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-gray-300 text-gray-700 hover:border-red-500 hover:bg-red-50 hover:text-red-700"
          }`}
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


