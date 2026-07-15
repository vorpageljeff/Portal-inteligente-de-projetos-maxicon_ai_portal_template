# Security and LGPD

## Diretrizes

- Segredos devem ficar em variáveis de ambiente, nunca no código.
- Senhas devem ser armazenadas somente com hash seguro.
- Tokens devem ter expiração e refresh controlado.
- CORS deve ser restrito por ambiente.
- Logs não devem conter senhas, tokens, documentos sigilosos ou dados pessoais desnecessários.
- Dados enviados para IA devem ser minimizados e passar por política aprovada.
- Todo texto gerado por IA deve exigir revisão humana.
- Aprovações e publicações de status report devem gerar auditoria.

## Preparado para implementação

- `SECRET_KEY`, `DATABASE_URL`, `AI_API_KEY` e demais secrets são lidos por ambiente.
- `AI_PROVIDER=mock` é o padrão.
- O Render deve gerar/configurar secrets fora do repositório.
- Uploads futuros devem validar extensão, tamanho, tipo MIME e permissões.
- Exportação, retenção e exclusão de dados devem ser desenhadas antes do uso com dados reais.
