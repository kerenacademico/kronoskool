// src/components/WellnessTrafficLight.tsx
"use client";

import React from "react";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Student } from "@/lib/types";

interface WellnessTrafficLightProps {
  students: Student[];
}

type RiskLevel = "GREEN" | "AMBER" | "RED";

function getRiskLevel(student: Student): {
  level: RiskLevel;
  label: string;
  recommendation: string;
} {
  const riskScore = student.lateCount + student.absentCount * 2;

  if (student.absentCount >= 2 || student.lateCount >= 4 || riskScore >= 5) {
    return {
      level: "RED",
      label: "Alerta Alta — Seguimiento urgente",
      recommendation:
        "Coordinar diálogo con acudiente y orientación escolar para revisar causas (salud, transporte o entorno).",
    };
  }

  if (student.lateCount >= 2 || student.absentCount >= 1 || riskScore >= 2) {
    return {
      level: "AMBER",
      label: "Preventivo — Monitoreo activo",
      recommendation:
        "Observar recurrencia en próximas jornadas y enviar recordatorio preventivo sin sanción automática.",
    };
  }

  return {
    level: "GREEN",
    label: "Estable — Buena asistencia",
    recommendation: "Sin patrones de riesgo detectados en el periodo.",
  };
}

export default function WellnessTrafficLight({ students }: WellnessTrafficLightProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Semáforo de Bienestar Estudiantil
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          Prevención temprana
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Evalúa retardos e inasistencias para detectar a tiempo posibles barreras de transporte, salud o bienestar.
      </p>

      <ul className="mt-4 space-y-2.5">
        {students.map((student) => {
          const risk = getRiskLevel(student);

          const styles: Record<
            RiskLevel,
            { card: string; badge: string; icon: React.ReactNode }
          > = {
            GREEN: {
              card: "border-emerald-200 bg-emerald-50/50",
              badge: "bg-emerald-100 text-emerald-800",
              icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
            },
            AMBER: {
              card: "border-amber-200 bg-amber-50/70",
              badge: "bg-amber-100 text-amber-900",
              icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
            },
            RED: {
              card: "border-red-200 bg-red-50/70",
              badge: "bg-red-100 text-red-800",
              icon: <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />,
            },
          };

          const currentStyle = styles[risk.level];

          return (
            <li
              key={student.id}
              className={`rounded-xl border p-3 text-xs ${currentStyle.card}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {currentStyle.icon}
                  <span className="font-bold text-slate-900">{student.fullName}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${currentStyle.badge}`}
                >
                  {risk.label}
                </span>
              </div>
              <p className="mt-1.5 pl-6 text-[11px] text-slate-700">
                {risk.recommendation}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}