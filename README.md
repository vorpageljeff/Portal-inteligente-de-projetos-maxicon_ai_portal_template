# Maxicon AI Project Portal

MVP para gestão de projetos, horas, riscos, pendências e geração de status report semanal com IA.

## Stack

- Backend: Python + FastAPI
- Banco: PostgreSQL
- ORM: SQLAlchemy
- Migrações: Alembic
- Web: Next.js + TypeScript
- Mobile: Flutter/Dart
- Deploy da API e banco: Render
- Deploy web: Vercel gratuito

## Início rápido

### Banco

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Web

```bash
cd web
npm install
copy .env.local.example .env.local
npm run dev
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

API: `http://localhost:8000/docs`

Web: `http://localhost:3000`

## Deploy

- Render usa `render.yaml` apenas para API e PostgreSQL.
- API usa plano `starter` para não hibernar.
- Banco usa `basic-256mb` para manter o menor custo pago.
- Vercel publica o frontend a partir do diretório `web`.

## Versionamento

Antes de qualquer push, upload ou deploy, o Codex deve informar o escopo e solicitar confirmação.
O fluxo está documentado em `docs/VERSIONING_WORKFLOW.md`.
