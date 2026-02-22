
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Star, Info, List, Beaker, Braces, Link as LinkIcon, GitBranch, Sparkles, ChevronRight } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface Definition {
    id: string;
    term: string;
    definition: string;
    subject_id: string;
    subject_name?: string;
}

interface Concept {
    id: string;
    term: string;
    description: string;
    type: string;
    subject_id: string;
    subject_name?: string;
}

const Definitions = () => {
    const { isPremium } = useProfile();
    const [definitions, setDefinitions] = useState<any[]>([]);
    const [concepts, setConcepts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            // Fetch definitions and concepts with subject names
            const [defRes, conRes, subRes] = await Promise.all([
                supabase.from("definitions").select("*").eq("user_id", user.user.id),
                supabase.from("concepts").select("*").eq("user_id", user.user.id),
                supabase.from("subjects").select("id, name").eq("user_id", user.user.id)
            ]);

            const subjectMap = (subRes.data || []).reduce((acc: any, sub: any) => {
                acc[sub.id] = sub.name;
                return acc;
            }, {});

            if (defRes.data) {
                setDefinitions(defRes.data.map((d: any) => ({ ...d, subject_name: subjectMap[d.subject_id] || "Unknown" })));
            }
            if (conRes.data) {
                setConcepts(conRes.data.map((c: any) => ({ ...c, subject_name: subjectMap[c.subject_id] || "Unknown" })));
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    const filteredDefinitions = definitions.filter(d =>
        d.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredConcepts = concepts.filter(c =>
        c.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allFilteredItems = [...filteredDefinitions, ...filteredConcepts];

    const groupedBySubject = allFilteredItems.reduce((acc: any, item) => {
        const subject = item.subject_name || "Uncategorized";
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(item);
        return acc;
    }, {});

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "importance": return <Star className="h-4 w-4 text-yellow-500" />;
            case "characteristic": return <List className="h-4 w-4 text-blue-500" />;
            case "example": return <BookOpen className="h-4 w-4 text-accent" />;
            case "formula": return <Braces className="h-4 w-4 text-purple-500" />;
            default: return <Info className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getRelatedConcepts = (term: string) => {
        if (!isPremium) return [];
        // Simple heuristic: find concepts that share words
        const words = term.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const related = allFilteredItems.filter(item =>
            item.term !== term &&
            words.some(word => item.term.toLowerCase().includes(word) || (item.definition || item.description || "").toLowerCase().includes(word))
        );
        return related.slice(0, 3);
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Definitions & Concepts</h1>
                        <p className="text-muted-foreground">Your structured learning library extracted from notes.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search definitions..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="h-20 bg-muted" />
                                <CardContent className="space-y-2 pt-4">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : Object.keys(groupedBySubject).length === 0 ? (
                    <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No definitions found</h3>
                        <p className="text-muted-foreground">Add definitions in your notes to see them here.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedBySubject).map(([subject, items]: [string, any]) => (
                            <section key={subject} className="space-y-4">
                                <div className="flex items-center gap-2 border-b pb-2">
                                    <Badge variant="outline" className="px-3 py-1 text-sm font-semibold capitalize">
                                        {subject}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{items.length} items</span>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {items.map((item: any) => (
                                        <Card key={item.id} className="group hover:shadow-md transition-shadow dark:bg-card/50">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                                        {item.term}
                                                    </CardTitle>
                                                    {item.type && (
                                                        <div title={item.type.charAt(0).toUpperCase() + item.type.slice(1)}>
                                                            {getTypeIcon(item.type)}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-balance leading-relaxed">
                                                    {item.definition || item.description}
                                                </p>

                                                {isPremium && (
                                                    <div className="mt-4 pt-4 border-t space-y-2">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase">
                                                            <LinkIcon className="h-3 w-3" />
                                                            Related Concepts
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getRelatedConcepts(item.term).length > 0 ? (
                                                                getRelatedConcepts(item.term).map((rel: any) => (
                                                                    <Badge key={rel.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                                                                        {rel.term}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground italic">No direct links found</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.type && (
                                                    <div className="mt-4 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                                        {item.type}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {isPremium && items.length > 1 && (
                                    <div className="mt-8">
                                        <Card className="bg-accent/5 border-dashed border-accent/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <GitBranch className="h-4 w-4 text-accent" />
                                                    Concept Dependency Map
                                                </CardTitle>
                                                <CardDescription className="text-[10px]">
                                                    Visualizing how these concepts build upon each other (Heuristic analysis)
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {items.slice(0, 5).map((item: any, idx: number) => (
                                                        <div key={item.id} className="flex items-center gap-3">
                                                            <div className="p-2 bg-background border rounded-md text-xs font-medium shadow-sm">
                                                                {item.term}
                                                            </div>
                                                            {idx < items.slice(0, 5).length - 1 && (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default Definitions;
