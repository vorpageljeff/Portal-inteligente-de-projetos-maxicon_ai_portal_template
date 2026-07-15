# Handoff de deploy no Render

Este documento orienta o Codex e o responsável humano no deploy do projeto.

## Estratégia

Use um Render Blueprint com `render.yaml` na raiz do repositório. O Blueprint deverá criar API, frontend e PostgreSQL como recursos relacionados.

## Antes do push

Execute:

```bash
python -m pytest backend/tests
cd web && npm ci && npm run build
cd ../mobile && flutter pub get && flutter analyze
```

Confirme:

- `.env` e secrets não estão no Git;
- migrations estão versionadas;
- `render.yaml` usa os diretórios corretos;
- backend escuta `$PORT`;
- frontend recebe `NEXT_PUBLIC_API_URL`;
- CORS está restrito;
- health check responde 200.

## Secrets para configurar no Render

- `SECRET_KEY`
- `AI_API_KEY`, somente se houver provedor real aprovado
- demais credenciais de integração futuras

## Validação pós-deploy

1. Abrir `/health` da API.
2. Abrir `/docs` em ambiente de teste, caso permitido.
3. Fazer login com usuário demo.
4. Abrir projeto de demonstração.
5. Criar ou editar uma tarefa.
6. Registrar uma hora.
7. Gerar status report.
8. Aprovar o relatório.
9. Conferir logs da API e frontend.

## Limite de automação

O Codex só poderá executar o deploy efetivo se o terminal estiver autenticado no repositório remoto e a conta do Render estiver conectada/autorizada. Sem isso, deverá preparar todos os arquivos, realizar commit local e informar o passo manual restante, sem declarar que o deploy ocorreu.
