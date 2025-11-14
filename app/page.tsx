import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, MessageSquare, Star, ClipboardList, Wallet } from 'lucide-react'
import { TransparentGorillaImage } from '@/components/TransparentGorillaImage'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Brainy. Brawny. Brilliant.
              </h1>
              <p className="text-xl text-muted-foreground">
                Big jobs, small jobs, or anything in between — post your tasks for free or start earning money as a helper. Smart, strong, simple.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="text-lg">
                    Get Started
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button size="lg" variant="outline" className="text-lg">
                    Browse Tasks/Earn Money
                  </Button>
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
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-lg text-muted-foreground">
            Life's full of tasks. Some are simple errands, others are tricky challenges. Whatever it is, Taskorilla connects you with helpers who think fast, work smart, and get it done without the hassle.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
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
                  Describe what needs doing, set your budget, add images — your task goes live. Helpers nearby can see it and swing into action.
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
                  Looking to pick up extra work? Browse local tasks, submit offers, and earn money doing what you're good at.
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
                  Chat, track progress, upload photos, mark it done, and leave reviews. Smart, fast, and stress-free.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Use Taskorilla */}
      <section className="py-20 px-4 bg-muted/30">
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
                    <h3 className="font-bold text-foreground text-lg mb-2">Brainy & Brawny Helpers</h3>
                    <p className="text-muted-foreground">
                      Skilled, reliable, and clever — our helpers tackle tasks big and small with smart efficiency and dependable strength. Whether you're posting or earning, Taskorilla makes it easy.
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
                      Helpers near you can see your task immediately, submit offers, and chat in real time — no waiting around.
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
                    <h3 className="font-bold text-foreground text-lg mb-2">Trust & Transparency</h3>
                    <p className="text-muted-foreground">
                      See verified reviews, track progress, and upload photos. Clear instructions and feedback mean your task gets done right.
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
                    <h3 className="font-bold text-foreground text-lg mb-2">Flexible & Secure</h3>
                    <p className="text-muted-foreground">
                      Set your budget, choose the best fit, and stay in control. Your info stays private, and instant alerts keep you in the loop.
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
                      Taskorilla isn't just a service — it's a community of smart, strong helpers making life easier. Simple, fun, effective, and stress-free.
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Post Your Task — Free & Easy</h3>
                    <p className="text-sm text-blue-700 font-medium mb-3">Get help when you need it — no fees.</p>
                    <p className="text-gray-700">
                      Share what you need done and get it handled without any fees.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/tasks" className="group">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg border-2 border-green-300 hover:shadow-xl hover:border-green-400 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-green-500 rounded-lg p-3 group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Earn Money Helping Others</h3>
                    <p className="text-sm text-green-700 font-medium mb-3">Pick tasks that suit you, get paid fast.</p>
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
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="flex justify-center md:justify-end order-2 md:order-1">
              <img 
                src="/images/taskorilla-mascot.png" 
                alt="Taskorilla mascot" 
                className="h-56 w-56 md:h-72 md:w-72 object-contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <div className="text-center md:text-left space-y-6 order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold">
                Stop stressing over tasks.
              </h2>
              <p className="text-xl opacity-90">
                Post your task today and let Taskorilla handle the heavy lifting — with brains, brawn, and brilliance.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Link href="/tasks/new">
                  <Button size="lg" variant="secondary" className="text-lg">
                    Post a Task
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button size="lg" variant="outline" className="text-lg bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    Browse Tasks/Earn Money
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p>© 2025 Taskorilla. All rights reserved. Swing responsibly.</p>
        </div>
      </footer>
    </div>
  )
}
