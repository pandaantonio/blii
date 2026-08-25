import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ?.replace(/\\n/g, "\n")
      ?.trim();

    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY não encontrada no .env");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });

    console.log("✅ Firebase Admin inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error);
    throw error;
  }
}

export const adminDb = admin.database();
export const adminAuth = admin.auth();
export default admin;