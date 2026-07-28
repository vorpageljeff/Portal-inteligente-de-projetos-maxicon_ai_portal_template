# Contratos de API pendentes

Este documento registra capacidades necessárias para completar o produto sem inventar persistência no front-end.

## Resumo executivo revisável

- Método: `GET`, `PUT` e `POST`
- Rotas sugeridas:
  - `GET /api/v1/projects/{project_id}/executive-summary`
  - `PUT /api/v1/projects/{project_id}/executive-summary`
  - `POST /api/v1/projects/{project_id}/executive-summary/regenerate`
- Corpo do `PUT`: `{ content, review_status, reviewer_id }`
- Resposta: conteúdo, origem (`human` ou `ai`), data de geração, revisor, situação e versão.
- Regra: IA nunca aprova nem publica; cada alteração relevante gera versão.
- Autenticação: gestor, analista ou administrador para editar; cliente somente se liberado.
- Erros: `403`, `404`, `409` por conflito de versão, `422`, `502` na regeneração.

## Série histórica planejado versus realizado

- Método: `GET`
- Rota sugerida: `GET /api/v1/projects/{project_id}/progress-history`
- Parâmetros: `from`, `to`, `granularity`.
- Resposta: pontos com data, planejado acumulado, realizado acumulado, origem e marcos.
- Regra: percentuais entre 0 e 100; snapshots publicados são imutáveis.
- Autenticação: usuário com acesso ao projeto.
- Erros: `403`, `404`, `422`.

## Pendências e decisões

- Métodos: `GET`, `POST`, `PATCH`
- Rota sugerida: `/api/v1/projects/{project_id}/pending-decisions`
- Filtros: situação, responsável, impacto, organização e dependência do cliente.
- Corpo: descrição, responsável, organização, prazo, impacto, situação, ação necessária e `depends_on_client`.
- Resposta: item versionado com auditoria.
- Regra: vencimento calculado pelo servidor; decisão concluída exige resolução.
- Autenticação: colaborador cria; analista/gestor altera; cliente somente itens liberados.
- Erros: `403`, `404`, `409`, `422`.

## Riscos completos

- Método: ampliar `POST/GET/PATCH /api/v1/dashboard/projects/{project_id}/risks`
- Campos pendentes: probabilidade, impacto, criticidade calculada, responsável, mitigação, data-limite e consequência no cronograma.
- Regra: criticidade calculada no servidor; risco crítico aberto exige plano de mitigação.
- Autenticação: conforme acesso ao projeto.
- Erros: `403`, `404`, `422`.

## Fechamento semanal

- Métodos: `POST`, `GET`, `PATCH`
- Rotas sugeridas:
  - `POST /api/v1/projects/{project_id}/weekly-closings`
  - `GET /api/v1/weekly-closings/{closing_id}`
  - `POST /api/v1/weekly-closings/{closing_id}/collect`
  - `POST /api/v1/weekly-closings/{closing_id}/validate`
  - `POST /api/v1/weekly-closings/{closing_id}/generate`
  - `PATCH /api/v1/weekly-closings/{closing_id}/review`
  - `POST /api/v1/weekly-closings/{closing_id}/approve`
  - `POST /api/v1/weekly-closings/{closing_id}/publish`
- Corpo inicial: projeto, período e status anterior.
- Resposta: etapa atual, coleta, inconsistências, sugestões, conteúdo final, aprovação e publicação.
- Regra: publicação exige revisão humana; versão publicada é imutável e alterações geram nova versão.
- Autenticação: analista/gestor; aprovação conforme política do projeto.
- Erros: `403`, `404`, `409`, `422`, `502`.

## Documentos e versões

- Métodos: `GET`, `POST`, `PATCH`, `DELETE`
- Rota sugerida: `/api/v1/projects/{project_id}/documents`
- Upload: multipart com arquivo, categoria, descrição e vínculos.
- Resposta: id, nome, categoria, versão, tamanho, responsável, atualização, URL temporária e vínculos.
- Regra: exclusão lógica, histórico imutável e download por URL assinada.
- Autenticação: acesso por projeto e visibilidade interna/cliente.
- Erros: `400`, `403`, `404`, `409`, `413`, `415`, `422`.

## Compartilhamento

- Métodos: `POST`, `GET`, `DELETE`
- Rota sugerida: `/api/v1/projects/{project_id}/shares`
- Corpo: recursos liberados, validade, destinatário e permissões.
- Resposta: link, expiração, autor e trilha de auditoria.
- Regra: nunca incluir margens, notas privadas ou horas não rentáveis por padrão.
- Autenticação: gestor ou administrador.
- Erros: `403`, `404`, `409`, `422`.

## Exportações

- Método: `POST` e `GET`
- Rotas sugeridas:
  - `POST /api/v1/status-reports/{report_id}/exports`
  - `GET /api/v1/status-reports/{report_id}/exports/{export_id}`
- Corpo: formato (`pdf`, `email`, `summary`) e template.
- Resposta: estado do processamento, checksum e URL temporária.
- Regra: exportar somente versão aprovada ou marcar claramente como rascunho.
- Autenticação: usuário com acesso ao report.
- Erros: `403`, `404`, `409`, `422`, `500`.

## Preferências e filtros

- Métodos: `GET`, `PUT`
- Rota sugerida: `/api/v1/users/me/preferences`
- Corpo: sidebar, filtros por tela, projeto e período preferidos.
- Resposta: preferências normalizadas.
- Regra: preferências não alteram permissões.
- Autenticação: usuário atual.
- Erros: `401`, `422`.
