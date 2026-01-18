import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, MessageSquare, Star } from 'lucide-react'
import { TransparentGorillaImage } from '@/components/TransparentGorillaImage'
import Footer from '@/components/Footer'

export default function LandingV2() {
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
                Big jobs, small jobs, or anything in between — post your tasks and watch them get tackled with smart efficiency and dependable strength.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="text-lg">
                    Get Started
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button size="lg" variant="outline" className="text-lg">
                    Browse Tasks
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
                  Post Your Task
                </h3>
                <p className="text-muted-foreground">
                  Describe what needs doing, set your budget, add a few images, and your task goes live. Nearby helpers can see it and swing into action.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-bold">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Connect & Agree
                </h3>
                <p className="text-muted-foreground">
                  Helpers submit offers, you chat in real time, and pick the right person for the job. Smart, fast, simple.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-bold">
                  3
                </div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Track & Complete
                </h3>
                <p className="text-muted-foreground">
                  Follow progress, get updates, upload photos if needed, and mark it done. Leave reviews to help the community grow stronger.
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
                      Skilled, reliable, and clever — our helpers tackle tasks big and small with smart efficiency and dependable strength.
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
            <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5">
              <p className="text-xl font-bold text-foreground">"No Monkey Business. Just Results."</p>
            </div>
            <div className="p-6 rounded-lg bg-gradient-to-br from-secondary/5 to-accent/5">
              <p className="text-xl font-bold text-foreground">"Strong Hands. Smart Moves."</p>
            </div>
            <div className="p-6 rounded-lg bg-gradient-to-br from-accent/5 to-primary/5">
              <p className="text-xl font-bold text-foreground">"Algarve's Local Service Marketplace."</p>
            </div>
            <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
              <p className="text-xl font-bold text-foreground">"Tasks, Conquered."</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Stop stressing over tasks.
          </h2>
          <p className="text-xl opacity-90">
            Post your task today and let Taskorilla handle the heavy lifting — with brains, brawn, and brilliance.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link href="/tasks/new" className="action-button post-button">
              <div className="button-icon">
                🆘
              </div>
              <div className="button-text">
                <div className="button-title">Post a Task</div>
                <div className="button-subtitle">Get help to get things done locally!</div>
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
      </section>

      <Footer variant="centered" />
    </div>
  )
}

