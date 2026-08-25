// app/api/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username inválido' },
        { status: 400 }
      );
    }

    const usernameLower = username.toLowerCase().trim();

    if (usernameLower.length < 3) {
      return NextResponse.json(
        { error: 'Username deve ter pelo menos 3 caracteres' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameLower)) {
      return NextResponse.json(
        { error: 'Username só pode conter letras, números e underline' },
        { status: 400 }
      );
    }

    const usernameRef = adminDb.ref(`usernames/${usernameLower}`);
    const snapshot = await usernameRef.once('value');

    if (snapshot.exists()) {
      return NextResponse.json(
        { error: 'Este username já está em uso' },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Erro ao verificar username:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar username' },
      { status: 500 }
    );
  }
}