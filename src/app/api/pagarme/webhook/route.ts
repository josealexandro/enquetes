import { NextRequest, NextResponse } from "next/server";
import {
  getSubscriptionByCompany,
  updateSubscriptionStatus,
} from "@/app/services/subscriptionService";
import {
  mapPagarmeStatusToPaymentStatus,
  type PagarmeTransaction,
  type PagarmeTransactionStatus,
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

    type WebhookRoot = {
      object?: string;
      data?: { object?: PagarmeTransaction };
      transaction?: PagarmeTransaction;
      [key: string]: unknown;
    };

    const root = body as WebhookRoot;

    // Tenta localizar o objeto de transação ou order em diferentes formatos de payload
    let tx: PagarmeTransaction | undefined;
    let orderStatus: string | undefined;

    // Formato V5 padrão para Orders/Charges: type define o evento, data contém o objeto
    if (root.type && root.data) {
      const eventType = root.type as string; // ex: "order.paid", "charge.paid"
      
      // Se for evento de Order
      if (eventType.startsWith("order.") && (root.data as any).charges) {
        // Pega a primeira charge válida para determinar status
        const charges = (root.data as any).charges as any[];
        if (charges && charges.length > 0) {
           tx = charges[0]; // Usa a primeira charge como referência de transação
        }
        // Status da order
        orderStatus = (root.data as any).status;
      } 
      // Se for evento de Charge direto
      else if (eventType.startsWith("charge.")) {
        tx = root.data as unknown as PagarmeTransaction;
      }
    }

    // Fallback para formatos antigos ou diretos (V4 style ou hooks simples)
    if (!tx) {
      if (root.object === "transaction") {
        tx = root as unknown as PagarmeTransaction;
      } else if (root.data?.object) {
        tx = root.data.object;
      } else if (root.transaction) {
        tx = root.transaction;
      }
    }

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

    const txWithCurrentStatus = tx as PagarmeTransaction & {
      current_status?: PagarmeTransactionStatus;
    };
    // Determinar status final
    const externalStatus =
      orderStatus ?? // Se temos status da Order, ele tem prioridade
      txWithCurrentStatus.current_status ??
      txWithCurrentStatus.status ??
      "processing";
      
    const paymentStatus = mapPagarmeStatusToPaymentStatus(externalStatus);

    // Só reagimos a estados finais relevantes
    let newSubscriptionStatus: SubscriptionStatus | null = null;
    
    // Se for PAID ou se a Order estiver "paid", ativamos
    if (paymentStatus === "PAID" || externalStatus === "paid") {
      newSubscriptionStatus = "ACTIVE";
    } else if (paymentStatus === "FAILED" || externalStatus === "failed" || externalStatus === "canceled") {
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


