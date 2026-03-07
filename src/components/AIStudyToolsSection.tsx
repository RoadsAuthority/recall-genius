import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Layers, HelpCircle, Package, Lock } from "lucide-react";

/** AI study tool item for the placeholder section */
const AI_TOOL_ITEMS = [
  { id: "summary", label: "AI Summary", icon: FileText, description: "Summarize notes into key points." },
  { id: "flashcards", label: "AI Flashcards", icon: Layers, description: "Auto-generate flashcards from content." },
  { id: "practice", label: "AI Practice Questions", icon: HelpCircle, description: "Generate practice questions and answers." },
  { id: "study-pack", label: "AI Study Pack Generator", icon: Package, description: "Create full study packs from your notes." },
] as const;

export interface AIStudyToolsSectionProps {
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Compact layout for sidebar or smaller spaces */
  compact?: boolean;
  className?: string;
}

/**
 * Modular "AI Study Tools" section. All tools are placeholders marked Coming Soon.
 * Buttons are disabled; safe to click without breaking. Ready for future AI integration.
 */
export function AIStudyToolsSection({
  title = "AI Study Tools",
  description = "Premium AI-powered study features. Coming soon for Recallio.",
  compact = false,
  className = "",
}: AIStudyToolsSectionProps) {
  return (
    <Card className={`border-accent/20 bg-accent/5 ${className}`}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-accent" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "space-y-2" : "space-y-3"}>
        {AI_TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.label}</p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Coming Soon
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="pointer-events-none opacity-70"
                  aria-label={`${item.label} (coming soon)`}
                >
                  Try
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default AIStudyToolsSection;
