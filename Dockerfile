FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend /app/backend
RUN cd /app/backend && uv sync --frozen --no-dev

COPY --from=frontend-build /app/dist /app/dist

EXPOSE 8001

CMD ["/bin/sh", "-c", "cd /app/backend && exec .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
