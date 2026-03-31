import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SubjectNotes from "./pages/SubjectNotes";
import NoteEditor from "./pages/NoteEditor";
import Review from "./pages/Review";
import Definitions from "./pages/Definitions";
import Profile from "./pages/Profile";
import ExamMode from "./pages/ExamMode";
import RefundPolicy from "./pages/RefundPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const GLASS_TINT_STORAGE_KEY = "glassTintColor";

function hexToRgbTuple(hex: string): string | null {
  const raw = hex.trim().replace("#", "");
  const valid = /^[0-9a-fA-F]{6}$/.test(raw);
  if (!valid) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

const GlassTintSync = () => {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(GLASS_TINT_STORAGE_KEY) || "#7b8394";
    const rgbTuple = hexToRgbTuple(stored) ?? "123 131 148";
    root.style.setProperty("--glass-tint-rgb", rgbTuple);
    root.style.setProperty("--glass-glow-rgb", rgbTuple);
    root.style.setProperty("--glass-theme-active", theme === "glass" ? "1" : "0");
  }, [theme]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" themes={["light", "dark", "glass"]} enableSystem>
        <GlassTintSync />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/subject/:subjectId" element={<ProtectedRoute><SubjectNotes /></ProtectedRoute>} />
              <Route path="/note/:noteId" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
              <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
              <Route path="/definitions" element={<ProtectedRoute><Definitions /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/exam" element={<ProtectedRoute><ExamMode /></ProtectedRoute>} />
              <Route path="/refund" element={<RefundPolicy />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
