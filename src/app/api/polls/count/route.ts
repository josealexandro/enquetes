import { NextRequest, NextResponse } from "next/server";
import {
  getPollsLimitForCompany,
  countPollsCreatedInCurrentPeriod,
} from "@/app/services/subscriptionService";

/**
 * API Route para obter contador de enquetes
 * Retorna: limite total, enquetes criadas, enquetes restantes
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId é obrigatório." },
        { status: 400 }
      );
    }

    // Buscar limite total e enquetes criadas
    const [pollsLimit, pollsCreated] = await Promise.all([
      getPollsLimitForCompany(companyId),
      countPollsCreatedInCurrentPeriod(companyId),
    ]);

    const pollsRemaining = Math.max(0, pollsLimit - pollsCreated);

    return NextResponse.json({
      pollsLimit,
      pollsCreated,
      pollsRemaining,
    });
  } catch (error) {
    console.error("[GET_POLLS_COUNT] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json(
      {
        message: "Erro ao buscar contador de enquetes.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

