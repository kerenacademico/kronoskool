// src/components/ExcuseModal.tsx
"use client";

import React, { useState } from "react";
import { FileText, CheckCircle2, X } from "lucide-react";
import { Student } from "@/lib/types";

interface ExcuseModalProps {
  student: Student | null;
  onClose: () => void;
  onSubmitExcuse: (studentId: string, reason: string, note: string) => void;
}

export default function ExcuseModal({
  student,
  onClose,
  onSubmitExcuse,
}: ExcuseModalProps) {
  const [reason, setReason] = useState("Cita médica / EPS");
  const [note, setNote] = useState("");

  if (!student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitExcuse(
      student.id,
      reason,
      note.trim() || "Soporte adjunto por acudiente"
    );
    setNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Justificar Inasistencia / Retardo
              </h3>
              <p className="text-xs text-slate-500">
                {student.fullName} ({student.grade}) • {student.guardianEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Motivo del acudiente
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option>Cita médica / EPS</option>
              <option>Incapacidad médica o malestar</option>
              <option>Calamidad familiar</option>
              <option>Retraso de transporte escolar / movilidad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Observación o referencia de soporte (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Constancia médica enviada al correo / Fórmula EPS"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Enviar Excusa en 2 Clics
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}