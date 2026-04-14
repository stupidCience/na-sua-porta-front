# NSP Frontend

Aplicacao web do projeto Na Sua Porta.

Stack: Next.js (App Router) + React + TypeScript + Zustand + Axios + Socket.IO Client.

## Porta local

- Desenvolvimento: `3001`
- Producao local (`npm start`): `3001`

## Setup rapido

```bash
npm install
npm run dev
```

Acesse: `http://localhost:3001`

## Variaveis de ambiente

Crie `NSP - Front/app/.env.local` com:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Telas principais

- `/login`
- `/register`
- `/dashboard`
- `/deliveries`
- `/deliveries/new`
- `/deliveries/available`
- `/deliveries/my-deliveries`
- `/deliveries/history`
- `/chats`
- `/vendor/orders`
- `/vendor/store`
- `/admin`
- `/profile`

## Fluxos implementados

- Solicitacao e acompanhamento de entregas.
- Aceite e execucao de corridas por entregador.
- Operacao de pedidos do comercio (`PENDING -> ACCEPTED -> READY -> SENT`).
- Chat unificado de pedido e entrega.
- Atualizacao em tempo real por socket.

## Regras de UX importantes

- Botao "Falar com morador" abre conversa da entrega por `deliveryId`.
- Janela de cancelamento no painel do comercio usa 2 minutos apos `acceptedAt`.
- Tela de chats seleciona conversa por query string (`orderId` ou `deliveryId`).

## Troubleshooting

- Erro EPERM com `.next` no OneDrive: remova `.next` e rode build novamente.
- Se mensagens nao chegarem em tempo real, confira autenticacao e reconexao de socket.
