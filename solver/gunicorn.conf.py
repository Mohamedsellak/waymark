# Production server: gunicorn -c gunicorn.conf.py server:app
import os

bind = os.environ.get("BIND", "127.0.0.1:5000")
workers = int(os.environ.get("WORKERS", "2"))
threads = 2
timeout = 60          # longest solve is ~10 s plus the road matrix lookup
graceful_timeout = 20
accesslog = "-"
