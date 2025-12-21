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
      <section className="bg-gradient-to-br from-primary to-accent text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            {content.backText}
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{content.title}</h1>
          <p className="text-xl opacity-90 leading-relaxed">
            {content.intro}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* TEE Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8 relative overflow-visible">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-primary" />
              {content.teeTitle}
            </h2>
            <div className="relative pr-48 md:pr-60">
              <p className="text-lg text-gray-700 leading-relaxed">
                {content.teeText}
              </p>
            </div>
            <div className="absolute bottom-12 right-0 w-48 md:w-60 h-auto z-10">
              <Image
                src="/images/tee-corner.png"
                alt="TEE the gorilla mascot peeking around a corner"
                width={240}
                height={240}
                className="object-contain"
              />
            </div>
          </div>

          {/* Belief Statement */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {content.belief}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
