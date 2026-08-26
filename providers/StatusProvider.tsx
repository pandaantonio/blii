// providers/StatusProvider.tsx
"use client";

import { useEffect, useCallback, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { ref, update, onDisconnect } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

export default function StatusProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [isTabActive, setIsTabActive] = useState(true);

  /* ── Pega o UID do usuário logado ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  /* ── Detecta visibilidade da aba ── */
  useEffect(() => {
    const onVis = () => setIsTabActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ── Sincroniza status no Firebase ── */
  const syncStatus = useCallback(
    (userId: string) => {
      const statusRef = ref(db, `users/${userId}/status`);
      const state = isTabActive ? "online" : "away";

      update(statusRef, {
        state,
        lastSeen: Date.now(),
      });

      onDisconnect(statusRef).update({
        state: "offline",
        lastSeen: Date.now(),
      });
    },
    [isTabActive]
  );

  /* ── Quando loga ── */
  useEffect(() => {
    if (uid) syncStatus(uid);
  }, [uid, syncStatus]);

  /* ── Quando aba muda ── */
  useEffect(() => {
    if (uid) syncStatus(uid);
  }, [isTabActive, uid, syncStatus]);

  return <>{children}</>;
}