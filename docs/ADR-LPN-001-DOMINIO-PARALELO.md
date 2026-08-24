# ADR-LPN-001 — LPN como domínio paralelo

- Data: 24/08/2026
- Status: aceita
- Origem: Padrão de Levantamento e Geração de LPN, versão 3

## Contexto

O portal existente gerencia execução de projetos e fechamento semanal. A LPN possui ciclo, conteúdo, versionamento e aprovação próprios.

## Decisão

Manter o mesmo repositório e a mesma fundação técnica, criando o domínio de LPN em modelos, serviços, rotas e página separados.

## Alternativas rejeitadas

- Renomear `StatusReport` para LPN: perde significado e mistura ciclos distintos.
- Criar outro repositório: duplica autenticação, implantação e identidade visual.
- Persistir toda a LPN em um único JSON: simplifica escrita, mas prejudica consulta, validação e rastreabilidade.

## Consequências

- O módulo atual continua funcionando.
- Projetos passam a ter organização e cliente normalizados.
- Conteúdo da LPN pode evoluir sem alterar tabelas operacionais.
- Integrações futuras entre LPN e projeto deverão ocorrer por serviços explícitos.
