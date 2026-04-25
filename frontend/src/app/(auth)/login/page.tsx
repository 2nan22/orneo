"use client";

import Card from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] bg-clip-text text-3xl font-bold text-transparent">
            ORNEO
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">
            오늘의 선택으로, 더 나은 나를.
          </p>
        </div>

        <Card>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">시작하기</h2>
          <p className="mb-6 text-sm text-[var(--color-text-sub)]">
            소셜 계정으로 간편하게 로그인하세요.
          </p>

          <div className="flex flex-col gap-3">
            {/* Google */}
            <a
              href="/api/auth/social/google/init"
              className="flex items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-text)] transition-all hover:bg-[var(--color-bg)] hover:shadow-sm active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Google로 계속하기
            </a>

            {/* Kakao — 미구현 안내 */}
            <button
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="#191919">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.62 5.07 4.08 6.48L5.1 21l4.98-2.82c.6.12 1.26.18 1.92.18 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
              </svg>
              카카오로 계속하기
              <span className="ml-auto text-xs opacity-60">준비 중</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--color-text-sub)]">
            로그인 시 ORNEO의{" "}
            <span className="underline">이용약관</span> 및{" "}
            <span className="underline">개인정보처리방침</span>에 동의합니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
