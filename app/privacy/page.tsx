"use client";

import Link from "next/link";

const lastUpdated = "November 17, 2025";

const sections = [
  {
    title: "Information We Collect",
    content:
      "We may collect account details, profile information, messages, technical data such as IP address and device type, and payment-related information from payment partners. Taskorilla does not store payment card details.",
  },
  {
    title: "How We Use Information",
    content:
      "We use personal information to operate the platform, connect users, improve functionality, communicate with you, and protect the platform. We do not sell personal information.",
  },
  {
    title: "Legal Basis",
    content:
      "We process data to provide the service, for legitimate interests, with your consent, and to meet legal obligations.",
  },
  {
    title: "Sharing Information",
    content:
      "We may share data with hosting providers, customer support tools, payment processors, and authorities when legally required. We do not share information for third-party marketing.",
  },
  {
    title: "Cookies",
    content:
      "We may use cookies for login and essential functionality. Disabling cookies may limit certain features.",
  },
  {
    title: "Data Security",
    content:
      "We take reasonable measures to protect information but cannot guarantee complete security.",
  },
  {
    title: "Retention",
    content:
      "We retain data only as long as necessary to operate the platform or as required by law.",
  },
  {
    title: "Your Rights",
    content:
      "You may have rights to access, correct, delete, or download your data. Contact us to exercise these rights.",
  },
  {
    title: "Children",
    content: "Taskorilla is not intended for users under 18.",
  },
  {
    title: "Changes",
    content:
      "We may update this policy. Continued use of the platform means you accept the updated policy.",
  },
  {
    title: "Contact",
    content:
      "For questions or to exercise your rights, contact us at tee@taskorilla.com.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
      >
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last updated: {lastUpdated}</p>

      <p className="text-gray-700 mb-8">
        This policy explains how Taskorilla collects, uses, and protects personal
        information.
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


