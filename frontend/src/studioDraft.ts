import { useEffect, useState } from "react";

export const blankStudioDraft = {
  title: "", format: "웹툰", genre: "판타지", synopsis: "", episodeTitle: "",
  accessType: "무료 공개", priceCoins: 0, publishMode: "초안 저장", scheduledAt: "",
  previewText: "", uploadMemo: "",
};
export type StudioDraftState = typeof blankStudioDraft;

function draftKey(userId: string) {
  return "creator-universe-studio-draft:" + userId;
}

function readDraft(userId?: string): StudioDraftState {
  if (!userId) return blankStudioDraft;
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(userId)) ?? "null");
    if (!saved || typeof saved !== "object") return blankStudioDraft;
    return Object.fromEntries(Object.entries(blankStudioDraft).map(([key, fallback]) => [
      key, typeof saved[key] === typeof fallback ? saved[key] : fallback,
    ])) as StudioDraftState;
  } catch {
    return blankStudioDraft;
  }
}

export function useStudioDraft(userId?: string) {
  const [draft, setDraft] = useState(blankStudioDraft);
  const [savedTitle, setSavedTitle] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const restored = readDraft(userId);
    setDraft(restored);
    setSavedTitle(restored.title);
    setMessage("");
  }, [userId]);
  function update<K extends keyof StudioDraftState>(key: K, value: StudioDraftState[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setMessage("");
  }
  function save() {
    if (!userId || !draft.title.trim()) {
      setMessage("초안에 작품 제목을 입력해 주세요.");
      return;
    }
    try {
      localStorage.setItem(draftKey(userId), JSON.stringify(draft));
      setSavedTitle(draft.title);
      setMessage("이 브라우저에 초안을 저장했습니다.");
    } catch {
      setMessage("이 브라우저에 저장할 수 없습니다. 원고를 복사해 보관해 주세요.");
    }
  }
  return { draft, savedTitle, message, update, save };
}
