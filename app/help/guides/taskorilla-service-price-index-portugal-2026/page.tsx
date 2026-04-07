import Link from 'next/link'

export const metadata = {
  title: 'Taskorilla Service Price Index | Portugal 2026',
  description:
    'Taskorilla Service Price Index (TSPI) for Portugal 2026 with regional adjustments, pricing overview, references, and disclaimer.',
}

const regionalAdjustments = [
  ['Premium zones', 'Lisbon, Cascais, Sintra, Algarve', '+15% to +25%'],
  ['Urban standard', 'Porto, Braga, Coimbra, Aveiro', 'Baseline'],
  ['Rural / Interior', 'Alentejo, Douro Valley, Centro', '-10% to -15%'],
]

const pricingSections = [
  {
    title: '1. Handyman (Faz-tudo)',
    rows: [
      ['Small fixes (pictures, mirrors)', 'EUR 25-40'],
      ['TV wall mounting', 'EUR 30-50'],
      ['Shutter (Estores) repair', 'EUR 25-40'],
      ['Shelf installation', 'EUR 30-45'],
      ['Door / window handle repair', 'EUR 15-25'],
    ],
  },
  {
    title: '2. Cleaning and Housekeeping',
    rows: [
      ['2-bedroom deep clean', 'EUR 60-85'],
      ['End-of-tenancy clean', 'EUR 135-275'],
      ['Airbnb / AL changeover', 'EUR 50-80'],
      ['Window cleaning', 'EUR 20-35'],
    ],
  },
  {
    title: '3. Gardening and Outdoor Maintenance',
    rows: [
      ['Monthly garden maintenance', 'EUR 120+'],
      ['Lawn mowing and edging', 'EUR 12-18'],
      ['Hedge trimming and weeding', 'EUR 15-22'],
      ['Pool cleaning / chemical balance', 'EUR 20-35'],
      ['Irrigation repair', 'EUR 25-40'],
    ],
  },
  {
    title: '4. Furniture Assembly',
    rows: [
      ['Small items', 'EUR 15-25'],
      ['Medium items', 'EUR 35-55'],
      ['Large items', 'EUR 60-150+'],
    ],
  },
  {
    title: '5. General Repairs (Non-certified)',
    rows: [
      ['Emergency leak fix', 'EUR 75-125'],
      ['Light fixture / socket replacement', 'EUR 35-55'],
      ['Drain unblocking', 'EUR 45-70'],
      ['Electric water heater repair', 'EUR 65-110'],
    ],
  },
  {
    title: '6. Painting and Decorating',
    rows: [
      ['Room painting', 'EUR 150-300'],
      ['Furniture painting / upcycling', 'EUR 15-25'],
      ['Small plastering / crack repair', 'EUR 20-30'],
    ],
  },
  {
    title: '7. Delivery, Moving and Errands',
    rows: [
      ['Small van load moving', 'EUR 100+'],
      ['Grocery shopping / delivery', 'EUR 10-15'],
      ['IKEA / hardware store pickup', 'EUR 20-40 + mileage'],
      ['Call-out fee (Taxa de Deslocacao)', 'EUR 15-25'],
    ],
  },
]

export default function TspiPortugal2026Page() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link href="/help/guides" className="text-sm text-primary-600 hover:underline">
            Back to Guides
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-10">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">
            Ref: PT-2026-V2 | Issued: 2nd Quarter 2026
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Taskorilla Service Price Index
          </h1>
          <p className="text-slate-700 leading-7">
            This document outlines the 2026 Taskorilla Service Price Index (TSPI) for the Portuguese market.
            It is a non-binding benchmark to help users understand typical service pricing and compare quotes
            with greater confidence.
          </p>
          <p className="text-slate-700 leading-7 mt-4">
            The figures are based on aggregated Taskorilla platform activity, observed pricing trends across
            Portugal, and publicly available benchmarks from service marketplaces and industry sources. All
            prices are gross estimates; final pricing, including any applicable VAT (IVA), depends on the
            provider&apos;s tax status and service delivery method.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Scope</h2>
          <p className="text-slate-700 leading-7">
            This Index focuses on general assistance, domestic tasks, and minor repairs. It does not cover
            regulated or certified work requiring licensing, insurance, or specialized qualifications, such as
            structural engineering, certified electrical work, or medical services.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2026 Market Commentary</h2>
          <p className="text-slate-700 leading-7">
            The TSPI reflects a modest increase in typical rates for manual service categories compared to 2025,
            generally EUR 1.50-3.00 per hour. This change is influenced by rising baseline labour costs
            (including the 2026 minimum wage) and higher operational expenses in urban hubs like Lisbon and
            Braga.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Regional Pricing Adjustments</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm border border-slate-200 rounded-lg overflow-hidden">
              <colgroup>
                <col className="w-1/3" />
                <col className="w-1/3" />
                <col className="w-1/3" />
              </colgroup>
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-800">Region type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-800">Example locations</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-800">Typical adjustment</th>
                </tr>
              </thead>
              <tbody>
                {regionalAdjustments.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-800">{row[0]}</td>
                    <td className="px-4 py-3 text-slate-700">{row[1]}</td>
                    <td className="px-4 py-3 text-slate-700">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-slate-700 text-sm">
            Adjustments reflect demand, travel, local cost of living, and provider availability.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Pricing Overview</h2>
          <p className="text-slate-700 leading-7 mb-4">
            All prices below are typical observed ranges. Actual quotes may vary depending on scope, urgency,
            materials, access, and provider availability.
          </p>

          <div className="space-y-6">
            {pricingSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{section.title}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <colgroup>
                      <col className="w-[72%]" />
                      <col className="w-[28%]" />
                    </colgroup>
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-slate-800">Task</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-800">Typical price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={row[0]} className="border-t border-slate-200">
                          <td className="px-4 py-2 text-slate-700">{row[0]}</td>
                          <td className="px-4 py-2 text-slate-700">{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Practical Pricing Tips</h2>
          <ul className="list-disc pl-5 text-slate-700 space-y-2">
            <li>Clients: Compare at least 2-3 quotes and clarify what is included in scope.</li>
            <li>Helpers: Flat pricing for repeatable tasks improves trust and conversion.</li>
            <li>Premium zones: Book early to secure top helpers.</li>
            <li>AL / Airbnb tasks: Include cleaning, laundry, consumables, and access in the scope.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">References / Sources</h2>
          <p className="text-slate-700 leading-7">
            This Index draws on publicly available data and observed market trends:
          </p>
          <ul className="list-disc pl-5 text-slate-700 mt-3 space-y-2">
            <li>Platforms: Fixando, Zaask, Habitissimo, Manofix.</li>
            <li>Market snapshots: SuperExpress Algarve pricing, Expert-Zoom plumbing guides.</li>
            <li>National labor and social security references (STAD, IRS guidance).</li>
          </ul>
          <p className="text-slate-700 leading-7 mt-4">
            These sources help ensure the Index reflects typical market pricing, but rates vary by provider and
            location.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Disclaimer</h2>
          <p className="text-slate-700 leading-7">
            This guide is for informational purposes only. Taskorilla does not set or enforce pricing. All
            services are independently agreed between users and providers. Users and providers are responsible for
            their own tax, legal, and regulatory compliance.
          </p>
        </section>
      </div>
    </main>
  )
}
