import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Zap, Shield, BookOpen, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";

const Index = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-accent" />
            <span className="font-display font-bold text-xl tracking-tight">Recallio</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
            <Button asChild size="sm">
              <Link to="/auth">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative py-24 px-4 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_100%)]" />
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1]">
              Master Your Subjects with <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">Recallio</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-muted-foreground leading-relaxed">
              Synthesize notes, generate definitions, and prepare for exams using AI-powered study tools designed for university excellence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link to="/auth">
                  Start Studying Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-card/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-display font-bold">Everything You Need to Succeed</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built specifically for university workflows, Recallio helps you organize, memorize, and excel.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "AI Analysis",
                  description: "Instantly create study material from your raw lecture notes and readings."
                },
                {
                  icon: BookOpen,
                  title: "Smart Definitions",
                  description: "Automatically pull complex terminology and concepts into your personal glossary."
                },
                {
                  icon: Trophy,
                  title: "Exam Readiness",
                  description: "Structured review modes and adaptive quizzes to ensure you're ready for tests."
                }
              ].map((feature, i) => (
                <div key={i} className="group relative p-8 rounded-2xl bg-card border hover:border-accent/50 transition-all duration-300">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-display font-bold">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground">Choose the plan that fits your academic goals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="p-8 rounded-2xl border bg-card/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Free</h3>
                  <p className="text-xs text-muted-foreground mb-3">What you get</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {["Up to 3 subjects", "Basic note storage", "Manual notes review", "Study Pack & recall questions", "No exam mode, no AI add-on"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-accent/50 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="p-8 rounded-2xl border-2 border-accent bg-accent/5 shadow-lg shadow-accent/10 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wider">
                  Recommended
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Premium</h3>
                  <p className="text-xs text-muted-foreground mb-3">What you get</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">$5</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Unlimited subjects",
                      "Flashcards",
                      "Exam mode (all or per topic)",
                      "Manual question generation",
                      "Spaced repetition"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full h-12 text-base font-bold shadow-md shadow-accent/20" asChild>
                  <Link to="/auth">Upgrade Now</Link>
                </Button>
              </div>

              {/* AI Add-on — Coming Soon */}
              <div className="p-8 rounded-2xl border border-dashed bg-card/20 flex flex-col justify-between opacity-90">
                <div>
                  <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    AI Add-on
                    <span className="text-xs font-normal normal-case px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Coming Soon
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Not in Free or Premium</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-bold text-muted-foreground">—</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {["AI Summary", "AI Flashcards", "AI Practice Questions", "AI Study Pack Generator"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/70">🔒</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" className="w-full cursor-not-allowed" disabled asChild>
                  <span>Coming Soon</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4 col-span-2">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-accent" />
              <span className="font-display font-bold text-lg">Recallio</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              The ultimate study companion for university students. Organize your knowledge, ace your exams.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-accent font-medium">Features</a></li>
              <li><a href="#pricing" className="hover:text-accent font-medium">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-accent font-medium">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-accent font-medium">Privacy Policy</Link></li>
              <li><Link to="/refund" className="hover:text-accent font-medium">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Recallio. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
