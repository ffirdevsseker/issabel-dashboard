#!/bin/bash
# Issabel Dashboard backend başlatıcı
# Apache ve vite.config.js port 5000 bekliyor
cd "$(dirname "$0")"
source venv/bin/activate
exec uvicorn app.main:app --host 127.0.0.1 --port 5000 --workers 1
