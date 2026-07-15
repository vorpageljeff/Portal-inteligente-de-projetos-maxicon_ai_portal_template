# Render Deploy

## Blueprint

Use o arquivo `render.yaml` na raiz do repositório para criar:

- API FastAPI;
- frontend Next.js;
- PostgreSQL gerenciado.

## Secrets obrigatórios

Configure no dashboard do Render:

- `SECRET_KEY`;
- `AI_API_KEY`, somente quando houver provedor real aprovado.

## Passos

1. Envie o repositório para o remoto autorizado.
2. No Render, crie um Blueprint apontando para o repositório.
3. Configure os secrets.
4. Aplique o Blueprint.
5. Acompanhe logs da API e do frontend.
6. Valide `/health`, `/docs`, dashboard web e fluxo de status report.

## Observações

- O backend deve escutar `0.0.0.0:$PORT`.
- O frontend deve usar `NEXT_PUBLIC_API_URL`.
- Migrations rodam no `startCommand` da API.
- Seed não deve rodar automaticamente em produção.
