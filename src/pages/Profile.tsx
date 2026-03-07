
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Bell, Shield, Loader2 } from "lucide-react";
import { AIStudyToolsSection } from "@/components/AIStudyToolsSection";

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [profile, setProfile] = useState({
        full_name: "",
        phone_number: "",
        plan_type: "free"
    });

    const [notifications, setNotifications] = useState({
        email_enabled: true,
        phone_enabled: false,
        reminder_frequency: "daily"
    });

    useEffect(() => {
        if (!user) return;

        const fetchProfileData = async () => {
            setLoading(true);

            const [profileRes, settingsRes] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
                supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle()
            ]);

            if (profileRes.data) {
                setProfile({
                    full_name: profileRes.data.full_name || "",
                    phone_number: profileRes.data.phone_number || "",
                    plan_type: profileRes.data.plan_type || "free"
                });
            }

            if (settingsRes.data) {
                setNotifications({
                    email_enabled: settingsRes.data.email_enabled,
                    phone_enabled: settingsRes.data.phone_enabled,
                    reminder_frequency: settingsRes.data.reminder_frequency
                });
            }

            setLoading(false);
        };

        fetchProfileData();
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: profile.full_name,
                    phone_number: profile.phone_number
                })
                .eq("id", user.id);

            if (error) throw error;
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
            const { error } = await supabase
                .from("notification_settings")
                .update({
                    email_enabled: notifications.email_enabled,
                    phone_enabled: notifications.phone_enabled,
                    reminder_frequency: notifications.reminder_frequency
                })
                .eq("user_id", user.id);

            if (error) throw error;
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
        if (!window.Paddle) {
            toast.error("Billing system is still loading. Please try again in a moment.");
            return;
        }
        setUpgrading(true);

        try {
            const { data, error } = await supabase.functions.invoke("create-paddle-checkout", {
                body: {
                    priceId: "pri_placeholder", // User MUST replace this with a real Paddle Price ID
                }
            });

            if (error) throw error;
            if (data?.transactionId) {
                window.Paddle.Checkout.open({
                    settings: {
                        displayMode: "overlay",
                        theme: "light",
                        locale: "en",
                    },
                    transactionId: data.transactionId,
                });
            } else {
                throw new Error("No transaction ID returned");
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
                            <Button variant="outline" onClick={handleSaveNotifications} disabled={saving} className="w-full">
                                Update Notifications
                            </Button>
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
                                        <li>• Up to 3 subjects</li>
                                        <li>• Basic note storage</li>
                                        <li>• Manual notes review</li>
                                        <li>• Study Pack (from note)</li>
                                        <li>• Generate recall questions (AI)</li>
                                        <li>• No exam mode, no flashcards</li>
                                    </ul>
                                </div>
                                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                                    <h4 className="font-semibold text-accent mb-2">Premium — $5/month</h4>
                                    <ul className="space-y-1.5 text-muted-foreground">
                                        <li>• Unlimited subjects</li>
                                        <li>• Flashcards</li>
                                        <li>• Exam mode (all topics or per topic)</li>
                                        <li>• Manual question generation</li>
                                        <li>• Spaced repetition</li>
                                        <li>• Generate Study Tools (AI)</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Add-on placeholder — Coming Soon */}
                    <Card className="md:col-span-2 border-dashed opacity-90">
                        <CardHeader>
                            <CardTitle className="text-lg">AI Add-on</CardTitle>
                            <CardDescription>
                                Not included in Free or Premium. Coming soon.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-sm text-muted-foreground space-y-1.5">
                                <li className="flex items-center gap-2"><span>🔒</span> AI Summary</li>
                                <li className="flex items-center gap-2"><span>🔒</span> AI Flashcards</li>
                                <li className="flex items-center gap-2"><span>🔒</span> AI Practice Questions</li>
                                <li className="flex items-center gap-2"><span>🔒</span> AI Study Pack Generator</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-3">We will not charge or enable these until release.</p>
                        </CardContent>
                    </Card>

                    {/* AI Study Tools — coming soon */}
                    <div className="md:col-span-2">
                        <AIStudyToolsSection
                            title="AI Study Tools (Add-on)"
                            description="Premium AI-powered study features. All tools below are coming soon."
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Profile;
