FROM python:3.11-slim

WORKDIR /app

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    ca-certificates \
    gcc \
    libpq-dev

ENV FLASK_APP=app:create_app \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .
RUN chmod +x /app/entrypoint.sh

COPY resolve_hosts.py /resolve_hosts.py
RUN python3 /resolve_hosts.py || echo "Warning: could not pre-resolve Google hosts"

EXPOSE 5000

CMD ["sh", "-c", "cat /google_hosts_cache >> /etc/hosts 2>/dev/null || true && sed 's/\\r//g' /app/entrypoint.sh | sh"]
