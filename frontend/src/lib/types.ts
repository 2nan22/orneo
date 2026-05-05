// frontend/src/lib/types.ts

export type JournalCategory = "investment" | "housing" | "learning" | "routine";

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  subscription_plan: string;
  risk_tolerance: string;
  onboarded_at: string | null;
  primary_provider: string;
  preferred_region: string;
  preferred_region_code: string;
  learning_interests: string[];
  preferred_ai_model: string;
  notify_daily_action: boolean;
  created_at: string;
};

export type TodayAction = {
  id: number;
  text: string;
  category: string;
  completed: boolean;
};

export type ScoreDelta = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
};

export type DashboardData = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
  delta: ScoreDelta | null;
  key_question: string;
  today_actions: TodayAction[];
  brief_summary: string;
};

export type DecisionScenarioData = {
  topic: string;
  evidence_chips: string[];
  scenarios: Array<{ id: string; title: string; risk: string; description: string }>;
  disclaimer: string;
};

/** Studio 화면에서 사용하는 경량 일지 타입 */
export type StudioJournal = {
  id: number;
  category: "investment" | "housing";
  title: string;
  dart_corp_name: string;
  ai_summary: string | null;
  created_at: string;
  decision_scenario: DecisionScenarioData | null;
};

export type JournalEntry = {
  id: number;
  category: JournalCategory;
  title: string;
  content: string;
  dart_corp_code: string;
  dart_corp_name: string;
  ai_summary: string | null;
  action_items: string[];
  mood_score: number | null;
  is_reviewed: boolean;
  review_memo: string | null;
  created_at: string;
  related_goal: number | null;
  decision_scenario?: DecisionScenarioData | null;
};

/** Finance 화면의 이벤트 카드 데이터 구조 */
export type FinanceEvent = {
  id:        number;
  title:     string;
  type:      "주식" | "부동산" | "금리·환율" | "공시";
  move:      string;
  context:   string;
  direction: string;
  value:     number;
  source:    "journal";
};

export type GoalCategory = "finance" | "housing" | "learning" | "routine";

export type Goal = {
  id: number;
  title: string;
  description: string | null;
  category: GoalCategory;
  target_amount: number | null;
  target_date: string | null;
  progress: number;
  is_active: boolean;
  created_at: string;
};

export type RecommendedStock = {
  ticker: string;
  name: string;
};

export type InvestmentSignal = 1 | 2 | 3 | 4 | 5;

export type NewsSectorAnalysis = {
  id: number;
  sector_name_ko: string;
  analysis_text: string;
  article_count: number;
  investment_signal: InvestmentSignal;
  investment_signal_raw: InvestmentSignal;
  recommended_stocks: RecommendedStock[];
};

export type NewsAnalysisRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type MarketCode = "KR" | "US";

export type NewsAnalysis = {
  id: number;
  analysis_date: string;
  market: MarketCode | "ALL";
  engine_type: string;
  run_status: NewsAnalysisRunStatus;
  overall_analysis: string;
  run_duration_ms: number | null;
  sector_analyses: NewsSectorAnalysis[];
  created_at: string;
};

/** market="ALL" 호출 결과의 단일 시장 부분 */
export type MarketAnalysis = {
  market: MarketCode;
  overall_analysis: string;
  sector_analyses: NewsSectorAnalysis[];
  run_duration_ms: number | null;
};

/** market="ALL" GET / SSE complete 응답 — KR/US 두 시장을 함께 표현 */
export type FullAnalysis = {
  analysis_date: string;
  run_duration_ms: number | null;
  markets: Record<MarketCode, MarketAnalysis | null>;
};

export type NewsTaskStatus = {
  task_id: string;
  state: "PENDING" | "STARTED" | "PROGRESS" | "SUCCESS" | "FAILURE" | string;
  result?: { analysis_id: number; run_duration_ms: number };
  error?: string;
};

export type WeeklyReport = {
  id: number;
  week_start: string;
  week_end: string;
  capital_score: number;
  goal_achievement_rate: number;
  journal_count: number;
  action_completion_rate: number;
  highlights: string[];
  improvements: string[];
  next_week_action: string;
  ai_summary: string | null;
  created_at: string;
};
