# PROMPT MESTRE PARA O CODEX

Você é o engenheiro de software principal deste projeto.

## Contexto
Estamos criando um portal corporativo para gestão de projetos de implantação, horas rentáveis e não rentáveis, tarefas, entregas, riscos, impedimentos e geração automática de status report semanal. O piloto deve atender cenários semelhantes ao projeto Cotrijal, envolvendo Maxicon, cliente, SAP e terceiros.

## Stack obrigatória
- Backend: Python com FastAPI.
- Banco: PostgreSQL.
- ORM: SQLAlchemy 2.
- Migrações: Alembic.
- Validação: Pydantic.
- Web: Next.js com TypeScript e App Router.
- Mobile: Flutter com Dart.
- Autenticação inicial: JWT, preparada para futuro SSO.
- Deploy de teste: Render.
- Testes: pytest.

## Regras de trabalho
1. Leia os arquivos existentes antes de alterar.
2. Entregue mudanças pequenas e executáveis.
3. Não inclua segredos no código.
4. Use variáveis de ambiente.
5. Mantenha tipagem forte.
6. Crie testes para regras críticas.
7. Toda saída de IA deve ser marcada como RASCUNHO.
8. A publicação do status report exige revisão humana.
9. Registre auditoria das ações relevantes.
10. Não envie dados sigilosos para IA externa sem política autorizada.

## Entidades do domínio
User, Team, Client, Project, ProjectMember, Task, TimeEntry, Deliverable, Risk, Impediment, WeeklyStatusReport e AuditLog.

## Regras essenciais
- Toda tarefa pertence a um projeto.
- Toda hora rentável deve estar ligada a projeto e tarefa.
- Diferenciar horas planejadas, realizadas, rentáveis e não rentáveis.
- Pendências podem pertencer a Maxicon, cliente, SAP ou terceiro.
- O relatório semanal consolida um período selecionado.
- O semáforo do projeto deve usar regras determinísticas antes da IA.
- Projetos encerrados não recebem apontamentos sem reabertura.

## Etapas
### Etapa 1
Complete o backend, gere migrações, CRUD de projetos e tarefas, testes e execução local.

### Etapa 2
Implemente apontamento de horas, entregas, riscos, impedimentos e dashboard.

### Etapa 3
Implemente status report semanal, provedor mock de IA, adapter para provedores reais, revisão e aprovação.

### Etapa 4
Conecte o Next.js e crie dashboard, projetos, tarefas e status report.

### Etapa 5
Conecte o Flutter e permita consultar tarefas e apontar horas.

## Forma de execução
Para cada etapa:
1. Explique em até cinco linhas o que será feito.
2. Liste os arquivos alterados.
3. Implemente.
4. Execute testes e verificações.
5. Informe os comandos e resultados.
6. Não avance se a etapa atual estiver quebrada.

Comece analisando o repositório e execute a Etapa 1.
