"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { Users, Heart, Lightbulb, Wrench } from "lucide-react";

export default function AboutPage() {
  const { language } = useLanguage();

  const content = language === 'pt' ? {
    backText: "← Voltar à Página Inicial",
    title: "Sobre Nós",
    intro: "Somos uma pequena equipa com um objetivo simples: ajudar as pessoas a realizar tarefas do dia a dia enquanto apoiamos ajudantes locais e a comunidade.",
    belief: "Acreditamos que a tecnologia deve tornar a vida mais fácil, não mais complicada — e estamos aqui para fazer exatamente isso.",
    missionTitle: "A Nossa Missão",
    mission1: "Tornar as tarefas do dia a dia simples e fiáveis",
    mission2: "Apoiar ajudantes locais e a comunidade",
    mission3: "Manter a tecnologia humana e fácil de usar",
    teamTitle: "Conheça a Equipa",
    teamText: "Apenas algumas pessoas que se preocupam em tornar a vida mais fácil para todos — sem fatos, sem jargão, apenas pessoas reais a construir um serviço que funciona."
  } : {
    backText: "← Back to Home",
    title: "About Us",
    intro: "We are a small team with a simple goal: help people get everyday tasks done while supporting local helpers and the community.",
    belief: "We believe technology should make life easier, not more complicated — and we are here to do just that.",
    missionTitle: "Our Mission",
    mission1: "Make everyday tasks simple and reliable",
    mission2: "Support local helpers and the community",
    mission3: "Keep technology human and easy to use",
    teamTitle: "Meet the Team",
    teamText: "Just a few people who care about making life smoother for everyone — no suits, no jargon, just real people building a service that works."
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
          {/* Belief Statement */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {content.belief}
              </p>
            </div>
          </div>

          {/* Mission Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Lightbulb className="w-7 h-7 text-primary" />
              {content.missionTitle}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <p className="text-gray-700 font-medium">{content.mission1}</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <p className="text-gray-700 font-medium">{content.mission2}</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <p className="text-gray-700 font-medium">{content.mission3}</p>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Users className="w-7 h-7 text-primary" />
              {content.teamTitle}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {content.teamText}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
