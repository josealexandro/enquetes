import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// Validar se Firebase está configurado
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.warn("[subscriptionService] Firebase não está configurado. Algumas funcionalidades podem não funcionar.");
}
import { DEFAULT_PLANS } from "@/app/data/planSeeds";
import {
  Plan,
  PlanSlug,
  Subscription,
  SubscriptionStatus,
  Payment,
  PaymentStatus,
  SubscriptionAudit,
} from "@/app/types/subscription";

// Helper functions para criar referências de coleção apenas quando necessário
const getPlansCollection = () => collection(db, "plans");
const getSubscriptionsCollection = () => collection(db, "subscriptions");
const getPaymentsCollection = () => collection(db, "payments");
const getAuditCollection = () => collection(db, "subscription_audit");

const findPlanSeedById = (planId: string) =>
  DEFAULT_PLANS.find((plan) => plan.id === planId);

const findPlanSeedBySlug = (slug: PlanSlug) =>
  DEFAULT_PLANS.find((plan) => plan.slug === slug);

export async function ensureDefaultPlans() {
  try {
    // DOCUMENTAÇÃO: Atualiza os planos no Firestore com os dados mais recentes (incluindo originalPrice)
    // Usa merge: true para atualizar campos existentes e adicionar novos campos sem perder dados
    const tasks = DEFAULT_PLANS.map(async (plan) => {
      try {
        const ref = doc(getPlansCollection(), plan.id);
        // DOCUMENTAÇÃO: merge: true garante que campos novos (como originalPrice) sejam adicionados
        await setDoc(ref, plan, { merge: true });
      } catch (error) {
        console.error(`[ensureDefaultPlans] Erro ao criar plano ${plan.id}:`, error);
        // Continua com os outros planos mesmo se um falhar
      }
    });

    await Promise.all(tasks);
  } catch (error) {
    console.error("[ensureDefaultPlans] Erro geral:", error);
    throw error;
  }
}

export async function listPlans(): Promise<Plan[]> {
  try {
    const plansQuery = query(getPlansCollection(), orderBy("sortOrder", "asc"));
    const snapshot = await getDocs(plansQuery);
    if (!snapshot.size) {
      return DEFAULT_PLANS;
    }
    // DOCUMENTAÇÃO: Retorna planos do Firestore (já atualizados por ensureDefaultPlans)
    return snapshot.docs.map((docSnap) => docSnap.data() as Plan);
  } catch (error) {
    console.error("listPlans fallback to DEFAULT_PLANS:", error);
    return DEFAULT_PLANS;
  }
}

export async function getSubscriptionByCompany(companyId: string) {
  try {
    if (!companyId || companyId.trim().length === 0) {
      console.error("[getSubscriptionByCompany] companyId inválido:", companyId);
      return null;
    }

    const subscriptionQuery = query(
      getSubscriptionsCollection(),
      where("companyId", "==", companyId),
      limit(1)
    );

    const snapshot = await getDocs(subscriptionQuery);
    if (!snapshot.docs.length) {
      return null;
    }

    const subscriptionData = snapshot.docs[0].data();
    
    // Garantir que os campos obrigatórios existam
    if (!subscriptionData) {
      console.error("[getSubscriptionByCompany] Dados da assinatura vazios");
      return null;
    }

    return subscriptionData as Subscription;
  } catch (error: any) {
    // Se for erro de permissão, retornar null em vez de lançar erro
    // Isso permite que a aplicação continue funcionando mesmo sem assinatura
    if (error?.code === 'permission-denied') {
      console.error("[getSubscriptionByCompany] Erro de permissão ao buscar assinatura:", error);
      return null;
    }
    // Re-lançar outros erros para que possam ser tratados adequadamente
    console.error("[getSubscriptionByCompany] Erro ao buscar assinatura:", error);
    throw error;
  }
}

export async function getPlanBySlug(slug: PlanSlug) {
  try {
    const slugQuery = query(getPlansCollection(), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(slugQuery);
    if (snapshot.docs.length) {
      return snapshot.docs[0].data() as Plan;
    }
  } catch (error) {
    console.error("getPlanBySlug fallback to DEFAULT_PLANS:", error);
  }

  return findPlanSeedBySlug(slug) ?? null;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  try {
    const planDoc = await getDoc(doc(getPlansCollection(), id));
    if (planDoc.exists()) {
      return planDoc.data() as Plan;
    }
  } catch (error) {
    console.error("getPlanById fallback to DEFAULT_PLANS:", error);
  }
  return findPlanSeedById(id) ?? null;
}

export interface CreateSubscriptionInput {
  companyId: string;
  companyName: string;
  planId: string;
  paymentMethod?: string;
  status?: SubscriptionStatus;
  pendingInvoiceId?: string;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const planRef = doc(getPlansCollection(), input.planId);
  const planDoc = await getDoc(planRef);

  let planData: Plan | undefined;
  if (!planDoc.exists()) {
    planData = findPlanSeedById(input.planId);
    if (!planData) {
      throw new Error("Plano selecionado não encontrado.");
    }
    await setDoc(planRef, planData, { merge: true });
  } else {
    planData = planDoc.data() as Plan;
  }
  const now = Timestamp.now();
  const periodLengthInDays = planData.billingPeriod === "monthly" ? 30 : 365;
  const status = input.status ?? (planData.trialDays ? "TRIALING" : "AWAITING_CONFIRMATION");

  const subscriptionRef = doc(getSubscriptionsCollection());
  const subscriptionData = {
    id: subscriptionRef.id,
    companyId: input.companyId,
    companyName: input.companyName,
    planId: planData.id,
    planSnapshot: {
      slug: planData.slug,
      name: planData.name,
      price: planData.price,
      currency: planData.currency,
      billingPeriod: planData.billingPeriod,
      limits: planData.limits,
    },
    status,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: Timestamp.fromMillis(
      now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000
    ),
    cancelAtPeriodEnd: false,
    // Firestore não aceita "undefined" como valor de campo.
    paymentMethod: input.paymentMethod ?? null,
    pendingInvoiceId: input.pendingInvoiceId ?? null,
  };

  await setDoc(subscriptionRef, subscriptionData);

  await logSubscriptionChange({
    subscriptionId: subscriptionRef.id,
    actorId: input.companyId,
    actorName: input.companyName,
    toPlan: planData.slug,
    toStatus: status,
    notes: "Assinatura criada via dashboard.",
  });

  return subscriptionRef.id;
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  options?: { notes?: string; actorId?: string; actorName?: string; invoiceId?: string }
) {
  const subscriptionRef = doc(getSubscriptionsCollection(), subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada.");
  } 

  await setDoc(
    subscriptionRef,
    { status, pendingInvoiceId: options?.invoiceId ?? null },
    { merge: true }
  );

  await logSubscriptionChange({
    subscriptionId,
    actorId: options?.actorId ?? "system",
    actorName: options?.actorName ?? "Sistema",
    fromStatus: (subscriptionSnap.data() as Subscription).status,
    toStatus: status,
    notes: options?.notes,
  });
}

export interface RecordPaymentInput {
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  gateway: string;
  dueDate: Date;
  paidAt?: Date;
  failureReason?: string;
  rawPayload?: Record<string, unknown>;
}

export async function recordPayment(input: RecordPaymentInput) {
  const paymentRef = doc(getPaymentsCollection());
  const paymentData = {
    id: paymentRef.id,
    subscriptionId: input.subscriptionId,
    invoiceId: input.invoiceId,
    amount: input.amount,
    currency: "BRL",
    status: input.status,
    gateway: input.gateway,
    dueDate: Timestamp.fromDate(input.dueDate),
    paidAt: input.paidAt ? Timestamp.fromDate(input.paidAt) : null,
    failureReason: input.failureReason ?? null,
    rawPayload: input.rawPayload ?? null,
    createdAt: Timestamp.now(),
  };

  await setDoc(paymentRef, paymentData);
  return paymentRef.id;
}

export interface LogSubscriptionChangeInput {
  subscriptionId: string;
  actorId: string;
  actorName: string;
  fromPlan?: PlanSlug;
  toPlan?: PlanSlug;
  fromStatus?: SubscriptionStatus;
  toStatus?: SubscriptionStatus;
  notes?: string;
}

export async function logSubscriptionChange(input: LogSubscriptionChangeInput) {
  const auditRef = doc(getAuditCollection());
  const auditData = {
    id: auditRef.id,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    actorName: input.actorName,
    fromPlan: input.fromPlan,
    toPlan: input.toPlan,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    notes: input.notes,
    createdAt: Timestamp.now(),
  } satisfies SubscriptionAudit;

  await setDoc(auditRef, auditData);
}

export interface SwitchSubscriptionPlanInput {
  subscriptionId: string;
  newPlanId: string;
  actorId: string;
  actorName: string;
}

export async function switchSubscriptionPlan(input: SwitchSubscriptionPlanInput) {
  const subscriptionRef = doc(getSubscriptionsCollection(), input.subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada.");
  }

  const subscriptionData = subscriptionSnap.data() as Subscription;

  const newPlanRef = doc(getPlansCollection(), input.newPlanId);
  const planSnap = await getDoc(newPlanRef);
  let planData: Plan | undefined;
  if (!planSnap.exists()) {
    planData = findPlanSeedById(input.newPlanId);
    if (!planData) {
      throw new Error("Novo plano não encontrado.");
    }
    await setDoc(newPlanRef, planData, { merge: true });
  } else {
    planData = planSnap.data() as Plan;
  }
  const now = Timestamp.now();
  const periodLengthInDays = planData.billingPeriod === "monthly" ? 30 : 365;

  await setDoc(
    subscriptionRef,
    {
      planId: planData.id,
      planSnapshot: {
        slug: planData.slug,
        name: planData.name,
        price: planData.price,
        currency: planData.currency,
        billingPeriod: planData.billingPeriod,
        limits: planData.limits,
      },
      status: "AWAITING_CONFIRMATION" as SubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: Timestamp.fromMillis(
        now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000
      ),
      pendingInvoiceId: null,
      cancelAtPeriodEnd: false,
    },
    { merge: true }
  );

  await logSubscriptionChange({
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    actorName: input.actorName,
    fromPlan: subscriptionData.planSnapshot.slug,
    toPlan: planData.slug,
    fromStatus: subscriptionData.status,
    toStatus: "AWAITING_CONFIRMATION",
    notes: "Plano alterado via dashboard.",
  });
}

export async function listPaymentsBySubscription(subscriptionId: string) {
  // Consulta básica sem "orderBy" extra para evitar necessidade de índice composto.
  const paymentsQuery = query(
    getPaymentsCollection(),
    where("subscriptionId", "==", subscriptionId)
  );

  const snapshot = await getDocs(paymentsQuery);
  const items = snapshot.docs.map((docSnap) => docSnap.data() as Payment);

  // Ordena em memória por data de vencimento, mais recente primeiro.
  return items.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis());
}

export async function getPollsLimitForCompany(companyId: string): Promise<number> {
  const subscription = await getSubscriptionByCompany(companyId);
  
  // Obter créditos avulsos e tipo de conta do documento do usuário
  const userRef = doc(db, "users", companyId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;
  const extraPolls = userData?.extraPollsAvailable ?? 0;
  const accountType = userData?.accountType ?? 'personal';

  // Sem assinatura ativa → limite fixo baseado no tipo de conta + avulsos
  if (!subscription || subscription.status !== "ACTIVE") {
    // Contas comerciais têm apenas 1 enquete gratuita, contas pessoais têm 2
    const freeLimit = accountType === 'commercial' ? 1 : 2;
    return freeLimit + extraPolls; 
  }

  // Com assinatura ativa → limite do plano + avulsos
  return subscription.planSnapshot.limits.pollsPerMonth + extraPolls;
}

export async function consumePollCredit(companyId: string) {
  const userRef = doc(db, "users", companyId);
  await updateDoc(userRef, {
    extraPollsAvailable: increment(-1)
  });
  console.log(`Crédito de enquete consumido para o usuário ${companyId}.`);
}

/**
 * Conta quantas enquetes foram CRIADAS no período atual (não enquetes existentes)
 * 
 * IMPORTANTE: Esta função conta de poll_creation_logs, não de polls existentes.
 * Isso garante que o limite seja baseado em enquetes CRIADAS, não enquetes EXISTENTES.
 * 
 * EXEMPLO DE FUNCIONAMENTO:
 * - Usuário tem limite de 2 enquetes por mês
 * - Usuário cria 2 enquetes → countPollsCreatedInCurrentPeriod retorna 2
 * - Usuário tenta criar 3ª enquete → bloqueado (limite atingido)
 * - Usuário exclui 1 enquete → countPollsCreatedInCurrentPeriod AINDA retorna 2
 * - Usuário tenta criar enquete novamente → AINDA bloqueado (limite respeitado)
 * 
 * Por que isso é importante?
 * Sem essa lógica, o usuário poderia criar 2 enquetes, excluir 1, criar 1, excluir 1,
 * criar 1... infinitamente, burlando o limite. Com esta implementação, o limite é
 * baseado em criações, não em existências.
 * 
 * FALLBACK:
 * Se houver erro ao contar logs (ex: índice composto não criado), faz fallback para
 * contar enquetes existentes (comportamento antigo). Isso garante que a aplicação
 * continue funcionando mesmo se houver problemas com os logs.
 */
export async function countPollsCreatedInCurrentPeriod(companyId: string): Promise<number> {
  const subscription = await getSubscriptionByCompany(companyId);

  let periodStart: Timestamp;
  let periodEnd: Timestamp;

  if (!subscription || subscription.status !== "ACTIVE") {
    // Para contas públicas ou com assinatura inativa: contar enquetes no mês corrente
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    periodStart = Timestamp.fromDate(startOfMonth);
    periodEnd = Timestamp.fromDate(endOfMonth);
  } else {
    // Para contas com assinatura ativa: usar o período da assinatura
    if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
      console.warn("Assinatura ativa sem datas de período definidas. Retornando 0 enquetes.", companyId);
      return 0; // Fallback seguro
    }
    periodStart = subscription.currentPeriodStart;
    periodEnd = subscription.currentPeriodEnd;
  }

  // IMPORTANTE: Contar de poll_creation_logs em vez de polls existentes
  // Isso garante que o limite seja baseado em enquetes CRIADAS, não enquetes EXISTENTES
  // Assim, mesmo que o usuário exclua uma enquete, o limite continua sendo respeitado
  // 
  // SEGURANÇA: NUNCA fazer fallback para contar enquetes existentes, pois isso permite bypass
  // ao deletar enquetes. Se houver erro, retornar erro ou valor seguro, mas nunca contar
  // enquetes existentes.
  //
  // Usar Admin SDK quando disponível (backend) para garantir funcionamento mesmo sem request.auth
  try {
    // Tentar usar Admin SDK primeiro (se disponível - backend)
    if (adminDb) {
      const logsCollection = adminDb.collection("poll_creation_logs");
      const snapshot = await logsCollection
        .where("userId", "==", companyId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(periodStart.toDate()))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(periodEnd.toDate()))
        .get();
      return snapshot.size;
    }

    // Fallback para Client SDK (frontend ou se Admin SDK não disponível)
    const logsCollection = collection(db, "poll_creation_logs");
    const logsQuery = query(
      logsCollection,
      where("userId", "==", companyId),
      where("createdAt", ">=", periodStart),
      where("createdAt", "<=", periodEnd)
    );

    const snapshot = await getDocs(logsQuery);
    return snapshot.size;
  } catch (error: any) {
    // REMOVIDO: Fallback perigoso que contava enquetes existentes
    // Isso permitia bypass ao deletar enquetes
    // 
    // Se houver erro ao contar logs, logar o erro e retornar um valor seguro
    // que bloqueia criação (retornar um número alto) para garantir segurança
    console.error("[countPollsCreatedInCurrentPeriod] Erro ao contar logs de criação:", error);
    console.error("[countPollsCreatedInCurrentPeriod] Retornando valor alto para bloquear criação por segurança");
    
    // Retornar um número alto o suficiente para bloquear criação
    // Isso garante que se houver problema técnico, o sistema fica seguro (bloqueia)
    // em vez de inseguro (permite bypass)
    return 999; // Valor alto para garantir bloqueio em caso de erro
  }
}

export async function addPollCreditToCompany(companyId: string, amount: number = 1) {
  const userRef = doc(db, "users", companyId);
  await updateDoc(userRef, { extraPollsAvailable: increment(amount) });
}

// Registra a criação de uma enquete no log
// Isso é usado para contar enquetes criadas no período, independentemente de terem sido excluídas
export async function recordPollCreation(userId: string, pollId: string) {
  try {
    const pollCreationLogsCollection = collection(db, "poll_creation_logs");
    await addDoc(pollCreationLogsCollection, {
      userId: userId,
      pollId: pollId,
      createdAt: serverTimestamp(),
    });
  } catch (error: any) {
    // Se falhar ao criar o log, não deve quebrar a criação da enquete
    // O log é importante para o limite, mas não é crítico para a funcionalidade básica
    console.error("Erro ao registrar log de criação de enquete (não crítico):", error);
    // Não re-lançar o erro para não quebrar o fluxo de criação da enquete
  }
}

export interface UpdateSubscriptionPeriodAndCancellationInput {
  subscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export async function updateSubscriptionPeriodAndCancellation(input: UpdateSubscriptionPeriodAndCancellationInput) {
  const subscriptionRef = doc(getSubscriptionsCollection(), input.subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada para atualizar período/cancelamento.");
  }

  await setDoc(
    subscriptionRef,
    {
      currentPeriodStart: Timestamp.fromDate(input.currentPeriodStart),
      currentPeriodEnd: Timestamp.fromDate(input.currentPeriodEnd),
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    },
    { merge: true }
  );

  await logSubscriptionChange({
    subscriptionId: input.subscriptionId,
    actorId: "stripe_webhook",
    actorName: "Stripe Webhook",
    notes: "Período e status de cancelamento da assinatura atualizados via webhook Stripe.",
  });
}

