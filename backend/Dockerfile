FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV FLASK_APP=app:create_app \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/entrypoint.sh

COPY resolve_hosts.py /resolve_hosts.py
RUN python3 /resolve_hosts.py || echo "Warning: could not pre-resolve Google hosts"

EXPOSE 5000

CMD ["sh", "-c", "cat /google_hosts_cache >> /etc/hosts 2>/dev/null || true && sed 's/\\r//g' /app/entrypoint.sh | sh"]
