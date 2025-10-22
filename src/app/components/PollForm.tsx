"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar Firebase Storage
import { v4 as uuidv4 } from "uuid"; // Importar uuidv4
import { useAuth } from "@/app/context/AuthContext";

interface PollFormProps {
  onPollCreated?: () => void; // New prop for callback
  isCommercial?: boolean; // Nova prop para indicar se é uma enquete comercial
}

export default function PollForm({ onPollCreated, isCommercial = false }: PollFormProps) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [category, setCategory] = useState("Geral"); // Novo estado para a categoria, com valor padrão
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  // const [imageFile, setImageFile] = useState<File | null>(null); // Estado para o arquivo de imagem
  // const [uploadingImage, setUploadingImage] = useState(false); // Estado para o status do upload da imagem
  const { user } = useAuth();

  const categories = ["Geral", "Política", "Games", "Gastronomia", "Filme", "Esportes", "Tecnologia", "Educação", "Música"];

  // const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  // const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     const file = e.target.files[0];
  //     if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
  //       setFeedbackMessage("Tipo de arquivo inválido. Apenas JPG, PNG, GIF e WebP são permitidos.");
  //       setFeedbackType("error");
  //       setImageFile(null);
  //       return;
  //     }
  //     if (file.size > MAX_FILE_SIZE) {
  //       setFeedbackMessage("A imagem é muito grande. O tamanho máximo permitido é 2MB.");
  //       setFeedbackType("error");
  //       setImageFile(null);
  //       return;
  //     }
  //     setImageFile(file);
  //   } else {
  //     setImageFile(null);
  //   }
  //   setFeedbackMessage(null); // Limpa o feedback anterior se o usuário tentar novamente
  // };

  const handleSubmit = async (e: React.FormEvent) => { // Tornar handleSubmit assíncrono
    e.preventDefault();

    // if (uploadingImage) return; // Previne o envio enquanto a imagem está sendo carregada

    const trimmedTitle = title.trim();
    const filteredOptions = options.map(opt => opt.trim()).filter(opt => opt !== "");
    const hasDuplicates = new Set(filteredOptions).size !== filteredOptions.length;

    if (!trimmedTitle) {
      setFeedbackMessage("O título da enquete não pode estar vazio.");
      setFeedbackType("error");
      return;
    }

    if (filteredOptions.length < 2) {
      setFeedbackMessage("A enquete precisa de pelo menos duas opções válidas.");
      setFeedbackType("error");
      return;
    }

    if (hasDuplicates) {
      setFeedbackMessage("As opções devem ser únicas.");
      setFeedbackType("error");
      return;
    }

    if (!category) {
      setFeedbackMessage("Por favor, selecione uma categoria para a enquete.");
      setFeedbackType("error");
      return;
    }

    if (!user) {
      setFeedbackMessage("Usuário não autenticado.");
      setFeedbackType("error");
      return;
    }

    // let imageUrl: string | undefined = undefined; // Inicializa imageUrl como undefined

    // if (isCommercial && imageFile) {
    //   setUploadingImage(true); // Inicia o estado de upload
    //   try {
    //     const storage = getStorage();
    //     const imageRef = ref(storage, `poll_images/${uuidv4()}-${imageFile.name}`);
    //     await uploadBytes(imageRef, imageFile);
    //     imageUrl = await getDownloadURL(imageRef);
    //     setFeedbackMessage("Imagem enviada com sucesso!");
    //     setFeedbackType("success");
    //   } catch (error) {
    //     console.error("Erro ao fazer upload da imagem:", error);
    //     setFeedbackMessage("Erro ao fazer upload da imagem.");
    //     setFeedbackType("error");
    //     setUploadingImage(false); // Garante que o estado de upload seja resetado em caso de erro
    //     return; // Interrompe o envio da enquete se o upload da imagem falhar
    //   } finally {
    //     setUploadingImage(false); // Finaliza o estado de upload, seja com sucesso ou erro
    //   }
    // }

    try {
      const pollsCollectionRef = collection(db, "polls");
      await addDoc(pollsCollectionRef, {
        title: trimmedTitle,
        options: filteredOptions.map(optionText => ({ id: uuidv4(), text: optionText, votes: 0 })),
        category: category,
        creator: { // Salvar o objeto creator completo
          name: user.displayName || user.email || "Usuário Logado",
          avatarUrl: user.photoURL || "https://www.gravatar.com/avatar/?d=mp", // Fallback para Gravatar
          id: user.uid,
        },
        createdAt: serverTimestamp(),
        isCommercial: isCommercial,
        // ...(imageUrl && { imageUrl }), // Adiciona imageUrl apenas se existir
      });

      setFeedbackMessage("Enquete criada com sucesso!");
      setFeedbackType("success");
      setTitle("");
      setOptions(["", ""]);
      setCategory("Geral"); // Resetar categoria para o padrão
      setTimeout(() => {
        setFeedbackMessage(null);
        onPollCreated?.();
      }, 3000);
    } catch (error) {
      console.error("Erro ao criar enquete:", error);
      setFeedbackMessage("Erro ao criar enquete."); // Usar mensagem mais genérica, já que o erro pode vir do Firestore
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto dark:bg-zinc-800 p-8 rounded-lg shadow-md space-y-4"
    >
      <h2 className="text-3xl font-poppins font-semibold text-center text-zinc-900 dark:text-white">
        Criar Nova Enquete
      </h2>

      {feedbackMessage && (
        <div className={`p-3 rounded-md text-white ${
          feedbackType === "success" ? "bg-green-500" : "bg-red-500"
        }`}>
          {feedbackMessage}
        </div>
      )}

      {/* {isCommercial && (
        <div className="flex flex-col gap-2">
          <label htmlFor="image-upload" className="text-zinc-900 dark:text-white font-medium">Upload de Imagem (opcional):</label>
          <input
            id="image-upload"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(", ")}
            onChange={handleImageChange}
            className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />
          {uploadingImage && (
            <div className="flex items-center justify-center p-2">
              <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-cyan-500">Enviando imagem...</span>
            </div>
          )}
          {imageFile && <p className="text-zinc-600 dark:text-zinc-300">Arquivo selecionado: {imageFile.name}</p>}
        </div>
      )}
 */}

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
        required
      >
        <option value="">Selecione uma categoria</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Título da Enquete"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
        required
      />

      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            placeholder={`Opção ${idx + 1}`}
            value={opt}
            onChange={(e) => handleOptionChange(idx, e.target.value)}
            className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
            required
          />
          {options.length > 2 && (
            <motion.button
              type="button"
              onClick={() => removeOption(idx)}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          )}
        </div>
      ))}

      <motion.button
        type="button"
        onClick={addOption}
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Adicionar Opção
      </motion.button>

      <motion.button
        type="submit"
        className={`w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        // disabled={uploadingImage} // Desabilita o botão durante o upload da imagem
      >
        Criar Enquete
      </motion.button>
    </form>
  );
}
