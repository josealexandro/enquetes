import { NextResponse } from "next/server";
import { ensureDefaultPlans, listPlans } from "@/app/services/subscriptionService";
import { DEFAULT_PLANS } from "@/app/data/planSeeds";

export async function GET() {
  try {
    // Verificar se as variáveis de ambiente do Firebase estão configuradas
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.warn("[GET_PLANS] Firebase não configurado, retornando planos padrão");
      // OCULTO: Filtrar plano de teste para não aparecer no site
      const filteredPlans = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste");
      return NextResponse.json(
        { 
          plans: filteredPlans, 
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
      console.log("[GET_PLANS] IDs dos planos:", plans.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
    } catch (listError) {
      console.error("[GET_PLANS] Erro ao listar planos:", listError);
      // Usar planos padrão se houver erro ao listar
      // OCULTO: Filtrar plano de teste para não aparecer no site
      plans = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste");
      console.log("[GET_PLANS] Usando planos padrão devido a erro:", plans.map(p => ({ id: p.id, name: p.name })));
    }
    
    if (!plans || plans.length === 0) {
      console.warn("[GET_PLANS] Nenhum plano encontrado, retornando planos padrão");
      // OCULTO: Filtrar plano de teste para não aparecer no site
      const filteredPlans = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste");
      return NextResponse.json(
        { plans: filteredPlans, message: "Retornando planos padrão temporariamente." },
        { status: 200 }
      );
    }

    // Garantir que sempre retornamos pelo menos os planos padrão se a lista estiver vazia ou incompleta
    // OCULTO: Filtrar plano de teste para não aparecer no site
    const expectedPlansCount = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste").length;
    if (plans.length < expectedPlansCount) {
      console.warn(`[GET_PLANS] Apenas ${plans.length} plano(s) encontrado(s), esperado ${expectedPlansCount}. Retornando planos padrão.`);
      const filteredPlans = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste");
      return NextResponse.json(
        { plans: filteredPlans, message: "Retornando planos padrão devido a lista incompleta." },
        { status: 200 }
      );
    }

    // OCULTO: Filtrar plano de teste para não aparecer no site (filtro extra de segurança)
    const filteredPlans = plans.filter(plan => plan.id !== "plan_teste");
    console.log("[GET_PLANS] Retornando planos:", filteredPlans.map(p => p.id));
    return NextResponse.json({ plans: filteredPlans }, { status: 200 });
  } catch (error) {
    console.error("[GET_PLANS] Erro crítico:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    // Retornar sempre JSON válido, mesmo em caso de erro
    // OCULTO: Filtrar plano de teste para não aparecer no site
    const filteredPlans = DEFAULT_PLANS.filter(plan => plan.id !== "plan_teste");
    return NextResponse.json(
      { 
        plans: filteredPlans, 
        message: "Retornando planos padrão temporariamente.",
        error: errorMessage 
      },
      { status: 200 }
    );
  }
}

