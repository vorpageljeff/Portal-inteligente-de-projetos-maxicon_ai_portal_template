# Maxicon AI Project Portal

Portal para gestão de projetos, horas, riscos, status semanal e elaboração versionada de LPN com IA rastreável.

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

Validações do front-end:

```bash
npm run typecheck
npm test
npm run build
```

O front-end usa `/api` como proxy para preservar o contrato com o backend. Em desenvolvimento, configure `NEXT_PUBLIC_API_URL` em `.env.local` quando a API não estiver no destino padrão.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

API: `http://localhost:8000/docs`

Web: `http://localhost:3000`

Módulo de LPN: `http://localhost:3000/lpn`

## Experiência do portal

- navegação executiva por Visão Geral, Projetos, Status Semanais, Cronograma, Entregas, Riscos e Pendências, Horas e Orçamento, Documentos, Relatórios e Configurações;
- visão de projeto com resumo executivo, até seis KPIs, planejado versus realizado, avanços, pendências, riscos e horas;
- fechamento semanal em seis etapas, com geração assistida por IA e revisão humana obrigatória;
- levantamento de LPN com dados gerais, processo atual, objetivo, diagrama, processo proposto, restrições, evidências e aceite;
- versões aprovadas imutáveis, geração DOCX/PDF/JSON/SVG e registro das decisões sobre IA;
- layout responsivo com menu recolhível e tabelas adaptadas para telas menores.

As integrações ainda pendentes estão descritas em `docs/CONTRATOS-API-PENDENTES.md`. O diagnóstico e o guia operacional estão em `docs/DIAGNOSTICO-UX-UI.md` e `docs/GUIA-STATUS-SEMANAL.md`.

## Deploy

- Render usa `render.yaml` apenas para API e PostgreSQL.
- API usa plano `starter` para não hibernar.
- Banco usa `basic-256mb` para manter o menor custo pago.
- Vercel publica o frontend a partir do diretório `web`.

## Versionamento

Antes de qualquer push, upload ou deploy, o Codex deve informar o escopo e solicitar confirmação.
O fluxo está documentado em `docs/VERSIONING_WORKFLOW.md`.
