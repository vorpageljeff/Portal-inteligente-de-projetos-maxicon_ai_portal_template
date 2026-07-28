# Diagnóstico UX/UI — Portal Inteligente de Projetos

## Escopo analisado

O front-end utiliza Next.js 15, React 19 e TypeScript 5, com App Router. Não há biblioteca de componentes, ícones, gráficos, gerenciamento de estado ou formulários. Toda a interface autenticada, tipos, chamadas HTTP, handlers, formulários e componentes locais estão concentrados em `web/app/page.tsx`. A estilização é global em `web/app/globals.css`.

Arquivos do front-end:

- `web/app/layout.tsx`: metadados e layout raiz;
- `web/app/page.tsx`: autenticação, navegação, telas, integração e formulários;
- `web/app/globals.css`: tokens, componentes e responsividade;
- `web/next.config.js`: proxy da API;
- `web/public/*`: marca Maxicon e imagem institucional.

Não existem hooks customizados, camada de serviços independente, testes de front-end ou rotas de página adicionais.

## Rotas e dados existentes

Dados provenientes da API:

- autenticação: login, bootstrap do primeiro administrador e usuário atual;
- projetos: listagem, criação, consulta e atualização;
- dashboard executivo e status semanal;
- marcos, riscos e ações;
- tarefas, entregas, impedimentos e apontamentos de horas;
- ciclos de status e resumos semanais de solicitações;
- geração, listagem e aprovação de status reports;
- prévia e aplicação de preenchimento por IA.

Os estados vazios em `emptyDashboard` e `emptyWeeklyStatus` são fallbacks locais, não dados demonstrativos persistidos. O gráfico de tendência do portfólio é calculado pelo backend a partir do progresso atual e não representa uma série histórica armazenada.

## Problemas encontrados

### Arquitetura e manutenção

- `page.tsx` é monolítico e mistura domínio, transporte HTTP, estado, regras de apresentação e formulários.
- Tipos de API estão acoplados à página.
- `apiRequest` está dentro do componente e não há camada de serviço.
- Estados globais de `loading`, `error` e `message` atendem operações diferentes e podem sobrescrever feedbacks.
- Não há testes para cálculos ou formatação.
- Não existe script de lint no `package.json`.

### Hierarquia e experiência

- A primeira dobra disputa atenção entre hero institucional, KPIs, gráfico, horas, resumo e tabelas.
- O resumo executivo aparece depois de elementos operacionais.
- O menu reflete entidades técnicas, não as tarefas principais do gestor.
- Projeto e portfólio não têm uma visão executiva dedicada.
- A seleção de projeto não é explícita no cabeçalho global.
- Fechamento semanal está fragmentado entre ciclo, IA, solicitações e reports.
- Ações secundárias têm o mesmo peso de ações primárias.
- Estados vazios existem apenas em parte das telas e não orientam o próximo passo.
- O loading é somente textual e não preserva a estrutura visual.

### Visual

- Predomínio de fundo azul-escuro e gradientes, distante do requisito de superfície corporativa clara.
- Muitas bordas, brilhos, círculos decorativos e áreas coloridas competem com o conteúdo.
- Tokens não formam uma escala clara de espaçamento.
- Tipografia e densidade variam entre cards, tabelas, formulários e navegação.
- Cores semânticas são usadas em preenchimentos relativamente grandes.
- Caracteres com codificação incorreta aparecem em textos e símbolos.

### Responsividade

- Em até 980 px a sidebar deixa de ser lateral, mas permanece inteira acima do conteúdo, aumentando muito a rolagem.
- Não há estado de menu recolhido funcional.
- Tabelas dependem de rolagem horizontal sem alternativa resumida.
- Cabeçalho e ações podem ocupar várias linhas sem priorização.
- Não existem validações específicas documentadas para 360, 768, 1024, 1366 e 1920 px.

### Acessibilidade

- Ícones são representados por letras e símbolos sem significado consistente.
- O menu não informa `aria-current`.
- O modal não declara `role="dialog"`, `aria-modal` ou título associado.
- Não há gestão de foco ou fechamento com Escape.
- O feedback de operações não utiliza região viva.
- Algumas combinações do tema escuro têm contraste e legibilidade frágeis em textos pequenos.
- Drag and drop do quadro de ações não oferece alternativa equivalente por teclado.

### Segurança e permissões

- O backend possui papéis, mas a interface não filtra informações ou ações por papel.
- Não existe contrato para separar conteúdo interno e conteúdo liberado ao cliente.
- Horas não rentáveis aparecem para qualquer usuário autenticado.
- O token fica em `localStorage`, aumentando impacto potencial de XSS.

## Duplicações e inconsistências

- Cabeçalhos de seção, painéis vazios, cards de registro e badges são repetidos com pequenas variações.
- Tarefas, entregas e impedimentos usam estruturas quase idênticas.
- Formatação de estado depende de um mapa global, mas tom semântico é decidido localmente em vários pontos.
- Diversos grids repetem regras responsivas.
- Ações de carregamento são disparadas em pontos diferentes sem uma política única de cache ou cancelamento.

## Funcionalidades com risco de regressão

- persistência e restauração do token;
- seleção de projeto e ciclo;
- carga paralela dos detalhes do projeto;
- criação de todas as entidades por modal;
- drag and drop das ações;
- prévia e aplicação de IA;
- geração e aprovação de report;
- proxy `/api` da Vercel para o Render.

Esses fluxos devem manter os mesmos endpoints e payloads durante a refatoração.

## Alterações propostas

1. Adotar superfícies claras, azul institucional pontual, escala de 4/8 px, largura máxima de conteúdo e componentes com hierarquia previsível.
2. Reorganizar a navegação por tarefas: Visão Geral, Projetos, Status Semanais, Cronograma, Entregas, Riscos e Pendências, Horas e Orçamento, Documentos, Relatórios e Configurações.
3. Criar cabeçalho de projeto, resumo executivo, até seis KPIs, comparação planejado/realizado, avanços da semana, pendências, riscos e horas.
4. Unificar ciclo, coleta, validação, IA, revisão e publicação em um fluxo de Fechamento Semanal.
5. Criar estados de loading, vazio e erro reutilizáveis, além de filtros e tabelas responsivas.
6. Separar progressivamente tipos, serviços, utilitários e componentes, priorizando primeiro a preservação funcional.
7. Documentar contratos ausentes e manter novas áreas em modo informativo/demonstração quando não houver persistência segura.
