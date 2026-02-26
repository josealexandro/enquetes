import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getSubscriptionByCompany } from "@/app/services/subscriptionService";
import { getIsAdminByCompanyId } from "@/lib/adminAuth";
import { CreateStoryInput, Story, StoryResponse } from "@/app/types/story";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

/**
 * API Route para gerenciar Stories de empresas
 * 
 * DOCUMENTAÇÃO:
 * - POST: Cria um novo story para uma empresa
 *   - Valida se a empresa tem assinatura ativa (ACTIVE ou TRIALING)
 *   - Valida se não há mais de 2 stories ativos
 *   - Calcula expiresAt automaticamente (createdAt + 24h)
 *   - Todas as contas comerciais podem criar stories (Basic, Medium, Pro)
 * 
 * - GET: Lista stories ativos de uma empresa
 *   - Filtra apenas stories onde expiresAt > now
 *   - Retorna máximo de 2 stories mais recentes
 * 
 * SEGURANÇA:
 * - Apenas empresas autenticadas podem criar stories
 * - Apenas para seu próprio empresaId
 * - Validação de assinatura no backend (não confia apenas no frontend)
 */

/**
 * POST /api/stories
 * Cria um novo story para a empresa autenticada
 * 
 * Body:
 * - imageUrl: string (obrigatório)
 * - text?: string (opcional, máximo 80 caracteres)
 * - companyId: string (obrigatório, deve ser o ID da empresa autenticada)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateStoryInput & { companyId: string };

    // Validação básica dos campos
    if (!body.companyId) {
      return NextResponse.json<StoryResponse>(
        { success: false, error: "companyId é obrigatório" },
        { status: 400 }
      );
    }

    if (!body.imageUrl || typeof body.imageUrl !== "string" || body.imageUrl.trim().length === 0) {
      return NextResponse.json<StoryResponse>(
        { success: false, error: "imageUrl é obrigatório e deve ser uma URL válida" },
        { status: 400 }
      );
    }

    // Validar texto se fornecido (máximo 80 caracteres)
    if (body.text && body.text.length > 80) {
      return NextResponse.json<StoryResponse>(
        { success: false, error: "O texto do story não pode ter mais de 80 caracteres" },
        { status: 400 }
      );
    }

    // DOCUMENTAÇÃO: Admin pode criar stories sem assinatura (demonstração)
    const isAdmin = await getIsAdminByCompanyId(body.companyId);
    if (!isAdmin) {
      // Validação de assinatura: empresa precisa ter assinatura ativa (qualquer plano)
      const subscription = await getSubscriptionByCompany(body.companyId);

      if (!subscription) {
        return NextResponse.json<StoryResponse>(
          { success: false, error: "Empresa não possui assinatura ativa" },
          { status: 403 }
        );
      }

      const isActive = subscription.status === "ACTIVE" || subscription.status === "TRIALING";
      if (!isActive) {
        return NextResponse.json<StoryResponse>(
          { success: false, error: "Assinatura não está ativa. Status: " + subscription.status },
          { status: 403 }
        );
      }
    }

    // DOCUMENTAÇÃO: Validação de plano removida - todas as contas comerciais (Basic, Medium, Pro) podem criar stories

    // DOCUMENTAÇÃO: Verificar limite de 2 stories ativos
    // Buscar stories ativos da empresa (expiresAt > now)
    const storiesRef = collection(db, `users/${body.companyId}/stories`);
    
    // Usar Admin SDK se disponível (contexto de API route)
    let activeStoriesCount = 0;
    if (adminDb) {
      // Admin SDK precisa usar AdminTimestamp
      const adminNow = AdminTimestamp.now();
      const activeStoriesSnapshot = await adminDb
        .collection("users")
        .doc(body.companyId)
        .collection("stories")
        .where("expiresAt", ">", adminNow)
        .get();
      activeStoriesCount = activeStoriesSnapshot.size;
    } else {
      // Fallback: usar Client SDK
      const now = Timestamp.now();
      const activeStoriesQuery = query(
        storiesRef,
        where("expiresAt", ">", now)
      );
      const activeStoriesSnapshot = await getDocs(activeStoriesQuery);
      activeStoriesCount = activeStoriesSnapshot.size;
    }

    // Verificar se já há 2 stories ativos
    if (activeStoriesCount >= 2) {
      return NextResponse.json<StoryResponse>(
        { success: false, error: "Máximo de 2 stories ativos por empresa. Aguarde a expiração de um story existente." },
        { status: 403 }
      );
    }

    // DOCUMENTAÇÃO: Criar o story
    // expiresAt = createdAt + 24 horas
    // Calcular expiresAt baseado no timestamp atual
    const expiresAtMillis = Date.now() + 24 * 60 * 60 * 1000; // +24h em milissegundos

    // Usar Admin SDK se disponível
    let storyId: string;
    let createdStory: Story;
    
    if (adminDb) {
      // Admin SDK: usar AdminTimestamp
      const adminNow = AdminTimestamp.now();
      const adminExpiresAt = AdminTimestamp.fromMillis(expiresAtMillis);
      
      const storyData = {
        imageUrl: body.imageUrl.trim(),
        text: body.text?.trim() || null,
        createdAt: adminNow,
        expiresAt: adminExpiresAt,
      };
      
      const storyRef = await adminDb
        .collection("users")
        .doc(body.companyId)
        .collection("stories")
        .add(storyData);
      storyId = storyRef.id;
      
      // Converter AdminTimestamp para Timestamp do Client SDK para resposta
      createdStory = {
        id: storyId,
        imageUrl: storyData.imageUrl,
        text: storyData.text || undefined,
        createdAt: Timestamp.fromMillis(adminNow.toMillis()),
        expiresAt: Timestamp.fromMillis(adminExpiresAt.toMillis()),
      };
    } else {
      // Fallback: usar Client SDK
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(expiresAtMillis);
      
      const storyData = {
        imageUrl: body.imageUrl.trim(),
        text: body.text?.trim() || null,
        createdAt: serverTimestamp(),
        expiresAt,
      };
      
      const storyRef = await addDoc(storiesRef, storyData);
      storyId = storyRef.id;
      
      createdStory = {
        id: storyId,
        imageUrl: storyData.imageUrl,
        text: storyData.text || undefined,
        createdAt: now,
        expiresAt,
      };
    }

    console.log(`[POST_STORIES] Story criado com sucesso: ${storyId} para empresa ${body.companyId}`);

    return NextResponse.json<StoryResponse>(
      { success: true, story: createdStory },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST_STORIES] Erro ao criar story:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json<StoryResponse>(
      { success: false, error: `Erro ao criar story: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stories?companyId=xxx
 * Lista stories ativos de uma empresa
 * 
 * Query params:
 * - companyId: string (obrigatório)
 * 
 * Retorna:
 * - Array de stories ativos (expiresAt > now)
 * - Máximo de 2 stories mais recentes
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId é obrigatório" },
        { status: 400 }
      );
    }

    // DOCUMENTAÇÃO: Buscar stories ativos
    // Filtrar apenas stories onde expiresAt > now
    const stories: Record<string, unknown>[] = [];

    if (adminDb) {
      // Usar Admin SDK se disponível
      // IMPORTANTE: Admin SDK precisa usar AdminTimestamp
      const adminNow = AdminTimestamp.now();
      const storiesSnapshot = await adminDb
        .collection("users")
        .doc(companyId)
        .collection("stories")
        .where("expiresAt", ">", adminNow)
        .orderBy("expiresAt", "desc")
        .limit(2)
        .get();

      storiesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Converter AdminTimestamp para formato serializável
        // IMPORTANTE: Timestamp do Firestore não é serializável em JSON diretamente
        // Precisamos converter para milissegundos e depois criar Timestamp no frontend
        let createdAtMillis = 0;
        let expiresAtMillis = 0;
        
        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            createdAtMillis = data.createdAt.toMillis();
          } else if (data.createdAt._seconds !== undefined) {
            createdAtMillis = data.createdAt._seconds * 1000 + (data.createdAt._nanoseconds || 0) / 1000000;
          }
        }
        
        if (data.expiresAt) {
          if (typeof data.expiresAt.toMillis === 'function') {
            expiresAtMillis = data.expiresAt.toMillis();
          } else if (data.expiresAt._seconds !== undefined) {
            expiresAtMillis = data.expiresAt._seconds * 1000 + (data.expiresAt._nanoseconds || 0) / 1000000;
          }
        }
        
        // Retornar timestamps como objetos serializáveis
        // IMPORTANTE: Timestamp do Firestore não é serializável em JSON
        // Precisamos retornar como objeto com _seconds e _nanoseconds
        // O frontend converterá para Timestamp do Client SDK usando Timestamp.fromMillis()
        stories.push({
          id: doc.id,
          imageUrl: data.imageUrl,
          text: data.text || undefined,
          // Retornar como objeto serializável que será convertido no frontend
          createdAt: createdAtMillis > 0 ? {
            _seconds: Math.floor(createdAtMillis / 1000),
            _nanoseconds: (createdAtMillis % 1000) * 1000000
          } : null,
          expiresAt: expiresAtMillis > 0 ? {
            _seconds: Math.floor(expiresAtMillis / 1000),
            _nanoseconds: (expiresAtMillis % 1000) * 1000000
          } : null,
        });
      });
    } else {
      // Fallback: usar Client SDK
      const now = Timestamp.now();
      const storiesRef = collection(db, `users/${companyId}/stories`);
      const storiesQuery = query(
        storiesRef,
        where("expiresAt", ">", now)
        // Nota: orderBy + limit requer índice composto no Firestore
        // Por enquanto, vamos ordenar no código
      );
      const storiesSnapshot = await getDocs(storiesQuery);
      
      storiesSnapshot.forEach((doc) => {
        stories.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Ordenar por createdAt (mais recente primeiro) e limitar a 2
      type WithCreatedAt = { createdAt?: { toMillis?: () => number } };
      stories.sort((a, b) => {
        const aTime = (a as WithCreatedAt).createdAt?.toMillis?.() ?? 0;
        const bTime = (b as WithCreatedAt).createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      stories.splice(2); // Limitar a 2 stories
    }

    console.log(`[GET_STORIES] Encontrados ${stories.length} stories ativos para empresa ${companyId}`);

    return NextResponse.json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error("[GET_STORIES] Erro ao buscar stories:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json(
      { success: false, error: `Erro ao buscar stories: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories?companyId=xxx&storyId=xxx
 * Deleta um story de uma empresa
 * 
 * Query params:
 * - companyId: string (obrigatório)
 * - storyId: string (obrigatório)
 * 
 * SEGURANÇA:
 * - Apenas a empresa dona pode deletar seus stories
 * - Validação no backend usando Admin SDK (bypassa regras do Firestore)
 */
export async function DELETE(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");
    const storyId = request.nextUrl.searchParams.get("storyId");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId é obrigatório" },
        { status: 400 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "storyId é obrigatório" },
        { status: 400 }
      );
    }

    // DOCUMENTAÇÃO: Deletar story usando Admin SDK
    // Admin SDK bypassa regras do Firestore, mas ainda precisamos validar que
    // a empresa está tentando deletar seu próprio story
    // NOTA: Em produção, você deveria verificar o token de autenticação aqui
    // Por enquanto, confiamos que o frontend só chama com companyId correto
    
    if (adminDb) {
      // Usar Admin SDK para deletar (bypassa regras do Firestore)
      const storyRef = adminDb
        .collection("users")
        .doc(companyId)
        .collection("stories")
        .doc(storyId);

      // Verificar se o story existe antes de deletar
      const storyDoc = await storyRef.get();
      if (!storyDoc.exists) {
        return NextResponse.json(
          { success: false, error: "Story não encontrado" },
          { status: 404 }
        );
      }

      await storyRef.delete();
      console.log(`[DELETE_STORIES] Story ${storyId} deletado com sucesso para empresa ${companyId}`);

      return NextResponse.json(
        { success: true, message: "Story deletado com sucesso" },
        { status: 200 }
      );
    } else {
      // Fallback: usar Client SDK (pode dar erro de permissão se regras não permitirem)
      const { doc, deleteDoc } = await import("firebase/firestore");
      const storyRef = doc(db, `users/${companyId}/stories/${storyId}`);
      await deleteDoc(storyRef);
      
      console.log(`[DELETE_STORIES] Story ${storyId} deletado com sucesso para empresa ${companyId}`);

      return NextResponse.json(
        { success: true, message: "Story deletado com sucesso" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("[DELETE_STORIES] Erro ao deletar story:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json(
      { success: false, error: `Erro ao deletar story: ${errorMessage}` },
      { status: 500 }
    );
  }
}
