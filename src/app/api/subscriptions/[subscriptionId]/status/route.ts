import { NextRequest, NextResponse } from "next/server";
import { updateSubscriptionStatus } from "@/app/services/subscriptionService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await params;

  try {
    const body = await request.json();
    const { status, notes, invoiceId, actorId, actorName } = body ?? {};

    if (!status) {
      return NextResponse.json(
        { message: "O campo status é obrigatório." },
        { status: 400 }
      );
    }

    await updateSubscriptionStatus(subscriptionId, status, {
      invoiceId,
      notes,
      actorId,
      actorName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH_SUBSCRIPTION_STATUS]", error);
    return NextResponse.json(
      { message: "Erro ao atualizar status da assinatura." },
      { status: 500 }
    );
  }
}


