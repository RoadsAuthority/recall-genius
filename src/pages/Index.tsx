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

      <main className="flex-grow pt-16 min-w-0">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 md:py-24 px-4 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_100%)]" />
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-foreground leading-[1.1] px-1">
              Master Your Subjects with <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">Recallio</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed px-2">
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
        <section id="features" className="py-12 sm:py-20 md:py-24 bg-card/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10 sm:mb-16 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">Everything You Need to Succeed</h2>
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
        <section id="pricing" className="py-12 sm:py-20 md:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-16 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground">Choose the plan that fits your academic goals.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Free Plan — Hook users, daily use */}
              <div className="p-8 rounded-2xl border bg-card/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Free</h3>
                  <p className="text-xs text-muted-foreground mb-3">Use Recallio daily with core AI help for studying.</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      "Unlimited notes",
                      "3 subjects",
                      "Basic folders & organization",
                      "Basic search",
                      "Sync across devices",
                      "Basic note editor (text, bullets, headings)",
                      "AI summaries",
                      "AI study questions",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-accent/50 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                    Limits: 3 subjects · Some AI tools require Premium
                  </p>
                </div>
                <Button variant="outline" className="w-full mt-6" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>

              {/* Premium — Study assistant */}
              <div className="p-8 rounded-2xl border-2 border-accent bg-accent/5 shadow-lg shadow-accent/10 flex flex-col justify-between relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wider">
                  Recommended
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Premium</h3>
                  <p className="text-xs text-muted-foreground mb-3">Everything in Free + study & AI features.</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">$5</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6 text-sm">
                    <li className="font-semibold text-foreground mt-2">Study</li>
                    {["Flashcard generator from notes", "Quiz generator from notes", "Smart summaries", "Study mode"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 pl-4">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3 pl-4">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span>Study rooms — study with other Premium students</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Coming soon</span>
                    </li>
                    <li className="font-semibold text-foreground mt-2">AI</li>
                    {["Ask AI about your notes", "AI note summarization", "AI concept explanations", "AI study questions"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 pl-4">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                    <li className="font-semibold text-foreground mt-2">Productivity</li>
                    {["Export notes (PDF / Markdown)", "Advanced search", "Tagging system", "Dark mode themes"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 pl-4">
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
