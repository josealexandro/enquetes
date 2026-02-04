import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { contemPalavrao } from "@/utils/profanityFilter";

/**
 * POST: Cria um comentário na enquete.
 * Valida palavrões no backend (contemPalavrao) e retorna 400 se houver.
 * Escreve no Firestore via Admin SDK.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { message: "Serviço indisponível. Tente novamente.", error: "ADMIN_SDK_NOT_AVAILABLE" },
        { status: 500 }
      );
    }

    const { pollId } = await params;
    if (!pollId) {
      return NextResponse.json(
        { message: "pollId é obrigatório." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, parentId, author, authorId, authorEmail } = body;

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (!trimmedText) {
      return NextResponse.json(
        { message: "O comentário não pode estar vazio." },
        { status: 400 }
      );
    }

    if (contemPalavrao(trimmedText)) {
      return NextResponse.json(
        { message: "Seu comentário contém palavras que não são permitidas. Por favor, edite o texto." },
        { status: 400 }
      );
    }

    if (!author || !authorId) {
      return NextResponse.json(
        { message: "Dados do autor são obrigatórios." },
        { status: 400 }
      );
    }

    const commentData = {
      pollId,
      author,
      authorId,
      authorEmail: authorEmail ?? null,
      text: trimmedText,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      ...(parentId ? { parentId } : {}),
    };

    const commentsRef = adminDb.collection("polls").doc(pollId).collection("comments");
    await commentsRef.add(commentData);

    const pollRef = adminDb.doc(`polls/${pollId}`);
    await pollRef.update({
      commentCount: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[COMMENTS_API] Erro ao criar comentário:", error);
    return NextResponse.json(
      { message: "Erro ao adicionar comentário. Tente novamente." },
      { status: 500 }
    );
  }
}
