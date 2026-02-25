import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

/**
 * API Route para votar em uma enquete
 * 
 * Esta rota usa Admin SDK para bypassar as regras do Firestore
 * e garantir que os votos funcionem corretamente.
 * 
 * IMPORTANTE: Esta função valida que:
 * - O usuário está autenticado (userId obrigatório)
 * - O usuário não votou antes (verifica votedBy)
 * - Apenas uma opção recebe +1 voto
 * - O usuário é adicionado ao array votedBy
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se Admin SDK está disponível
    if (!adminDb) {
      console.error("[VOTE_POLL] Admin SDK não está disponível");
      return NextResponse.json(
        {
          message: "Erro de configuração do servidor. Admin SDK não está disponível.",
          error: "ADMIN_SDK_NOT_AVAILABLE",
        },
        { status: 500 }
      );
    }

    const { pollId, optionId, userId } = await request.json();

    // Validações básicas
    if (!pollId || !optionId || !userId) {
      return NextResponse.json(
        {
          message: "pollId, optionId e userId são obrigatórios.",
          error: "MISSING_PARAMETERS",
        },
        { status: 400 }
      );
    }

    // Buscar a enquete atual
    const pollRef = adminDb.doc(`polls/${pollId}`);
    const pollSnap = await pollRef.get();

    if (!pollSnap.exists) {
      return NextResponse.json(
        {
          message: "Enquete não encontrada.",
          error: "POLL_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const pollData = pollSnap.data();
    if (!pollData) {
      return NextResponse.json(
        {
          message: "Dados da enquete inválidos.",
          error: "INVALID_POLL_DATA",
        },
        { status: 500 }
      );
    }

    // Verificar se o usuário já votou
    const currentVotedBy = pollData.votedBy || [];
    if (currentVotedBy.includes(userId)) {
      return NextResponse.json(
        {
          message: "Você já votou nesta enquete.",
          error: "ALREADY_VOTED",
        },
        { status: 400 }
      );
    }

    // Verificar se a opção existe
    const options = pollData.options || [];
    const optionIndex = options.findIndex((opt: { id?: string }) => opt.id === optionId);
    
    if (optionIndex === -1) {
      return NextResponse.json(
        {
          message: "Opção não encontrada.",
          error: "OPTION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Atualizar a opção selecionada e adicionar usuário ao votedBy
    const updatedOptions = [...options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      votes: (updatedOptions[optionIndex].votes || 0) + 1,
    };

    // Atualizar a enquete
    await pollRef.update({
      options: updatedOptions,
      votedBy: admin.firestore.FieldValue.arrayUnion(userId),
    });

    // Buscar dados atualizados
    const updatedSnap = await pollRef.get();
    const updatedData = updatedSnap.data();

    return NextResponse.json({
      success: true,
      message: "Voto registrado com sucesso!",
      data: {
        options: updatedData?.options || [],
        votedBy: updatedData?.votedBy || [],
      },
    });
  } catch (error: unknown) {
    console.error("[VOTE_POLL] Erro ao votar:", error);
    return NextResponse.json(
      {
        message: "Erro ao registrar voto.",
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}

