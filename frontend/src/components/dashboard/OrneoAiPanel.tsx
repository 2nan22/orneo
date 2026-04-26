// frontend/src/components/dashboard/OrneoAiPanel.tsx
import Card from "@/components/ui/Card";

export default function OrneoAiPanel() {
  return (
    <Card padding="md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-black tracking-wide text-[#2563EB]">ORNEO AI</p>
          <h3 className="text-base font-black text-[#0B132B]">먼저 기기에서 정리해요</h3>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-[var(--radius-2xl)] bg-[#00C2A8]/10 text-[#008C7A]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 6a3 3 0 0 1 5-2.2A3 3 0 0 1 18 6v1a3 3 0 0 1 1 5.8A3.5 3.5 0 0 1 15.5 18H15a3 3 0 0 1-6 0h-.5A3.5 3.5 0 0 1 5 12.8 3 3 0 0 1 6 7V6a2 2 0 0 1 2-2" />
            <path d="M12 4v16" /><path d="M8 10h3" /><path d="M13 14h3" />
          </svg>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-600">
        {"민감한 일지와 목표는 먼저 기기에서 요약해요.\n필요한 경우에만 웹 검색과 공공 데이터를 연결해요.\n모델명은 설정 화면에서만 보여줍니다."}
      </p>
    </Card>
  );
}
