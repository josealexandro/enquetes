import { NextResponse } from "next/server";
import { listPaymentsBySubscription } from "@/app/services/subscriptionService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const payments = await listPaymentsBySubscription(subscriptionId);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[GET_SUBSCRIPTION_PAYMENTS]", error);
    return NextResponse.json(
      { message: "Erro ao listar pagamentos da assinatura." },
      { status: 500 }
    );
  }
}


