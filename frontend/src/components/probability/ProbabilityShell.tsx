import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProbability } from "@/hooks/useProbability";
import type { ProbabilityRequest } from "@/lib/types";

const UNIVERSITIES = [
  "Trường Đại học Bách khoa Hà Nội",
  "Trường Đại học Kinh tế Quốc dân",
  "Trường Đại học Ngoại thương",
];

const METHODS = [
  { value: "regular", label: "Xét điểm thi THPT" },
  { value: "priority", label: "Ưu tiên" },
  { value: "aptitude_test", label: "Đánh giá năng lực" },
];

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

  const tierVariant = (tier: string) => {
    if (tier === "safety") return "success" as const;
    if (tier === "target") return "warning" as const;
    return "danger" as const;
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">{t("probability.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("probability.subtitle")}</p>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>{t("probability.scoreLabel")}</Label>
              <Input
                type="number"
                step="0.25"
                value={score}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScore(e.target.value)}
                placeholder="25.5"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("probability.universityLabel")}</Label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">{t("probability.universityPlaceholder")}</option>
                {UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("probability.majorLabel")}</Label>
              <Input
                value={major}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMajor(e.target.value)}
                placeholder={t("probability.majorPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("probability.methodLabel")}</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleAssess} disabled={loading || !score || !university || !major} className="w-full">
              {loading ? t("probability.assessing") : t("probability.assess")}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-6">
            <CardHeader className="text-center">
              <div className="text-5xl mb-2">{result.tier.emoji}</div>
              <CardTitle className="text-2xl">{result.tier.label}</CardTitle>
              <CardDescription>
                {t("probability.percentile", { rank: result.tier.percentile_rank.toFixed(1) })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm border-t pt-3">
                <span>{t("probability.score")}</span>
                <span className="font-semibold">{result.competitive_map.candidate_score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("probability.cutoff")}</span>
                <span className="font-semibold">{result.competitive_map.cutoff_score}</span>
              </div>
              {result.competitive_map.historical_years.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Historical Cutoffs</h4>
                  {result.competitive_map.historical_years.map((y) => (
                    <div key={y.year} className="flex justify-between text-sm bg-muted px-3 py-2 rounded-md">
                      <span>{y.year}</span>
                      <span className="font-medium">{y.cutoff_score}</span>
                    </div>
                  ))}
                </div>
              )}
              <Badge variant={tierVariant(result.tier.tier)} className="mt-2">
                {result.tier.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-3">{t("probability.disclaimer")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}