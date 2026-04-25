"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError("Google 로그인이 취소됐습니다.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    if (!code) {
      setError("인증 코드를 받지 못했습니다.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    fetch("/api/auth/social/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message ?? "로그인에 실패했습니다.");
          setTimeout(() => router.replace("/login"), 2500);
          return;
        }
        router.replace("/dashboard");
      })
      .catch(() => {
        setError("네트워크 오류가 발생했습니다.");
        setTimeout(() => router.replace("/login"), 2500);
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center">
        {error ? (
          <>
            <p className="mb-2 text-sm font-medium text-red-500">{error}</p>
            <p className="text-xs text-[var(--color-text-sub)]">로그인 페이지로 이동합니다...</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-sub)]">Google 로그인 처리 중...</p>
          </>
        )}
      </div>
    </div>
  );
}
