#!/bin/sh
set -eu

echo "Applying database migrations..."
until flask db upgrade; do
  echo "Database migrations failed, retrying in 3 seconds..."
  sleep 3
done

exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 "app:create_app()"
