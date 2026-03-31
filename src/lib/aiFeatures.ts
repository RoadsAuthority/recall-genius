import { apiRequest } from "@/lib/apiClient";

/** AI feature types for future implementation */
export type AIFeatureType =
  | "summary"
  | "flashcards"
  | "practice-questions"
  | "study-pack";

export interface CallAIFeatureParams {
  feature: AIFeatureType;
  payload?: Record<string, unknown>;
}

export interface CallAIFeatureResult {
  ok: boolean;
  data?: unknown;
  reason?: string;
  error?: string;
}

/**
 * Placeholder for AI feature calls. Calls the backend placeholder route.
 * When AI is implemented, replace the edge function body and optionally extend params/result.
 * Does not throw; returns { ok: false, reason: "not_implemented" } until AI is enabled.
 */
export async function callAIFeature(
  params: CallAIFeatureParams
): Promise<CallAIFeatureResult> {
  try {
    const data = await apiRequest<any>("/api/ai/call-ai-feature", {
      method: "POST",
      body: JSON.stringify({ feature: params.feature, payload: params.payload ?? {} }),
    });

    if (data?.ok === false) {
      return {
        ok: false,
        reason: data.reason ?? "not_implemented",
        error: data.error,
      };
    }

    return { ok: true, data: data?.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, reason: "request_failed" };
  }
}
