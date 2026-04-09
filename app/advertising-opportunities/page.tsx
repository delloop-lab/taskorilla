'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { MapPin, Users, Target, Link2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export default function AdvertisingOpportunitiesPage() {
  const { language } = useLanguage()
  const isPt = language === 'pt'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-4"
          >
            <span className="mr-1">←</span> {isPt ? 'Voltar ao Início' : 'Back to Home'}
          </Link>

          {/* Hero */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {isPt ? 'Publicidade' : 'Advertising'}
            <span className="block text-primary-600 text-2xl sm:text-3xl mt-1">
              {isPt ? 'Coloque o seu negócio no mapa da Taskorilla.' : 'Put your business on the Taskorilla map.'}
            </span>
          </h1>

          <div className="space-y-3 text-gray-700 leading-relaxed max-w-3xl">
            <p>
              {isPt
                ? 'Quer que o seu negócio seja visto por pessoas locais que estão ativamente ligadas a oportunidades perto de si? A vista de mapa da Taskorilla coloca a sua marca exatamente onde as pessoas interagem com a comunidade.'
                : 'Want your business to be seen by locals who are actively connecting with opportunities nearby? Taskorilla’s map view puts your brand exactly where people are engaging with their community.'}
            </p>
            <p>
              {isPt
                ? 'Os nossos Ajudantes usam o mapa para descobrir tarefas e experiências à sua volta, e agora o seu negócio pode fazer parte dessa rede dinâmica. Isto não é apenas visibilidade, é uma forma de envolver um público ativo, móvel e pronto para interagir.'
                : 'Our Helpers use the map to discover tasks and experiences around them and now your business can be part of that dynamic network. This isn’t just visibility, it’s a way to engage with an audience that’s active, mobile and ready to interact.'}
            </p>
          </div>

          {/* Who this is for */}
          <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              {isPt ? 'Ideal para' : 'Ideal for'}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                {isPt ? 'Cafés, lojas e serviços locais' : 'Cafés, shops & local services'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                {isPt ? 'Consultórios e estúdios profissionais' : 'Professional practices & studios'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                {isPt ? 'Marcas e franchisings com várias localizações' : 'Multi-location brands & franchises'}
              </span>
            </div>
          </div>

          {/* Main content: benefits + map preview */}
          <div className="mt-10 grid lg:grid-cols-2 gap-10 items-stretch">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">
                {isPt ? 'Por que anunciar connosco?' : 'Why advertise with us?'}
              </h2>
              <div className="mt-5 space-y-4 text-gray-700">
                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-primary-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{isPt ? 'Local e relevante' : 'Local and relevant'}</h3>
                    <p className="text-sm leading-relaxed">
                      {isPt
                        ? 'Apareça diretamente no mapa onde pessoas locais ativas e envolvidas estão a explorar oportunidades e a planear o próximo passo.'
                        : 'Appear directly on the map where active, engaged locals are exploring opportunities and planning their next move.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-amber-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{isPt ? 'Exposição direcionada' : 'Targeted exposure'}</h3>
                    <p className="text-sm leading-relaxed">
                      {isPt
                        ? 'Alcance as pessoas certas, no local certo e no momento certo, quando estão a explorar e a interagir localmente.'
                        : 'Reach people in the right place at the right time when they are exploring and engaging locally.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-emerald-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{isPt ? 'Visibilidade flexível' : 'Flexible visibility'}</h3>
                    <p className="text-sm leading-relaxed">
                      {isPt
                        ? 'Escolha como e onde as suas localizações aparecem para maximizar impacto, quer tenha uma loja ou vários pontos no mapa.'
                        : 'Choose how and where your locations appear to make the most impact, whether you have one store or multiple points on the map.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-blue-600">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{isPt ? 'Envolvimento direto' : 'Direct engagement'}</h3>
                    <p className="text-sm leading-relaxed">
                      {isPt
                        ? 'Os utilizadores podem clicar no seu marcador e ir diretamente para o seu website ou landing page, gerando tráfego e ligações reais.'
                        : 'Users can click on your marker and be taken straight to your website or landing page, driving real traffic and connections.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="h-full flex flex-col">
              <p className="text-gray-700 mb-3 text-sm font-medium">
                {isPt ? 'Pré-visualização de como aparece no mapa:' : 'Here’s a preview of what it looks like on the map:'}
              </p>
              <div className="border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden flex-1 min-h-[280px]">
                <img
                  src="/map.png"
                  alt={isPt ? 'Exemplo do mapa Taskorilla com marcadores' : 'Example of Taskorilla map with markers'}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '95% 50%' }}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </section>
          </div>

          {/* Call to action */}
          <div className="mt-10 bg-primary-50 border border-primary-100 rounded-2xl px-5 sm:px-8 py-6 sm:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2 text-gray-800 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {isPt ? 'Pronto para colocar o seu negócio no mapa?' : 'Ready to put your business on the map?'}
              </h3>
              <p className="text-sm leading-relaxed">
                {isPt
                  ? 'Quer tenha uma loja ou várias localizações, a Taskorilla oferece uma forma simples e eficaz de ser descoberto por pessoas locais já ativas na plataforma.'
                  : 'Whether you have one store or multiple locations, Taskorilla gives you a simple, effective way to be discovered by locals who are already active on the platform.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <a
                href="mailto:tee@taskorilla.com?subject=I%27d%20like%20to%20know%20more%20about%20the%20Advertising%20Opportunities%20with%20Taskorilla."
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-primary-600 bg-white text-primary-700 text-sm font-semibold hover:bg-primary-50 shadow-sm transition-colors"
              >
                {isPt ? 'Envie-nos email sobre publicidade' : 'Email us about advertising'}
              </a>
              <p className="text-[11px] text-gray-600 max-w-xs">
                {isPt ? 'Ou entre em contacto e ajudamos a explorar as opções.' : 'Or simply reach out and we’ll help you explore the options.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

