"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/i18n";

export default function AboutPage() {
  const { language } = useLanguage();

  const content = {
    backText: "← Back to Home",
    title: "About Us",
    subtitle: "Helping people get things done, locally and simply",
    intro1:
      "We’re a small team building a straightforward way for people to get everyday tasks done while supporting local Helpers in the community.",
    intro2:
      "Taskorilla connects people who need help with people who can do the work. Fast, simple, and without unnecessary complexity.",
    intro3:
      "No clutter. No confusion. Just a clear way to post a task, agree a price, and get it done.",
    intro4:
      "We believe technology should stay out of the way. The goal is simple: make it easier to get things done in the real world.",
    howTitle: "How Taskorilla works",
    howLine1: "People post tasks they need help with.",
    howLine2: "Local Helpers respond with offers.",
    howLine3: "Both sides agree on a price.",
    howLine4: "The job gets done.",
    howOutro: "Simple exchange. Real outcomes.",
    teeTitle: "Meet TEE",
    tee1:
      "TEE is our gorilla mascot and a small part of the Taskorilla experience.",
    tee2:
      "We use TEE to bring a bit of warmth and personality into what is otherwise a very practical platform. Think of TEE as a reminder that behind every task is a real person helping another real person.",
    tee3:
      "Calm, reliable, and always focused on getting things done properly.",
    simpleTitle: "A simple idea",
    simpleText:
      "Getting help shouldn’t be complicated. Taskorilla exists to make everyday tasks easier to organise, easier to complete, and easier to trust.",
    ptBackText: "← Voltar à Página Inicial",
  };

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
              {language === "pt" ? content.ptBackText : content.backText}
            </Link>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3 sm:mb-4">
              {content.title}
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary-700 mb-3 sm:mb-4">
              {content.subtitle}
            </h2>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors text-xs sm:text-sm md:text-base"
          >
            <span>←</span> {language === "pt" ? content.ptBackText.replace("← ", "") : "Back to Home"}
          </Link>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">{content.intro1}</p>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">{content.intro2}</p>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">{content.intro3}</p>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed">{content.intro4}</p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5">{content.howTitle}</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm md:text-lg text-gray-700">
              <li>{content.howLine1}</li>
              <li>{content.howLine2}</li>
              <li>{content.howLine3}</li>
              <li>{content.howLine4}</li>
            </ul>
            <p className="mt-5 text-base md:text-xl font-semibold text-gray-900">
              {content.howOutro}
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 mb-6 overflow-hidden">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{content.teeTitle}</h3>
            <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start md:items-center">
              <div className="w-full flex-1">
                <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">{content.tee1}</p>
                <p className="text-sm md:text-lg text-gray-700 leading-relaxed mb-4">{content.tee2}</p>
                <p className="text-sm md:text-lg text-gray-700 leading-relaxed">{content.tee3}</p>
              </div>
              <div className="w-full max-w-[220px] md:max-w-none md:w-48 lg:w-56 aspect-square flex-shrink-0 mx-auto md:mx-0 relative">
                <Image
                  src="/images/gorilla-mascot-newer.png"
                  alt="TEE the gorilla mascot"
                  width={192}
                  height={192}
                  className="object-contain w-full h-full md:hidden"
                  priority
                />
                <Image
                  src="/images/tee-peeking.png"
                  alt="TEE the gorilla mascot peeking around a corner"
                  width={192}
                  height={192}
                  className="object-contain w-full h-full hidden md:block"
                  priority
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{content.simpleTitle}</h3>
            <p className="text-sm md:text-lg text-gray-700 leading-relaxed">{content.simpleText}</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
