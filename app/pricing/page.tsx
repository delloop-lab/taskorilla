'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'

export default function PricingPage() {
  const { language } = useLanguage()
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({})

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
      startHelpingBtn: "Start Earning Today",
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
  const marketplaceData = [
    {
      platform: 'Taskorilla',
      clientModel: 'Free to post. Pay only when task is completed.',
      providerModel: 'Commission on completed task + small platform fee on completion.',
      monetisation: 'Success-based commission model',
      risk: 'Low',
      feesSummary: 'Free posting. Costs apply only after successful completion.',
      modelType: 'Commission',
      keyTakeaway: 'Pay linked to outcomes rather than lead access.',
    },
    {
      platform: 'Airtasker',
      clientModel: 'Free to post. Some booking or assignment fees may apply depending on region.',
      providerModel: 'Service fee on completed work (varies by category and reputation tier).',
      monetisation: 'Hybrid service fee model',
      risk: 'Medium',
      feesSummary: 'Potential booking/assignment fees and provider service fees.',
      modelType: 'Hybrid',
      keyTakeaway: 'Fee exposure varies by geography, category, and tier.',
    },
    {
      platform: 'TaskRabbit',
      clientModel: 'Booking price includes platform service fees.',
      providerModel: 'Platform fees applied to completed bookings (structure varies by region).',
      monetisation: 'Service fee + booking fee model',
      risk: 'Medium',
      feesSummary: 'Platform fees are embedded in booking flows.',
      modelType: 'Service fee',
      keyTakeaway: 'Users pay through booking-linked fee structures.',
    },
    {
      platform: 'Thumbtack',
      clientModel: 'Free to request quotes from professionals.',
      providerModel: 'Pay-per-lead model (cost per customer introduction).',
      monetisation: 'Lead generation model',
      risk: 'High',
      feesSummary: 'Providers pay for customer introductions.',
      modelType: 'Lead-based',
      keyTakeaway: 'Spend can occur before any confirmed work.',
    },
    {
      platform: 'Handy',
      clientModel: 'Clients pay upfront for booked services.',
      providerModel: 'Platform deducts commission from provider earnings.',
      monetisation: 'Commission on completed services',
      risk: 'Medium',
      feesSummary: 'Upfront client payment with provider commission deductions.',
      modelType: 'Commission',
      keyTakeaway: 'Revenue share is taken from completed service earnings.',
    },
    {
      platform: 'Fiverr',
      clientModel: 'Clients pay upfront when ordering services.',
      providerModel: 'Platform commission on completed earnings.',
      monetisation: 'Transaction commission model',
      risk: 'Medium',
      feesSummary: 'Upfront purchasing plus provider-side commission.',
      modelType: 'Commission',
      keyTakeaway: 'Transaction-based model centered on completed orders.',
    },
    {
      platform: 'Zaask',
      clientModel: 'Free to request quotes from professionals.',
      providerModel: 'Pay-per-lead or credit-based system depending on usage.',
      monetisation: 'Lead / credit-based model',
      risk: 'High',
      feesSummary: 'Providers may spend via lead or credit packages.',
      modelType: 'Lead-based',
      keyTakeaway: 'Cost is tied to visibility/access, not guaranteed jobs.',
    },
    {
      platform: 'StarOfService',
      clientModel: 'Free to browse and request services.',
      providerModel: 'Providers pay for leads or visibility credits.',
      monetisation: 'Lead + visibility model',
      risk: 'High',
      feesSummary: 'Monetisation relies on paid leads and visibility.',
      modelType: 'Lead-based',
      keyTakeaway: 'Exposure spend can happen without confirmed conversion.',
    },
    {
      platform: 'OLX',
      clientModel: 'Free classifieds posting.',
      providerModel: 'No platform commission (optional paid visibility tools).',
      monetisation: 'Advertising / listing model',
      risk: 'High',
      feesSummary: 'Core listings are free; optional paid visibility upsells.',
      modelType: 'Listing',
      keyTakeaway: 'Low platform control over transaction outcomes.',
    },
    {
      platform: 'Facebook Marketplace',
      clientModel: 'Free to list and contact sellers.',
      providerModel: 'No platform commission on transactions.',
      monetisation: 'Indirect advertising ecosystem',
      risk: 'High',
      feesSummary: 'No direct transaction fee model for marketplace exchanges.',
      modelType: 'Advertising',
      keyTakeaway: 'Transactions run outside platform protections.',
    },
  ]
  return (
    <div className="min-h-screen bg-[#F8F9FA] bg-[radial-gradient(#c9d2dc_0.8px,transparent_0.8px)] [background-size:16px_16px]">
      {/* Hero Section */}
      <section className="bg-[#F8F9FA] py-12 md:py-16 px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.10),transparent_40%)]" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {t.subtitle}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        {/* Marketplace Pricing Comparison */}
        <div id="comparison-table" className="mb-16 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            How marketplace pricing actually works
          </h2>
          <p className="mt-3 text-sm md:text-base text-gray-700">
            Most platforms in this space don&apos;t have fixed pricing. Instead, they use a mix of service fees, commissions,
            lead charges, or visibility models that vary by category, location, and demand.
          </p>
          <p className="mt-2 text-sm md:text-base text-gray-700">
            This comparison shows how each platform typically makes money, not exact pricing.
          </p>

          <p className="mt-5 text-sm text-gray-600">
            Fees in marketplace platforms are dynamic and can change by region, service type, and user tier. This table focuses
            on the underlying pricing model so you can understand who pays, when, and how risk is distributed.
          </p>

          <div className="mt-6 md:hidden space-y-4">
            {marketplaceData.map((row) => {
              const isOpen = Boolean(expandedPlatforms[row.platform])
              const riskClass =
                row.risk === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                row.risk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              const modelClass =
                row.modelType === 'Commission' ? 'bg-blue-100 text-blue-800' :
                row.modelType === 'Hybrid' || row.modelType === 'Service fee' ? 'bg-indigo-100 text-indigo-800' :
                row.modelType === 'Lead-based' ? 'bg-orange-100 text-orange-800' :
                'bg-slate-100 text-slate-800'

              return (
                <div key={`mobile-${row.platform}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">{row.platform}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${riskClass}`}>
                      {row.risk}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{row.feesSummary}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${modelClass}`}>
                      {row.modelType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{row.keyTakeaway}</p>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPlatforms((prev) => ({ ...prev, [row.platform]: !prev[row.platform] }))
                    }
                    className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    {isOpen ? 'Show less' : 'Show more'}
                  </button>

                  {isOpen && (
                    <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Client pricing model</p>
                        <p className="text-gray-800">{row.clientModel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Provider pricing model</p>
                        <p className="text-gray-800">{row.providerModel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Monetisation model</p>
                        <p className="text-gray-800">{row.monetisation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table id="comparison-table-table" className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Platform</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Client pricing model</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Provider pricing model</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Monetisation model</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Risk level</th>
                </tr>
              </thead>
              <tbody>
                {marketplaceData.map((row, index) => {
                  const riskClass =
                    row.risk === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                    row.risk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  return (
                    <tr key={row.platform} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-3 font-semibold text-gray-900">{row.platform}</td>
                      <td className="border border-gray-300 px-3 py-3 text-gray-800">{row.clientModel}</td>
                      <td className="border border-gray-300 px-3 py-3 text-gray-800">{row.providerModel}</td>
                      <td className="border border-gray-300 px-3 py-3 text-gray-800">{row.monetisation}</td>
                      <td className="border border-gray-300 px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${riskClass}`}>
                          {row.risk}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Important notes</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600">
              <li>Pricing varies significantly by country, category, and demand.</li>
              <li>Some platforms apply dynamic fees based on user activity, reputation, or service type.</li>
              <li>Lead-based platforms charge for access to customers, not guaranteed work.</li>
              <li>Commission-based platforms charge only when a transaction is completed.</li>
              <li>Classified platforms provide no payment protection or transaction control.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
            <h3 className="font-semibold text-gray-900 mb-2">How risk is defined</h3>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li><span className="font-medium text-gray-800">Low risk:</span> Payment only occurs after successful completion of work.</li>
              <li><span className="font-medium text-gray-800">Medium risk:</span> Fees apply at booking or completion, with some variability.</li>
              <li><span className="font-medium text-gray-800">High risk:</span> Payment is required for leads or exposure, with no guarantee of work.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 md:p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Disclaimer</h3>
            <p className="text-xs md:text-sm text-gray-500">
              This comparison is a simplified overview of marketplace pricing models based on publicly available platform structures.
            </p>
            <p className="mt-2 text-xs md:text-sm text-gray-500">
              Actual fees may vary by region, service category, user tier, promotions, and platform updates. This table is intended
              for informational purposes only and should not be treated as exact pricing data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
