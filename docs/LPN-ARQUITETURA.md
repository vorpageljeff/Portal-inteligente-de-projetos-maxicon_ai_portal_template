# Arquitetura do domínio de LPN

## Limites de domínio

- Gestão de projetos permanece responsável por projetos, tarefas, entregas, riscos, horas e status semanal.
- LPN é um domínio paralelo, associado a uma demanda.
- Uma LPN aprovada poderá gerar itens de projeto futuramente, sem compartilhar tabelas de conteúdo.

## Hierarquia

```text
Organization
├── OrganizationMembership
├── Client
│   ├── Project
│   └── Demand ── Project (opcional)
│       └── Lpn
│           └── LpnVersion
│               ├── LpnContentItem / LpnContentLink
│               ├── ProcessDiagram
│               ├── ValidationResult
│               ├── ApprovalStep / Decision
│               ├── Evidence
│               ├── AiInteraction / Suggestion / HumanDecision
│               └── GeneratedDocument
```

## Decisões de persistência

- Conteúdos extensos usam `LpnContentItem`, com tipo explícito e payload JSON validado pela API.
- `stable_key` mantém a identidade lógica entre versões; `source_item_id` aponta para o registro de origem.
- Diagramas usam JSON canônico com raias, nós, conexões, layout e metadados.
- Anexos e documentos são versionados e armazenados no banco no MVP.
- Aprovações, transições e decisões humanas são registros separados e imutáveis.

## Segurança

- Toda consulta nova é limitada pela organização ativa enviada em `X-Organization-ID`.
- A participação do usuário define o papel dentro da organização.
- Versões aprovadas rejeitam operações de escrita com `409`.
- Downloads exigem autenticação e organização autorizada.

## Dependências documentais

- `python-docx`: criação de DOCX editável; alternativa nativa exigiria implementar o pacote Open XML manualmente.
- `reportlab`: geração de PDF; a alternativa seria depender de conversor externo do sistema operacional.

Os SVGs dos processos são gerados nativamente, sem biblioteca adicional.
