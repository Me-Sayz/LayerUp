"use client";

import { useCallback, useEffect, useState } from "react";

export interface Tokens {
  overlayToken: string;
  workerToken: string;
}

export type TokenKind = "overlay" | "worker";

interface TokenResponse extends Partial<Tokens> {
  ok?: boolean;
  error?: string;
}

async function call(method: "GET" | "POST", kind?: TokenKind): Promise<Tokens> {
  const response = await fetch("/api/token", {
    method,
    headers: kind ? { "Content-Type": "application/json" } : undefined,
    body: kind ? JSON.stringify({ kind }) : undefined,
    cache: "no-store",
  });
  let body: TokenResponse = {};
  try {
    body = (await response.json()) as TokenResponse;
  } catch {
    body = {};
  }
  if (!response.ok || !body.overlayToken || !body.workerToken) {
    throw new Error(body.error ?? `Server menolak (kode ${response.status})`);
  }
  return { overlayToken: body.overlayToken, workerToken: body.workerToken };
}

export function useTokens() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    call("GET")
      .then((next) => {
        if (alive) setTokens(next);
      })
      .catch((failure: unknown) => {
        if (alive) setError(failure instanceof Error ? failure.message : "Gagal memuat token");
      });
    return () => {
      alive = false;
    };
  }, []);

  const regenerate = useCallback(async (kind: TokenKind): Promise<string | null> => {
    try {
      setTokens(await call("POST", kind));
      setError(null);
      return null;
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Gagal membuat ulang token";
      setError(message);
      return message;
    }
  }, []);

  return { tokens, error, regenerate };
}
