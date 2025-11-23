import { NextResponse } from "next/server";
import { ensureDefaultPlans, listPlans } from "@/app/services/subscriptionService";
import { DEFAULT_PLANS } from "@/app/data/planSeeds";

export async function GET() {
  try {
    try {
      await ensureDefaultPlans();
    } catch (seedError) {
      console.warn("[GET_PLANS] Falha ao garantir planos no Firestore, usando fallback:", seedError);
    }

    const plans = await listPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[GET_PLANS]", error);
    return NextResponse.json(
      { plans: DEFAULT_PLANS, message: "Retornando planos padrão temporariamente." },
      { status: 200 }
    );
  }
}

