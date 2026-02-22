
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Timer, Trophy, History, Brain, ChevronRight, Lock, Loader2 } from "lucide-react";

const ExamMode = () => {
    const { user } = useAuth();
    const { isPremium, loading: profileLoading } = useProfile();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchSubjects();
    }, [user]);

    const fetchSubjects = async () => {
        const { data } = await supabase
            .from("subjects")
            .select("*, notes(count)")
            .eq("user_id", user?.id);

        setSubjects(data || []);
        setLoading(false);
    };

    if (profileLoading || loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            </AppLayout>
        );
    }

    if (!isPremium) {
        return (
            <AppLayout>
                <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                    <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="h-10 w-10 text-accent" />
                    </div>
                    <h1 className="text-3xl font-display font-bold">Exam Mode is Premium</h1>
                    <p className="text-muted-foreground text-lg">
                        Unlock timed recall sessions, difficulty scaling, and exam readiness scores with Recallio Premium.
                    </p>
                    <Button size="lg" onClick={() => navigate("/profile")} className="font-bold">
                        Upgrade to Premium
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-accent" />
                            Exam Simulation
                        </h1>
                        <p className="text-muted-foreground">Test your knowledge under pressure with timed sessions.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {subjects.map((subject) => (
                        <Card key={subject.id} className="group hover:border-accent/50 transition-all">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-widest">{subject.name}</Badge>
                                    <Brain className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle className="text-xl">{subject.name} Exam</CardTitle>
                                <CardDescription>
                                    {subject.notes?.[0]?.count || 0} topics available
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Timer className="h-3 w-3" />
                                            <span>15 Mins</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ChevronRight className="h-3 w-3" />
                                            <span>Ready?</span>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full font-bold group-hover:gradient-accent group-hover:text-white"
                                        onClick={() => toast.info("Starting simulation...", {
                                            description: "This feature is coming in the next update!"
                                        })}
                                    >
                                        Start Session
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
};

export default ExamMode;
