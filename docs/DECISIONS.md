# Decisions

## 2026-07-15 - Banco e ambiente local

Decisão: manter PostgreSQL como banco oficial e usar defaults locais não sensíveis no backend.

Motivo: a API precisa importar e rodar testes básicos mesmo antes da criação do `.env`, mas o ambiente real continua configurado por variáveis.

Impacto: `SECRET_KEY=dev-only-change-me` existe apenas como fallback de desenvolvimento. Produção deve configurar segredo real.

## 2026-07-15 - IA no MVP

Decisão: começar com provedor mock obrigatório.

Motivo: permite validar o fluxo de status report sem enviar dados corporativos para provedor externo antes de haver política aprovada.

Impacto: adapters reais serão adicionados atrás de uma interface e com secrets fora do código.

## 2026-07-15 - Render

Decisão: usar Blueprint com API, web e PostgreSQL no mesmo `render.yaml`.

Motivo: reduz passos manuais e mantém o deploy reproduzível.

Impacto: secrets continuam marcados para configuração segura no Render.
