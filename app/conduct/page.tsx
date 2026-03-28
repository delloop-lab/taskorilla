"use client";

import { useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export default function ConductGuidePage() {
  const { t } = useLanguage();

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
          >
            {t("conduct.backHome")}
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("conduct.title")}
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            {t("conduct.subtitle")}
          </p>

          <p className="text-gray-700 mb-10 leading-relaxed">
            {t("conduct.intro")}
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("conduct.pillar1Title")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("conduct.pillar1Lead")}
            </p>
            <div className="space-y-4 pl-4 border-l-4 border-primary-200">
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.noLowBallingTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.noLowBallingBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.finalSayTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.finalSayBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.scopeIntegrityTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.scopeIntegrityBody")}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t("conduct.pillar2Title")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("conduct.pillar2Lead")}
            </p>
            <div className="space-y-4 pl-4 border-l-4 border-primary-200">
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.beResponsiveTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.beResponsiveBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.noSideDealsTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.noSideDealsBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.respectfulExitsTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.respectfulExitsBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.startWhenSecuredTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.startWhenSecuredBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.finishWithPrideTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.finishWithPrideBody")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("conduct.honestCompletionTitle")}</h3>
                <p className="text-gray-700">
                  {t("conduct.honestCompletionBody")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 mb-10">
            <h2 className="text-xl font-semibold text-amber-900 mb-3">
              {t("conduct.enforceTitle")}
            </h2>
            <p className="text-amber-800 leading-relaxed">
              {t("conduct.enforceBodyPrefix")}
              <strong>{t("conduct.enforceBodyStrong")}</strong>
              {t("conduct.enforceBodySuffix")}
            </p>
          </section>

          <p className="text-center text-lg font-semibold text-gray-900">
            {t("conduct.signoff")}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
