# backend/apps/reports/services.py
"""주간 복기 리포트 생성 서비스."""

from __future__ import annotations

import logging
from datetime import date, timedelta

from django.db import transaction

from apps.accounts.models import CustomUser
from apps.reports.exceptions import ReportAlreadyExistsError
from apps.reports.models import WeeklyReport

logger = logging.getLogger(__name__)


def _get_week_bounds(week_start: date) -> tuple[date, date]:
    """주어진 날짜 기준 월~일 범위를 반환한다.

    Args:
        week_start: 주 시작 기준 날짜 (월요일이어야 함).

    Returns:
        (week_start, week_end) 튜플. week_end는 week_start + 6일.
    """
    return week_start, week_start + timedelta(days=6)


def _calculate_goal_achievement_rate(user: CustomUser) -> float:
    """활성 목표 중 progress >= 1.0인 목표 비율을 계산한다.

    Args:
        user: 대상 사용자.

    Returns:
        달성률 (0.0~1.0). 활성 목표가 없으면 0.0.
    """
    from apps.goals.models import Goal

    active_goals = list(Goal.objects.filter(user=user, is_active=True).values("progress"))
    if not active_goals:
        return 0.0
    achieved = sum(1 for g in active_goals if g["progress"] >= 1.0)
    return round(achieved / len(active_goals), 4)


def _calculate_action_completion_rate(
    user: CustomUser,
    week_start: date,
    week_end: date,
) -> tuple[int, float]:
    """해당 주 일지 수와 행동 완료율을 계산한다.

    action_items(추천 행동)가 있는 일지 중 reviewed_at이 있는(복기 완료) 비율을
    행동 완료율로 간주한다.

    Args:
        user: 대상 사용자.
        week_start: 주 시작일.
        week_end: 주 종료일 (inclusive).

    Returns:
        (journal_count, action_completion_rate) 튜플.
    """
    from apps.journal.models import JournalEntry

    week_journals = JournalEntry.objects.filter(
        user=user,
        created_at__date__gte=week_start,
        created_at__date__lte=week_end,
    )
    journal_count = week_journals.count()

    with_actions = week_journals.exclude(action_items=[])
    total_with_actions = with_actions.count()
    if total_with_actions == 0:
        return journal_count, 0.0

    reviewed = with_actions.exclude(reviewed_at=None).count()
    return journal_count, round(reviewed / total_with_actions, 4)


def _build_highlights_and_improvements(
    goal_achievement_rate: float,
    journal_count: int,
    action_completion_rate: float,
) -> tuple[list[str], list[str]]:
    """지표 기반으로 잘한 점/놓친 점 목록을 생성한다.

    Args:
        goal_achievement_rate: 목표 달성률.
        journal_count: 주간 일지 수.
        action_completion_rate: 행동 완료율.

    Returns:
        (highlights, improvements) 튜플.
    """
    highlights: list[str] = []
    improvements: list[str] = []

    if goal_achievement_rate >= 0.5:
        highlights.append(f"목표 달성률 {goal_achievement_rate * 100:.0f}%로 절반 이상 달성")
    else:
        improvements.append("달성 목표 비율이 50% 미만 — 목표 재검토 또는 세분화 필요")

    if journal_count >= 3:
        highlights.append(f"이번 주 {journal_count}개 일지 작성으로 꾸준한 기록 유지")
    elif journal_count == 0:
        improvements.append("이번 주 일지 작성 없음 — 작은 결정부터 기록 시작 권장")
    else:
        improvements.append(f"일지 {journal_count}개 작성 — 주 3회 이상 목표 도전")

    if action_completion_rate >= 0.7:
        highlights.append(f"추천 행동 완료율 {action_completion_rate * 100:.0f}%로 높은 실행력")
    elif action_completion_rate > 0:
        improvements.append(f"행동 완료율 {action_completion_rate * 100:.0f}% — 복기 습관 강화 필요")

    return highlights, improvements


def _determine_next_week_action(
    goal_achievement_rate: float,
    journal_count: int,
) -> str:
    """다음 주 핵심 행동을 제안한다.

    Args:
        goal_achievement_rate: 목표 달성률.
        journal_count: 주간 일지 수.

    Returns:
        핵심 행동 문자열.
    """
    if journal_count == 0:
        return "이번 주 작은 결정 하나를 골라 첫 일지를 작성해보세요."
    if goal_achievement_rate < 0.3:
        return "가장 중요한 목표 1개를 선택하고 이번 주 첫 진척을 만들어보세요."
    if goal_achievement_rate >= 0.8:
        return "달성한 목표를 검토하고 다음 단계 목표를 새롭게 설정해보세요."
    return "일지 복기를 통해 지난주 행동 중 1가지를 개선해보세요."


@transaction.atomic
def generate_weekly_report(
    *,
    user: CustomUser,
    week_start: date,
) -> WeeklyReport:
    """주간 복기 리포트를 생성한다.

    이미 해당 주 리포트가 존재하면 ReportAlreadyExistsError를 발생시킨다.

    Args:
        user: 리포트 생성 대상 사용자.
        week_start: 해당 주 시작일 (월요일).

    Returns:
        생성된 WeeklyReport 인스턴스.

    Raises:
        ReportAlreadyExistsError: 해당 주차 리포트가 이미 존재하는 경우.
    """
    if WeeklyReport.objects.filter(user=user, week_start=week_start).exists():
        raise ReportAlreadyExistsError(
            f"해당 주차 리포트가 이미 존재합니다: user_id={user.pk} week_start={week_start}"
        )

    week_end = week_start + timedelta(days=6)

    goal_achievement_rate = _calculate_goal_achievement_rate(user)
    journal_count, action_completion_rate = _calculate_action_completion_rate(
        user, week_start, week_end
    )
    highlights, improvements = _build_highlights_and_improvements(
        goal_achievement_rate, journal_count, action_completion_rate
    )
    next_week_action = _determine_next_week_action(goal_achievement_rate, journal_count)

    # 라이프 캐피털 점수는 dashboard 서비스에서 계산한 최신 점수를 활용
    from apps.dashboard.services import calculate_capital_score

    score_result = calculate_capital_score(user=user)
    capital_score = int(score_result.capital_score)

    report = WeeklyReport.objects.create(
        user=user,
        week_start=week_start,
        week_end=week_end,
        capital_score=capital_score,
        goal_achievement_rate=goal_achievement_rate,
        journal_count=journal_count,
        action_completion_rate=action_completion_rate,
        highlights=highlights,
        improvements=improvements,
        next_week_action=next_week_action,
        ai_summary="",  # Celery 태스크에서 비동기 생성
    )

    logger.info(
        "주간 리포트 생성 완료: id=%d user_id=%d week_start=%s score=%d",
        report.pk,
        user.pk,
        week_start,
        capital_score,
    )
    return report
