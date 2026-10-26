"use client";

import { useCallback, useState } from "react";

export function useTouched() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [all, setAll] = useState(false);

  const touch = useCallback((name: string) => setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true })), []);
  const touchAll = useCallback(() => setAll(true), []);
  const reset = useCallback(() => {
    setTouched({});
    setAll(false);
  }, []);
  const show = (name: string) => all || Boolean(touched[name]);

  return { show, touch, touchAll, reset };
}

export function focusFirst(ids: string[]): void {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      return;
    }
  }
}
