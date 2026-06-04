import { useCallback, useEffect, useState } from "react";
import {
  assessProbability,
  fetchAssessmentHistory,
  fetchUniversities,
  fetchAdmissionMethods,
} from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type {
  AssessmentHistoryItem,
  ProbabilityRequest,
  ProbabilityResponse,
  UniversityMeta,
  AdmissionMethod,
} from "@/lib/types";

export function useProbability(): {
  result: ProbabilityResponse | null;
  history: AssessmentHistoryItem[];
  universities: UniversityMeta[];
  methods: AdmissionMethod[];
  metaLoading: boolean;
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  assess: (body: ProbabilityRequest) => Promise<void>;
  loadHistory: () => Promise<void>;
} {
  const { token } = useAuth();
  const [result, setResult] = useState<ProbabilityResponse | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [universities, setUniversities] = useState<UniversityMeta[]>([]);
  const [methods, setMethods] = useState<AdmissionMethod[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dynamic university and admission method lists on mount
  useEffect(() => {
    if (!token) {
      setMetaLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMeta() {
      try {
        const [unis, meths] = await Promise.all([
          fetchUniversities(token!),
          fetchAdmissionMethods(token!),
        ]);
        if (!cancelled) {
          setUniversities(unis);
          setMethods(meths);
        }
      } catch {
        // Fall back to empty — component will use hardcoded defaults
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }

    loadMeta();
    return () => { cancelled = true; };
  }, [token]);

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

  return {
    result,
    history,
    universities,
    methods,
    metaLoading,
    loading,
    historyLoading,
    error,
    assess,
    loadHistory,
  };
}
