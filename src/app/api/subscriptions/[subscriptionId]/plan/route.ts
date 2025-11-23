import { NextRequest, NextResponse } from "next/server";
import { switchSubscriptionPlan } from "@/app/services/subscriptionService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  const { subscriptionId } = params;

  try {
    const body = await request.json();
    const { planId, actorId, actorName } = body ?? {};

    if (!planId || !actorId || !actorName) {
      return NextResponse.json(
        { message: "planId, actorId e actorName são obrigatórios." },
        { status: 400 }
      );
    }

    await switchSubscriptionPlan({
      subscriptionId,
      newPlanId: planId,
      actorId,
      actorName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH_SUBSCRIPTION_PLAN]", error);
    return NextResponse.json(
      { message: "Erro ao atualizar plano da assinatura." },
      { status: 500 }
    );
  }
}


