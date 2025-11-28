import { PaymentStatus } from "@/app/types/subscription";
import { Buffer } from "buffer";

/**
 * Base da API do Pagar.me.
 * Para contas novas, usamos a API Core V5.
 */
const PAGARME_API_BASE =
  process.env.PAGARME_API_BASE || "https://api.pagar.me/core/v5";
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
  metadata?: Record<string, unknown>;
  boleto_url?: string;
  boleto_barcode?: string;
  pix_qr_code?: string;
  pix_qr_code_url?: string;
  [key: string]: unknown;
}

export interface PagarmeCardData {
  number: string;
  holder_name: string;
  exp_month: string;
  exp_year: string;
  cvv: string;
}

export interface PagarmeCustomerData {
  name: string;
  email: string;
  document?: string;
  phone?: string;
}

export interface PagarmeCheckoutData {
  card: PagarmeCardData;
  customer: PagarmeCustomerData;
  payment_method?: "credit_card" | "pix" | "boleto";
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
 * Nesta versão usamos a API Core V5 criando uma "order" com um pagamento.
 * Em ambiente sem PAGARME_API_KEY configurada, apenas devolve skipped=true.
 */
export async function createTransactionFromCheckout(
  input: CreateTransactionFromCheckoutInput
): Promise<CreateTransactionFromCheckoutResult> {
  if (!PAGARME_API_KEY) {
    return { transaction: null, skipped: true };
  }

  const base = PAGARME_API_BASE.replace(/\/$/, "");
  const url = `${base}/orders`;

  // A estrutura exata do objeto "checkoutData" pode variar conforme a
  // configuração do Checkout. Aqui tentamos extrair os campos mais comuns.
  const { checkoutData, amount, metadata } = input;

  const paymentMethod = checkoutData.payment_method ?? "credit_card";

  // Alguns setups da API v5 exigem que cada item tenha um "code" único.
  // Aproveitamos o planId do metadata (quando existir) como código do item.
  const planCode =
    metadata && typeof metadata["planId"] === "string"
      ? (metadata["planId"] as string)
      : "subscription";

  const items = [
    {
      code: planCode,
      name: "Assinatura",
      description: "Assinatura de plano",
      quantity: 1,
      amount,
    },
  ];

  const payments: Record<string, unknown>[] = [];

  if (paymentMethod === "credit_card") {
    const normalizedNumber = checkoutData.card.number.replace(/\s+/g, "");

    const cardPayload = {
      number: normalizedNumber,
      holder_name: checkoutData.card.holder_name,
      exp_month: checkoutData.card.exp_month,
      exp_year: checkoutData.card.exp_year,
      cvv: checkoutData.card.cvv,
    };

    payments.push({
      payment_method: "credit_card",
      credit_card: {
        card: cardPayload,
      },
    });
  } else if (paymentMethod === "pix") {
    payments.push({
      payment_method: "pix",
      pix: {},
    });
  } else if (paymentMethod === "boleto") {
    payments.push({
      payment_method: "boleto",
      boleto: {},
    });
  }

  // Monta o customer no formato esperado pela API v5
  const customerPayload: Record<string, unknown> = {
    name: checkoutData.customer.name,
    email: checkoutData.customer.email,
  };

  if (checkoutData.customer.document) {
    const docOnlyNumbers = checkoutData.customer.document.replace(/\D/g, "");
    if (docOnlyNumbers) {
      customerPayload.document = docOnlyNumbers;
      customerPayload.type =
        docOnlyNumbers.length > 11 ? "company" : "individual";
    }
  }

  if (checkoutData.customer.phone) {
    const phoneDigits = checkoutData.customer.phone.replace(/\D/g, "");
    if (phoneDigits.length >= 10) {
      const area_code = phoneDigits.slice(0, 2);
      const number = phoneDigits.slice(2);
      // estrutura mínima esperada pelo Core v5
      customerPayload["phones"] = {
        mobile_phone: {
          country_code: "55",
          area_code,
          number,
        },
      };
    }
  }

  const payload: Record<string, unknown> = {
    items,
    payments,
    customer: customerPayload,
    metadata,
  };

  const authHeader = `Basic ${Buffer.from(`${PAGARME_API_KEY}:`).toString(
    "base64"
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as PagarmeTransaction;

  if (!response.ok) {
    console.error("[Pagar.me] Erro ao criar order (Core V5):", json);
    throw new Error("Erro ao criar transação no Pagar.me.");
  }

  return {
    transaction: json,
    skipped: false,
  };
}


