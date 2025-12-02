"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/lib/firebase"; // Importar a instância de autenticação do Firebase
import { db } from "@/lib/firebase"; // Importar a instância do Firestore para buscar roles
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar funções do Firebase Storage
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, FieldValue } from "firebase/firestore"; // Importar doc, getDoc, setDoc e serverTimestamp do Firestore
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";

interface UserDataToSave {
  email: string | null;
  displayName: string | null;
  accountType: 'personal' | 'commercial';
  commercialName?: string | null; // Adicionar commercialName
  createdAt: Timestamp | FieldValue; // serverTimestamp é um tipo complexo, mas por enquanto 'any' é aceitável aqui se for apenas para o tipo do FireStore
  themeColor?: string | null; // Adicionar themeColor
}

export interface AuthContextType {
  user: (User & {
    displayName?: string | null;
    accountType?: 'personal' | 'commercial';
    commercialName?: string | null; // Adicionar commercialName
    avatarUrl?: string | null; // Adicionar avatarUrl aqui
    aboutUs?: string | null; // Novo campo para "Sobre Nós"
    contactEmail?: string | null; // Novo campo para email de contato
    address?: string | null; // Novo campo para endereço
    facebookUrl?: string | null; // Novo campo para URL do Facebook
    instagramUrl?: string | null; // Novo campo para URL do Instagram (antigo twitterUrl)
    twitterUrl?: string | null; // Novo campo para URL do Twitter (antigo linkedinUrl)
    themeColor?: string | null; // Adicionar themeColor
    extraPollsAvailable?: number; // Novo campo para créditos de enquete avulsas
  }) | null; // O tipo de usuário agora é o User do Firebase
  firebaseAuthUser: User | null; // Novo campo para o objeto User original do Firebase Auth
  loading: boolean;
  isMasterUser: boolean; // Novo campo para indicar se o usuário é mestre
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string,
    accountType: 'personal' | 'commercial',
    commercialName?: string | null, // Adicionar commercialName
    avatarFile?: File | null
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDocument: (uid: string, data: { [key: string]: any }) => Promise<void>; // Nova função
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<(User & {
    displayName?: string | null;
    accountType?: 'personal' | 'commercial';
    commercialName?: string | null; // Adicionar commercialName
    avatarUrl?: string | null;
    aboutUs?: string | null; // Novo campo para "Sobre Nós"
    contactEmail?: string | null; // Novo campo para email de contato
    address?: string | null; // Novo campo para endereço
    facebookUrl?: string | null; // Novo campo para URL do Facebook
    instagramUrl?: string | null; // Mapear para instagramUrl
    twitterUrl?: string | null; // Mapear para twitterUrl
    themeColor?: string | null; // Adicionar themeColor
    extraPollsAvailable?: number; // Novo campo para créditos de enquete avulsas
  }) | null>(null);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<User | null>(null); // Novo estado
  const [loading, setLoading] = useState(true);
  const [isMasterUser, setIsMasterUser] = useState(false); // Novo estado

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verificar se o usuário é mestre
        // const masterUserRef = doc(db, "masterUsers", firebaseUser.uid);
        // const masterUserDoc = await getDoc(masterUserRef);

        // Buscar displayName e accountType do Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : null;

        setFirebaseAuthUser(firebaseUser); // Armazenar o objeto User original
        const customUser = {
          ...firebaseUser,
          displayName: firebaseUser.displayName || null, // Usar displayName direto do firebaseUser por enquanto
          accountType: (userData?.accountType as 'personal' | 'commercial') || 'personal', // Adicionar accountType do Firestore
          commercialName: (userData?.commercialName as string | null) || null, // Adicionar commercialName do Firestore
          avatarUrl: firebaseUser.photoURL || null, // Adicionar avatarUrl
          aboutUs: (userData?.aboutUs as string | null) || null, // Adicionar campo "Sobre Nós"
          contactEmail: (userData?.contactEmail as string | null) || null, // Adicionar campo para email de contato
          address: (userData?.address as string | null) || null, // Adicionar campo para endereço
          facebookUrl: (userData?.facebookUrl as string | null) || null, // Adicionar campo para URL do Facebook
          instagramUrl: (userData?.instagramUrl as string | null) || null, // Mapear para instagramUrl
          twitterUrl: (userData?.twitterUrl as string | null) || null, // Mapear para twitterUrl
          themeColor: (userData?.themeColor as string | null) || null, // Adicionar themeColor do Firestore
          extraPollsAvailable: (userData?.extraPollsAvailable as number) || 0, // Carregar créditos de enquete
        };
        setUser(customUser);

        setIsMasterUser(false); // Definir como false temporariamente
      } else {
        setUser(null);
        setFirebaseAuthUser(null); // Limpar também o firebaseAuthUser
        setIsMasterUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Nova função para atualizar o documento do usuário
  const updateUserDocument = async (uid: string, data: { [key: string]: any }) => {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, data, { merge: true });
    // Atualizar o estado local do usuário após a atualização do Firestore
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, ...data };
    });
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseAuthUser(userCredential.user); // Armazenar o objeto User original após login
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      console.error("Erro ao fazer login:", errorMessage);
      throw new Error(errorMessage || "Email ou senha incorretos."); // Mensagem amigável ao usuário
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    accountType: 'personal' | 'commercial',
    commercialName?: string | null,
    avatarFile?: File | null
  ) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      setFirebaseAuthUser(firebaseUser); // Armazenar o objeto User original após cadastro

      const userDataToSave: UserDataToSave = {
        email: firebaseUser.email,
        displayName: displayName,
        accountType: accountType,
        ...(commercialName && { commercialName: commercialName }), // Adicionar commercialName condicionalmente
        createdAt: serverTimestamp(), // Adicionar timestamp de criação
        themeColor: null, // Inicialmente nulo, pois não há um campo para tema na interface de cadastro
        extraPollsAvailable: 0, // Inicialmente 0, pois não há um campo para créditos na interface de cadastro
      };

      // Salvar o displayName e accountType no Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), userDataToSave);
      
      let photoURL: string | null = null;
      if (avatarFile) {
        const storage = getStorage();
        const avatarRef = ref(storage, `avatars/${firebaseUser.uid}/${avatarFile.name}`);
        const snapshot = await uploadBytes(avatarRef, avatarFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Atualizar o perfil do Firebase Auth também
      await updateProfile(firebaseUser, { 
        displayName: displayName, 
        photoURL: photoURL // Usar a URL do avatar carregado ou null
      });


    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      console.error("Erro ao cadastrar:", errorMessage);
      throw new Error(errorMessage || "Erro ao cadastrar. Tente novamente."); // Mensagem amigável ao usuário
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setFirebaseAuthUser(null); // Limpar o objeto User original no logout
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      console.error("Erro ao fazer logout:", errorMessage);
      throw new Error(errorMessage || "Erro ao fazer logout. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isMasterUser, login, signup, logout, firebaseAuthUser, updateUserDocument }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
