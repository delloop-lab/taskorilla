"use client";

import Link from "next/link";

const lastUpdated = "November 17, 2025";

const sections = [
  {
    title: "About Taskorilla",
    content:
      "Taskorilla lets people post tasks and connect with Taskers who may want to complete them. We do not employ Taskers, supervise any work, or guarantee outcomes.",
  },
  {
    title: "Eligibility",
    content: "You must be at least 18 years old to use Taskorilla.",
  },
  {
    title: "Your Account",
    content:
      "You are responsible for keeping your account secure. Any activity that happens through your account is your responsibility.",
  },
  {
    title: "Your Use of the Platform",
    content:
      "You agree not to break any laws, mislead users, take communication off-platform, post harmful or offensive content, or interfere with Taskorilla’s operation.",
  },
  {
    title: "Task Agreements",
    content:
      "All agreements are strictly between Posters and Taskers. Taskorilla is not part of any agreement and is not responsible for performance, payment, disputes, loss, damage, or safety issues.",
  },
  {
    title: "Payments",
    content:
      "Payments may be processed by third parties. Taskorilla does not store card details and is not responsible for payment errors or disputes unless caused by a confirmed platform malfunction.",
  },
  {
    title: "Safety",
    content:
      "Users are solely responsible for their personal safety when meeting or performing task activities.",
  },
  {
    title: "Content",
    content:
      "You are responsible for anything you post. By posting, you give Taskorilla permission to display that content on the platform.",
  },
  {
    title: "Platform Changes",
    content: "We may change or remove features at any time.",
  },
  {
    title: "Limitation of Liability",
    content:
      "Taskorilla is provided on an “as is” and “as available” basis. We do not guarantee uninterrupted service, accuracy, or suitability, and we are not liable for loss or damage connected to using the platform.",
  },
  {
    title: "Termination",
    content:
      "We may suspend or terminate accounts that violate these Terms.",
  },
  {
    title: "Governing Law",
    content:
      "These Terms are governed by the laws of Portugal unless local law requires otherwise.",
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
      >
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Terms and Conditions
      </h1>
      <p className="text-gray-600 mb-8">Last updated: {lastUpdated}</p>

      <p className="text-gray-700 mb-8">
        Welcome to Taskorilla. By using the platform you agree to these Terms.
        If you do not agree, please stop using the platform.
      </p>

      <div className="space-y-6">
        {sections.map(({ title, content }) => (
          <section key={title}>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-700">{content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}


