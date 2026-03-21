import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, LayoutDashboard, BookOpen, LogOut, User, Bell, Trophy, Lock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Footer from "./Footer";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isPremium } = useProfile();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 5));
          setUnreadCount(prev => prev + 1);
          toast.info(payload.new.title, { description: payload.new.message });
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Notifications realtime subscription issue:", status, err?.message ?? err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/review", label: "Review", icon: Brain },
    { path: "/definitions", label: "Definitions", icon: BookOpen },
    { path: "/exam", label: "Exam Mode", icon: Trophy, premiumOnly: true },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const NotificationsContent = () => (
    <>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-sm">Notifications</h4>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-[10px]" onClick={markAllRead}>Mark all as read</Button>
        )}
      </div>
      <Separator />
      <div className="py-2">
        {notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 rounded-md transition-colors ${n.read ? "opacity-60" : "bg-accent/5"}`}>
                <p className="text-xs font-bold">{n.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-xs text-muted-foreground">No new notifications</p>
            <p className="text-[10px] text-muted-foreground mt-1">We&apos;ll remind you when it&apos;s time to review!</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col min-w-0">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 min-w-0">
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0 shrink-0" aria-label="Recallio home">
            <Brain className="h-6 w-6 shrink-0 text-accent" />
            <span className="font-display font-bold text-base sm:text-lg truncate">Recallio</span>
          </Link>

          {/* Desktop nav: md and up */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 min-h-9"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  {"premiumOnly" in item && item.premiumOnly && !isPremium && (
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </Button>
              </Link>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative min-h-9">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-destructive text-[8px] flex items-center justify-center text-white rounded-full border-2 border-background font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                <NotificationsContent />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground min-h-9">
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Sign Out</span>
            </Button>
          </nav>

          {/* Mobile: hamburger + sheet */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative min-h-10 min-w-10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-destructive text-[8px] flex items-center justify-center text-white rounded-full border-2 border-background font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
                <NotificationsContent />
              </PopoverContent>
            </Popover>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(320px,100vw-2rem)] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent" />
                    Recallio
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left font-medium transition-colors min-h-[44px] ${
                        location.pathname === item.path ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                      {"premiumOnly" in item && item.premiumOnly && !isPremium && (
                        <Lock className="h-4 w-4 shrink-0 ml-auto" />
                      )}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto pt-4 border-t">
                  <Button variant="ghost" className="w-full justify-start gap-3 min-h-[44px] text-muted-foreground" onClick={signOut}>
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-grow w-full min-w-0">{children}</main>
      <Footer />
    </div>
  );
};

export default AppLayout;
