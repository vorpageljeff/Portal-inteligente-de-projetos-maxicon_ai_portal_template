# Relatorio de Validacao de Regras de Negocio

Data da auditoria: 2026-07-15
Atualizacao pos-correcao P0/P1: 2026-07-15
Atualizacao de refinamento operacional: 2026-07-15

## 1. Resumo executivo

O sistema evoluiu de uma tela demonstrativa para um MVP tecnico com frontend consumindo API real, backend FastAPI, persistencia via SQLAlchemy/PostgreSQL e migrations Alembic. Ja existe fluxo funcional para cadastrar projetos, marcos, riscos e acoes, e o dashboard executivo e recalculado a partir desses registros.

Parecer atual: **APTO COM RESSALVAS** para piloto tecnico controlado. Foram adicionados autenticacao JWT, usuarios, auditoria, tarefas, entregas, impedimentos, apontamentos de horas, status report persistido/versionado/aprovavel, telas operacionais integradas e testes de fluxo minimo. Ainda nao e apto para producao porque faltam RBAC granular, equipes completas, capacidade, workflow avancado de aprovacao de horas e IA real auditavel.

## 2. Arquitetura encontrada

- Frontend: Next.js em `web/app/page.tsx`, com layout de dashboard, navegacao por secoes e formularios.
- Backend: FastAPI em `backend/app/main.py`, rotas versionadas em `backend/app/api/v1`.
- Persistencia: SQLAlchemy em `backend/app/db/session.py`, modelos em `backend/app/models`.
- Banco esperado: PostgreSQL por `DATABASE_URL`, com normalizacao de URL em `backend/app/core/config.py`.
- Migrations: Alembic em `backend/alembic/versions`.
- IA/status report: `backend/app/services/status_report.py` consolida dados reais do periodo e cria versoes de rascunho; IA segue mock/configuravel.
- Testes: `backend/tests/test_health.py`, `backend/tests/test_status_report.py` e `backend/tests/test_business_rules.py`.

## 3. Resultado geral

| Area | Situacao | Prioridade |
| --- | --- | --- |
| Frontend consumindo backend | PARCIALMENTE CONFORME | P1 |
| Persistencia em banco | PARCIALMENTE CONFORME | P1 |
| Dashboard calculado por registros | PARCIALMENTE CONFORME | P1 |
| Autenticacao e permissoes | PARCIALMENTE CONFORME | P1 |
| Projetos | PARCIALMENTE CONFORME | P1 |
| Tarefas, entregas e impedimentos | PARCIALMENTE CONFORME | P1 |
| Horas e capacidade | PARCIALMENTE CONFORME | P1 |
| Riscos | PARCIALMENTE CONFORME | P1 |
| Status report semanal | PARCIALMENTE CONFORME | P1 |
| IA rastreavel e auditavel | NAO CONFORME | P0 |
| Auditoria e LGPD operacional | PARCIALMENTE CONFORME | P1 |
| Testes automatizados de regras | PARCIALMENTE CONFORME | P1 |

## 4. Itens conformes

### ARQ02 - Configuracao por ambiente

- Evidencia: `backend/app/core/config.py` usa `BaseSettings`; `web/app/page.tsx` usa `NEXT_PUBLIC_API_URL`.
- Endpoint: todos os endpoints dependem da configuracao base.
- Tabela: nao aplicavel.
- Regra esperada: URLs e secrets configuraveis por ambiente.
- Comportamento atual: existe configuracao por variavel de ambiente; `SECRET_KEY` tem fallback local documentado.
- Risco: medio se producao usar fallback.
- Recomendacao: bloquear inicializacao em producao quando `SECRET_KEY=dev-only-change-me`.
- Prioridade: P1.

### ARQ04 - Migrations

- Evidencia: `202607150001_initial_projects.py` e `202607150002_dashboard_work_items.py`.
- Endpoint: nao aplicavel.
- Tabelas: `projects`, `milestones`, `risks`, `action_items`.
- Regra esperada: banco vazio criado por migrations.
- Comportamento atual: `python -m alembic upgrade head --sql` gerou SQL completo com sucesso.
- Risco: baixo para o escopo atual.
- Recomendacao: adicionar teste de migration contra PostgreSQL real em CI.
- Prioridade: P2.

## 5. Itens parcialmente conformes

### DAD01 / FRONT01 - Origem real dos dados no dashboard

- Evidencia: `web/app/page.tsx` chama `GET /api/v1/dashboard/executive` e `GET /api/v1/projects`.
- Endpoint: `/api/v1/dashboard/executive`, `/api/v1/projects`.
- Tabelas: `projects`, `milestones`, `risks`, `action_items`.
- Regra esperada: indicadores exibidos no frontend devem vir do banco.
- Comportamento atual: os principais indicadores vem da API, mas parte da alocacao de horas e formatacao ainda e calculada no frontend.
- Risco: medio; divergencia entre tela e regra oficial se outras telas/calculos forem adicionados.
- Recomendacao: mover todos os indicadores de negocio para servico backend e expor payload final do dashboard.
- Prioridade: P1.

### DASH01 a DASH06 - Indicadores executivos

- Evidencia: `backend/app/api/v1/routes/dashboard.py`.
- Endpoint: `/api/v1/dashboard/executive`.
- Tabelas: `projects`, `milestones`, `risks`, `action_items`.
- Regra esperada: formulas documentadas por periodo, status, permissao e fonte.
- Comportamento atual: projetos ativos sao todos exceto `COMPLETED`; progresso medio e media simples; horas somam campos agregados no projeto; risco critico considera `CRITICAL` nao fechado; tendencia semanal e simulada a partir do progresso atual.
- Risco: alto; o dashboard pode parecer executivo, mas ainda nao e historico nem auditavel por periodo.
- Recomendacao: criar servico `DashboardService`, documentar formulas, incluir filtros de periodo/projeto/cliente/equipe e testes.
- Prioridade: P1.

### PROJ01 a PROJ03 - Cadastro de projetos

- Evidencia: `ProjectCreate` em `backend/app/schemas/project.py`; rotas em `backend/app/api/v1/routes/projects.py`.
- Endpoint: `GET/POST/PATCH /api/v1/projects`.
- Tabela: `projects`.
- Regra esperada: nome, cliente, responsavel, datas, situacao, horas contratadas, equipe e descricao.
- Comportamento atual: nome, cliente, datas, status e horas existem; responsavel e descricao sao opcionais; equipe nao existe.
- Risco: alto para operacao real, pois nao ha propriedade por equipe/usuario.
- Recomendacao: tornar campos de governanca obrigatorios no fluxo real e criar entidades `users`, `teams` e vinculos.
- Prioridade: P1.

### RSC01 / RSC02 - Riscos

- Evidencia: `Risk` em `backend/app/models/work_items.py`; `RiskCreate` em `backend/app/schemas/dashboard.py`.
- Endpoint: `POST /api/v1/dashboard/projects/{project_id}/risks`.
- Tabela: `risks`.
- Regra esperada: probabilidade, impacto, criticidade calculada, responsavel, plano, prazo e situacao.
- Comportamento atual: existe titulo, descricao, severidade manual e status.
- Risco: alto; criticidade nao e calculada e risco pode ser encerrado sem evidencia.
- Recomendacao: adicionar probabilidade, impacto, dono, plano de mitigacao, prazo, evidencia e regra deterministica de criticidade.
- Prioridade: P1.

## 6. Itens nao conformes

### USR01 a USR04 - Autenticacao, perfis e escopo

- Evidencia: `backend/app/models/security.py`, `backend/app/core/security.py`, `backend/app/api/deps.py`, `backend/app/api/v1/routes/auth.py`.
- Endpoint: `/api/v1/auth/bootstrap-admin`, `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/users`.
- Tabela: `users`.
- Regra esperada: login real, hash de senha, tokens, perfis e autorizacao no backend.
- Comportamento atual: API exige JWT nas rotas principais; admin pode criar usuarios; ainda nao ha escopo por projeto/cliente nem matriz granular de permissoes.
- Risco: medio/alto para clientes externos.
- Recomendacao: implementar RBAC por entidade, vinculo usuario-projeto-cliente e tokens refresh/logout server-side.
- Prioridade: P1.

### TAR01 / ENT01 / RSC03 - Tarefas, entregas e impedimentos

- Evidencia: `backend/app/models/operations.py`, `backend/app/api/v1/routes/operations.py`, secoes `Tarefas`, `Entregas` e `Impedimentos` em `web/app/page.tsx`.
- Endpoint: `/api/v1/operations/projects/{project_id}/tasks`, `/deliverables`, `/impediments`.
- Tabela: `tasks`, `deliverables`, `impediments`.
- Regra esperada: registros vinculados ao projeto, com responsavel, datas, status e validacoes server-side.
- Comportamento atual: front cadastra e lista registros reais; backend bloqueia projeto encerrado/cancelado, prazo invalido de impedimento e entrega concluida sem data real.
- Risco: medio; ainda falta edicao, historico detalhado e dependencias entre tarefas.
- Recomendacao: adicionar edicao/auditoria before-after, dependencias e fluxo de aceite formal.
- Prioridade: P1.

### HOR01 a HOR06 - Horas e capacidade

- Evidencia: `TimeEntry` em `backend/app/models/operations.py`; rota em `backend/app/api/v1/routes/operations.py`.
- Endpoint: `POST/GET /api/v1/operations/projects/{project_id}/time-entries`.
- Tabela: `time_entries`.
- Regra esperada: apontamentos por usuario, tarefa, data, tipo, aprovacao, capacidade e regras de sobreposicao.
- Comportamento atual: apontamento de horas existe com tipo e status de aprovacao; front cadastra/lista horas reais; horas aprovadas atualizam totais do projeto. Backend valida valor maior que zero, limite de 24h e vinculo da tarefa ao projeto. Ainda nao ha calendario, capacidade, sobreposicao ou aprovacao por gestor.
- Risco: medio/alto.
- Recomendacao: criar workflow de aprovacao, capacidade mensal e validacao de sobreposicao/limite diario por usuario.
- Prioridade: P1.

### REP01 a REP10 - Status report semanal

- Evidencia: `StatusReport`, `StatusReportVersion`, `StatusReportService.generate_from_project`.
- Endpoint: `POST /api/v1/status-reports`, `GET /api/v1/status-reports/project/{project_id}`, `POST /api/v1/status-reports/{report_id}/approve`.
- Tabela: `status_reports`, `status_report_versions`.
- Regra esperada: selecionar projeto e periodo, consolidar dados reais, gerar rascunho, revisar, aprovar, versionar e exportar.
- Comportamento atual: rascunho e gerado a partir de tarefas, entregas, riscos, impedimentos e horas aprovadas; versoes sao persistidas e aprovacao humana e registrada. Falta exportacao e imutabilidade mais forte para relatorio aprovado.
- Risco: medio.
- Recomendacao: bloquear nova versao sobre report aprovado, criar exportacao identica ao conteudo aprovado e tela completa de revisao.
- Prioridade: P1.

### IA01 a IA09 - IA rastreavel

- Evidencia: `ai_provider="mock"` em `backend/app/core/config.py`; decisao documentada em `docs/DECISIONS.md`.
- Endpoint: `POST /api/v1/status-reports/draft`.
- Tabela: inexistente.
- Regra esperada: adapter configuravel, minimizacao, evidencia, fallback, auditoria e aprovacao.
- Comportamento atual: nao ha provider real, adapter, log de prompt, campos enviados, evidencias ou auditoria.
- Risco: alto; se trocar para IA real sem camada de governanca, dados podem vazar e textos podem alucinar.
- Recomendacao: manter mock isolado ate existir adapter, politica de dados, prompt versionado, evidencias e trilha de auditoria.
- Prioridade: P0.

### SEG03 / SEG07 - Auditoria e seguranca da API

- Evidencia: `AuditLog` e `app/services/audit.py`.
- Endpoint: todos.
- Tabela: `audit_logs`.
- Regra esperada: registrar usuario, acao, entidade, antes/depois; proteger API.
- Comportamento atual: criacao/alteracao de entidades principais registra auditoria com ator e entidade; ainda falta cobertura total de before/after e consulta administrativa de logs.
- Risco: medio.
- Recomendacao: ampliar cobertura, adicionar tela de auditoria e politicas de retencao.
- Prioridade: P1.

## 7. Dados mockados encontrados

- `docs/DECISIONS.md`: decisao explicita de IA mock no MVP. Situacao: CONFORME como decisao documentada, NAO CONFORME para piloto real sem adapter.
- `docs/RENDER_DEPLOY.md` e `docs/SECURITY_LGPD.md`: `AI_PROVIDER=mock`.
- `web/app/page.tsx`: placeholders e valores default de formulario com Cotrijal e numeros demonstrativos (`progress_percent=63`, horas default). Situacao: PARCIALMENTE CONFORME, pois sao valores de formulario, nao indicadores fixos exibidos em producao.
- `web/app/page.tsx`: periodo fixo no seletor (`12 a 18 de maio de 2025`). Situacao: NAO CONFORME para regra de periodo real.
- `backend/app/api/v1/routes/dashboard.py`: tendencia semanal calculada artificialmente a partir do progresso atual. Situacao: NAO CONFORME para historico real.

## 8. Fluxos sem integracao

- Equipes.
- Decisoes.
- Pendencias por Maxicon, cliente, SAP e terceiros.
- Reunioes.
- Aprovacao gerencial completa de horas.
- Capacidade e disponibilidade.
- Publicacao e exportacao do report aprovado.
- Edicao e historico detalhado para tarefas, entregas, impedimentos e horas.

## 9. Regras sem testes

Ainda sem testes automatizados para:

- validacao de datas de projeto via API;
- limites de progresso e horas;
- dashboard executivo;
- rentabilidade;
- risco critico;
- mudanca de status do projeto ao criar risco alto/critico;
- marcos atrasados;
- filtros de periodo;
- autenticacao e permissao;
- versionamento multiplas versoes;
- migrations contra PostgreSQL real.

## 10. Riscos de seguranca e LGPD

- API publica sem autenticacao.
- Sem autorizacao por perfil ou escopo de cliente/projeto.
- Sem auditoria de alteracoes.
- Sem politica implementada de retencao, exclusao, anonimizacao ou arquivamento.
- `allow_credentials=True` no CORS exige validacao rigorosa de `CORS_ORIGINS` em producao.
- Sem controle sobre dados enviados para IA futura.
- Sem rate limit ou protecao operacional.

## 11. Validacao do cenario Cotrijal

Situacao: **NAO IMPLEMENTADO** como cenario de homologacao completo.

Existe apenas referencia demonstrativa em teste e placeholders do frontend. Nao ha seed idempotente contendo:

- 8 tarefas;
- 3 entregas;
- 2 marcos;
- 2 riscos;
- 1 impedimento;
- 10 apontamentos;
- pendencias por Maxicon, Cotrijal e SAP;
- atividades concluidas e atrasadas;
- horas rentaveis e nao rentaveis auditaveis.

Recomendacao: criar seed demonstrativo separado de producao e teste E2E do fluxo Cotrijal.

## 12. Validacao do status report

Situacao: **PARCIALMENTE CONFORME**.

O fluxo atual gera rascunho a partir de dados reais do periodo, persiste versao e permite aprovacao humana. Ainda falta tela dedicada de revisao, exportacao e bloqueio forte contra alteracao de relatorio aprovado.

## 13. Validacao da IA

Situacao: **NAO CONFORME** para uso real.

O mock e uma decisao prudente para evitar envio prematuro de dados corporativos, mas o produto ainda nao possui adapter, minimizacao, auditoria, prompt versionado, evidencias por afirmacao ou bloqueio de dados sensiveis.

## 14. Resultado dos testes

Comando executado:

```powershell
python -m pytest
```

Resultado:

```text
5 passed in 3.92s
```

Observacao: os testes agora cobrem autenticacao obrigatoria, bootstrap/login, projeto, tarefa, hora aprovada, status report gerado por dados persistidos, aprovacao, entrega concluida sem data real, impedimento com prazo invalido e apontamento em tarefa fora do projeto.

## 15. Resultado dos builds

Comandos executados:

```powershell
python -m ruff check backend
python -m mypy backend\app
npm ci
npm run build
```

Resultados:

- Ruff: `All checks passed!`
- Mypy: `Success: no issues found in 22 source files`
- `npm ci`: 0 vulnerabilidades encontradas.
- Next build: compilou com sucesso.

Observacao: antes do `npm ci`, `npm run build` falhou localmente porque `next` nao estava instalado em `web/node_modules`.

## 16. Resultado das migrations

Comando executado:

```powershell
$env:PYTHONPATH='.'; python -m alembic upgrade head --sql
```

Resultado: SQL gerado com sucesso para `projects`, `milestones`, `risks` e `action_items`.

Limitacao: nao foi validada conexao direta ao PostgreSQL do Render nesta auditoria local.

## 17. Resultado do deploy

Evidencia informada no fluxo de trabalho anterior:

- Render: API `maxicon-ai-portal-api` deployada e DB `maxicon-ai-portal-db` disponivel.
- Vercel: `https://portal-inteligente-de-projetos-maxi.vercel.app/`.

Situacao: **PARCIALMENTE CONFORME**. Deploy funcional nao equivale a prontidao de negocio.

## 18. Backlog de correcoes

### P0 - Bloqueia uso real

1. Implementar regras de IA com adapter, minimizacao, evidencias e log de prompt antes de qualquer provedor real.
2. Implementar RBAC granular e escopo por projeto/cliente antes de liberar acesso externo.
3. Criar politicas de retencao/exclusao LGPD e consulta de auditoria.

### P1 - Essencial para MVP controlado

1. Centralizar calculos do dashboard em servico backend.
2. Documentar formulas de dashboard, saude, tendencia, risco e rentabilidade.
3. Adicionar filtros de periodo, projeto, cliente, equipe e responsavel.
4. Criar seed demonstrativo Cotrijal idempotente.
5. Remover periodo fixo do frontend e conectar ao filtro real.
6. Adicionar edicao/fechamento formal para risco, marco, tarefa, entrega e impedimento.
7. Bloquear defaults inseguros em ambiente de producao.

### P2/P3 - Melhorias

1. Exportacao PDF/PowerPoint do status report aprovado.
2. Responsividade e acessibilidade com testes automatizados.
3. Observabilidade, metricas e alertas operacionais.
4. CI com Postgres real e smoke test pos-deploy.

## 19. Parecer final

Classificacao: **APTO COM RESSALVAS**.

O portal ja tem base tecnica para piloto tecnico controlado com usuarios internos: autenticacao, entidades centrais, telas operacionais, horas rastreaveis, status report versionado e auditoria inicial. Ainda nao deve ser tratado como producao nem aberto para cliente externo sem RBAC granular, capacidade, exportacao aprovada, edicao/historico completo e governanca de IA.

Os P0 estruturais mais urgentes foram reduzidos para P1 ou P0 especifico de IA/permissao granular. A proxima etapa recomendada e completar a interface operacional e endurecer seguranca antes do deploy para usuarios reais.
