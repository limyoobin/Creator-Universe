import { useEffect, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import { matchingProviderIds, type MatchingProvider, type MatchingProviderIssues, type MatchingProviderSetting, type MatchingReviewIssue } from "../../shared/matching-providers";
import type { ApiRequest } from "./portone";

export const matchProviderNames = { groq: "Groq", nvidia: "NVIDIA", gemini: "Gemini" } as const;
const consoles: Record<MatchingProvider, string> = {
  groq: "https://console.groq.com/keys",
  nvidia: "https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/build",
  gemini: "https://aistudio.google.com/apikey",
};
const settingsLabels = { configured: "키 설정됨", disabled: "사용 중지", missing_key: "키 미등록" };
const outcomeLabels: Record<MatchingReviewIssue, string> = {
  credentials: "키 권한 확인 필요", quota: "요청 한도 도달", unavailable: "응답 지연 또는 오류", invalid_response: "추천 근거 검증 실패",
};

export function MatchingProviders({ request, token, providersUsed, providerIssues }: {
  request: ApiRequest; token: string | null; providersUsed?: MatchingProvider[]; providerIssues?: MatchingProviderIssues;
}) {
  const [settings, setSettings] = useState<MatchingProviderSetting[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { setFailed(true); controller.abort(); }, 30_000);
    setSettings(null);
    setFailed(false);
    request<{ providers: MatchingProviderSetting[] }>("/api/ai/matching-providers", token, { signal: controller.signal, cache: "no-store" })
      .then(result => {
        if (controller.signal.aborted) return;
        if (!matchingProviderIds.every(provider => result?.providers?.some(item => item.provider === provider && Object.prototype.hasOwnProperty.call(settingsLabels, item.state)))) {
          throw new Error("Incomplete provider settings");
        }
        setSettings(result.providers);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [request, token, attempt]);

  return <div className="matching-providers">
    <div className="matching-providers-heading">
      <h3>AI 검토 현황</h3>
      <button type="button" onClick={() => setAttempt(value => value + 1)} aria-label="AI 서버 설정 새로고침" title="AI 서버 설정 새로고침"><RotateCw aria-hidden="true" size={15} /></button>
    </div>
    <ul aria-live="polite">
      {matchingProviderIds.map(provider => {
        const state = settings?.find(item => item.provider === provider)?.state;
        const issue = providerIssues?.[provider];
        const accepted = providersUsed?.includes(provider);
        return <li key={provider}>
          <span className="matching-provider-name">{matchProviderNames[provider]}<small>{state ? settingsLabels[state] : failed ? "설정 조회 실패" : "설정 확인 중"}</small></span>
          {accepted ? <span className="matching-provider-outcome accepted">최근 답변 참여</span>
            : issue ? <span className="matching-provider-outcome">{outcomeLabels[issue]}</span> : null}
        </li>;
      })}
    </ul>
    <details className="ai-review-info">
      <summary>추천 방식과 API 키 연결</summary>
      <p>작품 조건과 공개 프로필에서 추출한 키워드를 연결된 AI가 동시에 검토해요. 후보와 근거가 일치하는 답변을 모아 추천 순서를 정합니다.</p>
      <ol>
        <li>이용할 서비스에서 키를 발급하세요.
          <div className="matching-provider-links">{matchingProviderIds.map(provider => <a key={provider} href={consoles[provider]} target="_blank" rel="noreferrer">{matchProviderNames[provider]} <ExternalLink size={12} aria-hidden="true" /></a>)}</div>
        </li>
        <li><a href="https://dashboard.render.com/" target="_blank" rel="noreferrer">Render Dashboard</a>에서 Creator Universe 백엔드의 <b>Environment → Add Environment Variable</b>을 여세요.</li>
        <li><code>GROQ_API_KEY</code>, <code>NVIDIA_API_KEY</code>, <code>GEMINI_API_KEY</code>에 각각의 키를 입력하고 <b>Save and deploy</b>를 선택하세요.</li>
        <li>배포가 끝나면 새로고침하고 추천을 요청하세요. 응답을 검증한 서비스에 ‘최근 답변 참여’가 표시돼요.</li>
      </ol>
    </details>
  </div>;
}
