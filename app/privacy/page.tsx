"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/i18n";

const sectionsEn = [
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

const sectionsPt = [
  {
    title: "Informação que Recolhemos",
    content:
      "Podemos recolher dados de conta, informação de perfil, mensagens, dados técnicos como endereço IP e tipo de dispositivo, e informação relacionada com pagamentos de parceiros de pagamento. O Taskorilla não armazena dados de cartões de pagamento.",
  },
  {
    title: "Como Usamos a Informação",
    content:
      "Usamos informação pessoal para operar a plataforma, conectar utilizadores, melhorar funcionalidades, comunicar consigo e proteger a plataforma. Não vendemos informação pessoal.",
  },
  {
    title: "Base Legal",
    content:
      "Processamos dados para fornecer o serviço, para interesses legítimos, com o seu consentimento e para cumprir obrigações legais.",
  },
  {
    title: "Partilha de Informação",
    content:
      "Podemos partilhar dados com fornecedores de alojamento, ferramentas de apoio ao cliente, processadores de pagamento e autoridades quando legalmente exigido. Não partilhamos informação para marketing de terceiros.",
  },
  {
    title: "Cookies",
    content:
      "Podemos usar cookies para login e funcionalidades essenciais. Desativar cookies pode limitar certas funcionalidades.",
  },
  {
    title: "Segurança de Dados",
    content:
      "Tomamos medidas razoáveis para proteger a informação, mas não podemos garantir segurança completa.",
  },
  {
    title: "Retenção",
    content:
      "Retemos dados apenas pelo tempo necessário para operar a plataforma ou conforme exigido por lei.",
  },
  {
    title: "Os Seus Direitos",
    content:
      "Pode ter direitos de aceder, corrigir, eliminar ou descarregar os seus dados. Contacte-nos para exercer estes direitos.",
  },
  {
    title: "Menores",
    content: "O Taskorilla não se destina a utilizadores com menos de 18 anos.",
  },
  {
    title: "Alterações",
    content:
      "Podemos atualizar esta política. O uso continuado da plataforma significa que aceita a política atualizada.",
  },
  {
    title: "Contacto",
    content:
      "Para questões ou para exercer os seus direitos, contacte-nos em tee@taskorilla.com.",
  },
];

export default function PrivacyPage() {
  const { language } = useLanguage();
  const sections = language === 'pt' ? sectionsPt : sectionsEn;
  
  const lastUpdated = language === 'pt' ? "17 de novembro de 2025" : "November 17, 2025";
  const backText = language === 'pt' ? "← Voltar à Página Inicial" : "← Back to Home";
  const titleText = language === 'pt' ? "Política de Privacidade" : "Privacy Policy";
  const lastUpdatedText = language === 'pt' ? "Última atualização" : "Last updated";
  const introText = language === 'pt' 
    ? "Esta política explica como o Taskorilla recolhe, usa e protege informação pessoal."
    : "This policy explains how Taskorilla collects, uses, and protects personal information.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <section className="bg-[#F8F9FA] px-4 py-8 sm:py-12 md:py-16 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_40%)]" />
          <div className="max-w-4xl mx-auto relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 md:mb-6 transition-colors text-xs sm:text-sm md:text-base"
            >
              {backText}
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3 sm:mb-4">{titleText}</h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4">{lastUpdatedText}: {lastUpdated}</p>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed">
              {introText}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
      </main>

      <Footer />
    </div>
  );
}


