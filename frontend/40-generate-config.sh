#!/bin/sh
set -eu

envsubst '${VITE_FIREBASE_API_KEY} ${VITE_FIREBASE_AUTH_DOMAIN} ${VITE_FIREBASE_PROJECT_ID} ${VITE_FIREBASE_STORAGE_BUCKET} ${VITE_FIREBASE_MESSAGING_SENDER_ID} ${VITE_FIREBASE_APP_ID} ${VITE_FIREBASE_VAPID_KEY} ${VITE_API_BASE_URL}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js