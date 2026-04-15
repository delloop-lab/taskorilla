"use client";

import { useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export default function ConductGuidePage() {
  useEffect(() => {
    async function markViewed() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch("/api/conduct/mark-viewed", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }
    markViewed();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">
      <main className="flex-1">
        <section className="bg-[#F8F9FA] px-4 py-8 sm:py-12 md:py-16 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_40%)]" />
          <div className="max-w-5xl mx-auto relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 md:mb-6 transition-colors text-xs sm:text-sm md:text-base"
            >
              ← Back to Home
            </Link>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3 sm:mb-4">
              Taskorilla Professional Conduct Guide
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary-700 mb-3 sm:mb-4">
              How to stay steady and successful
            </h2>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed">
              At Taskorilla, we don&apos;t just complete tasks, we build trust. To keep the platform safe, fair, and reliable,
              all Helpers and Taskers agree to the following principles.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">1. Honest Agreements</h3>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">
              Clear pricing and scope from the start.
            </p>
            <div className="space-y-4 text-sm md:text-lg text-gray-700">
              <div>
                <p className="font-semibold text-gray-900">No misleading bids</p>
                <p>Only submit bids you are willing to honour.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Confirm before commitment</p>
                <p>Once you click &quot;Confirm Final Price&quot;, the agreed price is locked in.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Scope changes matter</p>
                <p>
                  If the task changes during a job, use the platform tools to adjust or withdraw rather than agreeing informally.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">2. Professional Communication</h3>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">
              Keep communication clear, timely, and on-platform.
            </p>
            <div className="space-y-4 text-sm md:text-lg text-gray-700">
              <div>
                <p className="font-semibold text-gray-900">Be responsive</p>
                <p>If a bid or task is pending, respond promptly to avoid delays.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">No off-platform contact or payments</p>
                <p>All communication, agreements, and payments must stay within Taskorilla.</p>
                <p className="mt-3">This includes sharing or requesting:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Phone numbers</li>
                  <li>Email addresses</li>
                  <li>Social media handles</li>
                  <li>Messaging apps (e.g. WhatsApp, Telegram)</li>
                  <li>Any attempt to move conversations or payment outside the platform</li>
                </ul>
                <p className="mt-3">
                  This rule exists to protect both Helpers and Taskers, ensure secure payments, and provide platform support if
                  anything goes wrong.
                </p>
                <p className="mt-3">
                  Contact details are automatically shared only after a job is confirmed through Taskorilla.
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Use proper exit tools</p>
                <p>If a job is not suitable, withdraw rather than leaving the other party without response.</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">3. Safe Start and Completion</h3>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">
              Make sure work is properly secured and fairly completed.
            </p>
            <div className="space-y-4 text-sm md:text-lg text-gray-700">
              <div>
                <p className="font-semibold text-gray-900">Start only when payment is secured</p>
                <p>Begin work only after the platform confirms the job is active.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Complete with care</p>
                <p>Deliver work as agreed in the chat and confirmation.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Close jobs properly</p>
                <p>Mark tasks as complete only when work is finished and verified.</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-primary-200 shadow-sm p-5 md:p-8 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-800 border border-primary-200 px-3 py-1 text-xs font-semibold mb-4">
              Important
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why these rules matter</h3>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">
              These guidelines protect both Helpers and Taskers by ensuring fair payment, clear expectations, and trust across
              the platform.
            </p>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm md:text-base font-semibold text-red-800">
                Repeated breaches of these principles may result in temporary suspension or removal from the platform.
              </p>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8">
            <p className="text-center text-xl md:text-2xl font-semibold text-gray-900">
              Stay steady. Stay professional.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
