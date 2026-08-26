// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { storage, storageRef, uploadBytes, getDownloadURL } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uid = formData.get("uid") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 });
    }
    if (!uid) {
      return NextResponse.json({ error: "UID ausente" }, { status: 400 });
    }

    const ok = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!ok.includes(file.type)) {
      return NextResponse.json({ error: "Use JPG, PNG, GIF ou WebP" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Máximo 5 MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // avatars/{uid}.ext — sobrescreve o anterior
    const ext = file.name.split(".").pop() || "jpg";
    const fileRef = storageRef(storage, `avatars/${uid}.${ext}`);

    await uploadBytes(fileRef, buffer, { contentType: file.type });
    const url = await getDownloadURL(fileRef);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}