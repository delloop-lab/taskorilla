"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/i18n";

const sectionsEn = [
  {
    title: "Information We Collect",
    content: `We collect information to operate, secure, and improve the Taskorilla platform.

This includes:

• Account details such as name, email, and profile information
• Messages and interactions between users on the platform
• Usage data including pages visited, actions taken, and activity within the platform
• Technical data such as IP address, device type, browser information, and operating system
• Payment-related information provided by third-party payment processors (we do not store card details)`,
  },
  {
    title: "How We Use Information",
    content: `We use this information to:

• Operate and maintain the platform
• Enable users to connect and communicate
• Process and manage transactions via payment partners
• Improve platform performance and user experience
• Detect, prevent, and investigate fraud, abuse, or security issues
• Enforce our Terms and protect users and platform integrity
• Comply with legal obligations

We do not sell personal data.`,
  },
  {
    title: "Legal Basis for Processing",
    content: `We process personal data under the following legal bases:

• Performance of a contract (providing the platform services)
• Legitimate interests (platform security, improvement, and fraud prevention)
• Consent (where required, such as optional features or cookies)
• Legal obligations (compliance with applicable laws and regulations)`,
  },
  {
    title: "Sharing of Information",
    content: `We may share personal data with:

• Hosting and infrastructure providers
• Payment processing partners
• Customer support and operational tools
• Legal or regulatory authorities when required by law

We do not share personal data for third-party marketing purposes.`,
  },
  {
    title: "Monitoring and Platform Safety",
    content: `Taskorilla operates a trust and safety system to protect users and maintain platform integrity.

This may include monitoring activity on the platform, including usage patterns, messages, and interactions between users.

Message content is not routinely accessed. However, we may review messages where:

• A user reports a concern
• There is suspected violation of our Terms
• Fraud, abuse, or illegal activity is suspected
• We are required to do so by law

We may take action where violations are identified, including warnings, restriction of features, suspension or termination of accounts, removal of content, and where necessary, cooperation with relevant authorities.`,
  },
  {
    title: "Cookies",
    content: `We use cookies and similar technologies for essential platform functionality such as authentication, session management, and security.

You can disable cookies in your browser, but some features may not function correctly.`,
  },
  {
    title: "Data Retention",
    content: `We retain personal data only for as long as necessary to:

• Provide the platform
• Comply with legal obligations
• Resolve disputes
• Enforce agreements

When data is no longer required, it is securely deleted or anonymised.`,
  },
  {
    title: "Data Security",
    content: `We use reasonable technical and organisational measures to protect personal data.

However, no system can be completely secure, and we cannot guarantee absolute security of information transmitted or stored.`,
  },
  {
    title: "Your Rights",
    content: `Depending on your location, you may have rights to:

• Access your personal data
• Correct inaccurate data
• Request deletion of your data
• Request a copy of your data
• Object to or restrict certain processing

To exercise these rights, contact us at: tee@taskorilla.com`,
  },
  {
    title: "Children",
    content: `Taskorilla is not intended for users under 18. We do not knowingly collect data from minors.`,
  },
  {
    title: "International Transfers",
    content: `Your data may be processed in countries outside your residence. Where this occurs, we take steps to ensure appropriate safeguards are in place.`,
  },
  {
    title: "Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. Continued use of the platform after changes means you accept the updated policy.`,
  },
  {
    title: "Contact",
    content: `For questions about this Privacy Policy or your data rights, contact:
tee@taskorilla.com`,
  },
];

const sectionsPt = [
  {
    title: "Informação que Recolhemos",
    content: `Recolhemos informação para operar, proteger e melhorar a plataforma Taskorilla.

Isto inclui:

• Dados de conta, como nome, email e informação de perfil
• Mensagens e interações entre utilizadores na plataforma
• Dados de utilização, incluindo páginas visitadas, ações realizadas e atividade na plataforma
• Dados técnicos, como endereço IP, tipo de dispositivo, informação do browser e sistema operativo
• Informação relacionada com pagamentos fornecida por processadores de pagamento terceiros (não armazenamos dados de cartão)`,
  },
  {
    title: "Como Usamos a Informação",
    content: `Utilizamos esta informação para:

• Operar e manter a plataforma
• Permitir que os utilizadores se conectem e comuniquem
• Processar e gerir transações através de parceiros de pagamento
• Melhorar o desempenho da plataforma e a experiência do utilizador
• Detetar, prevenir e investigar fraude, abusos ou questões de segurança
• Fazer cumprir os nossos Termos e proteger os utilizadores e a integridade da plataforma
• Cumprir obrigações legais

Não vendemos dados pessoais.`,
  },
  {
    title: "Base Legal para o Tratamento",
    content: `Tratamos dados pessoais com base nas seguintes fundamentações legais:

• Execução de contrato (prestação dos serviços da plataforma)
• Interesses legítimos (segurança da plataforma, melhoria e prevenção de fraude)
• Consentimento (quando exigido, como em funcionalidades opcionais ou cookies)
• Obrigações legais (conformidade com leis e regulamentos aplicáveis)`,
  },
  {
    title: "Partilha de Informação",
    content: `Podemos partilhar dados pessoais com:

• Fornecedores de alojamento e infraestruturas
• Parceiros de processamento de pagamentos
• Ferramentas de apoio ao cliente e operacionais
• Autoridades legais ou reguladoras quando exigido por lei

Não partilhamos dados pessoais para fins de marketing por terceiros.`,
  },
  {
    title: "Monitorização e Segurança da Plataforma",
    content: `O Taskorilla opera um sistema de confiança e segurança para proteger os utilizadores e manter a integridade da plataforma.

Isto pode incluir a monitorização da atividade na plataforma, incluindo padrões de utilização, mensagens e interações entre utilizadores.

O conteúdo das mensagens não é acedido rotineiramente. Contudo, podemos rever mensagens quando:

• Um utilizador reporta uma preocupação
• Existe suspeita de violação dos nossos Termos
• É suspeita fraude, abuso ou atividade ilegal
• Somos obrigados a fazê-lo por lei

Podemos tomar medidas quando forem identificadas violações, incluindo avisos, restrição de funcionalidades, suspensão ou encerramento de contas, remoção de conteúdo e, quando necessário, cooperação com as autoridades competentes.`,
  },
  {
    title: "Cookies",
    content: `Utilizamos cookies e tecnologias semelhantes para funcionalidades essenciais da plataforma, como autenticação, gestão de sessão e segurança.

Pode desativar cookies no seu browser, mas algumas funcionalidades podem deixar de funcionar corretamente.`,
  },
  {
    title: "Retenção de Dados",
    content: `Retemos dados pessoais apenas pelo tempo necessário para:

• Fornecer a plataforma
• Cumprir obrigações legais
• Resolver litígios
• Fazer cumprir acordos

Quando os dados deixam de ser necessários, são eliminados em segurança ou anonimizados.`,
  },
  {
    title: "Segurança de Dados",
    content: `Utilizamos medidas técnicas e organizativas razoáveis para proteger dados pessoais.

Contudo, nenhum sistema pode ser totalmente seguro e não podemos garantir segurança absoluta da informação transmitida ou armazenada.`,
  },
  {
    title: "Os Seus Direitos",
    content: `Consoante a sua localização, pode ter direitos a:

• Aceder aos seus dados pessoais
• Corrigir dados inexatos
• Solicitar a eliminação dos seus dados
• Solicitar uma cópia dos seus dados
• Opor-se a ou restringir determinados tratamentos

Para exercer estes direitos, contacte-nos em: tee@taskorilla.com`,
  },
  {
    title: "Menores",
    content: `O Taskorilla não se destina a utilizadores com menos de 18 anos. Não recolhemos conscientemente dados de menores.`,
  },
  {
    title: "Transferências Internacionais",
    content: `Os seus dados podem ser tratados em países fora da sua residência. Quando tal ocorre, adotamos medidas para garantir salvaguardas adequadas.`,
  },
  {
    title: "Alterações a Esta Política",
    content: `Podemos atualizar esta Política de Privacidade periodicamente. O uso continuado da plataforma após alterações significa que aceita a política atualizada.`,
  },
  {
    title: "Contacto",
    content: `Para questões sobre esta Política de Privacidade ou sobre os seus direitos de dados, contacte:
tee@taskorilla.com`,
  },
];

export default function PrivacyPage() {
  const { language } = useLanguage();
  const sections = language === "pt" ? sectionsPt : sectionsEn;

  const lastUpdated = language === "pt" ? "10 de abril de 2026" : "April 10, 2026";
  const backText = language === "pt" ? "← Voltar à Página Inicial" : "← Back to Home";
  const titleText = language === "pt" ? "Política de Privacidade" : "Privacy Policy";
  const lastUpdatedText = language === "pt" ? "Última atualização" : "Last updated";
  const introText =
    language === "pt"
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
