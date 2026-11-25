// src/lib/rules.ts
import { AlertEvent, AttendanceStatus, Student } from "./types";

/**
 * Convierte "HH:mm" a minutos desde las 00:00
 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Evalúa la marcación biométrica:
 * - Si currentClockTime <= (startTime + graceMinutes): Entrada normal ("PRESENT")
 * - Si currentClockTime > (startTime + graceMinutes): Entrada tarde ("LATE")
 * Nunca devuelve ABSENT al marcar huella/rostro; la inasistencia se asigna al cerrar la clase.
 */
export function evaluateAutomaticArrival(
  classStartTime: string,
  currentClockTime: string,
  graceMinutes = 5
): { status: AttendanceStatus; minutesAfterStart: number } {
  const startMins = timeToMinutes(classStartTime);
  const currentMins = timeToMinutes(currentClockTime);
  const diff = currentMins - startMins;

  if (diff <= graceMinutes) {
    return {
      status: "PRESENT",
      minutesAfterStart: Math.max(0, diff),
    };
  }

  return {
    status: "LATE",
    minutesAfterStart: diff,
  };
}

export function generateAlertsForStudent(
  student: Student,
  newStatus: AttendanceStatus
): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  const now = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (newStatus === "LATE") {
    const totalLates = student.lateCount + 1;

    if (totalLates === 2) {
      alerts.push({
        id: `alt-${Date.now()}-1`,
        studentId: student.id,
        studentName: student.fullName,
        targetRole: "STUDENT",
        channel: "IN_APP",
        message: `Acumulas ${totalLates} llegadas tarde en el periodo. Recuerda llegar a tiempo.`,
        createdAt: now,
      });
    }

    if (totalLates >= 3) {
      alerts.push({
        id: `alt-${Date.now()}-2`,
        studentId: student.id,
        studentName: student.fullName,
        targetRole: "TEACHER",
        channel: "IN_APP",
        message: `Alerta docente: ${student.fullName} alcanzó ${totalLates} llegadas tarde.`,
        createdAt: now,
      });
      alerts.push({
        id: `alt-${Date.now()}-3`,
        studentId: student.id,
        studentName: student.fullName,
        targetRole: "GUARDIAN",
        channel: "EMAIL",
        message: `Correo enviado a ${student.guardianEmail}: ${student.fullName} registra ${totalLates} llegadas tarde.`,
        createdAt: now,
      });
    }
  }

  if (newStatus === "ABSENT") {
    const totalAbsences = student.absentCount + 1;

    alerts.push({
      id: `alt-${Date.now()}-4`,
      studentId: student.id,
      studentName: student.fullName,
      targetRole: "GUARDIAN",
      channel: "EMAIL",
      message: `Correo enviado a ${student.guardianEmail}: Inasistencia registrada al cerrar asistencia. Enlace de excusa disponible.`,
      createdAt: now,
    });

    if (totalAbsences >= 2) {
      alerts.push({
        id: `alt-${Date.now()}-5`,
        studentId: student.id,
        studentName: student.fullName,
        targetRole: "TEACHER",
        channel: "DASHBOARD",
        message: `Semáforo de Bienestar: ${student.fullName} suma ${totalAbsences} inasistencias.`,
        createdAt: now,
      });
    }
  }

  return alerts;
}