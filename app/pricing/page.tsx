'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Taskorilla Pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            No subscriptions, no hidden fees, you only pay when a task is completed. Everyone benefits or pays nothing.
          </p>
        </div>

        {/* Task Posters and Helpers Sections - Side by Side on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Task Posters Section */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Task Posters</h2>
            
            {/* Task Posters Badges */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="bg-blue-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-blue-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€0</div>
                <div className="text-gray-700 text-sm">No cost to place tasks</div>
              </div>

              <div className="bg-blue-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-blue-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€2</div>
                <div className="text-gray-700 text-sm">Only paid on completed task</div>
              </div>
            </div>
            
            <p className="text-lg font-semibold text-gray-800 mb-4">
              Post tasks for free. Pay only if they get done.
            </p>
            <p className="text-gray-700 mb-4">
              Post as many tasks as you like, browse local helpers, chat, and agree on a price, all free.
            </p>
            <p className="text-gray-700 mb-4">
              If a task isn&apos;t taken, isn&apos;t completed, or you change your mind, <strong>you pay nothing</strong>.
            </p>
            <p className="text-gray-700 mb-4">
              When a task is completed, you pay the agreed task price <strong>plus a €2 platform fee</strong>.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-800 mb-2">Examples:</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Task budget €30 → completed → you pay €32</li>
                <li>✓ Task budget €20 → not completed → you pay €0</li>
                <li>✓ Five tasks posted, one completed → you pay only for that one</li>
              </ul>
            </div>
            <div className="text-center mb-6">
              <div className="inline-block animate-float">
                <Image
                  src="/images/tee_on_laptop.png"
                  alt="Taskorilla mascot posting a task"
                  width={250}
                  height={250}
                  className="w-auto h-48 object-contain"
                />
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/tasks/new"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-bold hover:bg-blue-700 transition-all duration-200 hover:-translate-y-1"
              >
                Post a Task for Free
              </Link>
            </div>
          </div>

          {/* Helpers Section */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Task Helpers</h2>
            
            {/* Helpers Badges */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="bg-green-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-green-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">€0</div>
                <div className="text-gray-700 text-sm">No cost to bid on tasks</div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl w-48 text-center transition-all duration-300 hover:shadow-lg border-2 border-green-300">
                <div className="text-4xl font-bold text-gray-900 mb-2">10%</div>
                <div className="text-gray-700 text-sm">Commission on completion</div>
              </div>
            </div>
            
            <p className="text-lg font-semibold text-gray-800 mb-4">
              Join for free. Earn when tasks are done.
            </p>
            <p className="text-gray-700 mb-4">
              Signing up and bidding on tasks is <strong>always free</strong>. Add your skills, browse tasks, bid, and chat, no cost.
            </p>
            <p className="text-gray-700 mb-4">
              When a task is completed and you&apos;re paid, Taskorilla takes a <strong>10% commission</strong> from the agreed task price.
            </p>
            <p className="text-gray-700 mb-4">
              If your bid is not accepted, <strong>you pay nothing</strong>.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-800 mb-2">Examples:</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Task agreed €50 → completed → you get €45 (10% commission €5)</li>
                <li>✓ Task agreed €20 → cancelled → you get €0, commission €0</li>
                <li>✓ Multiple bids → commission only on completed tasks</li>
              </ul>
            </div>
            <div className="text-center mb-6">
              <div className="inline-block animate-float">
                <Image
                  src="/images/gorilla-mascot-newer.png"
                  alt="Taskorilla mascot helping"
                  width={250}
                  height={250}
                  className="w-auto h-48 object-contain"
                />
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/register"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg text-base font-bold hover:bg-green-700 transition-all duration-200 hover:-translate-y-1"
              >
                Start Helping Today
              </Link>
            </div>
          </div>
        </div>

        {/* Taskorilla vs Competitors Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            How Taskorilla Compares
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white shadow-lg rounded-lg overflow-hidden comparison-table">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Platform</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Task Poster Cost</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Helper Cost / Fees</th>
                  <th className="border border-gray-300 px-3 py-3 text-left font-bold text-gray-900">Risk for Posters / Helpers</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-100 border-l-4 border-l-green-600 hover:bg-green-200 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Taskorilla</td>
                  <td className="border border-gray-300 px-3 py-3">€0 to post, €2 platform fee on completion</td>
                  <td className="border border-gray-300 px-3 py-3">10% commission on completion</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-green-700">✅ No risk — only pay if task completed</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Airtasker</td>
                  <td className="border border-gray-300 px-3 py-3">Connection/assignment fee may apply when task booked</td>
                  <td className="border border-gray-300 px-3 py-3">12.5%–20% service fee tiered by Tasker level</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Fees may vary per task</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">TaskRabbit</td>
                  <td className="border border-gray-300 px-3 py-3">Service fee + trust/support fee on every booked task</td>
                  <td className="border border-gray-300 px-3 py-3">No direct commission; registration fee may apply in some regions</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Costs apply once a task is booked</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Thumbtack</td>
                  <td className="border border-gray-300 px-3 py-3">No upfront fee; clients pay professionals directly</td>
                  <td className="border border-gray-300 px-3 py-3">Professionals pay per lead, cost varies</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Costs depend on lead conversion</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Handy</td>
                  <td className="border border-gray-300 px-3 py-3">Clients pay upfront for booked services</td>
                  <td className="border border-gray-300 px-3 py-3">Commission deducted from earnings</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Fees deducted from earnings; clients pay upfront</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Fiverr</td>
                  <td className="border border-gray-300 px-3 py-3">Clients pay for service upfront</td>
                  <td className="border border-gray-300 px-3 py-3">10–20% commission on completed work</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Helpers pay commission; clients pay upfront</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Zaask</td>
                  <td className="border border-gray-300 px-3 py-3">Free to request quotes</td>
                  <td className="border border-gray-300 px-3 py-3">Providers may pay per quote; commission on completed tasks varies</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Some cost risk if quotes don&apos;t convert</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Star of Service</td>
                  <td className="border border-gray-300 px-3 py-3">Free to post; client pays for selected services</td>
                  <td className="border border-gray-300 px-3 py-3">Providers pay per accepted lead; commission may apply</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ Costs depend on accepted leads/tasks</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">OLX</td>
                  <td className="border border-gray-300 px-3 py-3">Free to post in classifieds</td>
                  <td className="border border-gray-300 px-3 py-3">No platform fees; risk if client doesn&apos;t pay outside the platform</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ No guarantees for payment; full user risk</td>
                </tr>
                <tr className="even:bg-gray-50 hover:bg-green-50 transition-all duration-200">
                  <td className="border border-gray-300 px-3 py-3 font-bold">Facebook</td>
                  <td className="border border-gray-300 px-3 py-3">Free to post</td>
                  <td className="border border-gray-300 px-3 py-3">No platform fees</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold text-red-600">❌ No protections; risk entirely on user</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-center text-gray-600 text-sm mt-6 max-w-4xl mx-auto">
            <strong>Disclaimer:</strong> All comparisons are based on publicly available information as of January 2026. Taskorilla is not affiliated with or endorsed by any of the platforms mentioned. Fees and policies may change over time. E&OE
          </p>
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
        
        /* Responsive table for mobile */
        @media (max-width: 768px) {
          .comparison-table, 
          .comparison-table thead, 
          .comparison-table tbody, 
          .comparison-table th, 
          .comparison-table td, 
          .comparison-table tr {
            display: block;
          }
          
          .comparison-table thead tr {
            display: none;
          }
          
          .comparison-table tr {
            margin-bottom: 1.2rem;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 0.5rem;
          }
          
          .comparison-table td {
            border: none;
            padding: 0.5rem;
            position: relative;
            padding-left: 50%;
            text-align: left;
          }
          
          .comparison-table td:before {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            width: 45%;
            padding-right: 10px;
            white-space: nowrap;
            font-weight: bold;
          }
          
          .comparison-table td:nth-of-type(1):before { content: "Platform"; }
          .comparison-table td:nth-of-type(2):before { content: "Task Poster Cost"; }
          .comparison-table td:nth-of-type(3):before { content: "Helper Cost / Fees"; }
          .comparison-table td:nth-of-type(4):before { content: "Risk"; }
        }
      `}</style>
    </div>
  )
}
