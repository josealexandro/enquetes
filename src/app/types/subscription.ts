import { Timestamp } from "firebase/firestore";

export type PlanSlug = "basic" | "medium" | "pro";

export type BillingPeriod = "monthly" | "yearly";

export interface PlanLimits {
  pollsPerMonth: number;
  activePolls: number;
  commercialProfiles: number;
  teamMembers: number;
  storageMb: number;
}

export interface Plan {
  id: string;
  slug: PlanSlug;
  name: string;
  description: string;
  price: number;
  currency: "BRL";
  billingPeriod: BillingPeriod;
  trialDays?: number;
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "AWAITING_CONFIRMATION"
  | "CANCELED";

export interface Subscription {
  id: string;
  companyId: string;
  companyName: string;
  planId: string;
  planSnapshot: Pick<
    Plan,
    "slug" | "name" | "price" | "currency" | "billingPeriod" | "limits"
  >;
  status: SubscriptionStatus;
  startDate: Timestamp;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string;
  pendingInvoiceId?: string;
  notes?: string;
}

export type PaymentStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface Payment {
  id: string;
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  currency: "BRL";
  status: PaymentStatus;
  gateway: string;
  dueDate: Timestamp;
  paidAt?: Timestamp;
  failureReason?: string;
  rawPayload?: Record<string, unknown>;
}

export interface SubscriptionAudit {
  id: string;
  subscriptionId: string;
  actorId: string;
  actorName: string;
  fromPlan?: PlanSlug;
  toPlan?: PlanSlug;
  fromStatus?: SubscriptionStatus;
  toStatus?: SubscriptionStatus;
  createdAt: Timestamp;
  notes?: string;
}


