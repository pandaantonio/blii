// components/ProfilePictureUpload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { FaCamera, FaUser, FaTimes } from "react-icons/fa";
import { auth, db } from "@/lib/firebase";
import { ref as dRef, update } from "firebase/database";
import { compressImage, base64SizeBytes } from "@/lib/imageUtils";

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
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem deve ter no m\u00e1ximo 10MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("N\u00e3o autenticado");

      const dataUrl = await compressImage(file, 512, 0.7);

      if (base64SizeBytes(dataUrl) > 1024 * 1024) {
        setError("Imagem muito grande mesmo ap\u00f3s compress\u00e3o.");
        setUploading(false);
        return;
      }

      await update(dRef(db, `users/${user.uid}`), {
        photoURL: dataUrl,
        updatedAt: Date.now(),
      });

      onUpdate(dataUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      setError("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [onUpdate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("N\u00e3o autenticado");

      await update(dRef(db, `users/${user.uid}`), {
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

  // ─── Drag & Drop ───────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type.startsWith("image/")) {
      processFile(file);
    } else {
      setError("Apenas imagens s\u00e3o aceitas.");
    }
  }, [uploading, processFile]);

  return (
    <div
      className="flex flex-col items-center gap-3"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="relative">
        {/* Anel de drag & drop */}
        {isDragging && (
          <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#a78bfa] animate-pulse" />
        )}

        <div
          className={`w-28 h-28 rounded-full bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-2 border-[rgba(255,255,255,0.08)] shadow-[0_4px_20px_rgba(167,139,250,0.2)] transition-all duration-200 ${
            isDragging ? "scale-110 shadow-[0_0_30px_rgba(167,139,250,0.4)]" : ""
          }`}
        >
          {currentPhotoURL ? (
            <img src={currentPhotoURL} alt="Foto de perfil" className="w-full h-full object-cover" />
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

      {/* Dica de drag & drop */}
      <span className="text-[10px] text-[#7a6a9a]/70 text-center leading-tight -mt-1">
        Arraste uma imagem aqui<br />ou clique no <FaCamera className="inline text-[8px] mx-0.5" />
      </span>

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
          Processando...
        </span>
      )}

      {error && (
        <span className="text-xs text-[#f87171] text-center">{error}</span>
      )}
    </div>
  );
}