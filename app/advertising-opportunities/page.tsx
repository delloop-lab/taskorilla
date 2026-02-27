'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { MapPin, Users, Target, Link2 } from 'lucide-react'

export default function AdvertisingOpportunitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-4"
          >
            <span className="mr-1">←</span> Back to Home
          </Link>

          {/* Hero */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Advertising
            <span className="block text-primary-600 text-2xl sm:text-3xl mt-1">
              Put your business on the Taskorilla map.
            </span>
          </h1>

          <div className="space-y-3 text-gray-700 leading-relaxed max-w-3xl">
            <p>
              Want your business to be seen by locals who are actively connecting with opportunities nearby? Taskorilla’s
              map view puts your brand exactly where people are engaging with their community.
            </p>
            <p>
              Our Helpers use the map to discover tasks and experiences around them and now your business can be part of
              that dynamic network. This isn’t just visibility, it’s a way to engage with an audience that’s active,
              mobile and ready to interact.
            </p>
          </div>

          {/* Who this is for */}
          <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Ideal for
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                Cafés, shops & local services
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                Professional practices & studios
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                Multi-location brands & franchises
              </span>
            </div>
          </div>

          {/* Main content: benefits + map preview */}
          <div className="mt-10 grid lg:grid-cols-2 gap-10 items-stretch">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Why advertise with us?</h2>
              <div className="mt-5 space-y-4 text-gray-700">
                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-primary-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Local and relevant</h3>
                    <p className="text-sm leading-relaxed">
                      Appear directly on the map where active, engaged locals are exploring opportunities and planning
                      their next move.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-amber-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Targeted exposure</h3>
                    <p className="text-sm leading-relaxed">
                      Reach people in the right place at the right time when they are exploring and engaging locally.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-emerald-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Flexible visibility</h3>
                    <p className="text-sm leading-relaxed">
                      Choose how and where your locations appear to make the most impact, whether you have one store or
                      multiple points on the map.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="mt-1 text-blue-600">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Direct engagement</h3>
                    <p className="text-sm leading-relaxed">
                      Users can click on your marker and be taken straight to your website or landing page, driving real
                      traffic and connections.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="h-full flex flex-col">
              <p className="text-gray-700 mb-3 text-sm font-medium">
                Here’s a preview of what it looks like on the map:
              </p>
              <div className="border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden flex-1 min-h-[280px]">
                <img
                  src="/map.png"
                  alt="Example of Taskorilla map with markers"
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
                Ready to put your business on the map?
              </h3>
              <p className="text-sm leading-relaxed">
                Whether you have one store or multiple locations, Taskorilla gives you a simple, effective way to be
                discovered by locals who are already active on the platform.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <a
                href="mailto:tee@taskorilla.com?subject=I%27d%20like%20to%20know%20more%20about%20the%20Advertising%20Opportunities%20with%20Taskorilla."
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-primary-600 bg-white text-primary-700 text-sm font-semibold hover:bg-primary-50 shadow-sm transition-colors"
              >
                Email us about advertising
              </a>
              <p className="text-[11px] text-gray-600 max-w-xs">
                Or simply reach out and we’ll help you explore the options.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

