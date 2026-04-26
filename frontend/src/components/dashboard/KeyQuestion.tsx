// frontend/src/components/dashboard/KeyQuestion.tsx
import Card from "@/components/ui/Card";
import Link from "next/link";

interface Props {
  question: string;
}

export default function KeyQuestion({ question }: Props) {
  return (
    <Card
      className="relative overflow-hidden border-[#B4C5FF] bg-gradient-to-br from-white to-[#EEF6FF] p-5"
    >
      <div className="relative flex gap-4">
        {/* Studio 아이콘 */}
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-2xl)] bg-[#2563EB]/10 text-[#2563EB]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L4 10l5.2-1.8L12 3z" />
            <path d="M19 17l.7 1.8L22 20l-2.3.8L19 23l-.7-2.2L16 20l2.3-1.2L19 17z" />
          </svg>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black tracking-wide text-[#2563EB]">
            ORNEO AI · 오늘의 핵심 질문
          </p>
          <h2 className="mt-2 text-xl font-black leading-7 tracking-[-0.04em] text-[#0B132B]">
            {question}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
            {"ORNEO AI가 개인 일지를 요약했어요.\n웹 검색과 실거래가 데이터로 시장 근거를 보강했어요.\n투자자문이 아니라 판단 보조로 제공됩니다."}
          </p>
          {/* CTA — Studio 화면으로 이동 */}
          <Link href="/studio">
            <button
              className="mt-4 inline-flex h-11 items-center gap-2
                         rounded-[var(--radius-2xl)] bg-[#2563EB]
                         px-4 text-sm font-black text-white
                         shadow-lg shadow-blue-200
                         hover:opacity-90 active:scale-[0.98]
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              심층 분석 보기
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17L17 7" /><path d="M8 7h9v9" />
              </svg>
            </button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
