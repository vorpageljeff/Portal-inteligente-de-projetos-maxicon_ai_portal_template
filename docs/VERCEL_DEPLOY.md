# Vercel Deploy

## Objetivo

Publicar o frontend Next.js no plano gratuito da Vercel, sem criar serviço web no Render.

## Configuração do projeto

- Repository: `vorpageljeff/Portal-inteligente-de-projetos-maxicon_ai_portal_template`
- Framework Preset: Next.js
- Root Directory: `web`
- Install Command: `npm ci`
- Build Command: `npm run build`

## Variáveis de ambiente

Configure:

```text
NEXT_PUBLIC_API_URL=https://maxicon-ai-portal-api.onrender.com
```

Se a API no Render tiver outro domínio, use a URL real da API.

## CORS

Depois que a Vercel gerar a URL do projeto, atualize no Render:

```text
CORS_ORIGINS=https://sua-url-vercel.vercel.app
```

## Validação

1. Abrir a URL da Vercel.
2. Confirmar que a página carrega.
3. Confirmar que a listagem de projetos chama a API do Render.
4. Conferir erros de CORS no console do navegador, se a API não responder.
