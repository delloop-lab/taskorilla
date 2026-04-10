"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/i18n";

const sectionsEn = [
  {
    title: "About Taskorilla",
    content: `Taskorilla is a marketplace that connects people who post tasks ("Posters") with people who may choose to complete those tasks ("Helpers").

Taskorilla provides the platform only. We do not employ users, supervise work, or act as a party to any agreement between users.`,
  },
  {
    title: "Eligibility",
    content: `You must be at least 18 years old to use Taskorilla.

By using the platform, you confirm you meet this requirement.`,
  },
  {
    title: "Account Responsibility",
    content: `You are responsible for maintaining the security of your account and for all activity that occurs under it.

You must ensure your account information is accurate and kept up to date.`,
  },
  {
    title: "Platform Use",
    content: `You agree to use Taskorilla lawfully and responsibly.

You must not:

• Break any applicable laws or regulations
• Mislead, impersonate, or defraud other users
• Post illegal, harmful, or offensive content
• Attempt to bypass fees or platform systems
• Move communications or payments off-platform where prohibited
• Interfere with the operation or security of the platform

We may investigate suspected misuse of the platform.`,
  },
  {
    title: "Task Agreements",
    content: `All agreements are formed directly between Posters and Helpers.

Taskorilla is not a party to any agreement between users and is not responsible for:

• task completion or quality of work
• payment disputes or failures
• loss, damage, injury, or safety outcomes
• communication or conduct between users

Users are solely responsible for assessing and agreeing to any task.`,
  },
  {
    title: "Fees and Charges",
    content: `Posting tasks and placing bids is free.

A platform fee of €2 applies to Helpers only when a task is marked as completed in accordance with platform rules.

A 10% commission applies to Helpers only when a task is completed and payment has been successfully received.

Fees may change from time to time. Updated fees will apply only after users are notified or accept updated Terms.`,
  },
  {
    title: "Payments",
    content: `Payments may be processed by third-party payment providers.

Taskorilla does not store payment card details and is not responsible for payment processing errors, delays, chargebacks, or disputes handled by payment providers.

All payment issues between users must be resolved directly between those users or through the payment provider.`,
  },
  {
    title: "Platform Communication",
    content: `Taskorilla provides communication tools including messaging.

Users are responsible for all communications and interactions conducted through the platform.

We may monitor, review, and retain communications where necessary to:

• enforce these Terms
• investigate suspected fraud, abuse, or misconduct
• respond to user reports
• comply with legal obligations`,
  },
  {
    title: "Disputes Between Users",
    content: `Taskorilla does not mediate, arbitrate, or resolve disputes between users.

All agreements are strictly between Posters and Helpers. Users are solely responsible for resolving any disputes directly with each other.

We do not determine which party is correct in any dispute.

However, we may take action where necessary to enforce these Terms or protect the platform, including investigating fraud, abuse, or violations of platform rules.`,
  },
  {
    title: "Safety",
    content: `Users are solely responsible for their own safety when interacting with others, including meeting in person or performing tasks.

Taskorilla does not conduct background checks and does not guarantee the behaviour, reliability, or safety of any user.`,
  },
  {
    title: "Content",
    content: `Users are responsible for all content they post.

By posting content, you grant Taskorilla a non-exclusive right to display and use that content within the platform for operational purposes.`,
  },
  {
    title: "Enforcement and Termination",
    content: `We may investigate activity on the platform and take action where necessary.

This may include:

• warnings
• removal of content
• restriction of features
• suspension or termination of accounts

We may act where we reasonably believe there is a breach of these Terms, fraud, abuse, or risk to users or the platform.`,
  },
  {
    title: "Platform Changes",
    content: `We may modify, suspend, or discontinue any part of the platform at any time without liability.`,
  },
  {
    title: "Limitation of Liability",
    content: `To the maximum extent permitted by law, Taskorilla is provided on an "as is" and "as available" basis.

We do not guarantee uninterrupted operation, accuracy, or suitability of the platform.

Taskorilla is not liable for any indirect, incidental, consequential, or punitive damages, or for any loss of data, profits, or business arising from use of the platform.`,
  },
  {
    title: "No Agency or Employment Relationship",
    content: `No agency, partnership, joint venture, or employment relationship exists between Taskorilla and any user.`,
  },
  {
    title: "Governing Law",
    content: `These Terms are governed by the laws of the jurisdiction in which Taskorilla operates, unless mandatory local consumer protection laws require otherwise.`,
  },
  {
    title: "Contact",
    content: `For questions about these Terms, contact:
tee@taskorilla.com`,
  },
];

const sectionsPt = [
  {
    title: "Sobre o Taskorilla",
    content: `O Taskorilla é um mercado que liga pessoas que publicam tarefas («Requisitantes») a pessoas que podem optar por completar essas tarefas («Ajudantes»).

O Taskorilla fornece apenas a plataforma. Não empregamos utilizadores, não supervisionamos o trabalho nem somos parte de qualquer acordo entre utilizadores.`,
  },
  {
    title: "Elegibilidade",
    content: `Deve ter pelo menos 18 anos para usar o Taskorilla.

Ao usar a plataforma, confirma que cumpre este requisito.`,
  },
  {
    title: "Responsabilidade da Conta",
    content: `É responsável por manter a segurança da sua conta e por toda a atividade que ocorra na mesma.

Deve garantir que a informação da conta é exata e mantida atualizada.`,
  },
  {
    title: "Utilização da Plataforma",
    content: `Concorda em usar o Taskorilla de forma lícita e responsável.

Não deve:

• Violar leis ou regulamentos aplicáveis
• Induzir em erro, impersonar ou defraudar outros utilizadores
• Publicar conteúdo ilegal, prejudicial ou ofensivo
• Tentar contornar taxas ou sistemas da plataforma
• Deslocar comunicações ou pagamentos para fora da plataforma quando proibido
• Interferir com o funcionamento ou a segurança da plataforma

Podemos investigar suspeitas de uso indevido da plataforma.`,
  },
  {
    title: "Acordos sobre Tarefas",
    content: `Todos os acordos são celebrados diretamente entre Requisitantes e Ajudantes.

O Taskorilla não é parte de qualquer acordo entre utilizadores e não é responsável por:

• conclusão da tarefa ou qualidade do trabalho
• litígios ou falhas de pagamento
• perdas, danos, lesões ou resultados de segurança
• comunicação ou conduta entre utilizadores

Os utilizadores são os únicos responsáveis por avaliar e acordar qualquer tarefa.`,
  },
  {
    title: "Taxas e Encargos",
    content: `Publicar tarefas e apresentar propostas é gratuito.

Uma taxa de plataforma de €2 aplica-se apenas aos Ajudantes quando uma tarefa é marcada como concluída de acordo com as regras da plataforma.

Uma comissão de 10% aplica-se apenas aos Ajudantes quando uma tarefa é concluída e o pagamento foi recebido com sucesso.

As taxas podem alterar periodicamente. As taxas atualizadas aplicam-se apenas após notificação aos utilizadores ou aceitação dos Termos atualizados.`,
  },
  {
    title: "Pagamentos",
    content: `Os pagamentos podem ser processados por prestadores de pagamento terceiros.

O Taskorilla não armazena dados de cartão de pagamento e não é responsável por erros de processamento, atrasos, estornos ou litígios tratados pelos prestadores de pagamento.

Todas as questões de pagamento entre utilizadores devem ser resolvidas diretamente entre esses utilizadores ou através do prestador de pagamento.`,
  },
  {
    title: "Comunicação na Plataforma",
    content: `O Taskorilla disponibiliza ferramentas de comunicação, incluindo mensagens.

Os utilizadores são responsáveis por todas as comunicações e interações realizadas através da plataforma.

Podemos monitorizar, rever e conservar comunicações quando necessário para:

• fazer cumprir estes Termos
• investigar suspeitas de fraude, abuso ou má conduta
• responder a denúncias de utilizadores
• cumprir obrigações legais`,
  },
  {
    title: "Litígios Entre Utilizadores",
    content: `O Taskorilla não media, não arbitra nem resolve litígios entre utilizadores.

Todos os acordos são estritamente entre Requisitantes e Ajudantes. Os utilizadores são os únicos responsáveis por resolver quaisquer litígios diretamente entre si.

Não determinamos qual das partes tem razão em qualquer litígio.

Contudo, podemos tomar medidas quando necessário para fazer cumprir estes Termos ou proteger a plataforma, incluindo investigar fraude, abuso ou violações das regras da plataforma.`,
  },
  {
    title: "Segurança",
    content: `Os utilizadores são os únicos responsáveis pela sua própria segurança ao interagir com outros, incluindo encontros presenciais ou execução de tarefas.

O Taskorilla não realiza verificações de antecedentes e não garante a conduta, fiabilidade ou segurança de qualquer utilizador.`,
  },
  {
    title: "Conteúdo",
    content: `Os utilizadores são responsáveis por todo o conteúdo que publicam.

Ao publicar conteúdo, concede ao Taskorilla um direito não exclusivo para exibir e usar esse conteúdo na plataforma para fins operacionais.`,
  },
  {
    title: "Execução e Rescisão",
    content: `Podemos investigar atividade na plataforma e tomar medidas quando necessário.

Isto pode incluir:

• avisos
• remoção de conteúdo
• restrição de funcionalidades
• suspensão ou encerramento de contas

Podemos agir quando razoavelmente acreditarmos que há violação destes Termos, fraude, abuso ou risco para utilizadores ou para a plataforma.`,
  },
  {
    title: "Alterações à Plataforma",
    content: `Podemos modificar, suspender ou descontinuar qualquer parte da plataforma a qualquer momento sem responsabilidade.`,
  },
  {
    title: "Limitação de Responsabilidade",
    content: `Na máxima extensão permitida por lei, o Taskorilla é fornecido «tal como está» e «conforme disponível».

Não garantimos funcionamento ininterrupto, exatidão ou adequação da plataforma.

O Taskorilla não é responsável por quaisquer danos indiretos, incidentais, consequenciais ou punitivos, nem por perda de dados, lucros ou negócio decorrente do uso da plataforma.`,
  },
  {
    title: "Sem Relação de Agência ou Emprego",
    content: `Não existe relação de agência, parceria, joint venture ou emprego entre o Taskorilla e qualquer utilizador.`,
  },
  {
    title: "Lei Aplicável",
    content: `Estes Termos são regidos pelas leis da jurisdição em que o Taskorilla opera, salvo se leis locais imperativas de proteção do consumidor exigirem o contrário.`,
  },
  {
    title: "Contacto",
    content: `Para questões sobre estes Termos, contacte:
tee@taskorilla.com`,
  },
];

export default function TermsPage() {
  const { language } = useLanguage();
  const sections = language === "pt" ? sectionsPt : sectionsEn;

  const lastUpdated = language === "pt" ? "10 de abril de 2026" : "April 10, 2026";
  const backText = language === "pt" ? "← Voltar à Página Inicial" : "← Back to Home";
  const titleText = language === "pt" ? "Termos de Serviço" : "Terms of Service";
  const lastUpdatedText = language === "pt" ? "Última atualização" : "Last updated";
  const introText =
    language === "pt"
      ? "Bem-vindo ao Taskorilla. Ao usar a plataforma, concorda com estes Termos. Se não concordar, deixe de usar a plataforma."
      : "Welcome to Taskorilla. By using the platform you agree to these Terms. If you do not agree, please stop using the platform.";

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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3 sm:mb-4">
              {titleText}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4">
              {lastUpdatedText}: {lastUpdated}
            </p>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed">{introText}</p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {sections.map(({ title, content }) => (
              <section key={title}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-700 whitespace-pre-line">{content}</p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
