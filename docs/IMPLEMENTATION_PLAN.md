# Implementation Plan

## Auditoria inicial

Problemas encontrados na base recebida:

- Backend falhava ao importar sem `.env`, porque `DATABASE_URL` e `SECRET_KEY` eram obrigatórios.
- Dependências estavam sem versão fixa e sem Ruff/mypy, apesar de serem critérios do projeto.
- Não havia migration inicial versionada para a tabela `projects`.
- O plano de implementação, decisões técnicas, segurança/LGPD e scripts de predeploy ainda não existiam.
- O MVP completo descrito no prompt é maior que o template atual; será entregue em fases incrementais e validadas.

## Fase 0 - Setup e fundação

- Padronizar dependências, lint, tipagem e testes.
- Garantir import da API sem depender de secrets reais.
- Criar migration inicial e documentação operacional.
- Preparar validações de predeploy.

## Fase 1 - Fundação funcional

- Implementar autenticação JWT com refresh token.
- Criar usuários, papéis, organizações, equipes e clientes.
- Adicionar autorização inicial por papel.
- Criar seed idempotente com dados fictícios.

## Fase 2 - Projetos e execução

- Expandir `Project` para o modelo exigido.
- Implementar tarefas, entregas, riscos, impedimentos e decisões.
- Criar endpoints REST com paginação e filtros.

## Fase 3 - Horas, capacidade e indicadores

- Implementar apontamento de horas.
- Separar horas rentáveis e não rentáveis.
- Calcular capacidade, demanda confirmada, demanda provável e alocação real.
- Criar dashboards individual, gerencial e executivo.

## Fase 4 - Status report e IA

- Consolidar dados semanais por projeto.
- Implementar `AIProvider` e `MockAIProvider`.
- Gerar rascunho com aviso obrigatório de revisão humana.
- Implementar aprovação, publicação e versionamento.

## Fase 5 - Web

- Criar layout corporativo responsivo.
- Implementar login, dashboard, projetos, tarefas, horas, riscos, impedimentos e status reports.
- Adicionar estados de loading, vazio, erro e sucesso.

## Fase 6 - Mobile

- Implementar login, meus projetos, minhas tarefas, detalhe da tarefa, apontamento de horas e impedimentos.
- Consumir a mesma API REST.

## Fase 7 - Qualidade e deploy

- Executar testes, lint, tipagem e builds.
- Validar `render.yaml`.
- Documentar deploy no Render.
- Fazer push/deploy somente com autorização e autenticação disponíveis.
