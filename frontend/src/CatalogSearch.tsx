import { useRef, useState, type RefObject } from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuery: (value: string, submitted?: boolean) => void;
};

export function CatalogSearch({ value, inputRef, onQuery }: Props) {
  const composing = useRef(false);
  const [composition, setComposition] = useState<string | null>(null);
  const shownValue = composition ?? value;

  function clear() {
    onQuery("");
    inputRef.current?.focus({ preventScroll: true });
  }

  return <form className="cu-search" role="search" aria-label="작품 검색" onSubmit={event => {
    event.preventDefault();
    if (!composing.current) onQuery(shownValue, true);
  }}>
    <Search size={18} strokeWidth={1.8} aria-hidden="true" />
    <input type="search" ref={inputRef} value={shownValue} enterKeyHint="search"
      autoComplete="off" autoCapitalize="none" spellCheck={false}
      aria-label="작품명 또는 작가명 검색" aria-keyshortcuts="/"
      placeholder="작품명, 작가명으로 검색"
      onCompositionStart={event => {
        composing.current = true;
        setComposition(event.currentTarget.value);
      }}
      onCompositionEnd={event => {
        composing.current = false;
        setComposition(null);
        onQuery(event.currentTarget.value);
      }}
      onChange={event => {
        if (composing.current) setComposition(event.target.value);
        else onQuery(event.target.value);
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composing.current) return;
        if (event.key === "Escape" && shownValue) {
          event.preventDefault();
          clear();
        }
      }}
    />
    {shownValue
      ? <button className="cu-search-clear" type="button" aria-label="검색어 지우기" onClick={clear}><X size={16} /></button>
      : <kbd aria-hidden="true">/</kbd>}
  </form>;
}
