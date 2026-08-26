// lib/upload-telegraph.ts
export async function uploadToTelegraph(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://telegra.ph/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // Retorna URL permanente: https://telegra.ph/file/xxxxx.jpg
  return data[0].src;
}