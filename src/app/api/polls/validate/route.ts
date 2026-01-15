import { NextRequest, NextResponse } from "next/server";
import {
  getPollsLimitForCompany,
  countPollsCreatedInCurrentPeriod,
  getSubscriptionByCompany,
} from "@/app/services/subscriptionService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * API Route para validar se um usuário pode criar uma enquete
 * 
 * Esta validação é feita no backend para garantir segurança, verificando:
 * 1. Se o usuário tem assinatura ativa
 * 2. Se o usuário atingiu o limite de enquetes no período atual
 * 3. Se o usuário tem créditos avulsos disponíveis
 * 
 * IMPORTANTE: Esta validação deve ser chamada ANTES de criar a enquete no Firestore
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se Firebase está configurado
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("[VALIDATE_POLL] Firebase não está configurado");
      return NextResponse.json(
        {
          message: "Firebase não está configurado. Verifique as variáveis de ambiente.",
          error: "FIREBASE_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId } = body;

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { message: "companyId é obrigatório e deve ser uma string." },
        { status: 400 }
      );
    }

    console.log("[VALIDATE_POLL] Validando criação de enquete para companyId:", companyId);

    // Obter limite de enquetes para o usuário
    const pollsLimit = await getPollsLimitForCompany(companyId);
    
    // Contar enquetes criadas no período atual
    const pollsCreated = await countPollsCreatedInCurrentPeriod(companyId);

    // Obter créditos avulsos do documento do usuário
    const userRef = doc(db, "users", companyId);
    const userSnap = await getDoc(userRef);
    const extraPollsAvailable = userSnap.exists() 
      ? (userSnap.data()?.extraPollsAvailable ?? 0) 
      : 0;

    // Verificar assinatura
    const subscription = await getSubscriptionByCompany(companyId);
    const hasActiveSubscription = subscription?.status === "ACTIVE";

    // Verificar se atingiu o limite base (sem contar créditos avulsos)
    const baseLimit = hasActiveSubscription 
      ? subscription?.planSnapshot.limits.pollsPerMonth ?? 2
      : 2;
    
    const hasReachedBaseLimit = pollsCreated >= baseLimit;
    const hasExtraCredit = extraPollsAvailable > 0;

    // Determinar se pode criar enquete
    let canCreate = false;
    let shouldUseCredit = false;
    let message = "";

    if (pollsCreated < pollsLimit) {
      // Ainda não atingiu o limite total (incluindo créditos)
      canCreate = true;
      message = "Você pode criar a enquete.";
    } else if (hasReachedBaseLimit && hasExtraCredit) {
      // Atingiu o limite base, mas tem crédito avulso
      canCreate = true;
      shouldUseCredit = true;
      message = `Você atingiu o limite de ${baseLimit} enquetes do seu plano, mas tem ${extraPollsAvailable} crédito(s) avulso(s) disponível(is). Um crédito será usado automaticamente.`;
    } else {
      // Atingiu o limite e não tem créditos
      canCreate = false;
      // Verificar tipo de conta para mensagem personalizada
      const accountType = userSnap.exists() ? (userSnap.data()?.accountType ?? 'personal') : 'personal';
      message = accountType === 'commercial'
        ? "Assine um plano e tenha todo o sistema de customer voice a seu favor."
        : `Você atingiu o limite de ${baseLimit} enquetes para o seu plano neste período. Compre um crédito avulso para postar mais enquetes.`;
    }

    console.log("[VALIDATE_POLL] Resultado da validação:", {
      companyId,
      pollsLimit,
      pollsCreated,
      baseLimit,
      extraPollsAvailable,
      hasActiveSubscription,
      canCreate,
      shouldUseCredit,
    });

    return NextResponse.json({
      canCreate,
      shouldUseCredit,
      message,
      data: {
        pollsLimit,
        pollsCreated,
        baseLimit,
        extraPollsAvailable,
        hasActiveSubscription,
        subscriptionStatus: subscription?.status ?? null,
      },
    });
  } catch (error) {
    console.error("[VALIDATE_POLL] Erro ao validar criação de enquete:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Verificar se é erro de permissão do Firestore
    if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
      return NextResponse.json(
        {
          message: "Erro de permissão ao validar criação de enquete. Verifique as regras do Firestore.",
          error: "PERMISSION_DENIED",
          canCreate: false,
        },
        { status: 403 }
      );
    }

    // Em caso de erro, retornar que não pode criar (fail-safe)
    return NextResponse.json(
      {
        message: "Erro ao validar criação de enquete. Tente novamente.",
        error: errorMessage,
        canCreate: false,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}


