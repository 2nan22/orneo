# backend/apps/reports/migrations/0002_add_weekly_report_schedule.py
"""주간 리포트 Celery Beat 스케줄 등록."""

from __future__ import annotations

from django.db import migrations


def add_weekly_report_schedule(apps, schema_editor):
    """매주 월요일 09:00 주간 리포트 자동 생성 스케줄을 등록한다."""
    CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="0",
        hour="9",
        day_of_week="1",  # 월요일
        day_of_month="*",
        month_of_year="*",
        timezone="Asia/Seoul",
    )

    PeriodicTask.objects.get_or_create(
        name="주간 복기 리포트 자동 생성",
        defaults={
            "task": "apps.reports.tasks.generate_weekly_reports_for_all_users",
            "crontab": schedule,
            "enabled": True,
            "description": "매주 월요일 09:00(KST) 전체 온보딩 완료 사용자 주간 리포트 생성",
        },
    )


def remove_weekly_report_schedule(apps, schema_editor):
    """주간 리포트 스케줄을 삭제한다."""
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name="주간 복기 리포트 자동 생성").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0001_initial"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(
            add_weekly_report_schedule,
            reverse_code=remove_weekly_report_schedule,
        ),
    ]
