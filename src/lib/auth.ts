import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  createSession,
  deleteSession,
  getSessionUser,
} from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "apex_session";
const SESSION_DAYS = 30;

/** Creates a session row and sets the httpOnly cookie. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await createSession(token, userId, expires.toISOString());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** Clears the current session (DB row + cookie). */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

/** Returns the authenticated user for the current request, or null. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}
