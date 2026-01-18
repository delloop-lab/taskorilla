"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";
import { Heart, Sparkles, Rocket } from "lucide-react";

export default function AboutPage() {
  const { language } = useLanguage();

  const content = language === 'pt' ? {
    backText: "← Voltar à Página Inicial",
    title: "Sobre Nós",
    introHeading: "Ajudando Pessoas, Apoiando Comunidades",
    intro: "Somos uma pequena equipa com uma missão simples: tornar mais fácil realizar tarefas do dia a dia enquanto apoiamos Ajudantes locais e a comunidade. Tudo o que criamos é projetado para ser humano, simples e genuinamente útil.",
    teeTitle: "Conheça o TEE",
    teeText: "Conheça o TEE, verá ele pelo site, a nossa mascote gorila. Inspirado na força, fiabilidade e foco calmo dos gorilas reais, o TEE atua como um guia amigável para tornar a sua experiência mais acolhedora e menos stressante. Sem ruído, sem pressão, apenas apoio constante, refletindo como queremos que o Taskorilla se sinta.",
    builtFromScratch: "O Taskorilla é único, pois foi construído de raiz para servir tanto Taskers como Ajudantes melhor do que qualquer outra coisa por aí. Não é uma cópia de nenhum outro marketplace—cada funcionalidade, fluxo de trabalho e detalhe é único, projetado para tornar a procura, gestão e conclusão de tarefas simples, justa e eficaz.",
    belief: "Acreditamos que a tecnologia deve tornar a vida mais fácil, não mais complicada, e tudo o que criamos segue esse princípio. Com o Taskorilla, realizar tarefas e ajudar a sua comunidade simplesmente faz sentido."
  } : {
    backText: "← Back to Home",
    title: "About Us",
    introHeading: "Helping People, Supporting Communities",
    intro: "We're a small team with a simple mission: make getting everyday tasks done easier while supporting local Helpers and the community. Everything we create is designed to be human, simple, and genuinely useful.",
    teeTitle: "Meet TEE",
    teeText: "Meet TEE, you'll see him around the site, our gorilla mascot. Inspired by the strength, reliability, and calm focus of real gorillas, TEE acts as a friendly guide to make your experience warmer and less stressful. No noise, no pressure, just steady support, reflecting how we want Taskorilla to feel.",
    builtFromScratch: "Taskorilla is unique as it was built from the ground up to serve both Taskers and Helpers better than anything else out there. It's not a copy of any other marketplace—every feature, workflow, and detail is unique, designed to make finding, managing, and completing tasks simple, fair, and effective.",
    belief: "We believe technology should make life easier, not more complicated, and everything we create follows that principle. With Taskorilla, getting tasks done and helping your community just makes sense."
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary to-accent text-white py-8 sm:py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-3 sm:mb-4 md:mb-6 transition-colors text-xs sm:text-sm md:text-base"
          >
            {content.backText}
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6">{content.title}</h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4 opacity-95">{content.introHeading}</h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl opacity-90 leading-relaxed">
              {content.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Built From Scratch */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                {content.builtFromScratch}
              </p>
            </div>
          </div>

          {/* Belief Statement */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                {content.belief}
              </p>
            </div>
          </div>

          {/* TEE Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8">
            <div className="flex items-start gap-3 sm:gap-4 mb-6">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  {content.teeText}
                </p>
              </div>
            </div>
            {/* TEE image */}
            <div className="flex justify-center">
              <div className="w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-56 lg:h-56 relative">
                {/* Mobile image */}
                <Image
                  src="/images/gorilla-mascot-newer.png"
                  alt="TEE the gorilla mascot"
                  width={192}
                  height={192}
                  className="object-contain w-full h-full md:hidden"
                  priority
                />
                {/* Desktop image */}
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
          </div>
        </div>
      </section>
    </div>
  );
}
