# Render Deploy

## Estratégia de menor custo sem hibernação

Use o Render apenas para:

- API FastAPI em `starter`;
- PostgreSQL em `basic-256mb`.

O frontend Next.js não deve ser criado no Render. Para evitar custo extra, publique o web na Vercel gratuita quando chegar a hora.

## Por que não usar free para a API?

Serviços free do Render hibernam depois de um período sem tráfego. Para manter o backend sempre acordado, use o plano `starter`.

## Blueprint

Use o arquivo `render.yaml` na raiz do repositório. Ele deve criar somente:

- `maxicon-ai-portal-api`
- `maxicon-ai-portal-db`

Se o Render mostrar `maxicon-ai-portal-web`, não aplique esse Blueprint antigo. Atualize o repositório primeiro.

## Secrets obrigatórios

Configure no dashboard do Render:

- `SECRET_KEY`;
- `AI_API_KEY`, somente quando houver provedor real aprovado.

## Variáveis importantes

- `PYTHON_VERSION`: fixada em `3.12.8` para evitar troca inesperada de runtime.
- `DATABASE_URL`: preenchida pelo banco gerenciado do Render.
- `CORS_ORIGINS`: depois do deploy web na Vercel, trocar para a URL real da Vercel.
- `AI_PROVIDER`: usar `mock` enquanto não houver provedor real aprovado.

## Passos

1. Envie o repositório atualizado para o GitHub.
2. No Render, sincronize ou recrie o Blueprint.
3. Confirme que aparecerão apenas API e banco.
4. Configure os secrets.
5. Aplique o Blueprint.
6. Valide `/health` e `/docs` da API.

## Observações

- O backend deve escutar `0.0.0.0:$PORT`.
- Migrations rodam no `startCommand` da API.
- O start usa `python -m alembic` e `python -m uvicorn` para evitar falha por PATH.
- Seed não deve rodar automaticamente em produção.
- Se o domínio do frontend mudar, atualize `CORS_ORIGINS`.
