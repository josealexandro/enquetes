import { NextRequest, NextResponse } from "next/server";
import {
  getSubscriptionByCompany,
  updateSubscriptionStatus,
} from "@/app/services/subscriptionService";
import {
  mapPagarmeStatusToPaymentStatus,
  type PagarmeTransaction,
} from "@/app/services/pagarmeService";
import type { SubscriptionStatus } from "@/app/types/subscription";

/**
 * Webhook do Pagar.me
 *
 * Configure a URL como:
 *   https://seu-dominio.com/api/pagarme/webhook
 *
 * Este endpoint tenta ser tolerante ao formato do payload,
 * lidando tanto com:
 *  - objeto direto de transação
 *  - evento com `data.object` contendo a transação
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
      console.log("[PAGARME_WEBHOOK] Payload recebido:", body);
    } catch (error) {
      console.error("[PAGARME_WEBHOOK] Falha ao ler JSON do webhook:", error);
      return NextResponse.json(
        { message: "Payload inválido." },
        { status: 400 }
      );
    }

    const asAny = body as any;

    // Tenta localizar o objeto de transação em diferentes formatos de payload
    const tx: PagarmeTransaction | undefined =
      asAny?.object === "transaction"
        ? (asAny as PagarmeTransaction)
        : asAny?.data?.object
        ? (asAny.data.object as PagarmeTransaction)
        : asAny?.transaction
        ? (asAny.transaction as PagarmeTransaction)
        : undefined;

    if (!tx) {
      console.warn(
        "[PAGARME_WEBHOOK] Payload recebido sem objeto de transação reconhecível:",
        body
      );
      return NextResponse.json(
        { message: "Nenhuma transação encontrada no payload." },
        { status: 200 }
      );
    }

    const externalStatus =
      (tx as any).current_status ?? (tx as any).status ?? "processing";
    const paymentStatus = mapPagarmeStatusToPaymentStatus(externalStatus);

    // Só reagimos a estados finais relevantes
    let newSubscriptionStatus: SubscriptionStatus | null = null;
    if (paymentStatus === "PAID") {
      newSubscriptionStatus = "ACTIVE";
    } else if (paymentStatus === "FAILED") {
      // Em caso de falha, marcamos como PAST_DUE para facilitar o reprocessamento
      newSubscriptionStatus = "PAST_DUE";
    }

    if (!newSubscriptionStatus) {
      console.log(
        "[PAGARME_WEBHOOK] Status de pagamento não exige atualização de assinatura:",
        { externalStatus, paymentStatus }
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
    const companyIdRaw =
      metadata.companyId ??
      metadata.company_id ??
      metadata.company_id ??
      null;

    if (!companyIdRaw || typeof companyIdRaw !== "string") {
      console.warn(
        "[PAGARME_WEBHOOK] Não foi possível determinar companyId a partir do metadata:",
        metadata
      );
      return NextResponse.json(
        { message: "companyId não encontrado no metadata." },
        { status: 200 }
      );
    }

    const companyId = companyIdRaw;
    const subscription = await getSubscriptionByCompany(companyId);

    if (!subscription) {
      console.warn(
        "[PAGARME_WEBHOOK] Nenhuma assinatura encontrada para companyId no webhook:",
        { companyId }
      );
      return NextResponse.json(
        { message: "Assinatura não encontrada para este companyId." },
        { status: 200 }
      );
    }

    const transactionId =
      typeof tx.id === "string" || typeof tx.id === "number"
        ? String(tx.id)
        : undefined;

    await updateSubscriptionStatus(subscription.id, newSubscriptionStatus, {
      invoiceId: transactionId,
      actorId: "pagarme_webhook",
      actorName: "Pagar.me Webhook",
      notes: `Status externo: ${externalStatus}`,
    });

    console.log(
      "[PAGARME_WEBHOOK] Assinatura atualizada a partir de webhook:",
      {
        subscriptionId: subscription.id,
        companyId,
        newStatus: newSubscriptionStatus,
        externalStatus,
      }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[PAGARME_WEBHOOK_POST]", error);
    return NextResponse.json(
      { message: "Erro ao processar webhook do Pagar.me." },
      { status: 500 }
    );
  }
}


