// src/lib/webauthn-fingerprint.ts
"use client";

export interface EnrolledFingerprint {
  credentialIdBase64: string;
  studentId: string;
  enrolledAt: string;
}

export interface FingerprintVerificationResult {
  credentialIdBase64: string;
  studentId: string | null;
}

const FINGERPRINT_STORAGE_KEY = "kronoskool_webauthn_fingerprints_v1";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const finalStr = padded + "=".repeat(padLength);
  const binary = atob(finalStr);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function randomChallenge(): Uint8Array {
  const arr = new Uint8Array(32);
  window.crypto.getRandomValues(arr);
  return arr;
}

export function isWebAuthnFingerprintAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

export function getEnrolledFingerprints(): EnrolledFingerprint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEnrolledFingerprint(record: EnrolledFingerprint): void {
  if (typeof window === "undefined") return;
  const current = getEnrolledFingerprints().filter(
    (item) => item.credentialIdBase64 !== record.credentialIdBase64
  );
  window.localStorage.setItem(
    FINGERPRINT_STORAGE_KEY,
    JSON.stringify([record, ...current])
  );
}

export async function enrollFingerprintForStudent(
  studentId: string,
  fullName: string,
  documentNumber: string
): Promise<EnrolledFingerprint> {
  if (!isWebAuthnFingerprintAvailable()) {
    throw new Error("Tu navegador o equipo no soporta autenticación biométrica WebAuthn.");
  }

  const rpId = window.location.hostname || "localhost";
  const userId = new TextEncoder().encode(`${studentId}-${Date.now()}`);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge() as unknown as BufferSource,
      rp: {
        name: "KronosKool",
        id: rpId,
      },
      user: {
        id: userId as unknown as BufferSource,
        name: `${documentNumber}@kronoskool.local`,
        displayName: fullName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("El lector de huella canceló o no devolvió credencial.");
  }

  const credentialIdBase64 = toBase64Url(new Uint8Array(credential.rawId));
  const record: EnrolledFingerprint = {
    credentialIdBase64,
    studentId,
    enrolledAt: new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  saveEnrolledFingerprint(record);
  return record;
}

export async function verifyFingerprintFromSensor(): Promise<FingerprintVerificationResult> {
  if (!isWebAuthnFingerprintAvailable()) {
    throw new Error("Este equipo o navegador no permite leer la huella con WebAuthn.");
  }

  const rpId = window.location.hostname || "localhost";
  const enrolled = getEnrolledFingerprints();

  const allowCredentials = enrolled.map((item) => ({
    id: fromBase64Url(item.credentialIdBase64) as unknown as BufferSource,
    type: "public-key" as const,
    transports: ["internal" as AuthenticatorTransport],
  }));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge() as unknown as BufferSource,
      rpId,
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("No se detectó lectura válida del sensor de huella.");
  }

  const credentialIdBase64 = toBase64Url(new Uint8Array(assertion.rawId));
  const found = enrolled.find((item) => item.credentialIdBase64 === credentialIdBase64);

  return {
    credentialIdBase64,
    studentId: found ? found.studentId : null,
  };
}