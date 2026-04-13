# Na Sua Porta - Front-end

Aplicacao web do projeto **Na Sua Porta**, desenvolvida com **Next.js (App Router)** para conectar moradores e entregadores em condominio, com atualizacao em tempo real.

## Visao Geral

O front-end oferece:

- Autenticacao com JWT (morador e entregador)
- Painel de pedidos para moradores
- Fila de pedidos disponiveis para entregadores
- Fluxo de status em tempo real via Socket.IO
- Historico de entregas concluidas
- Dashboard com metricas
- Avaliacao de entregas
- Cancelamento antes da coleta:
  - Morador pode cancelar o pedido antes da coleta
  - Entregador pode cancelar o aceite antes da coleta (pedido volta para fila)

## Stack Tecnologica

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Axios
- Zustand
- Socket.IO Client

## Estrutura de Pastas

```text
NSP - Front/
  app/                       # Projeto Next.js
    app/                     # Rotas (login, deliveries, history, dashboard)
    components/              # Componentes reutilizaveis (Input, Button, Card, etc.)
    lib/                     # API client, store global e socket hooks
    public/                  # Arquivos estaticos
    package.json             # Scripts e dependencias do front
```

## Pre-requisitos

- Node.js 20+
- npm 10+
- Backend do Na Sua Porta em execucao

## Configuracao de Ambiente

A aplicacao usa a variavel abaixo para chamadas HTTP:

- `NEXT_PUBLIC_API_URL` (opcional)

Valor padrao no codigo:

- `http://localhost:3000/api`

Se necessario, crie `app/.env.local` com:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Como Rodar (Desenvolvimento)

No terminal, a partir desta pasta (`NSP - Front`):

```bash
cd app
npm install
npm run dev
```

A aplicacao sera iniciada em:

- http://localhost:3001

> Observacao: o script `dev` esta configurado para porta `3001`.

## Scripts Disponiveis

Executar dentro da pasta `app/`:

```bash
npm run dev     # Ambiente de desenvolvimento (porta 3001)
npm run build   # Build de producao
npm run start   # Inicia app em producao
npm run lint    # Lint com ESLint
```

## Integracao com Backend

Principais grupos de endpoints utilizados:

- `POST /auth/register`
- `POST /auth/login`
- `GET /deliveries`
- `GET /deliveries/available`
- `GET /deliveries/my-deliveries`
- `GET /deliveries/history`
- `GET /deliveries/stats`
- `PATCH /deliveries/:id/accept`
- `PATCH /deliveries/:id/status`
- `PATCH /deliveries/:id/cancel`
- `PATCH /deliveries/cancel/:id` (compatibilidade)
- `PATCH /deliveries/:id/rate`

## Realtime (Socket.IO)

O front escuta eventos para manter telas sincronizadas sem recarregar:

- `delivery_created`
- `delivery_accepted`
- `delivery_updated`
- `delivery_cancelled`

## Regras de Fluxo Importantes

- Morador:
  - Cria pedido
  - Acompanha pedidos em aberto em tempo real
  - Cancela pedido antes da coleta
  - Avalia apenas apos entrega concluida
- Entregador:
  - Aceita pedido disponivel
  - Atualiza status durante o fluxo
  - Cancela aceite antes da coleta para devolver pedido a fila

## Troubleshooting Rapido

### 1) Erro de CORS ou 401 no login

- Verifique se backend esta ativo
- Confirme `NEXT_PUBLIC_API_URL`
- Limpe token antigo no navegador (localStorage)

### 2) Cancelamento retorna 404

- Confirme backend atualizado e reiniciado
- O front ja possui fallback automatico para rota de compatibilidade

### 3) Aviso de hydration mismatch em inputs

- Alguns navegadores/extensoes injetam atributos no HTML antes da hidratacao
- O componente de input foi ajustado para tolerar esse cenario

## Build e Deploy

```bash
cd app
npm run build
npm run start
```

Para producao, configure corretamente:

- `NEXT_PUBLIC_API_URL`
- URL de origem permitida no backend

## Observacoes

- Este README documenta o front-end no estado atual do projeto.
- O README interno em `app/README.md` pode conter informacoes genericas do create-next-app.
