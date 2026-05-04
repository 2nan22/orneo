# backend/apps/news/urls.py
"""뉴스 분석 URL 라우팅."""

from django.urls import path

from apps.news import views

urlpatterns = [
    path("analyses/", views.NewsAnalysisListView.as_view(), name="news-analysis-list"),
    path("analyses/run/", views.NewsAnalysisRunView.as_view(), name="news-analysis-run"),
    path(
        "analyses/run-stream/",
        views.news_analysis_run_stream,
        name="news-analysis-run-stream",
    ),
    path("analyses/latest/", views.NewsAnalysisLatestView.as_view(), name="news-analysis-latest"),
    path(
        "analyses/by-date/<str:analysis_date>/",
        views.NewsAnalysisByDateView.as_view(),
        name="news-analysis-by-date",
    ),
    path(
        "analyses/tasks/<str:task_id>/",
        views.NewsAnalysisTaskStatusView.as_view(),
        name="news-analysis-task-status",
    ),
    path("analyses/<int:pk>/", views.NewsAnalysisDetailView.as_view(), name="news-analysis-detail"),
]
