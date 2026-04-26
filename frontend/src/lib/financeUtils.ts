// frontend/src/lib/financeUtils.ts
/**
 * 사용자 일지를 Finance 화면의 이벤트 카드 데이터로 변환한다.
 * 투자 목적 정보 제공이 아닌 교육·복기 목적임을 주의.
 */
import type { JournalEntry, FinanceEvent } from "@/lib/types";

export function journalToFinanceEvent(journal: JournalEntry): FinanceEvent {
  const isInvestment = journal.category === "investment";

  const title = isInvestment
    ? journal.dart_corp_name || journal.title
    : journal.title;

  const move = journal.ai_summary
    ? journal.ai_summary.slice(0, 35) + (journal.ai_summary.length > 35 ? "..." : "")
    : "AI 분석 생성 중...";

  const context = journal.ai_summary || "이 일지의 AI 요약이 생성 중입니다.";

  const direction =
    Array.isArray(journal.action_items) && journal.action_items.length > 0
      ? journal.action_items[0]
      : "다음 행동 방향을 기록해두세요.";

  const value = journal.mood_score ? journal.mood_score * 20 : 60;

  return {
    id:        journal.id,
    title,
    type:      isInvestment ? "주식" : "부동산",
    move,
    context,
    direction,
    value,
    source:    "journal",
  };
}
