'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n'
import Footer from '@/components/Footer'

export default function PricingPage() {
  const { language } = useLanguage()

  const content = {
    en: {
      title: "Taskorilla Pricing",
      subtitle: "No subscriptions, no hidden fees, you only pay when a task is completed. Everyone benefits or pays nothing.",
      taskPosters: "Task Posters",
      taskHelpers: "Task Helpers",
      noCostToPlace: "No cost to place tasks",
      onlyPaidCompleted: "Only paid on completed task",
      noCostToBid: "No cost to bid on tasks",
      commissionCompletion: "Commission on completion",
      postersHeadline: "Post tasks for free. Pay only if they get done.",
      postersDesc1: "Post as many tasks as you like, browse local helpers, chat, and agree on a price, all free.",
      postersDesc2: "If a task isn't taken, isn't completed, or you change your mind, <strong>you pay nothing</strong>.",
      postersDesc3: "When a task is completed, you pay the agreed task price <strong>plus a €2 platform fee</strong>.",
      examplesTitle: "Examples:",
      postersEx1: "Task budget €30 → completed → you pay €32",
      postersEx2: "Task budget €20 → not completed → you pay €0",
      postersEx3: "Five tasks posted, one completed → you pay only for that one",
      postTaskBtn: "Post a Task for Free",
      helpersHeadline: "Join for free. Earn when tasks are done.",
      helpersDesc1: "Signing up and bidding on tasks is <strong>always free</strong>. Add your skills, browse tasks, bid, and chat, no cost.",
      helpersDesc2: "When a task is completed and you're paid, Taskorilla takes a <strong>10% commission</strong> from the agreed task price.",
      helpersDesc3: "If your bid is not accepted, <strong>you pay nothing</strong>.",
      helpersEx1: "Task agreed €50 → completed → you get €45 (10% commission €5)",
      helpersEx2: "Task agreed €20 → cancelled → you get €0, commission €0",
      helpersEx3: "Multiple bids → commission only on completed tasks",
      startHelpingBtn: "Start Helping Today",
      compareTitle: "How Taskorilla Compares",
      compareSubtitle: "Some platforms keep you guessing on fees and leave you wishing for basic features. Taskorilla does the opposite: simple, clear pricing and all the tools you'd ever want, no compromises.",
      tableHeaders: {
        platform: "Platform",
        posterCost: "Task Poster Cost",
        helperCost: "Helper Cost / Fees",
        risk: "Risk for Posters / Helpers"
      },
      taskorilla: {
        posterCost: "€0 to post, €2 platform fee on completion",
        helperCost: "10% commission on completion",
        risk: "✅ No risk — only pay if task completed"
      },
      competitors: {
        airtasker: {
          posterCost: "Connection/assignment fee may apply when task booked",
          helperCost: "12.5%–20% service fee tiered by Tasker level",
          risk: "❌ Fees may vary per task"
        },
        taskrabbit: {
          posterCost: "Service fee + trust/support fee on every booked task",
          helperCost: "No direct commission; registration fee may apply in some regions",
          risk: "❌ Costs apply once a task is booked"
        },
        thumbtack: {
          posterCost: "No upfront fee; clients pay professionals directly",
          helperCost: "Professionals pay per lead, cost varies",
          risk: "❌ Costs depend on lead conversion"
        },
        handy: {
          posterCost: "Clients pay upfront for booked services",
          helperCost: "Commission deducted from earnings",
          risk: "❌ Fees deducted from earnings; clients pay upfront"
        },
        fiverr: {
          posterCost: "Clients pay for service upfront",
          helperCost: "10–20% commission on completed work",
          risk: "❌ Helpers pay commission; clients pay upfront"
        },
        zaask: {
          posterCost: "Free to request quotes",
          helperCost: "Providers may pay per quote; commission on completed tasks varies",
          risk: "❌ Some cost risk if quotes don't convert"
        },
        starofservice: {
          posterCost: "Free to post; client pays for selected services",
          helperCost: "Providers pay per accepted lead; commission may apply",
          risk: "❌ Costs depend on accepted leads/tasks"
        },
        olx: {
          posterCost: "Free to post in classifieds",
          helperCost: "No platform fees; risk if client doesn't pay outside the platform",
          risk: "❌ No guarantees for payment; full user risk"
        },
        facebook: {
          posterCost: "Free to post",
          helperCost: "No platform fees",
          risk: "❌ No protections; risk entirely on user"
        }
      },
      disclaimer: "<strong>Disclaimer:</strong> All comparisons are based on publicly available information as of January 2026. Taskorilla is not affiliated with or endorsed by any of the platforms mentioned. Fees and policies may change over time. E&OE"
    },
    pt: {
      title: "Preços do Taskorilla",
      subtitle: "Sem assinaturas, sem taxas ocultas, você só paga quando uma tarefa é concluída. Todos ganham ou não pagam nada.",
      taskPosters: "Anunciantes de Tarefas",
      taskHelpers: "Ajudantes de Tarefas",
      noCostToPlace: "Sem custo para publicar tarefas",
      onlyPaidCompleted: "Pago apenas em tarefa concluída",
      noCostToBid: "Sem custo para ofertar em tarefas",
      commissionCompletion: "Comissão na conclusão",
      postersHeadline: "Publique tarefas gratuitamente. Pague apenas se forem concluídas.",
      postersDesc1: "Publique quantas tarefas quiser, navegue por ajudantes locais, converse e concorde com um preço, tudo grátis.",
      postersDesc2: "Se uma tarefa não for aceita, não for concluída ou você mudar de ideia, <strong>você não paga nada</strong>.",
      postersDesc3: "Quando uma tarefa é concluída, você paga o preço acordado da tarefa <strong>mais uma taxa de plataforma de €2</strong>.",
      examplesTitle: "Exemplos:",
      postersEx1: "Orçamento da tarefa €30 → concluída → você paga €32",
      postersEx2: "Orçamento da tarefa €20 → não concluída → você paga €0",
      postersEx3: "Cinco tarefas publicadas, uma concluída → você paga apenas por essa",
      postTaskBtn: "Publique uma Tarefa Gratuitamente",
      helpersHeadline: "Junte-se gratuitamente. Ganhe quando as tarefas forem concluídas.",
      helpersDesc1: "Inscrever-se e ofertar em tarefas é <strong>sempre gratuito</strong>. Adicione suas habilidades, navegue pelas tarefas, faça ofertas e converse, sem custo.",
      helpersDesc2: "Quando uma tarefa é concluída e você é pago, o Taskorilla cobra uma <strong>comissão de 10%</strong> do preço acordado da tarefa.",
      helpersDesc3: "Se sua oferta não for aceita, <strong>você não paga nada</strong>.",
      helpersEx1: "Tarefa acordada €50 → concluída → você recebe €45 (comissão de 10% €5)",
      helpersEx2: "Tarefa acordada €20 → cancelada → você recebe €0, comissão €0",
      helpersEx3: "Várias ofertas → comissão apenas em tarefas concluídas",
      startHelpingBtn: "Comece a Ajudar Hoje",
      compareTitle: "Como o Taskorilla se Compara",
      compareSubtitle: "Algumas plataformas deixam-no a adivinhar taxas e desejando funcionalidades básicas. O Taskorilla faz o oposto: preços simples e claros e todas as ferramentas que poderia desejar, sem compromissos.",
      tableHeaders: {
        platform: "Plataforma",
        posterCost: "Custo do Anunciante",
        helperCost: "Custo / Taxas do Ajudante",
        risk: "Risco para Anunciantes / Ajudantes"
      },
      taskorilla: {
        posterCost: "€0 para publicar, taxa de plataforma de €2 na conclusão",
        helperCost: "Comissão de 10% na conclusão",
        risk: "✅ Sem risco — pague apenas se a tarefa for concluída"
      },
      competitors: {
        airtasker: {
          posterCost: "Taxa de conexão/atribuição pode ser aplicada quando a tarefa é reservada",
          helperCost: "Taxa de serviço de 12,5%–20% em camadas por nível de Tasker",
          risk: "❌ As taxas podem variar por tarefa"
        },
        taskrabbit: {
          posterCost: "Taxa de serviço + taxa de confiança/suporte em cada tarefa reservada",
          helperCost: "Sem comissão direta; taxa de registro pode ser aplicada em algumas regiões",
          risk: "❌ Os custos se aplicam assim que uma tarefa é reservada"
        },
        thumbtack: {
          posterCost: "Sem taxa antecipada; clientes pagam profissionais diretamente",
          helperCost: "Profissionais pagam por lead, custo varia",
          risk: "❌ Os custos dependem da conversão de leads"
        },
        handy: {
          posterCost: "Clientes pagam antecipadamente por serviços reservados",
          helperCost: "Comissão deduzida dos ganhos",
          risk: "❌ Taxas deduzidas dos ganhos; clientes pagam antecipadamente"
        },
        fiverr: {
          posterCost: "Clientes pagam pelo serviço antecipadamente",
          helperCost: "Comissão de 10–20% no trabalho concluído",
          risk: "❌ Ajudantes pagam comissão; clientes pagam antecipadamente"
        },
        zaask: {
          posterCost: "Grátis para solicitar orçamentos",
          helperCost: "Prestadores podem pagar por orçamento; comissão em tarefas concluídas varia",
          risk: "❌ Algum risco de custo se os orçamentos não converterem"
        },
        starofservice: {
          posterCost: "Grátis para publicar; cliente paga por serviços selecionados",
          helperCost: "Prestadores pagam por lead aceito; comissão pode ser aplicada",
          risk: "❌ Os custos dependem de leads/tarefas aceitos"
        },
        olx: {
          posterCost: "Grátis para publicar em classificados",
          helperCost: "Sem taxas de plataforma; risco se o cliente não pagar fora da plataforma",
          risk: "❌ Sem garantias de pagamento; risco total do usuário"
        },
        facebook: {
          posterCost: "Grátis para publicar",
          helperCost: "Sem taxas de plataforma",
          risk: "❌ Sem proteções; risco inteiramente do usuário"
        }
      },
      disclaimer: "<strong>Aviso:</strong> Todas as comparações são baseadas em informações publicamente disponíveis em janeiro de 2026. O Taskorilla não é afiliado ou endossado por nenhuma das plataformas mencionadas. Taxas e políticas podem mudar ao longo do tempo. E&OE"
    }
  }

  const t = content[language as keyof typeof content]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Task Posters and Helpers Sections - Side by Side on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Task Posters Section */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">{t.taskPosters}</h2>
            
            {/* Task Posters Badges */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="bg-blue-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-blue-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€0</div>
                <div className="text-gray-700 text-sm">{t.noCostToPlace}</div>
              </div>

              <div className="bg-blue-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-blue-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€2</div>
                <div className="text-gray-700 text-sm">{t.onlyPaidCompleted}</div>
              </div>
            </div>
            
            <p className="text-lg font-semibold text-gray-800 mb-4">
              {t.postersHeadline}
            </p>
            <p className="text-gray-700 mb-4">
              {t.postersDesc1}
            </p>
            <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t.postersDesc2 }} />
            <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t.postersDesc3 }} />
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-800 mb-2">{t.examplesTitle}</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ {t.postersEx1}</li>
                <li>✓ {t.postersEx2}</li>
                <li>✓ {t.postersEx3}</li>
              </ul>
            </div>
            <div className="text-center mb-6">
              <div className="inline-block animate-float">
                <Image
                  src="/images/tee_on_laptop.png"
                  alt="Taskorilla mascot posting a task"
                  width={250}
                  height={250}
                  className="w-auto h-44 object-contain"
                />
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/tasks/new"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-bold hover:bg-blue-700 transition-all duration-200 hover:-translate-y-1"
              >
                {t.postTaskBtn}
              </Link>
            </div>
          </div>

          {/* Helpers Section */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">{t.taskHelpers}</h2>
            
            {/* Helpers Badges */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="bg-green-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-green-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€0</div>
                <div className="text-gray-700 text-sm">{t.noCostToBid}</div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-green-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">10%</div>
                <div className="text-gray-700 text-sm">{t.commissionCompletion}</div>
              </div>
            </div>
            
            <p className="text-lg font-semibold text-gray-800 mb-4">
              {t.helpersHeadline}
            </p>
            <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t.helpersDesc1 }} />
            <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t.helpersDesc2 }} />
            <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t.helpersDesc3 }} />
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-800 mb-2">{t.examplesTitle}</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ {t.helpersEx1}</li>
                <li>✓ {t.helpersEx2}</li>
                <li>✓ {t.helpersEx3}</li>
              </ul>
            </div>
            <div className="text-center mb-6">
              <div className="inline-block animate-float">
                <Image
                  src="/images/gorilla-mascot-newer.png"
                  alt="Taskorilla mascot helping"
                  width={250}
                  height={250}
                  className="w-auto h-44 object-contain"
                />
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/register"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg text-base font-bold hover:bg-green-700 transition-all duration-200 hover:-translate-y-1"
              >
                {t.startHelpingBtn}
              </Link>
            </div>
          </div>
        </div>

        {/* Taskorilla vs Competitors Table */}
        <div id="comparison-table" className="mb-16">
          <details className="bg-white rounded-xl shadow-md p-6">
            <summary className="text-2xl md:text-3xl font-bold text-gray-900 cursor-pointer">
              <strong>How Taskorilla Compares</strong>
            </summary>

            <div className="mt-6 space-y-4 text-gray-700">
              <p>Roles on Taskorilla:</p>
              <p><strong>Tasker</strong> - the person posting a task because they need something done.</p>
              <p><strong>Helper</strong> - the person doing the task and completing the work.</p>
              <p>
                Other platforms leave you guessing on fees or hoping your task gets done right. Taskorilla does things differently:
                simple, clear pricing, all the tools you need, and a double handshake system - tasks are only confirmed when both
                Tasker and Helper agree, and payment is released once the task is completed. No surprises, no risk.
              </p>
              <p className="font-semibold text-gray-900">Comparison Table</p>
            </div>

            <div className="overflow-x-auto mt-4 rounded-lg border border-gray-200">
              <table id="comparison-table-table" className="min-w-[860px] w-full border-collapse bg-white shadow-lg comparison-table text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Platform</th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Tasker Cost</th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Helper Cost / Fees</th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Risk for Tasker / Helper</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-green-100 border-l-4 border-l-green-600 hover:bg-green-200 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Taskorilla</td>
                    <td className="border border-gray-300 px-3 py-3">EUR0 to post, EUR2 platform fee on completion</td>
                    <td className="border border-gray-300 px-3 py-3">10% commission on completion</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-green-700">✅ Tasker risk: None / Helper risk: None - work only starts after both sides confirm; payment released after completion (double handshake system)</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Airtasker</td>
                    <td className="border border-gray-300 px-3 py-3">Usually free to post; may have connection/assignment fee</td>
                    <td className="border border-gray-300 px-3 py-3">12.5%-20% service fee, tiered by Tasker (Helper) level</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Low / Helper risk: Medium - Helper pays service fees even if task is not completed; Tasker has no full protection. Tasker level = Helper&apos;s experience tier affecting fees and visibility</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">TaskRabbit</td>
                    <td className="border border-gray-300 px-3 py-3">Service fee + trust/support fee on every booked task</td>
                    <td className="border border-gray-300 px-3 py-3">No direct commission; registration fee may apply</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Low - fees apply once booked; risk if task is not completed satisfactorily</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Thumbtack</td>
                    <td className="border border-gray-300 px-3 py-3">Tasker pays directly for service</td>
                    <td className="border border-gray-300 px-3 py-3">Helper pays per lead or %</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Medium - Helper pays per lead; Tasker risk if work incomplete</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Handy</td>
                    <td className="border border-gray-300 px-3 py-3">Tasker pays upfront</td>
                    <td className="border border-gray-300 px-3 py-3">Commission deducted from earnings</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Medium - Tasker pays before work; Helper pays commission regardless of outcome</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Fiverr</td>
                    <td className="border border-gray-300 px-3 py-3">Tasker pays upfront</td>
                    <td className="border border-gray-300 px-3 py-3">10-20% commission on completed work</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Medium - Tasker pays upfront; Helper risk if work unsatisfactory</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Zaask</td>
                    <td className="border border-gray-300 px-3 py-3">Free to request quotes</td>
                    <td className="border border-gray-300 px-3 py-3">Helper may pay per quote; commission varies</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Medium - Helper may pay for unconverted quotes; Tasker risk if work incomplete</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Star of Service</td>
                    <td className="border border-gray-300 px-3 py-3">Free to post; Tasker pays for selected services</td>
                    <td className="border border-gray-300 px-3 py-3">Helper pays per accepted lead; commission may apply</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-orange-600">❌ Tasker risk: Medium / Helper risk: Medium - costs depend on accepted leads/tasks; no full guarantees</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">OLX</td>
                    <td className="border border-gray-300 px-3 py-3">Free to post in classifieds</td>
                    <td className="border border-gray-300 px-3 py-3">No platform fees; risk if Tasker does not pay</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌❌ Tasker risk: High / Helper risk: High - no platform guarantees; full risk on both parties</td>
                  </tr>
                  <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                    <td className="border border-gray-300 px-3 py-3 font-bold">Facebook</td>
                    <td className="border border-gray-300 px-3 py-3">Free to post</td>
                    <td className="border border-gray-300 px-3 py-3">No platform fees</td>
                    <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌❌ Tasker risk: High / Helper risk: High - no protections; full risk on both parties</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4">
              <p className="font-semibold text-gray-900">Key Points:</p>
              <p className="text-gray-700">
                Taskorilla&apos;s double handshake system guarantees safety: both Tasker and Helper must confirm before work begins,
                and payment is only released once the task is completed.
              </p>
              <p className="text-gray-700">
                Fees and policies on other platforms vary and may expose Taskers or Helpers to risk.
              </p>
              <p className="text-gray-600 text-sm">
                <strong>Disclaimer:</strong> All comparisons are based on publicly available information as of January 2026. Taskorilla is not affiliated with or endorsed by any of the platforms mentioned. Fees and policies may change over time. E&amp;OE
              </p>
            </div>
          </details>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <Footer />
    </div>
  )
}
