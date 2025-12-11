"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/lib/firebase"; // Importar a instância de autenticação do Firebase
import { db } from "@/lib/firebase"; // Importar a instância do Firestore para buscar roles
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar funções do Firebase Storage
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, FieldValue, onSnapshot } from "firebase/firestore"; // Importar doc, getDoc, setDoc, onSnapshot e serverTimestamp do Firestore
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
  extraPollsAvailable?: number; // Adicionar créditos de enquete avulsas
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
    bannerURL?: string | null; // Novo campo para URL do banner
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
  updateUserDocument: (uid: string, data: Record<string, unknown>) => Promise<void>; // Nova função
  refreshUserData: () => Promise<void>; // Nova função para atualizar dados do usuário
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
    bannerURL?: string | null; // Novo campo para URL do banner
  }) | null>(null);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<User | null>(null); // Novo estado
  const [loading, setLoading] = useState(true);
  const [isMasterUser, setIsMasterUser] = useState(false); // Novo estado

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let unsubscribeFirestore: (() => void) | undefined;

      if (firebaseUser) {
        // Listener para mudanças no documento do usuário no Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          const userData = docSnap.exists() ? docSnap.data() : null;

          setFirebaseAuthUser(firebaseUser); // Armazenar o objeto User original
          const customUser = {
            ...firebaseUser,
            displayName: firebaseUser.displayName || null,
            accountType: (userData?.accountType as 'personal' | 'commercial') || 'personal',
            commercialName: (userData?.commercialName as string | null) || null,
            avatarUrl: firebaseUser.photoURL || null,
            aboutUs: (userData?.aboutUs as string | null) || null,
            contactEmail: (userData?.contactEmail as string | null) || null,
            address: (userData?.address as string | null) || null,
            facebookUrl: (userData?.facebookUrl as string | null) || null,
            instagramUrl: (userData?.instagramUrl as string | null) || null,
            twitterUrl: (userData?.twitterUrl as string | null) || null,
            themeColor: (userData?.themeColor as string | null) || null,
            bannerURL: (userData?.bannerURL as string | null) || null, // Adicionar bannerURL
            extraPollsAvailable: (userData?.extraPollsAvailable as number) || 0,
          };
          setUser(customUser);
          setIsMasterUser(false); // Definir como false temporariamente
        }, (error) => {
          console.error("Erro ao escutar mudanças no documento do usuário:", error);
        });
      } else {
        // Se não houver firebaseUser, limpa tudo
        setUser(null);
        setFirebaseAuthUser(null);
        setIsMasterUser(false);
      }
      setLoading(false);
      
      // Retorna a função de unsubscribe combinada
      return () => {
        unsubscribe(); // Unsubscribe do auth
        if (unsubscribeFirestore) {
          unsubscribeFirestore(); // Unsubscribe do Firestore, se estiver ativo
        }
      };
    });

    // O useEffect deve retornar a função de limpeza diretamente do onAuthStateChanged
    return unsubscribe;
  }, []);

  // Nova função para atualizar o documento do usuário
  const updateUserDocument = async (uid: string, data: Record<string, unknown>) => {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, data, { merge: true });
    // Não atualizamos o estado local aqui, pois o onSnapshot cuidará disso
  };

  const refreshUserData = async () => {
    if (firebaseAuthUser) {
      setLoading(true);
      try {
        const userDocRef = doc(db, "users", firebaseAuthUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : null;

        const customUser = {
          ...firebaseAuthUser,
          displayName: firebaseAuthUser.displayName || null,
          accountType: (userData?.accountType as 'personal' | 'commercial') || 'personal',
          commercialName: (userData?.commercialName as string | null) || null,
          avatarUrl: firebaseAuthUser.photoURL || null,
          aboutUs: (userData?.aboutUs as string | null) || null,
          contactEmail: (userData?.contactEmail as string | null) || null,
          address: (userData?.address as string | null) || null,
          facebookUrl: (userData?.facebookUrl as string | null) || null,
          instagramUrl: (userData?.instagramUrl as string | null) || null,
          twitterUrl: (userData?.twitterUrl as string | null) || null,
          themeColor: (userData?.themeColor as string | null) || null,
          extraPollsAvailable: (userData?.extraPollsAvailable as number) || 0,
        };
        setUser(customUser);
      } catch (error) {
        console.error("Erro ao recarregar dados do usuário:", error);
      } finally {
        setLoading(false);
      }
    }
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
    <AuthContext.Provider value={{ user, loading, isMasterUser, login, signup, logout, firebaseAuthUser, updateUserDocument, refreshUserData }}>
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
