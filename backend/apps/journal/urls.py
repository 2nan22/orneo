# backend/apps/journal/urls.py
"""의사결정 일지 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.journal.views import (
    JournalDetailView,
    JournalListCreateView,
    JournalReviewView,
    JournalScenariosView,
)

urlpatterns = [
    path("", JournalListCreateView.as_view(), name="journal-list-create"),
    path("<int:pk>/", JournalDetailView.as_view(), name="journal-detail"),
    path("<int:pk>/review/", JournalReviewView.as_view(), name="journal-review"),
    path("<int:pk>/scenarios/", JournalScenariosView.as_view(), name="journal-scenarios"),
]
