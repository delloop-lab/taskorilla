"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

const sectionsEn = [
  {
    title: "About Taskorilla",
    content:
      "Taskorilla lets people post tasks and connect with Taskers who may want to complete them. We do not employ Taskers, supervise any work, or guarantee outcomes.",
  },
  {
    title: "Eligibility",
    content: "You must be at least 18 years old to use Taskorilla.",
  },
  {
    title: "Your Account",
    content:
      "You are responsible for keeping your account secure. Any activity that happens through your account is your responsibility.",
  },
  {
    title: "Your Use of the Platform",
    content:
      "You agree not to break any laws, mislead users, take communication off-platform, post harmful or offensive content, or interfere with Taskorilla's operation.",
  },
  {
    title: "Task Agreements",
    content:
      "All agreements are strictly between Posters and Taskers. Taskorilla is not part of any agreement and is not responsible for performance, payment, disputes, loss, damage, or safety issues.",
  },
  {
    title: "Payments",
    content:
      "Payments may be processed by third parties. Taskorilla does not store card details and is not responsible for payment errors or disputes unless caused by a confirmed platform malfunction.",
  },
  {
    title: "Safety",
    content:
      "Users are solely responsible for their personal safety when meeting or performing task activities.",
  },
  {
    title: "Content",
    content:
      "You are responsible for anything you post. By posting, you give Taskorilla permission to display that content on the platform.",
  },
  {
    title: "Platform Changes",
    content: "We may change or remove features at any time.",
  },
  {
    title: "Limitation of Liability",
    content:
      "Taskorilla is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted service, accuracy, or suitability, and we are not liable for loss or damage connected to using the platform.",
  },
  {
    title: "Termination",
    content:
      "We may suspend or terminate accounts that violate these Terms.",
  },
  {
    title: "Governing Law",
    content:
      "These Terms are governed by the laws of Australia unless local law requires otherwise.",
  },
];

const sectionsPt = [
  {
    title: "Sobre o Taskorilla",
    content:
      "O Taskorilla permite que pessoas publiquem tarefas e se conectem com Ajudantes que possam querer completá-las. Não empregamos Ajudantes, não supervisionamos qualquer trabalho nem garantimos resultados.",
  },
  {
    title: "Elegibilidade",
    content: "Deve ter pelo menos 18 anos de idade para usar o Taskorilla.",
  },
  {
    title: "A Sua Conta",
    content:
      "É responsável por manter a sua conta segura. Qualquer atividade que aconteça através da sua conta é da sua responsabilidade.",
  },
  {
    title: "O Seu Uso da Plataforma",
    content:
      "Concorda em não violar quaisquer leis, enganar utilizadores, levar comunicações para fora da plataforma, publicar conteúdo prejudicial ou ofensivo, ou interferir com o funcionamento do Taskorilla.",
  },
  {
    title: "Acordos de Tarefas",
    content:
      "Todos os acordos são estritamente entre Requisitantes e Ajudantes. O Taskorilla não faz parte de qualquer acordo e não é responsável pelo desempenho, pagamento, disputas, perdas, danos ou questões de segurança.",
  },
  {
    title: "Pagamentos",
    content:
      "Os pagamentos podem ser processados por terceiros. O Taskorilla não armazena dados de cartões e não é responsável por erros de pagamento ou disputas, a menos que causados por uma avaria confirmada da plataforma.",
  },
  {
    title: "Segurança",
    content:
      "Os utilizadores são os únicos responsáveis pela sua segurança pessoal quando se encontram ou realizam atividades de tarefas.",
  },
  {
    title: "Conteúdo",
    content:
      "É responsável por tudo o que publica. Ao publicar, dá ao Taskorilla permissão para exibir esse conteúdo na plataforma.",
  },
  {
    title: "Alterações à Plataforma",
    content: "Podemos alterar ou remover funcionalidades a qualquer momento.",
  },
  {
    title: "Limitação de Responsabilidade",
    content:
      "O Taskorilla é fornecido numa base "tal como está" e "conforme disponível". Não garantimos serviço ininterrupto, precisão ou adequação, e não somos responsáveis por perdas ou danos relacionados com o uso da plataforma.",
  },
  {
    title: "Rescisão",
    content:
      "Podemos suspender ou encerrar contas que violem estes Termos.",
  },
  {
    title: "Lei Aplicável",
    content:
      "Estes Termos são regidos pelas leis da Austrália, a menos que a lei local exija o contrário.",
  },
];

export default function TermsPage() {
  const { language } = useLanguage();
  const sections = language === 'pt' ? sectionsPt : sectionsEn;
  
  const lastUpdated = language === 'pt' ? "17 de novembro de 2025" : "November 17, 2025";
  const backText = language === 'pt' ? "← Voltar à Página Inicial" : "← Back to Home";
  const titleText = language === 'pt' ? "Termos e Condições" : "Terms and Conditions";
  const lastUpdatedText = language === 'pt' ? "Última atualização" : "Last updated";
  const introText = language === 'pt' 
    ? "Bem-vindo ao Taskorilla. Ao usar a plataforma, concorda com estes Termos. Se não concordar, por favor pare de usar a plataforma."
    : "Welcome to Taskorilla. By using the platform you agree to these Terms. If you do not agree, please stop using the platform.";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
      >
        {backText}
      </Link>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        {titleText}
      </h1>
      <p className="text-gray-600 mb-8">{lastUpdatedText}: {lastUpdated}</p>

      <p className="text-gray-700 mb-8">
        {introText}
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
