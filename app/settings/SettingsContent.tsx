// app/settings/SettingsContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { ref, update, onValue } from "firebase/database";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from "firebase/auth";
import {
  FaUser,
  FaSave,
  FaCheck,
  FaArrowLeft,
} from "react-icons/fa";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerData?: any[];
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export default function SettingsContent() {
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/");
        return;
      }
      setFirebaseUser(u);
      setUser({
        uid: u.uid,
        displayName: u.displayName || null,
        email: u.email || null,
        photoURL: u.photoURL || null,
        providerData: u.providerData,
        metadata: u.metadata,
      });
      setDisplayName(u.displayName || "");
      setPhotoURL(u.photoURL || null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Sincroniza foto do banco (base64) — sobrescreve o valor do Auth
  // Sincroniza foto do banco (base64) — sobrescreve o valor do Auth
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onValue(ref(db, `users/${user.uid}/photoURL`), (snap) => {
      const dbPhoto = snap.val() || null;
      setPhotoURL(dbPhoto);
      setUser((prev) => prev ? { ...prev, photoURL: dbPhoto } : prev);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!firebaseUser || !displayName.trim()) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await updateProfile(firebaseUser, {
        displayName: displayName.trim(),
      });
      await update(ref(db, `users/${firebaseUser.uid}`), {
        displayName: displayName.trim(),
        updatedAt: Date.now(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpdate = (url: string | null) => {
    setPhotoURL(url);
    if (user) setUser({ ...user, photoURL: url });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
        <p>Carregando configura\u00e7\u00f5es...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)] overflow-y-auto">
      <header className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] sticky top-0 z-10 backdrop-blur-xl">
        <button
          type="button"
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-xl text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] hover:border-[rgba(255,255,255,0.12)] flex-shrink-0"
          onClick={() => router.back()}
          title="Voltar"
        >
          <FaArrowLeft className="text-sm sm:text-base" />
        </button>
        <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-lg sm:text-xl font-bold text-[#f0ebff] m-0">
          Configura\u00e7\u00f5es
        </h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <section className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl p-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-[rgba(255,138,91,0.1)] border border-[rgba(255,138,91,0.1)] text-[#ff8a5b] text-base sm:text-lg flex-shrink-0">
              <FaUser />
            </div>
            <div>
              <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-base sm:text-lg font-bold text-[#f0ebff] m-0">Perfil</h2>
              <p className="text-xs sm:text-sm text-[#b8a8d9] m-0">Gerencie seu nome e foto de perfil</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="flex-shrink-0 flex justify-center sm:block">
              <ProfilePictureUpload
                currentPhotoURL={photoURL}
                onUpdate={handlePhotoUpdate}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs sm:text-sm font-semibold text-[#b8a8d9] tracking-wide mb-1.5" htmlFor="displayName">
                Nome de exibi\u00e7\u00e3o
              </label>
              <input
                id="displayName"
                type="text"
                className="w-full h-10 sm:h-11 px-3 sm:px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)]"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                maxLength={32}
              />
              <span className="text-[10px] sm:text-xs text-[#7a6a9a] mt-1 block text-right">
                {displayName.length}/32
              </span>
            </div>
          </div>

          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 h-10 sm:h-11 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto"
              onClick={handleSaveProfile}
              disabled={savingProfile || !displayName.trim()}
            >
              {profileSaved ? (
                <><FaCheck className="text-xs sm:text-sm" /> Salvo</>
              ) : savingProfile ? (
                <><span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando\u2026</>
              ) : (
                <><FaSave className="text-xs sm:text-sm" /> Salvar perfil</>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}