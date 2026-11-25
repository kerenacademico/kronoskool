// src/components/StudentDetailModal.tsx
"use client";

import React from "react";
import {
  X,
  AlertTriangle,
  CalendarX,
  Clock,
  FileCheck,
  HeartPulse,
} from "lucide-react";
import { AlertEvent, Student } from "@/lib/types";

interface StudentDetailModalProps {
  student: Student | null;
  alerts: AlertEvent[];
  onClose: () => void;
  onOpenExcuse: (student: Student) => void;
  onOpenMedical: (student: Student) => void;
}

export default function StudentDetailModal({
  student,
  alerts,
  onClose,
  onOpenExcuse,
  onOpenMedical,
}: StudentDetailModalProps) {
  if (!student) return null;

  const studentAlerts = alerts.filter((a) => a.studentId === student.id);
  const isInAlert = student.absentCount >= 2 || student.lateCount >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                {student.fullName}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  isInAlert
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isInAlert ? "En alerta" : "Sin alerta"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {student.documentType} {student.documentNumber} • Grado {student.grade} • Acudiente:{" "}
              {student.guardianEmail}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen numérico de retrasos y faltas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Clock className="h-4 w-4 text-amber-600" />
              Retardos acumulados
            </div>
            <p className="mt-1.5 text-2xl font-black text-amber-950">
              {student.lateCount}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800">
              {student.checkInTime
                ? `Último ingreso: ${student.checkInTime}${
                    student.minutesAfterStart ? ` (+${student.minutesAfterStart} min)` : ""
                  }`
                : "Sin marcación reciente"}
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
              <CalendarX className="h-4 w-4 text-red-600" />
              Inasistencias
            </div>
            <p className="mt-1.5 text-2xl font-black text-red-950">
              {student.absentCount}
            </p>
            <p className="mt-0.5 text-[11px] text-red-800">
              Estado hoy: {student.todayStatus ?? "Pendiente"}
            </p>
          </div>
        </div>

        {/* Registro de alertas y motivos */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Historial de alertas y novedades
          </div>

          {studentAlerts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {isInAlert
                ? `Este estudiante acumula ${student.lateCount} retraso(s) y ${student.absentCount} falta(s) en el periodo. Revisa su justificación o contacta al acudiente.`
                : "No hay alertas disparadas en esta sesión para este estudiante."}
            </div>
          ) : (
            <ul className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {studentAlerts.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-red-200/80 bg-red-50/50 p-3 text-xs"
                >
                  <div className="flex justify-between font-bold text-red-900">
                    <span>
                      {item.targetRole} • {item.channel}
                    </span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {item.createdAt}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800">{item.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExcuse(student);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              <FileCheck className="h-4 w-4 text-[#1E3A8A]" />
              Registrar excusa
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMedical(student);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <HeartPulse className="h-4 w-4" />
              Ficha salud
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}