# backend/Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

FROM base AS deps
COPY requirements/base.txt requirements/base.txt
RUN pip install --upgrade pip && \
    pip install -r requirements/base.txt

FROM deps AS development
COPY requirements/dev.txt requirements/dev.txt
RUN pip install -r requirements/dev.txt
COPY . .
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM deps AS production
COPY . .
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
