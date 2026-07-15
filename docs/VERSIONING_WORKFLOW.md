# Versioning Workflow

## Combinado de trabalho

- O Codex deve sempre informar quais arquivos e mudanças serão enviados antes de qualquer push, upload ou deploy.
- O usuário deve confirmar explicitamente o envio.
- Commits devem ser pequenos, com mensagem clara e relacionados ao escopo validado.
- Push para GitHub só deve ocorrer quando houver repositório remoto autorizado.
- Deploy no Render só deve ocorrer quando houver autenticação disponível e confirmação do ambiente alvo.

## Fluxo recomendado

1. Implementar e validar localmente.
2. Resumir arquivos alterados, comandos executados e riscos.
3. Solicitar confirmação para subir.
4. Fazer commit e push.
5. Solicitar confirmação para deploy.
6. Validar URLs, health check e logs antes de declarar sucesso.
