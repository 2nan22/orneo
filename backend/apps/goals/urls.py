# backend/apps/goals/urls.py
"""목표 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.goals.views import GoalDetailView, GoalListCreateView

urlpatterns = [
    path("", GoalListCreateView.as_view(), name="goal-list-create"),
    path("<int:goal_id>/", GoalDetailView.as_view(), name="goal-detail"),
]
