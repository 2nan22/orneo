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
};

export type DecisionScenarioData = {
  topic: string;
  evidence_chips: string[];
  scenarios: Array<{ id: string; title: string; risk: string; description: string }>;
  disclaimer: string;
};

export type JournalEntry = {
  id: number;
  category: JournalCategory;
  title: string;
  content: string;
  dart_corp_code: string;
  dart_corp_name: string;
  ai_summary: string | null;
  mood_score: number | null;
  is_reviewed: boolean;
  review_memo: string | null;
  created_at: string;
  related_goal: number | null;
  decision_scenario?: DecisionScenarioData | null;
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
  created_at: string;
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
