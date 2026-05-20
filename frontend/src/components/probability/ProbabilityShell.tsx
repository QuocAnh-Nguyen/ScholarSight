import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProbability } from "@/hooks/useProbability";
import { cn } from "@/lib/utils";
import type { ProbabilityRequest } from "@/lib/types";

// ---------------------------------------------------------------------------
// Polished ProbabilityShell adapted from FastGPT's card patterns.
//
// Improvements:
//   - Uses shadcn Select component for dropdowns (cleaner UX)
//   - Results card with subtle animation and tier badge
//   - Historical cutoffs rendered as styled rows
//   - Consistent card shadow/hover transitions
//   - Input focus ring styling
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/List.tsx
// ---------------------------------------------------------------------------

const UNIVERSITIES = [
  "Trường Đại học Bách khoa Hà Nội",
  "Trường Đại học Kinh tế Quốc dân",
  "Trường Đại học Ngoại thương",
];

const METHODS = [
  { value: "regular", labelKey: "THPT" },
  { value: "priority", labelKey: "Priority" },
  { value: "aptitude_test", labelKey: "Aptitude Test" },
];

const TIER_CONFIG: Record<string, { variant: "outline" | "default" | "destructive"; emoji: string }> = {
  safety: { variant: "outline", emoji: "🟢" },
  target: { variant: "default", emoji: "🟡" },
  reach: { variant: "destructive", emoji: "🔴" },
};

export function ProbabilityShell() {
  const { t } = useTranslation();
  const { result, loading, error, assess } = useProbability();
  const [score, setScore] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [method, setMethod] = useState("regular");

  const handleAssess = () => {
    if (!score || !university || !major) return;
    const body: ProbabilityRequest = {
      score: parseFloat(score),
      university,
      major,
      admission_method: method,
    };
    assess(body);
  };

  const isValid = !!score && !!university && !!major;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("probability.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("probability.subtitle")}</p>
          </div>
        </div>

        {/* Input form card */}
        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("probability.scoreLabel")}</Label>
              <Input
                type="number"
                step="0.25"
                value={score}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore(e.target.value)}
                placeholder="25.5"
                className="h-10 rounded-lg text-sm transition-shadow focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("probability.universityLabel")}</Label>
              <Select value={university} onValueChange={setUniversity}>
                <SelectTrigger className="h-10 rounded-lg text-sm">
                  <SelectValue placeholder={t("probability.universityPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITIES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("probability.majorLabel")}</Label>
              <Input
                value={major}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMajor(e.target.value)}
                placeholder={t("probability.majorPlaceholder")}
                className="h-10 rounded-lg text-sm transition-shadow focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("probability.methodLabel")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-10 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.labelKey}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleAssess}
              disabled={loading || !isValid}
              className="h-10 w-full rounded-lg transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  {t("probability.assessing")}
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t("probability.assess")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result card */}
        {result && (
          <Card className={cn(
            "mt-6 shadow-sm border-2 animate-in fade-in-0 zoom-in-95 duration-300",
            result.tier.tier === "safety" && "border-emerald-200 dark:border-emerald-800",
            result.tier.tier === "target" && "border-amber-200 dark:border-amber-800",
            result.tier.tier === "reach" && "border-red-200 dark:border-red-800",
          )}>
            <CardHeader className="text-center pb-2">
              <div className="mb-2 text-5xl">{result.tier.emoji}</div>
              <CardTitle className="text-2xl">{result.tier.label}</CardTitle>
              <CardDescription>
                {t("probability.percentile", { rank: result.tier.percentile_rank.toFixed(1) })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tier badge */}
              <div className="flex justify-center">
                <Badge
                  variant={TIER_CONFIG[result.tier.tier]?.variant ?? "outline"}
                  className="px-3 py-1 text-sm"
                >
                  {result.tier.label}
                </Badge>
              </div>

              {/* Score comparison */}
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">{t("probability.score")}</span>
                <span className="font-semibold tabular-nums">{result.competitive_map.candidate_score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("probability.cutoff")}</span>
                <span className="font-semibold tabular-nums">{result.competitive_map.cutoff_score}</span>
              </div>

              {/* Historical cutoffs */}
              {result.competitive_map.historical_years.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-foreground">Historical Cutoffs</h4>
                  </div>
                  {result.competitive_map.historical_years.map((y, i) => (
                    <div
                      key={y.year}
                      className={cn(
                        "flex justify-between items-center rounded-lg px-3 py-2 text-sm",
                        i === result.competitive_map.historical_years.length - 1
                          ? "bg-primary/5 border border-primary/10"
                          : "bg-muted/40",
                      )}
                    >
                      <span className="text-muted-foreground">{y.year}</span>
                      <span className="font-semibold tabular-nums">{y.cutoff_score}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t("probability.disclaimer")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}