import { NextRequest, NextResponse } from "next/server";
import {
  getPollsLimitForCompany,
  countPollsCreatedInCurrentPeriod,
  getSubscriptionByCompany,
} from "@/app/services/subscriptionService";
import { getIsAdminByCompanyId } from "@/lib/adminAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
/**
 * API Route para criar uma enquete
 * 
 * Esta rota faz tudo no backend de forma segura:
 * 1. Valida assinatura e limites
 * 2. Consome crédito se necessário
 * 3. Cria a enquete no Firestore
 * 4. Registra no log de criação
 * 
 * IMPORTANTE: Esta é a única forma segura de criar enquetes,
 * garantindo que os limites de assinatura sejam respeitados.
 * 
 * NOTA: As regras do Firestore garantem que apenas o usuário autenticado
 * pode criar enquetes com seu próprio ID como creator.id
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se Firebase está configurado
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("[CREATE_POLL] Firebase não está configurado");
      return NextResponse.json(
        {
          message: "Firebase não está configurado. Verifique as variáveis de ambiente.",
          error: "FIREBASE_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      companyId,
      title,
      options,
      category,
      isCommercial = false,
      creatorData,
      // DOCUMENTAÇÃO: Campos de localização (opcionais)
      region,
      city,
      state,
    } = body;

    // Validações básicas
    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { message: "companyId é obrigatório e deve ser uma string." },
        { status: 400 }
      );
    }

    // Validar dados da enquete
    const trimmedTitle = title?.trim();
    if (!trimmedTitle || trimmedTitle.length === 0) {
      return NextResponse.json(
        { message: "O título da enquete não pode estar vazio." },
        { status: 400 }
      );
    }

    if (trimmedTitle.length > 200) {
      return NextResponse.json(
        { message: "O título da enquete não pode ter mais de 200 caracteres." },
        { status: 400 }
      );
    }

    const filteredOptions = options
      ?.map((opt: string) => opt.trim())
      .filter((opt: string) => opt !== "") || [];

    if (filteredOptions.length < 2) {
      return NextResponse.json(
        { message: "A enquete precisa de pelo menos duas opções válidas." },
        { status: 400 }
      );
    }

    if (filteredOptions.length > 10) {
      return NextResponse.json(
        { message: "A enquete não pode ter mais de 10 opções." },
        { status: 400 }
      );
    }

    // Verificar duplicatas
    const hasDuplicates = new Set(filteredOptions).size !== filteredOptions.length;
    if (hasDuplicates) {
      return NextResponse.json(
        { message: "As opções devem ser únicas." },
        { status: 400 }
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { message: "A categoria é obrigatória." },
        { status: 400 }
      );
    }

    console.log("[CREATE_POLL] Validando criação de enquete para companyId:", companyId);

    // ADMIN: Conta em ADMIN_EMAILS pode criar enquetes sem verificação de limite (para demonstração)
    let canCreate = false;
    let shouldUseCredit = false;
    let extraPollsAvailable = 0; // usado na resposta; quando admin permanece 0
    const isAdmin = await getIsAdminByCompanyId(companyId);
    if (isAdmin) {
      canCreate = true;
      shouldUseCredit = false;
    } else {
      // 1. VALIDAR ASSINATURA E LIMITES
      const pollsLimit = await getPollsLimitForCompany(companyId);
      const pollsCreated = await countPollsCreatedInCurrentPeriod(companyId);

      // Obter créditos avulsos
      const userRef = doc(db, "users", companyId);
      const userSnap = await getDoc(userRef);
      extraPollsAvailable = userSnap.exists()
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

      // 2. VERIFICAR SE PODE CRIAR
      if (pollsCreated < baseLimit) {
        // Ainda não atingiu o limite base (pode criar sem consumir crédito)
        canCreate = true;
        shouldUseCredit = false;
      } else if (hasReachedBaseLimit) {
        // Atingiu o limite base - precisa de crédito para criar mais
        if (hasExtraCredit) {
          // Tem crédito disponível - pode criar, mas DEVE consumir o crédito
          // Verificar se ainda não atingiu o limite total (base + créditos já consumidos)
          const remainingCredits = extraPollsAvailable;
          const effectiveLimit = baseLimit + remainingCredits;
          
          if (pollsCreated < effectiveLimit) {
            canCreate = true;
            shouldUseCredit = true;
          } else {
            // Já usou todos os créditos disponíveis
            canCreate = false;
          }
        } else {
          // Não tem crédito disponível
          canCreate = false;
        }
      } else {
        // Não deveria chegar aqui, mas por segurança
        canCreate = false;
      }

      if (!canCreate) {
        // Verificar tipo de conta para mensagem personalizada
        const accountType = userSnap.exists() ? (userSnap.data()?.accountType ?? 'personal') : 'personal';
        const message = accountType === 'commercial'
          ? "Assine um plano e tenha todo o sistema de customer voice a seu favor."
          : `Você atingiu o limite de ${baseLimit} enquetes para o seu plano neste período. Compre um crédito avulso para postar mais enquetes.`;

        return NextResponse.json(
          {
            message,
            error: "LIMIT_REACHED",
            data: {
              pollsLimit,
              pollsCreated,
              baseLimit,
              extraPollsAvailable,
              hasActiveSubscription,
            },
          },
          { status: 403 }
        );
      }
    }

    // 3. VERIFICAR SE ADMIN SDK ESTÁ DISPONÍVEL
    if (!adminDb) {
      console.error("[CREATE_POLL] Admin SDK não está disponível");
      return NextResponse.json(
        {
          message: "Erro de configuração do servidor. Admin SDK não está disponível.",
          error: "ADMIN_SDK_NOT_AVAILABLE",
        },
        { status: 500 }
      );
    }

    // 4. CONSUMIR CRÉDITO SE NECESSÁRIO (usando Admin SDK)
    if (shouldUseCredit) {
      if (extraPollsAvailable <= 0) {
        return NextResponse.json(
          {
            message: "Você não tem créditos avulsos disponíveis.",
            error: "NO_CREDITS_AVAILABLE",
          },
          { status: 400 }
        );
      }

      const userDocRef = adminDb.doc(`users/${companyId}`);
      await userDocRef.update({
        extraPollsAvailable: admin.firestore.FieldValue.increment(-1),
      });

      console.log("[CREATE_POLL] Crédito consumido. Créditos restantes:", extraPollsAvailable - 1);
    }

    // 5. CRIAR A ENQUETE (usando Admin SDK)
    const pollsCollectionRef = adminDb.collection("polls");

    // Preparar dados do criador (usar dados fornecidos ou criar básico)
    const finalCreatorData = creatorData || {
      id: companyId,
      name: "Usuário",
      avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
    };

    const pollData = {
      title: trimmedTitle,
      options: filteredOptions.map((optionText: string) => ({
        id: uuidv4(),
        text: optionText,
        votes: 0,
      })),
      category: category,
      creator: finalCreatorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isCommercial: isCommercial,
      commentCount: 0,
      likes: 0,
      likedBy: [],
      dislikes: 0,
      dislikedBy: [],
      // DOCUMENTAÇÃO: Campos de localização (opcionais - copiados do perfil do usuário)
      // Se não fornecidos, a enquete não terá localização (compatível com enquetes antigas)
      ...(region && typeof region === 'string' && region.trim() && { region: region.trim() }),
      ...(city && typeof city === 'string' && city.trim() && { city: city.trim() }),
      ...(state && typeof state === 'string' && state.trim() && { state: state.trim() }),
    };

    const newPollDoc = await pollsCollectionRef.add(pollData);
    const newPollId = newPollDoc.id;

    // 6. REGISTRAR NO LOG DE CRIAÇÃO (usando Admin SDK)
    try {
      const pollCreationLogsCollection = adminDb.collection("poll_creation_logs");
      await pollCreationLogsCollection.add({
        userId: companyId,
        pollId: newPollId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      // Erro ao criar log não deve impedir a criação da enquete
      console.error("[CREATE_POLL] Erro ao registrar log de criação (não crítico):", logError);
    }

    console.log("[CREATE_POLL] Enquete criada com sucesso:", newPollId);

    return NextResponse.json(
      {
        success: true,
        message: shouldUseCredit
          ? `Enquete criada com sucesso! Um crédito avulso foi utilizado. Você tem ${extraPollsAvailable - 1} crédito(s) restante(s).`
          : "Enquete criada com sucesso!",
        pollId: newPollId,
        creditsRemaining: shouldUseCredit ? extraPollsAvailable - 1 : extraPollsAvailable,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREATE_POLL] Erro ao criar enquete:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Verificar se é erro de permissão do Firestore
    if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
      return NextResponse.json(
        {
          message: "Erro de permissão ao criar enquete. Verifique as regras do Firestore.",
          error: "PERMISSION_DENIED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        message: "Erro ao criar enquete. Tente novamente.",
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

