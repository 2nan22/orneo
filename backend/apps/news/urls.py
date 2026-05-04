from django.urls import path

from apps.news import views

urlpatterns = [
    path("analyses/", views.NewsAnalysisListView.as_view(), name="news-analysis-list"),
    path("analyses/<int:pk>/", views.NewsAnalysisDetailView.as_view(), name="news-analysis-detail"),
]
