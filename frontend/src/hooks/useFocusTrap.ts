// frontend/src/hooks/useFocusTrap.ts
"use client";

import { useEffect } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * 모달 내 포커스를 가두는 훅.
 *
 * containerRef가 가리키는 요소 내부에서 Tab/Shift+Tab 키가
 * 벗어나지 못하도록 이벤트 핸들러를 등록한다.
 *
 * Args:
 *   containerRef: 포커스를 가둘 컨테이너 ref.
 *   isActive:     훅 활성화 여부. false면 등록/해제하지 않는다.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive = true,
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // 모달 오픈 시 첫 번째 포커스 가능 요소로 포커스 이동
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last  = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: 첫 요소에서 마지막 요소로 순환
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: 마지막 요소에서 첫 요소로 순환
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isActive]);
}
