# MISSÃO DO CODEX — PORTAL INTELIGENTE DE GESTÃO DE PROJETOS

Você atuará como engenheiro de software principal, arquiteto, QA e responsável pela preparação de deploy deste repositório.

## 1. Objetivo

Construir um MVP funcional e demonstrável de um portal corporativo para:

- gerir projetos de implantação;
- centralizar tarefas, entregas, marcos, riscos, impedimentos e pendências;
- planejar e apontar horas rentáveis e não rentáveis;
- acompanhar capacidade, cronograma e consumo de horas;
- gerar um status report semanal automaticamente;
- usar inteligência artificial para produzir rascunhos, resumos, riscos e próximos passos;
- manter revisão humana obrigatória;
- respeitar segurança da informação e LGPD;
- executar localmente e ficar pronto para deploy no Render.

O piloto deve ser adequado a projetos como Cotrijal, com responsabilidades distribuídas entre Maxicon, cliente, SAP e terceiros.

---

## 2. Stack obrigatória

### Backend

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic v2
- JWT com refresh token
- bcrypt ou Argon2 para senha
- pytest
- Ruff
- mypy ou pyright

### Frontend web

- Next.js com App Router
- TypeScript estrito
- React
- biblioteca de componentes acessível e consistente
- cliente HTTP tipado
- formulários com validação
- gráficos responsivos

### Mobile

- Flutter / Dart
- consumo da mesma API REST
- armazenamento seguro do token
- funcionalidades iniciais: login, meus projetos, minhas tarefas, apontamento de horas e impedimentos

### Infraestrutura

- Render para ambiente de teste
- PostgreSQL gerenciado no Render
- `render.yaml` na raiz
- Docker Compose para ambiente local
- variáveis de ambiente documentadas
- migrações executadas no deploy

---

## 3. Forma obrigatória de trabalho

1. Leia todos os arquivos antes de alterar.
2. Crie um branch de trabalho, caso o repositório esteja em Git.
3. Implemente em fases pequenas.
4. Ao final de cada fase, execute testes, lint, checagem de tipos e build.
5. Corrija todos os erros antes de avançar.
6. Não apague código funcional sem justificativa.
7. Não inclua chaves, senhas ou tokens no Git.
8. Atualize a documentação sempre que alterar arquitetura ou comandos.
9. Registre decisões relevantes em `docs/DECISIONS.md`.
10. Não afirme que algo foi testado sem executar o comando correspondente.
11. Não faça deploy destrutivo em produção.
12. Caso falte autenticação do GitHub ou Render, deixe tudo pronto, faça commit local e apresente exatamente o único passo manual necessário.

---

## 4. Escopo funcional obrigatório

### 4.1 Autenticação e usuários

Implementar:

- login;
- logout;
- refresh token;
- recuperação de senha preparada;
- perfil do usuário;
- usuários ativos e inativos;
- papéis: administrador, diretoria, gestor, gerente de projeto, colaborador e cliente;
- autorização por papel e por participação no projeto;
- estrutura preparada para SSO futuro.

### 4.2 Organizações e equipes

Entidades:

- Organization;
- Team;
- User;
- Client;
- ExternalParty.

Permitir distinguir responsáveis:

- Maxicon;
- Cliente;
- SAP;
- Terceiro.

### 4.3 Projetos

Cadastro com:

- nome;
- cliente;
- descrição;
- objetivo;
- gerente;
- equipe;
- data de início;
- data prevista de término;
- horas contratadas;
- orçamento opcional;
- prioridade;
- status;
- metodologia;
- percentual de progresso;
- situação semafórica;
- etapa atual da implantação.

Etapas iniciais:

- planejamento;
- kickoff;
- levantamento;
- configuração;
- desenvolvimento;
- testes;
- treinamento;
- cutover;
- go-live;
- estabilização;
- encerramento.

### 4.4 Tarefas e marcos

Tarefa deve possuir:

- projeto;
- título;
- descrição;
- responsável;
- organização responsável;
- prioridade;
- status;
- datas planejadas e reais;
- horas estimadas;
- percentual concluído;
- dependências;
- tags;
- comentários;
- anexos preparados;
- indicador de atraso.

Implementar lista, Kanban e visão simples de cronograma.

### 4.5 Entregas

Campos:

- projeto;
- nome;
- responsável;
- prazo;
- critério de aceite;
- situação;
- data real;
- aprovador;
- observação;
- vínculo com tarefas.

### 4.6 Horas e capacidade

Implementar:

- planejamento mensal por usuário e projeto;
- apontamento de horas;
- horas rentáveis e não rentáveis;
- categorias configuráveis;
- aprovação de apontamentos;
- comparação planejado x realizado;
- horas restantes;
- capacidade mensal;
- indisponibilidades;
- férias e feriados preparados;
- alertas de sobrecarga e baixa alocação.

Regra crítica: previsão de rentabilidade não pode atribuir ao colaborador responsabilidade por demanda inexistente. O cálculo deve separar capacidade, demanda confirmada, demanda provável e horas efetivamente alocadas.

### 4.7 Riscos, impedimentos e decisões

Risco:

- descrição;
- categoria;
- probabilidade;
- impacto;
- criticidade;
- resposta;
- responsável;
- prazo;
- situação.

Impedimento:

- descrição;
- tarefa ou entrega afetada;
- organização responsável;
- responsável individual;
- data de abertura;
- prazo;
- impacto;
- situação;
- resolução.

Decisão:

- tema;
- descrição;
- responsável pela decisão;
- prazo;
- status;
- resultado.

### 4.8 Dashboards

Criar dashboards:

#### Individual

- minhas tarefas;
- tarefas atrasadas;
- próximas entregas;
- horas planejadas;
- horas realizadas;
- rentáveis e não rentáveis;
- capacidade restante.

#### Gerencial

- projetos ativos;
- projetos em risco;
- tarefas atrasadas;
- entregas da semana;
- horas planejadas x realizadas;
- consumo de horas contratadas;
- riscos críticos;
- impedimentos por responsável;
- capacidade da equipe.

#### Executivo

- semáforo dos projetos;
- previsão de fechamento do mês;
- consumo de horas por cliente;
- projetos próximos do limite contratado;
- tendência de prazo;
- principais decisões pendentes.

### 4.9 Indicadores

Implementar inicialmente:

- percentual planejado;
- percentual concluído;
- desvio de prazo;
- desvio de esforço;
- consumo de horas contratadas;
- taxa de entregas no prazo;
- taxa de horas rentáveis;
- capacidade comprometida.

Implementar SPI somente quando houver valor planejado e valor agregado confiáveis. Exibir a fórmula e origem dos dados. Não inventar SPI com base apenas em opinião da IA.

### 4.10 Status report semanal

Este é o resultado central do MVP.

Fluxo:

1. Usuário seleciona projeto e semana.
2. Sistema consolida dados do período.
3. Regras determinísticas calculam indicadores e semáforo.
4. IA gera rascunho textual.
5. Usuário edita.
6. Usuário aprova.
7. Sistema registra versão, aprovador e data.
8. Relatório pode ser consultado, impresso e exportado.

Conteúdo obrigatório:

- cabeçalho do projeto;
- período;
- situação geral;
- resumo executivo;
- entregas concluídas;
- atividades em andamento;
- tarefas atrasadas;
- horas planejadas e realizadas;
- consumo das horas contratadas;
- riscos;
- impedimentos;
- pendências Maxicon;
- pendências cliente;
- pendências SAP;
- pendências terceiros;
- decisões necessárias;
- próximos passos;
- responsáveis e prazos;
- origem e data de atualização dos dados.

Estados:

- draft;
- in_review;
- approved;
- published;
- superseded.

Todo conteúdo de IA deve exibir:

`Rascunho gerado por IA — exige revisão humana.`

### 4.11 IA

Criar interface de provedor:

- `AIProvider`;
- `MockAIProvider` obrigatório;
- adapter configurável para provedor real;
- prompt versionado;
- timeout;
- retry controlado;
- logs sem dados sensíveis;
- fallback quando IA estiver indisponível.

Funções iniciais:

- gerar resumo executivo;
- resumir riscos e impedimentos;
- sugerir próximos passos;
- identificar itens sem responsável ou prazo;
- preparar texto do status report.

A IA não pode:

- aprovar relatório;
- alterar dados de projeto silenciosamente;
- decidir avaliação de colaborador;
- enviar comunicação ao cliente sem aprovação;
- receber credenciais, dados pessoais desnecessários ou documentos sigilosos por padrão.

### 4.12 Auditoria

Registrar:

- usuário;
- ação;
- entidade;
- identificador;
- data e hora;
- valor anterior e posterior quando aplicável;
- endereço IP quando permitido;
- aprovação do status report;
- geração por IA.

---

## 5. Modelo de dados mínimo

Crie models, schemas, migrations, repositórios/serviços e endpoints para:

- User
- Role
- Organization
- Team
- Client
- Project
- ProjectMember
- ProjectStage
- Task
- TaskDependency
- Deliverable
- TimeEntry
- MonthlyCapacity
- Risk
- Impediment
- Decision
- Comment
- WeeklyStatusReport
- WeeklyStatusReportVersion
- AuditLog

Use UUID, timestamps UTC, soft delete onde fizer sentido e índices para consultas frequentes.

---

## 6. API mínima

Criar endpoints REST consistentes para:

- `/auth`
- `/users`
- `/teams`
- `/clients`
- `/projects`
- `/projects/{id}/members`
- `/projects/{id}/tasks`
- `/projects/{id}/deliverables`
- `/projects/{id}/risks`
- `/projects/{id}/impediments`
- `/projects/{id}/decisions`
- `/time-entries`
- `/capacity`
- `/dashboards/me`
- `/dashboards/management`
- `/dashboards/executive`
- `/projects/{id}/status-reports`
- `/status-reports/{id}/generate`
- `/status-reports/{id}/approve`
- `/status-reports/{id}/publish`
- `/audit-logs`

Requisitos:

- paginação;
- filtros;
- ordenação;
- validação;
- respostas de erro padronizadas;
- documentação OpenAPI;
- autorização testada.

---

## 7. Frontend obrigatório

Criar layout corporativo, limpo e responsivo.

Páginas:

- login;
- dashboard;
- lista de projetos;
- detalhe do projeto;
- tarefas;
- horas;
- entregas;
- riscos e impedimentos;
- capacidade;
- status reports;
- geração e revisão do status report;
- administração básica.

No detalhe do projeto, usar abas:

- visão geral;
- tarefas;
- entregas;
- horas;
- riscos;
- impedimentos;
- decisões;
- status reports.

Incluir estados de loading, vazio, erro e sucesso.

---

## 8. Mobile obrigatório no MVP

Entregar aplicativo Flutter compilável com:

- login;
- meus projetos;
- minhas tarefas;
- detalhe da tarefa;
- atualizar progresso;
- apontar horas;
- abrir impedimento;
- consultar último status report aprovado.

Não implementar administração completa no mobile.

---

## 9. Segurança e LGPD

Implementar ou documentar claramente:

- segredo fora do código;
- hash seguro de senha;
- expiração de tokens;
- CORS restrito;
- rate limiting preparado;
- validação de upload preparada;
- autorização no backend, não apenas no frontend;
- minimização de dados;
- política de retenção preparada;
- logs sem dados sensíveis;
- revisão humana para IA;
- exportação e exclusão preparadas;
- trilha de auditoria.

Criar `docs/SECURITY_LGPD.md`.

---

## 10. Testes obrigatórios

### Backend

- autenticação;
- autorização;
- CRUD de projetos;
- tarefas;
- apontamento de horas;
- cálculo de indicadores;
- geração de status report;
- aprovação humana;
- bloqueio de alteração indevida;
- isolamento entre projetos.

### Frontend

- build sem erro;
- testes dos componentes críticos;
- fluxo principal de status report.

### Mobile

- análise estática;
- teste básico de navegação e parsing.

Objetivo mínimo de cobertura do backend: 75% nas regras de negócio.

---

## 11. Dados de demonstração

Criar seed idempotente com:

- administrador;
- gestor;
- gerente de projeto;
- dois colaboradores;
- cliente Cotrijal de demonstração;
- projeto “Implantação Cotrijal — Demonstração”;
- tarefas de treinamento, testes, cutover e go-live;
- pendências atribuídas à Maxicon, Cotrijal e SAP;
- horas planejadas e realizadas;
- riscos e impedimentos;
- um status report semanal em rascunho.

Nunca usar dados pessoais reais.

---

## 12. Deploy no Render

O repositório deve conter um `render.yaml` válido na raiz, definindo:

- API FastAPI como web service;
- frontend Next.js como web service;
- PostgreSQL;
- health check da API;
- variáveis não secretas;
- referências dinâmicas ao banco;
- secrets marcados para configuração manual;
- migração executada no deploy;
- builds separados por `rootDir`.

Requisitos de deploy:

- backend deve escutar em `0.0.0.0:$PORT`;
- frontend deve escutar na porta fornecida pelo Render;
- CORS deve aceitar somente a URL configurada do frontend;
- `DATABASE_URL` deve aceitar o formato entregue pelo Render;
- migrations devem ser idempotentes;
- seed não deve executar automaticamente em produção;
- `/health` deve testar aplicação e, preferencialmente, banco;
- criar `docs/RENDER_DEPLOY.md` com passo a passo;
- criar `scripts/predeploy_check.sh` e equivalente PowerShell;
- validar o YAML e os comandos localmente na medida do possível.

Deploy esperado:

1. Commitar e enviar para o repositório remoto autorizado.
2. Conectar o repositório ao Render como Blueprint.
3. Configurar secrets no dashboard.
4. Aplicar Blueprint.
5. Acompanhar logs.
6. Testar health check, login, projeto demo e status report.

Caso o ambiente possua credenciais e autorização explícita, execute o push e o deploy. Caso não possua, não invente sucesso: deixe tudo pronto e apresente o passo manual exato.

---

## 13. Variáveis de ambiente esperadas

Backend:

- `ENVIRONMENT`
- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `CORS_ORIGINS`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `LOG_LEVEL`

Frontend:

- `NEXT_PUBLIC_API_URL`

Mobile:

- `API_URL` via `--dart-define`.

---

## 14. Critérios de aceite do MVP

O trabalho só está concluído quando:

- ambiente local sobe com instruções reproduzíveis;
- migrations funcionam em banco vazio;
- seed funciona;
- login funciona;
- autorização funciona;
- usuário cria e acompanha projeto;
- tarefas, entregas, riscos e impedimentos funcionam;
- horas podem ser planejadas e apontadas;
- dashboards mostram dados reais;
- status report semanal é consolidado;
- IA mock gera rascunho;
- relatório exige aprovação humana;
- histórico de versões funciona;
- backend passa em testes e lint;
- frontend passa em build e validações;
- Flutter passa em análise;
- `render.yaml` está preparado;
- documentação de deploy está pronta;
- nenhuma chave está versionada.

---

## 15. Ordem de execução

### Fase 0 — Auditoria do repositório

- listar problemas atuais;
- corrigir setup quebrado;
- padronizar ferramentas;
- criar plano em `docs/IMPLEMENTATION_PLAN.md`.

### Fase 1 — Fundação

- banco;
- migrations;
- autenticação;
- usuários;
- organizações;
- equipes;
- clientes;
- testes.

### Fase 2 — Projetos

- projetos;
- membros;
- etapas;
- tarefas;
- entregas;
- riscos;
- impedimentos;
- decisões.

### Fase 3 — Horas e dashboards

- apontamentos;
- capacidade;
- indicadores;
- dashboards.

### Fase 4 — Status report e IA

- consolidação semanal;
- provedor mock;
- adapter;
- revisão;
- aprovação;
- histórico;
- impressão/exportação inicial.

### Fase 5 — Frontend completo

- autenticação;
- dashboards;
- CRUDs;
- status report.

### Fase 6 — Mobile

- fluxos essenciais.

### Fase 7 — Qualidade e deploy

- testes finais;
- segurança;
- documentação;
- render.yaml;
- predeploy;
- push/deploy autorizado.

---

## 16. Relatório final obrigatório do Codex

Ao terminar, apresente:

- resumo do que foi entregue;
- arquitetura final;
- arquivos principais;
- migrations criadas;
- testes executados e resultados reais;
- comandos de execução local;
- variáveis obrigatórias;
- URL ou estado do deploy;
- pendências reais;
- credenciais de demonstração apenas se forem valores de seed não sensíveis;
- riscos técnicos restantes.

## Comando inicial

Comece agora pela Fase 0. Leia todo o repositório, crie `docs/IMPLEMENTATION_PLAN.md`, corrija o setup e avance sequencialmente até cumprir os critérios de aceite. Não pare apenas em planejamento: implemente, valide e prepare o deploy.
