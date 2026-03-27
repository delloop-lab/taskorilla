"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
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
    teeText: "Vai ver o TEE, a nossa mascote gorila, por todo o site. Escolhemos um gorila porque acreditamos que a fiabilidade deve assentar na força e no foco calmo, em vez da energia frenética e nervosa de um coelho assustado.\nO TEE atua como um guia amigável para tornar a sua experiência mais acolhedora e menos stressante. Sem correria, sem pressão, apenas apoio constante, refletindo exatamente como queremos que o Taskorilla se sinta para si.",
    builtFromScratch: "O Taskorilla é único. Não copiámos outro marketplace; construímos isto de raiz para servir Taskers e Ajudantes melhor do que qualquer outra opção. Cada funcionalidade, desde o nosso sistema de propostas justo até aos alertas móveis que o mantêm em contacto mesmo quando está em movimento, foi pensada para tornar a procura, gestão e conclusão de tarefas simples e eficaz.",
    belief: "Acreditamos que a tecnologia deve tornar a vida mais fácil, não mais complicada, e tudo o que criamos segue esse princípio. Com o Taskorilla, realizar tarefas e ajudar a sua comunidade simplesmente faz sentido."
  } : {
    backText: "← Back to Home",
    title: "About Us",
    introHeading: "Helping People, Supporting Communities",
    intro: "We're a small team with a simple mission: make getting everyday tasks done easier while supporting local Helpers and the community. Everything we create is designed to be human, simple, and genuinely useful.",
    teeTitle: "Meet TEE",
    teeText: "You’ll see TEE, our gorilla mascot, around the site. We chose a gorilla because we believe reliability should be rooted in strength and calm focus, rather than the frantic, twitchy energy of a nervous bunny.\nTEE acts as a friendly guide to make your experience warmer and less stressful. No scurrying, no pressure, just steady support, reflecting exactly how we want Taskorilla to feel for you.",
    builtFromScratch: "Taskorilla is unique. We didn't just copy another marketplace; we built this from the ground up to serve Taskers and Helpers better than anything else out there. Every feature, from our fair bidding system to our mobile alerts that keep you in touch even when you’re on the move, is designed to make finding, managing, and completing tasks simple and effective.",
    belief: "We believe technology should make life easier, not more complicated, and everything we create follows that principle. With Taskorilla, getting tasks done and helping your community just makes sense."
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <main className="py-8 md:py-12 px-4 flex-1">
        <div className="container mx-auto max-w-4xl">
          {/* Built From Scratch */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                {language === 'pt' ? (
                  <>
                    O Taskorilla é único. Não copiámos outro marketplace; construímos isto{' '}
                    <Link href="/pricing#comparison-table" className="text-primary-700 hover:text-primary-800 underline">
                      de raiz
                    </Link>{' '}
                    para servir Taskers e Ajudantes melhor do que qualquer outra opção. Cada funcionalidade, desde o nosso sistema de propostas justo até aos alertas móveis que o mantêm em contacto mesmo quando está em movimento, foi pensada para tornar a procura, gestão e conclusão de tarefas simples e eficaz.
                  </>
                ) : (
                  <>
                    Taskorilla is unique. We didn't just copy another marketplace; we built this{' '}
                    <Link href="/pricing#comparison-table" className="text-primary-700 hover:text-primary-800 underline">
                      from the ground up
                    </Link>{' '}
                    to serve Taskers and Helpers better than anything else out there. Every feature, from our fair bidding system to our mobile alerts that keep you in touch even when you’re on the move, is designed to make finding, managing, and completing tasks simple and effective.
                  </>
                )}
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
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 items-start md:items-center">
              <div className="flex items-start gap-3 sm:gap-4 flex-1">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                    {content.teeText}
                  </p>
                </div>
              </div>
              {/* TEE on the right */}
              <div className="w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-56 lg:h-56 flex-shrink-0 mx-auto md:mx-0 order-first md:order-last relative">
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

          <div className="relative mb-6 md:mb-8">
            {/* TEE Fun Facts Profile Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm p-4 sm:p-6 md:p-8 w-full">
              <h3 className="text-xl sm:text-2xl font-bold text-amber-900 mb-4">Fun Facts About TEE</h3>
              <div className="space-y-3 text-sm sm:text-base text-gray-800">
                <p>
                  <span className="font-semibold text-amber-900">Favorite Snack:</span>{' '}
                  Local Honey crisp apples (he’s a big fan of supporting our neighborhood orchards).
                </p>
                <p>
                  <span className="font-semibold text-amber-900">Hidden Talent:</span>{' '}
                  He can assemble a flat-pack bookshelf in record time without ever looking at the instructions, and he never has "leftover" screws.
                </p>
                <p>
                  <span className="font-semibold text-amber-900">Pet Peeve:</span>{' '}
                  High-pitched, frantic twitching bunnies. He prefers the sound of a job well done.
                </p>
                <p>
                  <span className="font-semibold text-amber-900">Workout Routine:</span>{' '}
                  Carrying all the groceries in just one trip.
                </p>
                <p>
                  <span className="font-semibold text-amber-900">Community Spirit:</span>{' '}
                  TEE has a "silent policy", he’s a man of few words, but he’s always the first to show up when a neighbor needs a heavy lift.
                </p>
                <p>
                  <span className="font-semibold text-amber-900">Current Goal:</span>{' '}
                  Making sure every Helper in the community feels as strong and steady as a silverback.
                </p>
              </div>
            </div>

            <Image
              src="/images/bunny.png"
              alt="Decorative bunny"
              width={280}
              height={280}
              className="hidden lg:block absolute right-3 bottom-3 w-14 h-14 md:w-20 md:h-20 object-contain opacity-25 pointer-events-none"
            />
            <div className="lg:hidden mt-2 flex justify-end">
              <Image
                src="/images/bunny.png"
                alt="Decorative bunny"
                width={280}
                height={280}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain opacity-25"
              />
            </div>
          </div>

          <div className="flex justify-center -mt-12 md:-mt-16 mb-6 md:mb-8">
            <Image
              src="/images/tee_id.png"
              alt="TEE ID"
              width={240}
              height={240}
              className="w-96 h-96 sm:w-[30rem] sm:h-[30rem] md:w-[36rem] md:h-[36rem] object-contain"
            />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
