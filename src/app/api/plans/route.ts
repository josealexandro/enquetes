import { NextResponse } from "next/server";
import { ensureDefaultPlans, listPlans } from "@/app/services/subscriptionService";
import { DEFAULT_PLANS } from "@/app/data/planSeeds";

export async function GET() {
  try {
    // Verificar se as variáveis de ambiente do Firebase estão configuradas
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.warn("[GET_PLANS] Firebase não configurado, retornando planos padrão");
      return NextResponse.json(
        { 
          plans: DEFAULT_PLANS, 
          message: "Firebase não configurado. Retornando planos padrão." 
        },
        { status: 200 }
      );
    }

    console.log("[GET_PLANS] Iniciando busca de planos...");
    
    try {
      await ensureDefaultPlans();
      console.log("[GET_PLANS] Planos padrão garantidos no Firestore");
    } catch (seedError) {
      console.warn("[GET_PLANS] Falha ao garantir planos no Firestore, usando fallback:", seedError);
    }

    let plans: typeof DEFAULT_PLANS = [];
    try {
      plans = await listPlans();
      console.log("[GET_PLANS] Planos encontrados:", plans.length);
    } catch (listError) {
      console.error("[GET_PLANS] Erro ao listar planos:", listError);
      // Usar planos padrão se houver erro ao listar
      plans = DEFAULT_PLANS;
    }
    
    if (!plans || plans.length === 0) {
      console.warn("[GET_PLANS] Nenhum plano encontrado, retornando planos padrão");
      return NextResponse.json(
        { plans: DEFAULT_PLANS, message: "Retornando planos padrão temporariamente." },
        { status: 200 }
      );
    }

    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    console.error("[GET_PLANS] Erro crítico:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    // Retornar sempre JSON válido, mesmo em caso de erro
    return NextResponse.json(
      { 
        plans: DEFAULT_PLANS, 
        message: "Retornando planos padrão temporariamente.",
        error: errorMessage 
      },
      { status: 200 }
    );
  }
}

