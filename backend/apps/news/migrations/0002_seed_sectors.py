from django.db import migrations

SECTORS = [
    ("SEMICONDUCTOR", "반도체",  "Semiconductor",           "KR",  1),
    ("AI",            "AI",      "Artificial Intelligence",  "ALL", 2),
    ("SHIPBUILDING",  "조선",    "Shipbuilding",             "KR",  3),
    ("RAW_MATERIALS", "원자재",  "Raw Materials",            "ALL", 4),
    ("ENERGY",        "에너지",  "Energy",                   "ALL", 5),
    ("FINANCE",       "금융",    "Finance",                  "ALL", 6),
]


def seed_sectors(apps, schema_editor):
    MarketSector = apps.get_model("news", "MarketSector")
    for code, ko, en, market, order in SECTORS:
        MarketSector.objects.get_or_create(
            sector_code=code,
            defaults={
                "sector_name_ko": ko,
                "sector_name_en": en,
                "market": market,
                "display_order": order,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("news", "0001_initial")]

    operations = [migrations.RunPython(seed_sectors, migrations.RunPython.noop)]
