import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * API Route para consumir um crédito avulso de enquete
 * 
 * Esta rota deve ser chamada quando o usuário usa um crédito avulso para criar uma enquete.
 * IMPORTANTE: Esta operação deve ser feita no backend para garantir segurança.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se Firebase está configurado
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("[CONSUME_CREDIT] Firebase não está configurado");
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

    console.log("[CONSUME_CREDIT] Consumindo crédito para companyId:", companyId);

    // Verificar se o usuário tem créditos disponíveis
    const userRef = doc(db, "users", companyId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const currentCredits = userSnap.data()?.extraPollsAvailable ?? 0;

    if (currentCredits <= 0) {
      return NextResponse.json(
        {
          message: "Você não tem créditos avulsos disponíveis.",
          error: "NO_CREDITS_AVAILABLE",
        },
        { status: 400 }
      );
    }

    // Consumir um crédito
    await updateDoc(userRef, {
      extraPollsAvailable: increment(-1),
    });

    const newCreditsCount = currentCredits - 1;

    console.log("[CONSUME_CREDIT] Crédito consumido. Créditos restantes:", newCreditsCount);

    return NextResponse.json({
      success: true,
      message: `Crédito consumido com sucesso. Você tem ${newCreditsCount} crédito(s) restante(s).`,
      creditsRemaining: newCreditsCount,
    });
  } catch (error) {
    console.error("[CONSUME_CREDIT] Erro ao consumir crédito:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Verificar se é erro de permissão do Firestore
    if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
      return NextResponse.json(
        {
          message: "Erro de permissão ao consumir crédito. Verifique as regras do Firestore.",
          error: "PERMISSION_DENIED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        message: "Erro ao consumir crédito. Tente novamente.",
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}




