# Dashboard de Assinaturas

## 1. Cards de planos (Basic, Medium, Pro)
- **Dados**: resposta de `GET /api/plans` (já garante seed).
- **Layout sugerido**: grade de 3 cards com destaque no plano atual (`isCurrentPlan`).
- **Conteúdo mínimo**:
  - Nome, descrição curta, preço formatado (`price / 100` → `toLocaleString("pt-BR")`).
  - Lista de features (`features`).
  - Tabela mini de limites (`limits`).
  - CTA com estado: `Assinar`, `Atualizar`, `Plano atual`.
- **Ações**:
  - Botão chama `POST /api/subscriptions` com `companyId`, `companyName`, `planId`.
  - Exibir loading/erro e confirmar com modal.

## 2. Resumo da assinatura atual
- **Fonte**: `GET /api/subscriptions?companyId=:id`.
- **Campos**:
  - Plano atual + badge de status (`subscription.status`).
  - Próximo ciclo (`currentPeriodEnd` formatado).
  - Método de pagamento (`paymentMethod`).
  - Botões: `Atualizar plano`, `Cancelar renovação`, `Gerenciar pagamento`.
- **Regra**:
  - Se `cancelAtPeriodEnd=true`, mostrar aviso e opção de reativar (chamar `PATCH /api/subscriptions/[id]/status` com `ACTIVE`).

## 3. Controle de pagamentos
- **Tabela**:
  - Dataset vindo de coleção `payments` filtrada por `subscriptionId`.
  - Colunas: referência (invoiceId), vencimento, valor, status (badge), gateway, ação (ver comprovante).
- **Filtros**: `status` (PENDENTE, PAG0, FALHOU), intervalo de datas.
- **Ações**:
  - Botão “Confirmar pagamento manual” → `PATCH /status` com `AWAITING_CONFIRMATION` ou `ACTIVE`.
  - Download do recibo (payload guardado na collection).

## 4. Alertas e notificações
- **Regra**: se `status === "AWAITING_CONFIRMATION"` ou `PAST_DUE`, mostrar banner no topo com instrução e último evento.
- **Componentes**:
  - `Alert` com ícone, texto e CTA (`Reenviar boleto`, `Falar com suporte`).
  - Histórico rápido (últimos 3 registros de `subscription_audit`).

## 5. Métricas para admins
- Cards menores (opcional):
  - “Enquetes ativas restantes” → `subscription.planSnapshot.limits.activePolls - qtdAtual`.
  - “Usuários da equipe” vs limite.

## 6. Fluxo de downgrade/upgrade
- Antes de confirmar downgrade, validar:
  - Se `activePolls > limits.activePolls` do novo plano → mostrar checklist para arquivar enquetes.
  - Bloquear se exceder limites essenciais.
- Upgrades são imediatos (status `ACTIVE` e `currentPeriodEnd` recalculado).

## 7. Estados vazios e erros
- Sem assinatura: mostrar cards + bloco explicando benefícios + CTA principal.
- Falha na API: skeleton loaders + mensagens amigáveis com opção “Tentar novamente”.

Com esses blocos o dashboard cobre vitrine dos planos, status atual e governança financeira de forma clara, aproveitando os endpoints e tipos criados no backend.


