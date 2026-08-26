// lib/imageUtils.ts

/**
 * Comprime uma imagem via Canvas e retorna como data URL (base64).
 * Redimensiona para maxWidth e converte para JPEG com a qualidade dada.
 * Uma foto de 5MB vira ~80-150KB após compressão.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas n\u00e3o suportado")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };

    img.src = url;
  });
}

/** Tamanho estimado da string base64 em bytes */
export function base64SizeBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}