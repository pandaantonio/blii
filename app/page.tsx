// app/components/HomeContent.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import styles from "@/styles/Home.module.css";

export default function HomeContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      {/* Ambient orbs */}
      <div className={styles.orb} aria-hidden="true" />
      <div className={styles.orbSecondary} aria-hidden="true" />

      <div className={styles.hero}>
        <p className={styles.kicker}>Rede social</p>

        <h1 className={styles.heroTitle}>
          Conecte-se com
          <br />
          <em>elegância</em>
        </h1>

        <p className={styles.heroText}>
          Conversas, servidores e momentos — em um espaço pensado para ser
          calmo, moderno e genuinamente seu.
        </p>

        <div className={styles.ctaRow}>
          {user ? (
            <Link href="/dm" className={styles.ctaPrimary}>
              Aplicativo
            </Link>
          ) : (
            <>
              <Link href="/register" className={styles.ctaPrimary}>
                Criar conta
              </Link>
              <Link href="/login" className={styles.ctaSecondary}>
                Entrar
              </Link>
            </>
          )}
        </div>

        <p className={styles.heroNote}>Gratuito · Privado · Sem ruído</p>
      </div>
    </main>
  );
}