// lib/firebaseAdmin.ts
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

// Função para limpar a chave privada
function cleanPrivateKey(key: string): string {
  // Remove aspas no início e fim
  let cleaned = key.replace(/^["']|["']$/g, "");
  
  // Substitui \n por quebras de linha reais
  cleaned = cleaned.replace(/\\n/g, "\n");
  
  // Remove espaços extras
  cleaned = cleaned.trim();
  
  return cleaned;
}

if (!getApps().length) {
  try {
    const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");
    
    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY não encontrada ou vazia no .env");
    }

    // Verifica se a chave tem o formato correto
    if (!privateKey.includes("BEGIN PRIVATE KEY")) {
      throw new Error("FIREBASE_PRIVATE_KEY não está no formato correto");
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !databaseURL) {
      throw new Error("Variáveis de ambiente do Firebase não configuradas corretamente");
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL,
    });

    console.log("✅ Firebase Admin inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error);
    
    // Em desenvolvimento, podemos continuar sem Firebase Admin
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Firebase Admin não disponível em desenvolvimento. Recursos que dependem dele podem não funcionar.");
    } else {
      throw error;
    }
  }
}

export const adminDb = getDatabase();
export const adminAuth = getAuth();
export default getApp();