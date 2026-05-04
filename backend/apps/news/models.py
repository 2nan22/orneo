from django.db import models


class MarketSector(models.Model):
    """TBL_MARKET_SECTOR — 섹터 마스터."""

    MARKET_CHOICES = [("KR", "한국"), ("US", "미국"), ("ALL", "공통")]

    sector_code = models.CharField(max_length=30, unique=True)
    sector_name_ko = models.CharField(max_length=50)
    sector_name_en = models.CharField(max_length=50)
    market = models.CharField(max_length=5, choices=MARKET_CHOICES)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_MARKET_SECTOR"
        ordering = ["display_order"]

    def __str__(self) -> str:
        return f"{self.sector_name_ko} ({self.market})"


class MarketCompany(models.Model):
    """TBL_MARKET_COMPANY — 회사 마스터."""

    MARKET_CHOICES = [("KR", "한국"), ("US", "미국")]

    ticker = models.CharField(max_length=20, unique=True)
    company_name_ko = models.CharField(max_length=100, blank=True)
    company_name_en = models.CharField(max_length=100)
    market = models.CharField(max_length=5, choices=MARKET_CHOICES)
    exchange = models.CharField(max_length=20, blank=True)
    sector = models.ForeignKey(
        MarketSector, null=True, blank=True, on_delete=models.SET_NULL
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_MARKET_COMPANY"

    def __str__(self) -> str:
        return f"{self.ticker} — {self.company_name_en}"


class NewsArticle(models.Model):
    """TBL_NEWS_ARTICLE — Tavily 수집 원문 기사."""

    MARKET_CHOICES = [("KR", "한국"), ("US", "미국")]

    article_url = models.TextField(unique=True)
    title = models.TextField()
    content = models.TextField(blank=True)
    source_name = models.CharField(max_length=100, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    market = models.CharField(max_length=5, choices=MARKET_CHOICES, blank=True)
    language = models.CharField(max_length=5, default="ko")
    raw_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_NEWS_ARTICLE"
        indexes = [
            models.Index(fields=["market"]),
            models.Index(fields=["-published_at"]),
        ]


class NewsAnalysis(models.Model):
    """TBL_NEWS_ANALYSIS — 분석 실행 헤더 (1 run = 1 row)."""

    STATUS_CHOICES = [
        ("PENDING",   "대기"),
        ("RUNNING",   "실행 중"),
        ("COMPLETED", "완료"),
        ("FAILED",    "실패"),
    ]
    ENGINE_CHOICES = [("langgraph", "LangGraph"), ("crewai", "CrewAI")]
    MARKET_CHOICES = [("KR", "한국"), ("US", "미국"), ("ALL", "전체")]

    analysis_date = models.DateField()
    market = models.CharField(max_length=5, choices=MARKET_CHOICES)
    engine_type = models.CharField(max_length=20, choices=ENGINE_CHOICES, default="langgraph")
    run_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    overall_analysis = models.TextField(blank=True)
    raw_result = models.JSONField(null=True, blank=True)
    run_duration_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_NEWS_ANALYSIS"
        unique_together = [("analysis_date", "market", "engine_type")]

    def __str__(self) -> str:
        return f"{self.analysis_date} [{self.market}] {self.engine_type} — {self.run_status}"


class NewsSectorAnalysis(models.Model):
    """TBL_NEWS_SECTOR_ANALYSIS — 섹터별 분석 결과."""

    analysis = models.ForeignKey(
        NewsAnalysis, on_delete=models.CASCADE, related_name="sector_analyses"
    )
    sector = models.ForeignKey(MarketSector, on_delete=models.PROTECT)
    analysis_text = models.TextField(blank=True)
    article_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_NEWS_SECTOR_ANALYSIS"
        unique_together = [("analysis", "sector")]


class UserWatchlist(models.Model):
    """TBL_USER_WATCHLIST — 사용자 관심 섹터/종목."""

    TYPE_CHOICES = [("SECTOR", "섹터"), ("COMPANY", "종목")]

    user_id = models.BigIntegerField(null=True, blank=True)
    watchlist_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    sector = models.ForeignKey(
        MarketSector, null=True, blank=True, on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        MarketCompany, null=True, blank=True, on_delete=models.CASCADE
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_USER_WATCHLIST"
