import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, MessageSquare, Star, ClipboardList, Wallet } from 'lucide-react'
import { TransparentGorillaImage } from '@/components/TransparentGorillaImage'
import TrafficTracker from '@/components/TrafficTracker'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <TrafficTracker pageName="home" />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-14 md:pt-20 pb-8 md:pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Brainy. Brawny. Brilliant.
              </h1>
              <div className="text-xl text-muted-foreground">
                <p>
                  <img 
                    src="https://flagcdn.com/w20/pt.png" 
                    alt="Portugal flag" 
                    className="inline-block h-4 w-6 object-cover mr-2"
                  /> Whether you're new here or have lived in Portugal for years, Taskorilla helps you get tasks done or earn by helping others.
                </p>
                <p>
                  Big jobs, small jobs, or anything in between, find trusted helpers or professionals, or offer your skills, and get results quickly and safely.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-[10px] mb-0">
                <Link href="/tasks/new" className="action-button post-button">
                  <div className="button-icon">
                    🆘
                  </div>
                  <div className="button-text">
                    <h2 className="button-title">Post a Task</h2>
                    <p className="button-subtitle">Get <strong>help</strong> to get things done!</p>
                  </div>
                </Link>
                <Link href="/tasks" className="action-button browse-button">
                  <div className="button-icon">
                    💵
                  </div>
                  <div className="button-text">
                    <h2 className="button-title">Browse Tasks</h2>
                    <p className="button-subtitle">Get <strong>paid</strong> to get things done!</p>
                  </div>
                </Link>
              </div>
            </div>
            <div className="animate-fade-in">
              <TransparentGorillaImage />
            </div>
          </div>
        </div>
      </section>

      {/* Subheadline */}
      <section className="pt-4 md:pt-6 pb-8 md:pb-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-lg text-muted-foreground">
            Life's full of tasks. Some are simple errands, others are tricky challenges. Whatever it is, Taskorilla connects you with helpers who think fast, work smart, and get it done without the hassle.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  1
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Post Your Task (Free!)
                </h3>
                <p className="text-muted-foreground">
                  Need something done in Portugal? Describe your task, set your budget, and post it. Helpers nearby can submit offers instantly. Only €2 per completed task. Connect with trusted helpers and get things done quickly.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-bold">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Browse & Earn
                </h3>
                <p className="text-muted-foreground">
                  Pick up extra work, show off your skills, and get hired fast. Helpers keep their earnings minus a 10% commission, and task posters pay only when the job is done. Build your reputation with badges, reviews, and a shareable profile. Perfect for newcomers looking to earn while settling in Portugal.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-bold">
                  3
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Connect & Complete
                </h3>
                <p className="text-muted-foreground">
                  Chat with your helper or tasker, track progress, upload photos, and mark the task done. Leave and receive reviews so everyone knows who's reliable. Every completed task strengthens trust and your reputation. Stay on top of your tasks, whether you're new in town or a long-time resident.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Use Taskorilla */}
      <section className="pt-12 md:pt-20 pb-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            Why Use Taskorilla?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Brainy and Brawny Helpers</h3>
                    <p className="text-muted-foreground">
                      Skilled, reliable, and clever. Our helpers tackle tasks big and small, from everyday errands to professional services. Show off your skills, services, or professional role, earn badges, collect reviews, and get noticed. Whether you're new to Portugal or a long-time resident, Taskorilla makes it simple to get help or offer it.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Fast, Local, and Connected</h3>
                    <p className="text-muted-foreground">
                      Helpers nearby see your tasks instantly, submit offers, and chat in real time. Taskers can search for helpers by skills, services, or professional role to find the perfect match, whether it's a casual errand or a professional job.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Star className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Trust and Transparency</h3>
                    <p className="text-muted-foreground">
                      Reviews go both ways. Taskers can review helpers, and helpers can review taskers. Track progress, upload photos, and see verified feedback so everyone knows who's reliable.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Flexible and Secure</h3>
                    <p className="text-muted-foreground">
                      Set your budget, choose the best fit, and stay in control. Your information stays private, and instant alerts keep you in the loop. Post tasks and offer help, from small jobs to professional services, without juggling multiple accounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale md:col-span-2">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Community with a Clever Twist</h3>
                    <p className="text-muted-foreground">
                      Taskorilla is not just a service. It is a community of smart, strong helpers and taskers making life easier. Shareable profiles, badges, and discoverable skills make it simple, fun, and effective.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Fun Taglines */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"No Monkey Business. Just Results."</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"Strong Hands. Smart Moves."</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"Swing Into Action."</p>
            </div>
            <div className="p-6 rounded-lg bg-muted">
              <p className="text-xl font-bold text-foreground">"Tasks, Conquered."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Post Free / Earn Money Highlight */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/tasks/new" className="group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-lg border-2 border-blue-300 hover:shadow-xl hover:border-blue-400 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-500 rounded-lg p-3 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-blue-700 uppercase mb-2">TASKER</h2>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Post Your Task, Free & Easy</h3>
                    <p className="text-sm text-blue-700 font-medium mb-3">Get help when you need it, no fees.</p>
                    <p className="text-gray-700">
                      Share what you need done and get it handled without any fees.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/tasks" className="group">
              <div className="bg-gradient-to-br from-[#FFF4E6] to-[#FFE5CC] rounded-xl p-8 shadow-lg border-2 border-[#FFD4A3] hover:shadow-xl hover:border-[#FD9212] transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-[#FD9212] rounded-lg p-3 group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-[#D97706] uppercase mb-2">HELPER</h2>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Earn Money Helping Others</h3>
                    <p className="text-sm text-[#D97706] font-medium mb-3">Pick tasks that suit you, get paid fast.</p>
                    <p className="text-gray-700">
                      Pick up tasks that fit your skills, submit bids, and earn money while helping others.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-12 md:pt-20 pb-8 md:pb-20 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <div className="flex justify-center md:justify-end order-2 md:order-1">
              <img 
                src="/images/taskorilla-mascot.png" 
                alt="Taskorilla mascot" 
                className="h-56 w-56 md:h-72 md:w-72 object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <div className="text-center space-y-6 order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold">
                Stop stressing over tasks.
              </h2>
              <p className="text-xl opacity-90">
                Post your task today and let Taskorilla handle the heavy lifting, with brains, brawn, and brilliance.
              </p>
              <div className="flex flex-col items-center gap-4">
                <Link href="/tasks/new" className="action-button post-button">
                  <div className="button-icon">
                    🆘
                  </div>
                  <div className="button-text">
                    <div className="button-title">Post a Task</div>
                    <div className="button-subtitle">Get help to get things done!</div>
                  </div>
                </Link>
                <Link href="/tasks" className="action-button browse-button">
                  <div className="button-icon">
                    💵
                  </div>
                  <div className="button-text">
                    <div className="button-title">Browse Tasks</div>
                    <div className="button-subtitle">Get paid to get things done!</div>
                  </div>
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-start order-3">
              <img 
                src="/images/tee_on_laptop.png" 
                alt="Tee on laptop" 
                className="h-[300px] w-[300px] object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
