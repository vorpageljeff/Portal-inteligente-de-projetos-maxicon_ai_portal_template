# Especificação funcional da LPN

Documento derivado do **Padrão de Levantamento e Geração de LPN — versão 3** e validado contra uma LPN operacional da Maxicon em 24/08/2026.

## Fluxo funcional

1. Cadastrar cliente e demanda.
2. Criar a LPN e sua primeira versão.
3. Conferir os dados gerais: cliente, solicitação, módulos, processo, Product Owner, analista e designação de gerenciamento.
4. Descrever processo atual, objetivo e resultados esperados.
5. Montar o diagrama e detalhar o processo proposto.
6. Registrar restrições/impeditivos, informações complementares e critérios de aceite.
7. Anexar telas e evidências do processo atual.
8. Executar validações, registrar o aceite e aprovar a versão.
9. Gerar DOCX, PDF, JSON e SVG do processo.
10. Para qualquer alteração posterior, clonar a versão aprovada.

## Estrutura publicada

1. Capa institucional.
2. Dados gerais — Levantamento de Processos de Negócio.
3. Detalhamento do processo atual.
4. Objetivo e resultados esperados.
5. Diagrama do processo.
6. Detalhamentos do processo proposto.
7. Restrições/impeditivos.
8. Informações complementares.
9. Critérios de aceite.
10. Aprovação/aceite.

Os tipos técnicos mais granulares continuam disponíveis na persistência para evolução e rastreabilidade, mas não são expostos como seções principais do editor.

## Regras centrais

- Organização é obtida da participação ativa do usuário.
- Demanda pertence a um cliente e pode ter projeto opcional do mesmo cliente.
- Todo conteúdo pertence diretamente a uma versão da LPN.
- Versão aprovada é imutável.
- Sugestão da IA exige decisão humana antes de virar conteúdo.
- Processo atual, objetivo, processo proposto e diagrama TO-BE são obrigatórios para aprovação.
- Rastreabilidade detalhada e justificativas de gaps geram alertas, sem descaracterizar o documento operacional.
- A geração documental é independente do status funcional da versão.

## Tipos de conteúdo suportados

`storytelling`, `stakeholder`, `gap`, `objective`, `requirement`, `business_rule`,
`screen`, `screen_field`, `report`, `integration`, `impact`, `constraint`,
`dependency`, `scope_exclusion`, `acceptance_criterion` e `pending_issue`.

O contrato completo de campos permanece no documento de origem. Esta versão derivada registra o comportamento efetivamente implementado e deve evoluir junto aos testes funcionais.
