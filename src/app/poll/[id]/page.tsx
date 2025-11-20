import { Metadata } from "next";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import PollDetailClient from "./PollDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

// Função para gerar metadados dinâmicos
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Em Next.js 15, params é uma Promise
  const { id } = await params;

  try {
    const docRef = doc(db, "polls", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const poll = docSnap.data();
      const title = poll.title || "Enquete no Poll App";
      const description = `Vote na enquete: ${title}. Crie suas próprias enquetes gratuitamente!`;
      
      return {
        title: `${title} | Poll App`,
        description: description,
        openGraph: {
          title: title,
          description: description,
          // Se tiver imagem, adicione aqui: images: [poll.imageUrl],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: title,
          description: description,
        },
      };
    }
  } catch (error) {
    console.error("Erro ao gerar metadados:", error);
  }

  return {
    title: "Enquete | Poll App",
    description: "Vote nesta enquete do Poll App.",
  };
}

export default async function PollPage({ params }: Props) {
  const { id } = await params;
  return <PollDetailClient pollId={id} />;
}