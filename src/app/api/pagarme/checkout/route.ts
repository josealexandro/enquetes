import { NextRequest, NextResponse } from "next/server";
import {
  createSubscription,
  CreateSubscriptionInput,
  recordPayment,
} from "@/app/services/subscriptionService";
import {
  createTransactionFromCheckout,
  mapPagarmeStatusToPaymentStatus,
  type PagarmeCheckoutData,
} from "@/app/services/pagarmeService";
import { PaymentStatus } from "@/app/types/subscription";

interface CheckoutRequestBody {
  amount: number;
  planId: string;
  companyId: string;
  companyName: string;
  subscriptionId?: string;
  checkoutData: PagarmeCheckoutData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;

    if (
      !body.amount ||
      !body.planId ||
      !body.companyId ||
      !body.companyName ||
      !body.checkoutData
    ) {
      return NextResponse.json(
        { message: "Dados de checkout incompletos." },
        { status: 400 }
      );
    }

    const {
      amount,
      planId,
      companyId,
      companyName,
      subscriptionId,
      checkoutData,
    } = body;

    // 1) Cria transação no Pagar.me (quando configurado)
    const { transaction, skipped } = await createTransactionFromCheckout({
      amount,
      checkoutData,
      metadata: {
        planId,
        companyId,
        companyName,
      },
    });

    console.log("[PAGARME_CHECKOUT] Resultado da criação de transação:", {
      skipped,
      status: transaction?.status,
      id: transaction?.id,
      metadata: transaction?.metadata,
    });

    const externalStatus = transaction?.status ?? "processing";
    const paymentStatus: PaymentStatus = skipped
      ? "AWAITING_CONFIRMATION"
      : mapPagarmeStatusToPaymentStatus(externalStatus);

    // 2) Garante que existe uma assinatura no Firestore
    let finalSubscriptionId = subscriptionId;

    if (!finalSubscriptionId) {
      const input: CreateSubscriptionInput = {
        companyId,
        companyName,
        planId,
        paymentMethod: "pagarme_checkout",
        status:
          paymentStatus === "PAID" ? "ACTIVE" : "AWAITING_CONFIRMATION",
      };

      finalSubscriptionId = await createSubscription(input);
    }

    // 3) Registra o pagamento localmente
    const invoiceId =
      typeof transaction?.id === "string" || typeof transaction?.id === "number"
        ? String(transaction.id)
        : `local-${Date.now()}`;

    await recordPayment({
      subscriptionId: finalSubscriptionId,
      invoiceId,
      amount,
      status: paymentStatus,
      gateway: "Pagar.me",
      dueDate: new Date(),
      paidAt: paymentStatus === "PAID" ? new Date() : undefined,
      rawPayload: transaction ?? { skipped: true, checkoutData },
    });

    return NextResponse.json(
      {
        subscriptionId: finalSubscriptionId,
        transaction,
        paymentStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PAGARME_CHECKOUT_POST]", error);
    return NextResponse.json(
      {
        message:
          "Erro ao processar pagamento com o gateway. Tente novamente mais tarde.",
      },
      { status: 500 }
    );
  }
}


