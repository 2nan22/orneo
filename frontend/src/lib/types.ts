// frontend/src/lib/types.ts

export type JournalCategory = "investment" | "housing" | "learning" | "routine";

export type TodayAction = {
  id: number;
  text: string;
  completed: boolean;
};

export type DashboardData = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
  key_question: string;
  today_actions: TodayAction[];
};

export type JournalEntry = {
  id: number;
  category: JournalCategory;
  title: string;
  content: string;
  ai_summary: string | null;
  mood_score: number | null;
  is_reviewed: boolean;
  review_memo: string | null;
  created_at: string;
  related_goal: number | null;
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
