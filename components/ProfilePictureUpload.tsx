// components/ProfilePictureUpload.tsx
"use client";

import { useState, useRef } from "react";
import { FaCamera, FaUser, FaTimes } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, auth, db } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { update } from "firebase/database";

interface ProfilePictureUploadProps {
  currentPhotoURL: string | null;
  onUpdate: (url: string | null) => void;
}

export default function ProfilePictureUpload({
  currentPhotoURL,
  onUpdate,
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no m\u00e1ximo 2MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("N\u00e3o autenticado");

      if (currentPhotoURL) {
        try {
          await deleteObject(ref(storage, `profile-pictures/${user.uid}`));
        } catch {}
      }

      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: downloadURL });

      await update(ref(db, `users/${user.uid}`), {
        photoURL: downloadURL,
        updatedAt: Date.now(),
      });

      onUpdate(downloadURL);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      setError("Erro ao fazer upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("N\u00e3o autenticado");

      try {
        await deleteObject(ref(storage, `profile-pictures/${user.uid}`));
      } catch {}

      await updateProfile(user, { photoURL: null });

      await update(ref(db, `users/${user.uid}`), {
        photoURL: null,
        updatedAt: Date.now(),
      });

      onUpdate(null);
    } catch (err) {
      console.error("Erro ao remover foto:", err);
      setError("Erro ao remover foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-2 border-[rgba(255,255,255,0.08)] shadow-[0_4px_20px_rgba(167,139,250,0.2)]">
          {currentPhotoURL ? (
            <img
              src={currentPhotoURL}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <FaUser />
          )}
        </div>
        <button
          type="button"
          className="absolute -bottom-1 -right-1 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-2 border-[#0a0618] rounded-full text-white cursor-pointer transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Alterar foto"
        >
          <FaCamera className="text-sm" />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {currentPhotoURL && (
        <button
          type="button"
          className="text-xs text-[#7a6a9a] hover:text-[#f87171] transition-colors duration-200 flex items-center gap-1"
          onClick={handleRemovePhoto}
          disabled={uploading}
        >
          <FaTimes className="text-[10px]" /> Remover foto
        </button>
      )}
      {uploading && (
        <span className="text-xs text-[#b8a8d9] flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
          Enviando...
        </span>
      )}
      {error && (
        <span className="text-xs text-[#f87171] text-center">{error}</span>
      )}
    </div>
  );
}