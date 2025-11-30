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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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

const plansCollection = collection(db, "plans");
const subscriptionsCollection = collection(db, "subscriptions");
const paymentsCollection = collection(db, "payments");
const auditCollection = collection(db, "subscription_audit");

const findPlanSeedById = (planId: string) =>
  DEFAULT_PLANS.find((plan) => plan.id === planId);

const findPlanSeedBySlug = (slug: PlanSlug) =>
  DEFAULT_PLANS.find((plan) => plan.slug === slug);

export async function ensureDefaultPlans() {
  const tasks = DEFAULT_PLANS.map(async (plan) => {
    const ref = doc(plansCollection, plan.id);
    await setDoc(ref, plan, { merge: true });
  });

  await Promise.all(tasks);
}

export async function listPlans(): Promise<Plan[]> {
  try {
    const plansQuery = query(plansCollection, orderBy("sortOrder", "asc"));
    const snapshot = await getDocs(plansQuery);
    if (!snapshot.size) {
      return DEFAULT_PLANS;
    }
    return snapshot.docs.map((docSnap) => docSnap.data() as Plan);
  } catch (error) {
    console.error("listPlans fallback to DEFAULT_PLANS:", error);
    return DEFAULT_PLANS;
  }
}

export async function getSubscriptionByCompany(companyId: string) {
  const subscriptionQuery = query(
    subscriptionsCollection,
    where("companyId", "==", companyId),
    limit(1)
  );

  const snapshot = await getDocs(subscriptionQuery);
  if (!snapshot.docs.length) {
    return null;
  }

  return snapshot.docs[0].data() as Subscription;
}

export async function getPlanBySlug(slug: PlanSlug) {
  try {
    const slugQuery = query(plansCollection, where("slug", "==", slug), limit(1));
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
    const planDoc = await getDoc(doc(plansCollection, id));
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
  const planRef = doc(plansCollection, input.planId);
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

  const subscriptionRef = doc(subscriptionsCollection);
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
  const subscriptionRef = doc(subscriptionsCollection, subscriptionId);
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
  const paymentRef = doc(paymentsCollection);
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
  const auditRef = doc(auditCollection);
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
  const subscriptionRef = doc(subscriptionsCollection, input.subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada.");
  }

  const subscriptionData = subscriptionSnap.data() as Subscription;

  const newPlanRef = doc(plansCollection, input.newPlanId);
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
    paymentsCollection,
    where("subscriptionId", "==", subscriptionId)
  );

  const snapshot = await getDocs(paymentsQuery);
  const items = snapshot.docs.map((docSnap) => docSnap.data() as Payment);

  // Ordena em memória por data de vencimento, mais recente primeiro.
  return items.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis());
}

export interface UpdateSubscriptionPeriodAndCancellationInput {
  subscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export async function updateSubscriptionPeriodAndCancellation(input: UpdateSubscriptionPeriodAndCancellationInput) {
  const subscriptionRef = doc(subscriptionsCollection, input.subscriptionId);
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

