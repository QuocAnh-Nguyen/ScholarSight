import { useCallback, useState } from "react";
import { assessProbability, fetchAssessmentHistory } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { AssessmentHistoryItem, ProbabilityRequest, ProbabilityResponse } from "@/lib/types";

export function useProbability(): {
  result: ProbabilityResponse | null;
  history: AssessmentHistoryItem[];
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  assess: (body: ProbabilityRequest) => Promise<void>;
  loadHistory: () => Promise<void>;
} {
  const { token } = useAuth();
  const [result, setResult] = useState<ProbabilityResponse | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assess = useCallback(async (body: ProbabilityRequest) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await assessProbability(token, body);
      setResult(resp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const items = await fetchAssessmentHistory(token);
      setHistory(items);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  return { result, history, loading, historyLoading, error, assess, loadHistory };
}