import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

/**
 * API Route para curtir/descurtir uma enquete
 * 
 * Esta rota usa Admin SDK para bypassar as regras do Firestore
 * e garantir que as curtidas funcionem corretamente.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se Admin SDK está disponível
    if (!adminDb) {
      console.error("[LIKE_POLL] Admin SDK não está disponível");
      return NextResponse.json(
        {
          message: "Erro de configuração do servidor. Admin SDK não está disponível.",
          error: "ADMIN_SDK_NOT_AVAILABLE",
        },
        { status: 500 }
      );
    }

    const { pollId, userId, action } = await request.json();

    // Validações básicas
    if (!pollId || !userId || !action) {
      return NextResponse.json(
        {
          message: "pollId, userId e action são obrigatórios.",
          error: "MISSING_PARAMETERS",
        },
        { status: 400 }
      );
    }

    if (action !== "like" && action !== "unlike" && action !== "dislike" && action !== "undislike") {
      return NextResponse.json(
        {
          message: "action deve ser 'like', 'unlike', 'dislike' ou 'undislike'.",
          error: "INVALID_ACTION",
        },
        { status: 400 }
      );
    }

    // Buscar a enquete atual para verificar estado
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
    const currentLikedBy = pollData?.likedBy || [];
    const currentDislikedBy = pollData?.dislikedBy || [];
    const hasLiked = currentLikedBy.includes(userId);
    const hasDisliked = currentDislikedBy.includes(userId);

    // Preparar atualizações
    const updates: Record<string, unknown> = {};

    if (action === "like") {
      if (hasLiked) {
        // Descurtir
        updates.likes = admin.firestore.FieldValue.increment(-1);
        updates.likedBy = admin.firestore.FieldValue.arrayRemove(userId);
      } else {
        // Curtir
        updates.likes = admin.firestore.FieldValue.increment(1);
        updates.likedBy = admin.firestore.FieldValue.arrayUnion(userId);

        // Se tinha descurtido antes, remover do dislikedBy e decrementar dislikes
        if (hasDisliked) {
          updates.dislikes = admin.firestore.FieldValue.increment(-1);
          updates.dislikedBy = admin.firestore.FieldValue.arrayRemove(userId);
        }
      }
    } else if (action === "unlike") {
      if (hasLiked) {
        // Descurtir
        updates.likes = admin.firestore.FieldValue.increment(-1);
        updates.likedBy = admin.firestore.FieldValue.arrayRemove(userId);
      }
    } else if (action === "dislike") {
      if (hasDisliked) {
        // Remover dislike
        updates.dislikes = admin.firestore.FieldValue.increment(-1);
        updates.dislikedBy = admin.firestore.FieldValue.arrayRemove(userId);
      } else {
        // Adicionar dislike
        updates.dislikes = admin.firestore.FieldValue.increment(1);
        updates.dislikedBy = admin.firestore.FieldValue.arrayUnion(userId);

        // Se tinha curtido antes, remover do likedBy e decrementar likes
        if (hasLiked) {
          updates.likes = admin.firestore.FieldValue.increment(-1);
          updates.likedBy = admin.firestore.FieldValue.arrayRemove(userId);
        }
      }
    } else if (action === "undislike") {
      if (hasDisliked) {
        // Remover dislike
        updates.dislikes = admin.firestore.FieldValue.increment(-1);
        updates.dislikedBy = admin.firestore.FieldValue.arrayRemove(userId);
      }
    }

    // Atualizar a enquete
    await pollRef.update(updates);

    // Buscar dados atualizados
    const updatedSnap = await pollRef.get();
    const updatedData = updatedSnap.data();

    let message = "Ação realizada com sucesso!";
    if (action === "like" && !hasLiked) {
      message = "Enquete curtida com sucesso!";
    } else if (action === "unlike" && hasLiked) {
      message = "Curtida removida com sucesso!";
    } else if (action === "dislike" && !hasDisliked) {
      message = "Enquete descurtida com sucesso!";
    } else if (action === "undislike" && hasDisliked) {
      message = "Descurtida removida com sucesso!";
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        likes: updatedData?.likes || 0,
        likedBy: updatedData?.likedBy || [],
        dislikes: updatedData?.dislikes || 0,
        dislikedBy: updatedData?.dislikedBy || [],
      },
    });
  } catch (error: unknown) {
    console.error("[LIKE_POLL] Erro ao curtir/descurtir enquete:", error);
    return NextResponse.json(
      {
        message: "Erro ao curtir/descurtir enquete.",
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}

