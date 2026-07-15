# Handoff de deploy

## Estratégia

- Render: apenas API FastAPI e PostgreSQL.
- Vercel: frontend Next.js, quando necessário.

## Antes do push

Execute:

```bash
python -m pytest
python -m ruff check backend
python -m mypy backend/app
```

Para validar o frontend localmente:

```bash
cd web
npm ci
npm run build
```

## Render

O Blueprint deve criar somente:

- `maxicon-ai-portal-api`
- `maxicon-ai-portal-db`

Configuração esperada:

- API: `starter`, para não hibernar.
- Banco: `basic-256mb`, menor Postgres pago atual no Blueprint.
- Python: `3.12.8`.
- Start Command: `python -m alembic upgrade head && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

Secrets:

- `SECRET_KEY`
- `AI_API_KEY`, somente se houver provedor real aprovado

## Vercel

Quando o web for publicado:

- Root Directory: `web`
- Build Command: `npm run build`
- Install Command: `npm ci`
- Environment Variable:
  - `NEXT_PUBLIC_API_URL=https://maxicon-ai-portal-api.onrender.com`

Depois, atualize no Render:

```text
CORS_ORIGINS=https://sua-url-vercel.vercel.app
```

## Validação pós-deploy

1. Abrir `/health` da API no Render.
2. Abrir `/docs`, se permitido.
3. Conferir logs da API.
4. Confirmar que o Blueprint não criou serviço web no Render.
