import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Brain, BookOpen, Zap } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        // If confirmation is required, Supabase may not create a session until the user clicks the email link
        if (data?.user && !data?.session) {
          toast.success("Check your email for the confirmation link.");
          setEmail("");
          setPassword("");
        } else {
          toast.success("Account created! Welcome.");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row min-w-0">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-8 xl:p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Brain className="h-12 w-12 text-accent" />
            <h1 className="text-4xl font-display font-bold text-primary-foreground">Recallio</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-12">
            Transform your notes into active recall questions. Study smarter, retain longer.
          </p>
          <div className="space-y-6 text-left">
            <Feature icon={<BookOpen className="h-5 w-5 text-accent" />} title="Block-Based Notes" desc="Organize your notes into structured blocks for better retention." />
            <Feature icon={<Zap className="h-5 w-5 text-accent" />} title="AI-Powered Questions" desc="Automatically generate recall questions from your notes." />
            <Feature icon={<Brain className="h-5 w-5 text-accent" />} title="Spaced Repetition" desc="Review at optimal intervals to maximize long-term memory." />
          </div>
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="w-full max-w-sm px-1">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Brain className="h-8 w-8 text-accent" />
            <h1 className="text-2xl font-display font-bold">Recallio</h1>
          </div>

          <h2 className="text-2xl font-display font-bold mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin ? "Sign in to continue studying" : "Start your learning journey"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex gap-4 items-start">
    <div className="mt-1 flex-shrink-0">{icon}</div>
    <div>
      <h3 className="font-display font-semibold text-primary-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export default Auth;
