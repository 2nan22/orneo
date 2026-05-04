from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.news.models import NewsAnalysis
from apps.news.serializers import NewsAnalysisSerializer


class NewsAnalysisListView(generics.ListAPIView):
    """최근 뉴스 분석 결과 목록."""

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = NewsAnalysis.objects.prefetch_related("sector_analyses__sector").order_by("-analysis_date")
        market = self.request.query_params.get("market")
        if market:
            qs = qs.filter(market=market)
        return qs[:30]


class NewsAnalysisDetailView(generics.RetrieveAPIView):
    """뉴스 분석 결과 상세."""

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
