// src/app/kiosk/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { CLASS_GROUPS, INITIAL_STUDENTS } from "@/lib/mock-data";
import { evaluateAutomaticArrival, generateAlertsForStudent } from "@/lib/rules";
import { AlertEvent, Student } from "@/lib/types";
import {
  getEnrolledFingerprints,
  isWebAuthnFingerprintAvailable,
  verifyFingerprintFromSensor,
} from "@/lib/webauthn-fingerprint";
import {
  fetchAllStudentsFromSupabase,
  findStudentByWebAuthnCredential,
  updateStudentAttendanceInSupabase,
} from "@/lib/supabase-students";
import KronosLogo from "@/components/KronosLogo";

const STORAGE_KEY = "kronoskool_mvp_v5";

interface KioskResultBanner {
  tone: "PRESENT" | "LATE" | "INFO" | "ERROR";
  studentName?: string;
  groupName?: string;
  statusLabel: string;
  detailText: string;
}

function getCurrentHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function BiometricKioskPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [minutesSaved, setMinutesSaved] = useState<number>(12);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(CLASS_GROUPS[0].id);
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([CLASS_GROUPS[0].id]);
  const [startTime, setStartTime] = useState<string>(CLASS_GROUPS[0].startTime);
  const [graceMinutes, setGraceMinutes] = useState<number>(CLASS_GROUPS[0].graceMinutes);
  const [resultBanner, setResultBanner] = useState<KioskResultBanner | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);

  const scanningRef = useRef<boolean>(false);
  const resetTimerRef = useRef<number | null>(null);

  const activeGroup = useMemo(
    () => CLASS_GROUPS.find((g) => g.id === selectedGroupId) ?? CLASS_GROUPS[0],
    [selectedGroupId]
  );

  const isGroupOpen = openGroupIds.includes(activeGroup.id);

  const scheduleAutoReset = useCallback(() => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setResultBanner(null);
    }, 4000);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.selectedGroupId === "string") setSelectedGroupId(parsed.selectedGroupId);
        if (Array.isArray(parsed.openGroupIds)) setOpenGroupIds(parsed.openGroupIds);
        if (typeof parsed.startTime === "string") setStartTime(parsed.startTime);
        if (typeof parsed.graceMinutes === "number") setGraceMinutes(parsed.graceMinutes);
        if (typeof parsed.minutesSaved === "number") setMinutesSaved(parsed.minutesSaved);
      }
    } catch {
      // Ignorar
    }

    void fetchAllStudentsFromSupabase().then((dbStudents) => {
      if (dbStudents.length > 0) setStudents(dbStudents);
    });

    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const processFingerprintArrival = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setIsReading(true);

    try {
      const arrivalTime = getCurrentHHMM();
      const verification = await verifyFingerprintFromSensor();
      const enrolled = getEnrolledFingerprints();

      let matchedStudent: Student | null = null;
      if (verification.studentId) {
        matchedStudent = students.find((s) => s.id === verification.studentId) ?? null;
      }
      if (!matchedStudent) {
        matchedStudent = await findStudentByWebAuthnCredential(
          verification.credentialIdBase64
        );
      }

      if (!matchedStudent) {
        const matchedLocal = enrolled.find(
          (e) => e.credentialIdBase64 === verification.credentialIdBase64
        );
        if (matchedLocal) {
          matchedStudent =
            students.find((s) => s.id === matchedLocal.studentId) ?? null;
        }
      }

      if (!matchedStudent) {
        setResultBanner({
          tone: "ERROR",
          statusLabel: "Huella no matriculada",
          detailText:
            "Esta huella no está registrada en la matrícula. Solicita registro al docente.",
        });
        scheduleAutoReset();
        return;
      }

      const studentGroup =
        CLASS_GROUPS.find((g) => g.id === matchedStudent!.groupId) ?? activeGroup;

      if (!isGroupOpen) {
        setResultBanner({
          tone: "ERROR",
          studentName: matchedStudent.fullName,
          groupName: studentGroup.name,
          statusLabel: "Clase cerrada",
          detailText: `La clase ${studentGroup.name} está cerrada.`,
        });
        scheduleAutoReset();
        return;
      }

      if (matchedStudent.todayStatus && matchedStudent.todayStatus !== "ABSENT") {
        setResultBanner({
          tone: "INFO",
          studentName: matchedStudent.fullName,
          groupName: studentGroup.name,
          statusLabel: "Asistencia ya registrada",
          detailText: `Registrada a las ${matchedStudent.checkInTime ?? arrivalTime}.`,
        });
        scheduleAutoReset();
        return;
      }

      const evaluation = evaluateAutomaticArrival(
        startTime,
        arrivalTime,
        graceMinutes
      );
      const newAlerts = generateAlertsForStudent(matchedStudent, evaluation.status);

      const updatedStudent: Student = {
        ...matchedStudent,
        todayStatus: evaluation.status,
        biometricMethod: "FINGERPRINT",
        checkInTime: arrivalTime,
        minutesAfterStart: evaluation.minutesAfterStart,
        lateCount:
          evaluation.status === "LATE"
            ? matchedStudent.lateCount + 1
            : matchedStudent.lateCount,
      };

      setStudents((prev) =>
        prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev]);
      }
      setMinutesSaved((m) => Number((m + 1.5).toFixed(1)));

      await updateStudentAttendanceInSupabase(updatedStudent);

      if (evaluation.status === "PRESENT") {
        setResultBanner({
          tone: "PRESENT",
          studentName: matchedStudent.fullName,
          groupName: studentGroup.name,
          statusLabel: "Se registró asistencia • Puntual",
          detailText: `Hora de llegada: ${arrivalTime}`,
        });
      } else {
        setResultBanner({
          tone: "LATE",
          studentName: matchedStudent.fullName,
          groupName: studentGroup.name,
          statusLabel: "Se registró asistencia • Impuntual",
          detailText: `Hora de llegada: ${arrivalTime} (+${evaluation.minutesAfterStart} min)`,
        });
      }

      scheduleAutoReset();
    } catch {
      // Si el usuario cancela o pasa el dedo de nuevo, vuelve a quedar listo
    } finally {
      setIsReading(false);
      scanningRef.current = false;
    }
  }, [students, activeGroup, isGroupOpen, startTime, graceMinutes, scheduleAutoReset]);

  // Escucha automática continua del sensor apenas se abre el kiosco y cuando vuelve a estar libre
  useEffect(() => {
    if (!isWebAuthnFingerprintAvailable() || !isGroupOpen || resultBanner) return;

    const timer = window.setTimeout(() => {
      void processFingerprintArrival();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [isGroupOpen, resultBanner, processFingerprintArrival]);

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#1E293B] flex flex-col justify-between">
      <header className="bg-gradient-to-r from-[#312E81] to-[#06B6D4] text-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="rounded-xl bg-white px-3 py-1.5 text-[#1E293B]">
            <KronosLogo />
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel Docente
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-10">
        {resultBanner ? (
          <div
            className={`w-full rounded-3xl border-2 p-10 text-center shadow-sm space-y-4 transition-all ${
              resultBanner.tone === "PRESENT"
                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                : resultBanner.tone === "LATE"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : resultBanner.tone === "INFO"
                ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                : "border-red-300 bg-red-50 text-red-950"
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-2xs">
              {resultBanner.tone === "PRESENT" && (
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              )}
              {resultBanner.tone === "LATE" && (
                <AlertCircle className="h-10 w-10 text-amber-600" />
              )}
              {resultBanner.tone === "INFO" && (
                <ShieldAlert className="h-10 w-10 text-[#06B6D4]" />
              )}
              {resultBanner.tone === "ERROR" && (
                <Lock className="h-10 w-10 text-red-600" />
              )}
            </div>

            {resultBanner.studentName && (
              <h1 className="text-3xl font-black tracking-tight">
                {resultBanner.studentName}
              </h1>
            )}

            {resultBanner.groupName && (
              <p className="inline-block rounded-full bg-white/90 px-4 py-1 text-sm font-extrabold text-[#312E81] shadow-2xs">
                Grupo: {resultBanner.groupName}
              </p>
            )}

            <p className="text-xl font-extrabold">{resultBanner.statusLabel}</p>
            <p className="text-sm font-semibold opacity-80">
              {resultBanner.detailText}
            </p>
            <p className="pt-2 text-xs font-medium opacity-60">
              Reiniciando automáticamente para el siguiente estudiante...
            </p>
          </div>
        ) : (
          <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-6">
            <div
              className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#312E81] text-cyan-300 shadow-md ${
                isReading ? "animate-pulse ring-8 ring-cyan-100" : ""
              }`}
            >
              <Fingerprint className="h-14 w-14" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-[#1E293B]">
                Ponga la huella para registrar asistencia
              </h1>
              <p className="text-sm text-slate-500">
                {isGroupOpen
                  ? "El sensor está listo. Coloque su dedo para identificar su registro."
                  : "La clase se encuentra cerrada en este momento."}
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-[11px] text-slate-400">
        KronosKool • Kiosco Biométrico Automático
      </footer>
    </div>
  );
}