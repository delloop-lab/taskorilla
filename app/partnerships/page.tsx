'use client'

import Link from 'next/link'
import Footer from '@/components/Footer'
import { Globe2, Rocket, Users, TrendingUp } from 'lucide-react'

export default function PartnershipsPage() {
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
            Run Taskorilla in Your Country
            <span className="block text-primary-600 text-2xl sm:text-3xl mt-1">
              Partnerships for local operators.
            </span>
          </h1>

          <div className="space-y-3 text-gray-700 leading-relaxed max-w-3xl">
            <p>
              Taskorilla was born global.
            </p>
            <p>
              We are looking for experienced, driven operators to launch and grow the platform in new markets.
            </p>
            <p>
              If you understand your local market, know how to build partnerships, and want to create a scalable
              marketplace business, this may be for you.
            </p>
          </div>

          {/* What Is This Opportunity */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary-50 text-primary-600 p-2">
                  <Globe2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  What Is This Opportunity?
                </h2>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                This is a country operator opportunity. You will build and grow Taskorilla in your country using our
                technology, brand, and systems.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">We provide:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>The full working platform</li>
                    <li>Ongoing technical development</li>
                    <li>Brand assets and positioning</li>
                    <li>Operational guidance</li>
                    <li>Product updates and improvements</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">You focus on:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Launching in your market</li>
                    <li>Local marketing and partnerships</li>
                    <li>Onboarding Helpers</li>
                    <li>Building supply and demand</li>
                    <li>Driving revenue growth</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                Revenue is shared between us. This is a real operating business, not a passive investment.
              </p>
            </div>

            {/* Why Taskorilla */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-50 text-emerald-600 p-2">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Why Taskorilla?
                </h2>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                Simple errands or tricky challenges, Taskorilla connects people who need things done with Helpers who
                think fast, work smart, and get things done without hassle.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                By operating Taskorilla in your country, you are not just building a business. You are supporting the
                local economy and helping skilled people earn fairly while solving real problems for customers.
              </p>
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-gray-900">The model is lean.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No inventory.</li>
                  <li>No warehouses.</li>
                  <li>No heavy infrastructure.</li>
                </ul>
                <p>
                  It is a scalable digital marketplace built around local communities.
                </p>
              </div>
            </div>
          </div>

          {/* Who we are looking for & The Model */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-50 text-amber-600 p-2">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Who We Are Looking For
                </h2>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                This opportunity is for hands-on operators.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                You should:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Have business or entrepreneurial experience</li>
                <li>Understand your local market</li>
                <li>Be comfortable with marketing and partnerships</li>
                <li>Be able to build and manage relationships</li>
                <li>Be prepared to commit time and effort</li>
              </ul>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mt-1">
                This is not suited to someone looking for a passive income stream.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-50 text-indigo-600 p-2">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  The Model
                </h2>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                Each country operator receives:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>The right to operate Taskorilla in their territory</li>
                <li>Access to the platform and ongoing updates</li>
                <li>Brand usage rights</li>
                <li>Operational and launch support</li>
              </ul>
              <p className="text-gray-700 text-sm leading-relaxed">
                In return, operators commit to building and growing the business locally. Revenue is shared under a
                formal agreement.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Selected markets may be offered territorial exclusivity.
              </p>
            </div>
          </div>

          {/* Interested? */}
          <div className="mt-10 bg-primary-50 border border-primary-100 rounded-2xl px-5 sm:px-8 py-6 sm:py-8 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="rounded-full bg-primary-100 text-primary-700 p-2">
                <Rocket className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Interested?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 max-w-3xl">
              If you believe Taskorilla could succeed in your country, we would like to hear from you. When you reach out,
              it helps if you can briefly cover the points below.
            </p>

            <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-800">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">About you</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your country and primary city</li>
                  <li>Your background and experience</li>
                  <li>Your proposed timeline</li>
                </ul>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">About your market</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Why you believe the model will work locally</li>
                  <li>Your ability to fund and support launch activities</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <p className="text-sm text-gray-700 max-w-lg">
                Submit your details and we will be in touch if there is a fit.
              </p>
              <a
                href="mailto:tee@taskorilla.com?subject=Partnership%20Opportunity%20-%20Run%20Taskorilla%20in%20My%20Country"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-primary-600 bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 hover:border-primary-700 shadow-sm transition-colors"
              >
                Email us about partnerships
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

