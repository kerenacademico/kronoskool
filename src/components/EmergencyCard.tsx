// src/components/EmergencyCard.tsx
"use client";

import React, { useState } from "react";
import { AlertTriangle, HeartPulse, Phone, ShieldAlert, FileCheck2 } from "lucide-react";
import { MedicalAuditLog, Student } from "@/lib/types";

interface EmergencyCardProps {
  students: Student[];
  onLogAccess: (log: MedicalAuditLog) => void;
}

export default function EmergencyCard({ students, onLogAccess }: EmergencyCardProps) {
  const [docQuery, setDocQuery] = useState("");
  const [reason, setReason] = useState("Desmayo / Pérdida de conciencia");
  const [unlockedStudent, setUnlockedStudent] = useState<Student | null>(null);
  const [error, setError] = useState("");

  const handleActivateEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const found = students.find(
      (s) => s.documentNumber.trim() === docQuery.trim()
    );

    if (!found) {
      setUnlockedStudent(null);
      setError("No se encontró ningún estudiante con ese número de documento.");
      return;
    }

    setUnlockedStudent(found);

    // Registro inmutable de auditoría (Habeas Data)
    onLogAccess({
      id: `aud-${Date.now()}`,
      studentId: found.id,
      studentName: found.fullName,
      documentNumber: found.documentNumber,
      accessedBy: "Prof. Alejandro Ruiz (Titular 10°A)",
      role: "TEACHER",
      reason,
      accessedAt: new Date().toLocaleString("es-CO"),
    });
  };

  return (
    <div className="rounded-2xl border-2 border-red-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-red-100 pb-4">
        <div className="rounded-xl bg-red-600 p-2.5 text-white">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Modo Emergencia Médica (Acceso Auditado)
          </h2>
          <p className="text-xs text-slate-500">
            Consulta vital para paramédicos u hospital mediante documento del estudiante.
          </p>
        </div>
      </div>

      <form onSubmit={handleActivateEmergency} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Número de Documento (TI / CC)
          </label>
          <input
            type="text"
            placeholder="Ej: 1023456789"
            value={docQuery}
            onChange={(e) => setDocQuery(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-red-500 focus:outline-none"
            required
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Docs de prueba: 1023456789, 1034567890, 1001234567, 1045678901
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Motivo de Emergencia (Queda registrado en auditoría)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
          >
            <option>Desmayo / Pérdida de conciencia</option>
            <option>Reacción alérgica severa</option>
            <option>Dificultad respiratoria / Crisis de asma</option>
            <option>Convulsión</option>
            <option>Accidente o trauma escolar</option>
          </select>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
        >
          <ShieldAlert className="h-4 w-4" />
          Desbloquear Ficha Vital y Notificar Acudiente
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {unlockedStudent && (
        <div className="mt-5 rounded-xl border-2 border-red-600 bg-red-50/60 p-4 space-y-3">
          <div className="flex items-start justify-between border-b border-red-200 pb-2">
            <div>
              <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Ficha Vital Activa
              </span>
              <h3 className="mt-1 text-base font-extrabold text-slate-900">
                {unlockedStudent.fullName}
              </h3>
              <p className="text-xs text-slate-600">
                {unlockedStudent.documentType}: {unlockedStudent.documentNumber} • Grado:{" "}
                {unlockedStudent.grade}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-1.5 text-center shadow-xs border border-red-200">
              <span className="block text-[10px] font-bold text-slate-400">RH</span>
              <span className="text-lg font-black text-red-600">
                {unlockedStudent.medical.bloodType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="rounded-lg bg-white p-2.5 border border-red-200">
              <span className="font-bold text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> ALERGIAS CRÍTICAS:
              </span>
              <p className="mt-0.5 font-semibold text-slate-900">
                {unlockedStudent.medical.criticalAllergies.join(", ")}
              </p>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="font-bold text-slate-700">CONDICIONES MÉDICAS:</span>
              <p className="mt-0.5 text-slate-800">
                {unlockedStudent.medical.medicalConditions.join(", ")}
              </p>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="font-bold text-slate-700">MEDICAMENTOS:</span>
              <p className="mt-0.5 text-slate-800">
                {unlockedStudent.medical.medications.join(", ")}
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-300">
              <span className="font-bold text-amber-900">PROTOCOLO / INDICACIONES:</span>
              <p className="mt-0.5 text-amber-950">
                {unlockedStudent.medical.emergencyInstructions}
              </p>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> CONTACTOS DE EMERGENCIA ({unlockedStudent.medical.epsName}):
              </span>
              <ul className="mt-1 space-y-1">
                {unlockedStudent.medical.emergencyContacts.map((c, idx) => (
                  <li key={idx} className="flex justify-between font-medium text-slate-800">
                    <span>{c.name}</span>
                    <span className="font-bold text-red-700">{c.phone}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
              Actualizado: {unlockedStudent.medical.lastVerifiedAt}
            </span>
            <span className="font-semibold text-red-700">Acceso auditado</span>
          </div>
        </div>
      )}
    </div>
  );
}