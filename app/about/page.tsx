"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";
import { Heart, Sparkles } from "lucide-react";

export default function AboutPage() {
  const { language } = useLanguage();

  const content = language === 'pt' ? {
    backText: "← Voltar à Página Inicial",
    title: "Sobre Nós",
    intro: "Somos uma pequena equipa com um objetivo simples: ajudar as pessoas a realizar tarefas do dia a dia enquanto apoiamos ajudantes locais e a comunidade. Gostamos de manter as coisas humanas, simples e úteis.",
    teeTitle: "Conheça o TEE",
    teeText: "Também verá o TEE pelo site. O TEE é a nossa mascote gorila, inspirada na força, fiabilidade e foco calmo pelos quais os gorilas são conhecidos. Ele aparece como um guia amigável para tornar a experiência mais acolhedora e menos stressante. Sem ruído, sem pressão, apenas um ajudante constante que representa como queremos que a plataforma se sinta.",
    belief: "Acreditamos que a tecnologia deve tornar a vida mais fácil, não mais complicada, e tudo o que criamos segue essa ideia."
  } : {
    backText: "← Back to Home",
    title: "About Us",
    intro: "We are a small team with a simple goal: help people get everyday tasks done while supporting local helpers and the community. We like to keep things human, simple and useful.",
    teeTitle: "Meet TEE",
    teeText: "You will also see TEE around the site. TEE is our gorilla mascot, inspired by the strength, reliability and calm focus that gorillas are known for. He shows up as a friendly guide to make the experience warmer and less stressful. No noise, no pressure, just a steady helper who represents how we want the platform to feel.",
    belief: "We believe technology should make life easier, not more complicated, and everything we create follows that idea."
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 md:mb-6 transition-colors text-sm md:text-base"
          >
            {content.backText}
          </Link>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">{content.title}</h1>
              <p className="text-base sm:text-lg md:text-xl opacity-90 leading-relaxed">
                {content.intro}
              </p>
            </div>
            {/* TEE at top - visible on all screens */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex-shrink-0 order-first md:order-last">
              <Image
                src="/images/tee-peeking.png"
                alt="TEE the gorilla mascot peeking around a corner"
                width={192}
                height={192}
                className="object-contain w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* TEE Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary flex-shrink-0" />
              {content.teeTitle}
            </h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              {content.teeText}
            </p>
          </div>

          {/* Belief Statement */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                {content.belief}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
