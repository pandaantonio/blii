// lib/firebaseAdmin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

// Função para diagnosticar a chave
function diagnoseKey(key: string) {
  console.log("🔍 Diagnóstico da chave:");
  console.log("  - Tamanho:", key.length);
  console.log("  - Começa com:", key.substring(0, 30) + "...");
  console.log("  - Termina com:", "... " + key.substring(key.length - 30));
  console.log("  - Contém \\n:", key.includes("\\n"));
  console.log("  - Contém quebras de linha reais:", key.includes("\n"));
  console.log("  - Começa com '-----BEGIN':", key.startsWith("-----BEGIN PRIVATE KEY-----"));
  console.log("  - Termina com '-----END PRIVATE KEY-----':", key.endsWith("-----END PRIVATE KEY-----"));
}

if (!getApps().length) {
  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
    
    // Remove aspas simples/duplas no início e fim
    privateKey = privateKey.replace(/^['"]|['"]$/g, "");
    
    // Diagnóstico
    diagnoseKey(privateKey);
    
    // Se não contém \n, mas contém quebras de linha reais, converte
    if (!privateKey.includes("\\n") && privateKey.includes("\n")) {
      console.log("⚠️ Convertendo quebras de linha reais para \\n");
      privateKey = privateKey.replace(/\n/g, "\\n");
    }
    
    // Se contém \n como texto, converte para quebras reais
    if (privateKey.includes("\\n") && !privateKey.includes("\n")) {
      console.log("✅ Convertendo \\n para quebras de linha reais");
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    
    // Remove espaços extras
    privateKey = privateKey.trim();

    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY não encontrada no .env");
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