
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
import { User, Bell, Shield, CreditCard, Loader2 } from "lucide-react";

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

    const togglePremium = async () => {
        if (!user) return;
        const newPlan = profile.plan_type === "free" ? "premium" : "free";

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ plan_type: newPlan })
                .eq("id", user.id);

            if (error) throw error;
            setProfile({ ...profile, plan_type: newPlan });
            toast.success(newPlan === "premium" ? "Welcome to Premium!" : "Plan changed to Free");
        } catch (error) {
            toast.error("Failed to change plan");
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
                            <CardDescription>Power up your learning with Recallio Premium.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold capitalize">{profile.plan_type} Plan</span>
                                    {profile.plan_type === "premium" && (
                                        <span className="bg-accent/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    {profile.plan_type === "premium"
                                        ? "You have access to all premium features including Exam Mode, AI Explanations, and Spaced Repetition optimization."
                                        : "Upgrade to unlock Exam Mode, AI Explanations, Spaced Repetition optimization, and full cloud sync."}
                                </p>
                            </div>
                            <Button
                                variant={profile.plan_type === "premium" ? "outline" : "default"}
                                size="lg"
                                className="min-w-[180px] font-bold"
                                onClick={togglePremium}
                            >
                                {profile.plan_type === "premium" ? "Switch to Free" : "Upgrade to Premium"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default Profile;
