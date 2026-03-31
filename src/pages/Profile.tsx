
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { User, Bell, Shield, Loader2, Moon, Sun, Monitor, Sparkles } from "lucide-react";

const Profile = () => {
    const GLASS_TINT_STORAGE_KEY = "glassTintColor";
    const GLASS_TINT_PRESETS = [
        { name: "Slate", value: "#7B8394" },
        { name: "Storm", value: "#5F6B7A" },
        { name: "Indigo", value: "#6F78A8" },
        { name: "Teal", value: "#5F8F8A" },
        { name: "Violet", value: "#7E6E9E" },
        { name: "Graphite", value: "#4D545F" },
    ] as const;
    const { user } = useAuth();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [glassTint, setGlassTint] = useState("#7b8394");

    const [profile, setProfile] = useState({
        full_name: "",
        phone_number: "",
        plan_type: "free"
    });

    const [notifications, setNotifications] = useState({
        email_enabled: true,
        phone_enabled: false,
        reminder_frequency: "daily",
        daily_reminder_count: 2,
    });

    useEffect(() => {
        if (!user) return;

        const fetchProfileData = async () => {
            setLoading(true);

            const [profileRes, settingsRes] = await Promise.all([
                apiRequest<{ data: any }>(`/api/profile/${encodeURIComponent(user.id)}`),
                apiRequest<{ data: any }>(`/api/notification-settings/${encodeURIComponent(user.id)}`),
            ]);

            if (profileRes.data) {
                setProfile({
                    full_name: profileRes.data.full_name || "",
                    phone_number: profileRes.data.phone_number || "",
                    plan_type: profileRes.data.plan_type || "free"
                });
            }

            if (settingsRes.data) {
                const d = settingsRes.data as { email_enabled?: boolean; phone_enabled?: boolean; reminder_frequency?: string; daily_reminder_count?: number };
                setNotifications({
                    email_enabled: d.email_enabled ?? true,
                    phone_enabled: d.phone_enabled ?? false,
                    reminder_frequency: d.reminder_frequency ?? "daily",
                    daily_reminder_count: Math.min(6, Math.max(1, d.daily_reminder_count ?? 2)),
                });
            }

            setLoading(false);
        };

        fetchProfileData();
    }, [user]);

    useEffect(() => {
        const saved = localStorage.getItem(GLASS_TINT_STORAGE_KEY);
        const valid = saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : "#7b8394";
        setGlassTint(valid);
    }, []);

    const applyGlassTint = (hex: string) => {
        const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#7b8394";
        localStorage.setItem(GLASS_TINT_STORAGE_KEY, normalized);
        const raw = normalized.replace("#", "");
        const r = Number.parseInt(raw.slice(0, 2), 16);
        const g = Number.parseInt(raw.slice(2, 4), 16);
        const b = Number.parseInt(raw.slice(4, 6), 16);
        const root = document.documentElement;
        root.style.setProperty("--glass-tint-rgb", `${r} ${g} ${b}`);
        root.style.setProperty("--glass-glow-rgb", `${r} ${g} ${b}`);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);

        try {
            await apiRequest<{ data: any }>(`/api/profile/${encodeURIComponent(user.id)}`, {
                method: "PUT",
                body: JSON.stringify({
                    full_name: profile.full_name,
                    phone_number: profile.phone_number
                }),
            });
            toast.success("Profile updated successfully");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        if (!user) return;
        setSaving(true);

        try {
            await apiRequest<{ data: any }>(`/api/notification-settings/${encodeURIComponent(user.id)}`, {
                method: "PUT",
                body: JSON.stringify({
                    email_enabled: notifications.email_enabled,
                    phone_enabled: notifications.phone_enabled,
                    reminder_frequency: notifications.reminder_frequency,
                    daily_reminder_count: notifications.reminder_frequency === "daily" ? notifications.daily_reminder_count : 2,
                }),
            });
            toast.success("Notification settings updated");
        } catch (error) {
            toast.error("Failed to update notification settings");
        } finally {
            setSaving(false);
        }
    };

    const [upgrading, setUpgrading] = useState(false);

    const handleUpgrade = async () => {
        if (!user) return;
        setUpgrading(true);

        try {
            const data = await apiRequest<{ authorization_url?: string }>("/api/billing/create-checkout", {
                method: "POST",
                body: JSON.stringify({
                    plan: "premium",
                    returnUrl: `${window.location.origin}/profile`,
                }),
            });
            if (data?.authorization_url) {
                window.location.assign(data.authorization_url as string);
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error) {
            console.error("Upgrade error:", error);
            toast.error("Failed to start checkout process");
        } finally {
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-display font-bold">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile, notifications, and subscription.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Profile Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-accent" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>Update your personal details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" value={user?.email} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={profile.phone_number}
                                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                                    placeholder="+1234567890"
                                />
                            </div>
                            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                                {saving ? "Saving..." : "Save Profile"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notifications Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-accent" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>How should we remind you to study?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Daily study session reminders.</p>
                                </div>
                                <Switch
                                    checked={notifications.email_enabled}
                                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_enabled: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Phone Notifications</Label>
                                    <p className="text-sm text-muted-foreground">SMS alerts for urgent reviews.</p>
                                </div>
                                <Switch
                                    checked={notifications.phone_enabled}
                                    onCheckedChange={(checked) => setNotifications({ ...notifications, phone_enabled: checked })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Reminder Frequency</Label>
                                <Select
                                    value={notifications.reminder_frequency}
                                    onValueChange={(value) => setNotifications({ ...notifications, reminder_frequency: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="none">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {notifications.reminder_frequency === "daily" && (
                                <div className="space-y-2">
                                    <Label>Times per day</Label>
                                    <Select
                                        value={String(notifications.daily_reminder_count)}
                                        onValueChange={(value) => setNotifications({ ...notifications, daily_reminder_count: Number(value) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                                <SelectItem key={n} value={String(n)}>
                                                    {n} {n === 1 ? "time" : "times"} per day
                                                    {n > 1 ? ` (every ${n === 6 ? "4" : (24 / n).toFixed(1)}h)` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Reminders are spaced at least 4 hours apart (max 6 per day).
                                    </p>
                                </div>
                            )}
                            <Button variant="outline" onClick={handleSaveNotifications} disabled={saving} className="w-full">
                                Update Notifications
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Dark mode — Premium */}
                    <Card className={profile.plan_type !== "premium" ? "opacity-80" : ""}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                {resolvedTheme === "dark" ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-accent" />}
                                Dark mode
                                {profile.plan_type !== "premium" && (
                                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-muted text-muted-foreground">Premium</span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Choose light, dark, system, or glass theme. Premium feature.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md p-2 shadow-sm">
                                {[
                                    { value: "light", label: "Light", icon: Sun },
                                    { value: "dark", label: "Dark", icon: Moon },
                                    { value: "system", label: "System", icon: Monitor },
                                    { value: "glass", label: "Glass", icon: Sparkles },
                                ].map(({ value, label, icon: Icon }) => (
                                    <Button
                                        key={value}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => profile.plan_type === "premium" && setTheme(value)}
                                        disabled={profile.plan_type !== "premium"}
                                        className={`gap-1.5 rounded-lg border transition-all duration-200 ${
                                            theme === value
                                                ? "bg-white/70 dark:bg-white/20 border-white/50 dark:border-white/20 shadow-sm"
                                                : "bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <Label htmlFor="glass-tint" className="text-xs text-muted-foreground min-w-[76px]">
                                    Glass tint
                                </Label>
                                <input
                                    id="glass-tint"
                                    type="color"
                                    value={glassTint}
                                    disabled={profile.plan_type !== "premium"}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setGlassTint(next);
                                        applyGlassTint(next);
                                    }}
                                    className="h-8 w-11 rounded border border-border bg-transparent p-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <span className="text-xs text-muted-foreground font-mono">{glassTint.toUpperCase()}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">Presets:</span>
                                {GLASS_TINT_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        aria-label={`Set glass tint to ${preset.name}`}
                                        title={`${preset.name} (${preset.value})`}
                                        disabled={profile.plan_type !== "premium"}
                                        onClick={() => {
                                            setGlassTint(preset.value);
                                            applyGlassTint(preset.value);
                                        }}
                                        className={`h-6 w-6 rounded-full border transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed ${
                                            glassTint.toLowerCase() === preset.value.toLowerCase()
                                                ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
                                                : ""
                                        }`}
                                        style={{ backgroundColor: preset.value }}
                                    />
                                ))}
                            </div>
                            {profile.plan_type !== "premium" && (
                                <p className="text-xs text-muted-foreground mt-2">Upgrade to Premium to change theme.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Subscription Section */}
                    <Card className="md:col-span-2 border-accent/20 bg-accent/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-accent" />
                                Subscription Plan
                            </CardTitle>
                            <CardDescription>Free and Premium features — upgrade to unlock more.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold capitalize">{profile.plan_type} Plan</span>
                                        {profile.plan_type === "premium" && (
                                            <span className="bg-accent/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {profile.plan_type === "premium"
                                            ? "You have access to all premium features below."
                                            : "Upgrade to Premium for $5/month to unlock the features listed under Premium."}
                                    </p>
                                </div>
                                <Button
                                    variant={profile.plan_type === "premium" ? "outline" : "default"}
                                    size="lg"
                                    className="min-w-[180px] font-bold"
                                    onClick={handleUpgrade}
                                    disabled={upgrading || profile.plan_type === "premium"}
                                >
                                    {upgrading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Redirecting...
                                        </>
                                    ) : profile.plan_type === "premium" ? (
                                        "Premium Active"
                                    ) : (
                                        "Upgrade to Premium"
                                    )}
                                </Button>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 text-sm border-t pt-4">
                                <div className="rounded-lg border bg-background/50 p-4">
                                    <h4 className="font-semibold text-foreground mb-2">Free — included</h4>
                                    <ul className="space-y-1.5 text-muted-foreground">
                                        <li>• Unlimited notes</li>
                                        <li>• 3 subjects</li>
                                        <li>• Basic folders & organization</li>
                                        <li>• Basic search</li>
                                        <li>• Sync across devices</li>
                                        <li>• Basic note editor</li>
                                        <li>• AI summaries</li>
                                        <li>• AI study questions</li>
                                        <li>• Limits: 3 subjects · Some AI tools require Premium</li>
                                    </ul>
                                </div>
                                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                                    <h4 className="font-semibold text-accent mb-2">Premium — $5/month</h4>
                                    <ul className="space-y-1.5 text-muted-foreground">
                                        <li>• <strong>Study:</strong> Flashcards, quiz generator, smart summaries, study mode, study rooms (coming soon)</li>
                                        <li>• <strong>AI:</strong> Ask AI, summarization, concept explanations, study questions</li>
                                        <li>• <strong>Productivity:</strong> Export PDF/Markdown, advanced search, tagging, dark mode</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Study Rooms — coming soon */}
                    <Card className="md:col-span-2 border-dashed border-accent/30 bg-accent/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Study Rooms</CardTitle>
                            <CardDescription>Study together with other Premium students in shared rooms.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">Coming soon</span>
                                Create or join rooms by subject, study in sync, and stay accountable with other Premium users.
                            </p>
                        </CardContent>
                    </Card>

                    {/* More AI / productivity features may be added to Premium over time */}
                    <p className="text-xs text-muted-foreground md:col-span-2">
                        Export PDF, advanced search, tagging, and dark mode are listed in Premium; study rooms and some others are coming soon in-app.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
};

export default Profile;
