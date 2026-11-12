import { SignJWT, jwtVerify } from "jose";

export type SessionToken = {
  uid: string;
  companyId: string;
  email: string;
  name: string;
};

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

export async function signSession(data: SessionToken): Promise<string> {
  const secret = key();
  if (!secret) throw new Error("AUTH_SECRET is missing");
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.uid)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
}

export async function readSession(token: string): Promise<SessionToken | null> {
  const secret = key();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = String(payload.uid ?? "");
    const companyId = String(payload.companyId ?? "");
    const email = String(payload.email ?? "");
    const name = String(payload.name ?? "");
    if (!uid || !companyId) return null;
    return { uid, companyId, email, name };
  } catch {
    return null;
  }
}
