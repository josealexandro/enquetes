import { PaymentStatus } from "@/app/types/subscription";

const PAGARME_API_BASE =
  process.env.PAGARME_API_BASE || "https://api.pagar.me/1";
const PAGARME_API_KEY = process.env.PAGARME_API_KEY;

if (!PAGARME_API_KEY) {
  // Em ambiente de desenvolvimento avisamos no log, mas não quebramos o build.
  console.warn(
    "[pagarmeService] PAGARME_API_KEY não configurada. As chamadas reais ao gateway serão puladas."
  );
}

export type PagarmeTransactionStatus =
  | "processing"
  | "waiting_payment"
  | "waiting_capture"
  | "authorized"
  | "paid"
  | "refused"
  | "chargeback"
  | "refunded"
  | "canceled"
  | string;

export interface PagarmeTransaction {
  id: number | string;
  status: PagarmeTransactionStatus;
  amount: number;
  payment_method?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  pix_qr_code?: string;
  pix_qr_code_url?: string;
  [key: string]: unknown;
}

export interface PagarmeCheckoutData {
  card_hash?: string;
  token?: string;
  payment_method?: string;
  customer?: unknown;
  [key: string]: unknown;
}

export interface CreateTransactionFromCheckoutInput {
  amount: number;
  checkoutData: PagarmeCheckoutData;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreateTransactionFromCheckoutResult {
  transaction: PagarmeTransaction | null;
  skipped: boolean;
}

export function mapPagarmeStatusToPaymentStatus(
  status: PagarmeTransactionStatus
): PaymentStatus {
  switch (status) {
    case "paid":
    case "authorized":
      return "PAID";
    case "processing":
    case "waiting_payment":
    case "waiting_capture":
      return "AWAITING_CONFIRMATION";
    case "refused":
    case "chargeback":
    case "canceled":
      return "FAILED";
    case "refunded":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

/**
 * Cria uma transação no Pagar.me a partir dos dados retornados pelo Checkout JS.
 * Em ambiente sem PAGARME_API_KEY configurada, apenas devolve skipped=true.
 */
export async function createTransactionFromCheckout(
  input: CreateTransactionFromCheckoutInput
): Promise<CreateTransactionFromCheckoutResult> {
  if (!PAGARME_API_KEY) {
    return { transaction: null, skipped: true };
  }

  const base = PAGARME_API_BASE.replace(/\/$/, "");
  const url = `${base}/transactions`;

  // A estrutura exata do objeto "checkoutData" pode variar conforme a
  // configuração do Checkout. Aqui tentamos extrair os campos mais comuns.
  const { checkoutData, amount, metadata } = input;

  const payload: Record<string, unknown> = {
    api_key: PAGARME_API_KEY,
    amount,
    metadata,
  };

  // Alguns ambientes retornam "token", outros "card_hash" ou "card" com hash.
  if (checkoutData?.card_hash) {
    payload.card_hash = checkoutData.card_hash;
  }
  if (checkoutData?.token) {
    payload.token = checkoutData.token;
  }
  if (checkoutData?.payment_method) {
    payload.payment_method = checkoutData.payment_method;
  }
  if (checkoutData?.customer) {
    payload.customer = checkoutData.customer;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as PagarmeTransaction;

  if (!response.ok) {
    console.error("[Pagar.me] Erro ao criar transação:", json);
    throw new Error("Erro ao criar transação no Pagar.me.");
  }

  return {
    transaction: json,
    skipped: false,
  };
}


