// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Sparkles,
  FileCheck,
  HeartPulse,
  Search,
  RotateCcw,
  DoorOpen,
  Lock,
  MonitorSmartphone,
  Layers,
  Bell,
  Siren,
  GraduationCap,
  ArrowLeft,
  ChevronRight,
  Moon,
  Sun,
  Database,
  UserPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { CLASS_GROUPS, INITIAL_STUDENTS } from "@/lib/mock-data";
import { evaluateAutomaticArrival, generateAlertsForStudent } from "@/lib/rules";
import {
  AlertEvent,
  AttendanceStatus,
  MedicalAuditLog,
  MedicalEmergencyProfile,
  Student,
} from "@/lib/types";
import {
  deleteStudentFromSupabase,
  fetchAllStudentsFromSupabase,
  resetSupabaseDemoData,
  updateStudentAttendanceInSupabase,
  updateStudentMedicalInSupabase,
  upsertStudentInSupabase,
} from "@/lib/supabase-students";
import KronosLogo from "@/components/KronosLogo";
import EmergencyCard from "@/components/EmergencyCard";
import ExcuseModal from "@/components/ExcuseModal";
import MedicalEditModal from "@/components/MedicalEditModal";
import StudentDetailModal from "@/components/StudentDetailModal";
import StudentEnrollmentModal from "@/components/StudentEnrollmentModal";

type NavSection = "CLASSES" | "ALERTS" | "EMERGENCY";
type ClassScreenMode = "CARDS" | "ROSTER";
type AlertScreenMode = "CARDS" | "STUDENTS";

const STORAGE_KEY = "kronoskool_mvp_v5";

function isStudentInAlert(student: Student): boolean {
  return student.absentCount >= 2 || student.lateCount >= 3;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getCurrentHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getAttendanceBadge(status?: AttendanceStatus) {
  if (status === "PRESENT") {
    return {
      label: "Puntual",
      pillClass: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
      Icon: CheckCircle2,
    };
  }
  if (status === "LATE") {
    return {
      label: "Impuntual",
      pillClass: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
      Icon: AlertCircle,
    };
  }
  if (status === "ABSENT") {
    return {
      label: "Inasistencia",
      pillClass: "bg-red-100 text-red-800 ring-1 ring-red-300",
      Icon: XCircle,
    };
  }
  if (status === "EXCUSED") {
    return {
      label: "Excusada",
      pillClass: "bg-cyan-100 text-[#312E81] ring-1 ring-cyan-300",
      Icon: FileCheck,
    };
  }
  return {
    label: "Sin registrar",
    pillClass: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    Icon: Clock,
  };
}

export default function TeacherDashboardPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<MedicalAuditLog[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(CLASS_GROUPS[0].id);
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([CLASS_GROUPS[0].id]);
  const [alertGroupId, setAlertGroupId] = useState<string>(CLASS_GROUPS[0].id);
  const [navSection, setNavSection] = useState<NavSection>("CLASSES");
  const [classScreenMode, setClassScreenMode] = useState<ClassScreenMode>("CARDS");
  const [alertScreenMode, setAlertScreenMode] = useState<AlertScreenMode>("CARDS");
  const [startTime, setStartTime] = useState<string>(CLASS_GROUPS[0].startTime);
  const [graceMinutes, setGraceMinutes] = useState<number>(CLASS_GROUPS[0].graceMinutes);
  const [clockTime, setClockTime] = useState<string>(getCurrentHHMM());
  const [minutesSaved, setMinutesSaved] = useState<number>(12);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [excuseStudent, setExcuseStudent] = useState<Student | null>(null);
  const [medicalStudent, setMedicalStudent] = useState<Student | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const activeGroup = useMemo(
    () => CLASS_GROUPS.find((g) => g.id === selectedGroupId) ?? CLASS_GROUPS[0],
    [selectedGroupId]
  );

  const activeAlertGroup = useMemo(
    () => CLASS_GROUPS.find((g) => g.id === alertGroupId) ?? CLASS_GROUPS[0],
    [alertGroupId]
  );

  const isCurrentGroupOpen = openGroupIds.includes(activeGroup.id);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingDb(true);
      const dbStudents = await fetchAllStudentsFromSupabase();
      if (active && dbStudents.length > 0) {
        setStudents(dbStudents);
      }
      if (active) setIsLoadingDb(false);
    };
    void load();

    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedGroupId,
          openGroupIds,
          startTime,
          graceMinutes,
          clockTime,
          minutesSaved,
          darkMode,
        })
      );
    } catch {
      // Ignorar
    }
  }, [
    selectedGroupId,
    openGroupIds,
    startTime,
    graceMinutes,
    clockTime,
    minutesSaved,
    darkMode,
  ]);

  const handleOpenClass = async (groupId: string) => {
    const grp = CLASS_GROUPS.find((g) => g.id === groupId) ?? CLASS_GROUPS[0];
    setSelectedGroupId(grp.id);
    setStartTime(grp.startTime);
    setGraceMinutes(grp.graceMinutes);
    setSearchTerm("");
    setNavSection("CLASSES");
    setClassScreenMode("ROSTER");

    const latest = await fetchAllStudentsFromSupabase();
    if (latest.length > 0) {
      setStudents(latest);
    }
  };

  const handleOpenAlertGroup = (groupId: string) => {
    setAlertGroupId(groupId);
    setNavSection("ALERTS");
    setAlertScreenMode("STUDENTS");
  };

  const handleToggleClassAttendance = async () => {
    if (isCurrentGroupOpen) {
      const generated: AlertEvent[] = [];
      const updatedList: Student[] = [];

      const nextStudents = students.map((s) => {
        if (s.groupId === activeGroup.id && !s.todayStatus) {
          const studentAlerts = generateAlertsForStudent(s, "ABSENT");
          generated.push(...studentAlerts);
          const updated: Student = {
            ...s,
            todayStatus: "ABSENT",
            absentCount: s.absentCount + 1,
          };
          updatedList.push(updated);
          return updated;
        }
        return s;
      });

      setStudents(nextStudents);
      if (generated.length > 0) {
        setAlerts((old) => [...generated, ...old]);
      }
      setOpenGroupIds((prev) => prev.filter((id) => id !== activeGroup.id));

      for (const st of updatedList) {
        await updateStudentAttendanceInSupabase(st);
      }
    } else {
      setOpenGroupIds((prev) =>
        prev.includes(activeGroup.id) ? prev : [...prev, activeGroup.id]
      );
    }
  };

  const handleSaveStudentEnrollment = async (
    savedStudent: Student,
    isNew: boolean
  ) => {
    setStudents((prev) => {
      if (isNew) return [savedStudent, ...prev];
      return prev.map((s) => (s.id === savedStudent.id ? savedStudent : s));
    });
    await upsertStudentInSupabase(savedStudent);
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    await deleteStudentFromSupabase(studentId);
  };

  const handleSubmitExcuse = async (
    studentId: string,
    reason: string,
    note: string
  ) => {
    const now = getCurrentHHMM();
    let updatedStudent: Student | null = null;

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        updatedStudent = {
          ...student,
          todayStatus: "EXCUSED",
          checkInTime: student.checkInTime ?? now,
          absentCount: Math.max(0, student.absentCount - 1),
        };
        return updatedStudent;
      })
    );

    if (updatedStudent) {
      await updateStudentAttendanceInSupabase(updatedStudent);
    }

    const target = students.find((s) => s.id === studentId);
    if (target) {
      setAlerts((old) => [
        {
          id: `alt-${Date.now()}-exc`,
          studentId: target.id,
          studentName: target.fullName,
          targetRole: "ADMIN_SCHOOL",
          channel: "DASHBOARD",
          message: `Asistencia manual con excusa para ${target.fullName}: ${reason} — ${note}`,
          createdAt: now,
        },
        ...old,
      ]);
    }
  };

  const handleSaveMedical = async (
    studentId: string,
    updatedMedical: MedicalEmergencyProfile
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, medical: updatedMedical } : student
      )
    );
    await updateStudentMedicalInSupabase(studentId, updatedMedical);
  };

  const handleResetDemo = async () => {
    setIsLoadingDb(true);
    const fresh = await resetSupabaseDemoData();
    setStudents(fresh);
    setAlerts([]);
    setAuditLogs([]);
    setOpenGroupIds([CLASS_GROUPS[0].id]);
    setStartTime(CLASS_GROUPS[0].startTime);
    setGraceMinutes(CLASS_GROUPS[0].graceMinutes);
    setClockTime(getCurrentHHMM());
    setMinutesSaved(12);
    setSearchTerm("");
    setDetailStudent(null);
    setClassScreenMode("CARDS");
    setAlertScreenMode("CARDS");
    setNavSection("CLASSES");
    setIsLoadingDb(false);
  };

  const groupAlertCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const grp of CLASS_GROUPS) {
      map[grp.id] = students.filter(
        (s) => s.groupId === grp.id && isStudentInAlert(s)
      ).length;
    }
    return map;
  }, [students]);

  const totalAlertStudents = useMemo(
    () => Object.values(groupAlertCounts).reduce((acc, n) => acc + n, 0),
    [groupAlertCounts]
  );

  const groupStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      if (s.groupId !== activeGroup.id) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.documentNumber.toLowerCase().includes(q)
      );
    });
  }, [students, activeGroup.id, searchTerm]);

  const alertGroupStudents = useMemo(
    () =>
      students.filter(
        (s) => s.groupId === activeAlertGroup.id && isStudentInAlert(s)
      ),
    [students, activeAlertGroup.id]
  );

  const isLateNow =
    evaluateAutomaticArrival(startTime, clockTime, graceMinutes).status === "LATE";

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row transition-colors ${
        darkMode
          ? "bg-[#0F172A] text-slate-100"
          : "bg-[#F4F7FA] text-[#1E293B]"
      }`}
    >
      <aside className="w-full lg:w-72 shrink-0 bg-[#312E81] text-white flex flex-col justify-between">
        <div className="p-6 space-y-6">
          <div className="rounded-2xl bg-white p-3 text-[#1E293B] shadow-2xs">
            <KronosLogo showSubtitle />
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-cyan-200/80">
              Menú Principal
            </p>
            <nav className="mt-2.5 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setNavSection("CLASSES");
                  setClassScreenMode("CARDS");
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  navSection === "CLASSES"
                    ? "bg-white text-[#312E81] shadow-2xs"
                    : "text-indigo-100 hover:bg-indigo-950/50 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Layers
                    className={`h-4 w-4 ${
                      navSection === "CLASSES" ? "text-[#06B6D4]" : "text-cyan-300"
                    }`}
                  />
                  Clases
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNavSection("ALERTS");
                  setAlertScreenMode("CARDS");
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  navSection === "ALERTS"
                    ? "bg-white text-[#312E81] shadow-2xs"
                    : "text-indigo-100 hover:bg-indigo-950/50 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Bell
                    className={`h-4 w-4 ${
                      navSection === "ALERTS" ? "text-[#06B6D4]" : "text-cyan-300"
                    }`}
                  />
                  Alertas
                </span>
                {totalAlertStudents > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {totalAlertStudents}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setNavSection("EMERGENCY")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  navSection === "EMERGENCY"
                    ? "bg-white text-[#312E81] shadow-2xs"
                    : "text-indigo-100 hover:bg-indigo-950/50 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Siren
                    className={`h-4 w-4 ${
                      navSection === "EMERGENCY" ? "text-[#06B6D4]" : "text-cyan-300"
                    }`}
                  />
                  Emergencia Médica
                </span>
              </button>
            </nav>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingStudent(null);
              setEnrollmentModalOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06B6D4] px-3.5 py-2.5 text-xs font-extrabold text-slate-950 shadow-2xs transition hover:bg-cyan-400"
          >
            <UserPlus className="h-4 w-4" />
            Matricular estudiante
          </button>

          <div className="rounded-2xl border border-cyan-400/25 bg-indigo-950/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Database className="h-4 w-4" />
              Supabase PostgreSQL
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-100/90">
              {isLoadingDb
                ? "Sincronizando grupos y estudiantes..."
                : `${students.length} estudiantes sincronizados en la nube.`}
            </p>
          </div>
        </div>

        <div className="border-t border-indigo-950/70 bg-indigo-950/50 p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06B6D4] text-xs font-black text-slate-950">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white">{activeGroup.teacherName}</p>
              <p className="text-[11px] text-cyan-200/80">
                {activeGroup.name} • {activeGroup.subject}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleResetDemo()}
            title="Restaurar datos iniciales en Supabase"
            className="rounded-lg border border-indigo-700 bg-indigo-900/70 p-2 text-indigo-100 transition hover:bg-indigo-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-gradient-to-r from-[#312E81] to-[#06B6D4] text-white px-6 py-4">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {navSection === "CLASSES" && classScreenMode === "ROSTER" && (
                <button
                  type="button"
                  onClick={() => setClassScreenMode("CARDS")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/25"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Clases
                </button>
              )}

              {navSection === "ALERTS" && alertScreenMode === "STUDENTS" && (
                <button
                  type="button"
                  onClick={() => setAlertScreenMode("CARDS")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/25"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Grupos en Alerta
                </button>
              )}

              <div>
                <h1 className="text-lg font-extrabold tracking-tight">
                  {navSection === "EMERGENCY"
                    ? "Emergencia Médica y Auditoría"
                    : navSection === "ALERTS"
                    ? alertScreenMode === "CARDS"
                      ? "Alertas por Grupo"
                      : `Alertas • ${activeAlertGroup.name} (${activeAlertGroup.subject})`
                    : classScreenMode === "CARDS"
                    ? "Clases"
                    : `${activeGroup.name} • ${activeGroup.subject}`}
                </h1>
                <p className="text-xs text-cyan-50/90">
                  {navSection === "EMERGENCY"
                    ? "Consulta de ficha vital por documento con trazabilidad."
                    : navSection === "ALERTS"
                    ? alertScreenMode === "CARDS"
                      ? "Estudiantes con alertas por inasistencias o llegadas tarde."
                      : "Estudiantes en alerta de este grupo."
                    : classScreenMode === "CARDS"
                    ? "Selecciona una clase para ver su listado y abrir el Kiosco."
                    : `Docente: ${activeGroup.teacherName} • La asistencia se registra por huella en el Kiosco.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-950/35 px-3 py-1.5 text-xs font-bold text-cyan-100 ring-1 ring-white/25">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                {minutesSaved} min salvados
              </span>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#312E81] shadow-2xs transition hover:bg-cyan-50"
              >
                {darkMode ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#F97316]" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#312E81]" />
                    Modo Oscuro
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-6 py-7">
          {navSection === "CLASSES" && classScreenMode === "CARDS" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CLASS_GROUPS.map((grp) => {
                const totalInGroup = students.filter((s) => s.groupId === grp.id).length;
                const groupOpen = openGroupIds.includes(grp.id);

                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => void handleOpenClass(grp.id)}
                    className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                      darkMode
                        ? "border-slate-800 bg-slate-900 hover:border-[#06B6D4]"
                        : "border-slate-200/90 bg-white hover:border-[#06B6D4] shadow-2xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                            darkMode
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "bg-cyan-50 text-[#312E81]"
                          }`}
                        >
                          {grp.name}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            groupOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {groupOpen ? "Abierta" : "Cerrada"}
                        </span>
                      </div>

                      <h2
                        className={`mt-3 text-lg font-extrabold ${
                          darkMode ? "text-white" : "text-[#1E293B]"
                        }`}
                      >
                        {grp.subject}
                      </h2>
                      <p
                        className={`mt-0.5 text-xs ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {grp.teacherName}
                      </p>
                    </div>

                    <div
                      className={`mt-5 flex items-center justify-between border-t pt-3 text-xs ${
                        darkMode
                          ? "border-slate-800 text-slate-400"
                          : "border-slate-100 text-slate-500"
                      }`}
                    >
                      <span>
                        {totalInGroup} alumnos • Inicio {grp.startTime}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          darkMode ? "text-cyan-300" : "text-[#312E81]"
                        }`}
                      >
                        Abrir clase <ChevronRight className="h-4 w-4 text-[#06B6D4]" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {navSection === "CLASSES" && classScreenMode === "ROSTER" && (
            <div className="space-y-5">
              <div
                className={`rounded-2xl border p-5 space-y-4 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200/90 bg-white shadow-2xs"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isCurrentGroupOpen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isCurrentGroupOpen
                        ? "Clase abierta (registro activo en Kiosco)"
                        : "Clase cerrada (habilitada excusa manual)"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(null);
                        setEnrollmentModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#06B6D4] px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-2xs transition hover:bg-cyan-400"
                    >
                      <UserPlus className="h-4 w-4" />
                      Matricular alumno
                    </button>

                    <Link
                      href="/kiosk"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F97316] px-3.5 py-2 text-xs font-extrabold text-white shadow-2xs transition hover:bg-orange-600"
                    >
                      <MonitorSmartphone className="h-4 w-4" />
                      Ir a Pantalla Kiosco
                    </Link>

                    <button
                      type="button"
                      onClick={() => void handleToggleClassAttendance()}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                        isCurrentGroupOpen
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-[#312E81] hover:bg-indigo-900"
                      }`}
                    >
                      {isCurrentGroupOpen ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Cerrar clase (marcar faltas)
                        </>
                      ) : (
                        <>
                          <DoorOpen className="h-3.5 w-3.5" />
                          Reabrir clase
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className={`flex flex-wrap items-center justify-between gap-4 border-t pt-3 text-xs ${
                    darkMode ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 font-semibold">
                      Hora inicio:
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-[#1E293B]"
                      />
                    </label>

                    <label className="flex items-center gap-1.5 font-semibold">
                      Tolerancia (min):
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={graceMinutes}
                        onChange={(e) => setGraceMinutes(Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-[#1E293B]"
                      />
                    </label>

                    <label className="flex items-center gap-1.5 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-[#06B6D4]" />
                      Hora de prueba:
                      <input
                        type="time"
                        value={clockTime}
                        onChange={(e) => setClockTime(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-[#1E293B]"
                      />
                    </label>
                  </div>

                  <span
                    className={`rounded-lg px-2.5 py-1 font-bold ${
                      isLateNow
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-cyan-50 text-[#312E81] border border-cyan-200"
                    }`}
                  >
                    {isLateNow ? "Si llega ahora: Impuntual" : "Si llega ahora: Puntual"}
                  </span>
                </div>
              </div>

              <div
                className={`rounded-2xl border overflow-hidden ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200/90 bg-white shadow-2xs"
                }`}
              >
                <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold">
                      Estudiantes de {activeGroup.name} ({groupStudents.length})
                    </h2>
                    <p
                      className={`text-xs ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {isCurrentGroupOpen
                        ? "El alumno registra su huella en el Kiosco al llegar."
                        : "Clase cerrada: puedes registrar excusa/asistencia manual en alumnos con inasistencia."}
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar alumno..."
                      className="w-full rounded-xl border border-slate-200 bg-[#F4F7FA] py-2 pl-9 pr-3 text-xs text-[#1E293B] focus:border-[#06B6D4] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {groupStudents.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">
                    No se encontraron estudiantes en {activeGroup.name}.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr
                          className={`border-y text-[11px] font-bold uppercase tracking-wider ${
                            darkMode
                              ? "border-slate-800 bg-slate-950/60 text-slate-400"
                              : "border-slate-200/80 bg-[#F4F7FA] text-slate-500"
                          }`}
                        >
                          <th className="py-3 pl-5 pr-3">Estudiante</th>
                          <th className="px-3 py-3">Documento</th>
                          <th className="px-3 py-3">Estado hoy</th>
                          <th className="px-3 py-3">Historial / RH</th>
                          <th className="py-3 pl-3 pr-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          darkMode ? "divide-slate-800" : "divide-slate-100"
                        }`}
                      >
                        {groupStudents.map((student) => {
                          const badge = getAttendanceBadge(student.todayStatus);
                          const StatusIcon = badge.Icon;
                          const canExcuseAfterClose =
                            !isCurrentGroupOpen &&
                            (student.todayStatus === "ABSENT" || !student.todayStatus);

                          return (
                            <tr
                              key={student.id}
                              onClick={() => setDetailStudent(student)}
                              className={`cursor-pointer transition ${
                                darkMode
                                  ? "hover:bg-slate-800/60"
                                  : "hover:bg-slate-50/90"
                              }`}
                            >
                              <td className="py-3.5 pl-5 pr-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                                      darkMode
                                        ? "bg-cyan-500/15 text-cyan-300"
                                        : "bg-cyan-50 text-[#312E81]"
                                    }`}
                                  >
                                    {getInitials(student.fullName)}
                                  </div>
                                  <span className="text-sm font-bold">
                                    {student.fullName}
                                  </span>
                                </div>
                              </td>

                              <td
                                className={`px-3 py-3.5 font-medium ${
                                  darkMode ? "text-slate-300" : "text-slate-600"
                                }`}
                              >
                                {student.documentType} {student.documentNumber}
                              </td>

                              <td className="px-3 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${badge.pillClass}`}
                                >
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {badge.label}
                                  {student.checkInTime ? ` • ${student.checkInTime}` : ""}
                                </span>
                              </td>

                              <td
                                className={`px-3 py-3.5 ${
                                  darkMode ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                Retardos: <strong>{student.lateCount}</strong> • Faltas:{" "}
                                <strong>{student.absentCount}</strong> • RH:{" "}
                                <strong className="text-[#F97316]">
                                  {student.medical.bloodType}
                                </strong>
                              </td>

                              <td
                                className="py-3.5 pl-3 pr-5 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {canExcuseAfterClose && (
                                    <button
                                      type="button"
                                      onClick={() => setExcuseStudent(student)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-[#312E81] px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-900"
                                    >
                                      <FileCheck className="h-3.5 w-3.5 text-cyan-300" />
                                      Excusa
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setMedicalStudent(student)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-[#F97316] hover:bg-orange-100"
                                  >
                                    <HeartPulse className="h-3.5 w-3.5" />
                                    Salud
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStudent(student);
                                      setEnrollmentModalOpen(true);
                                    }}
                                    title="Editar matrícula"
                                    className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteStudent(student.id)}
                                    title="Eliminar estudiante"
                                    className="rounded-xl border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {navSection === "ALERTS" && alertScreenMode === "CARDS" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CLASS_GROUPS.map((grp) => {
                const alertStudentsCount = groupAlertCounts[grp.id] ?? 0;

                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => handleOpenAlertGroup(grp.id)}
                    className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                      alertStudentsCount > 0
                        ? darkMode
                          ? "border-red-500/60 bg-slate-900 hover:border-red-400"
                          : "border-red-300 bg-white hover:border-red-500 shadow-2xs"
                        : darkMode
                        ? "border-slate-800 bg-slate-900 hover:border-slate-700"
                        : "border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                            darkMode
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "bg-cyan-50 text-[#312E81]"
                          }`}
                        >
                          {grp.name}
                        </span>

                        {alertStudentsCount > 0 && (
                          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold text-white">
                            {alertStudentsCount}{" "}
                            {alertStudentsCount === 1 ? "alerta" : "alertas"}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-lg font-extrabold">{grp.subject}</h2>
                      <p
                        className={`mt-0.5 text-xs ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {grp.teacherName}
                      </p>
                    </div>

                    <div
                      className={`mt-5 flex items-center justify-between border-t pt-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-100"
                      }`}
                    >
                      <span
                        className={
                          alertStudentsCount > 0
                            ? "font-bold text-red-600"
                            : darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }
                      >
                        {alertStudentsCount > 0
                          ? `${alertStudentsCount} alumno(s) con retrasos o faltas`
                          : "Sin alertas en este grupo"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          darkMode ? "text-cyan-300" : "text-[#312E81]"
                        }`}
                      >
                        Ver <ChevronRight className="h-4 w-4 text-[#06B6D4]" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {navSection === "ALERTS" && alertScreenMode === "STUDENTS" && (
            <div
              className={`rounded-2xl border p-5 space-y-4 ${
                darkMode
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200/90 bg-white shadow-2xs"
              }`}
            >
              {alertGroupStudents.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No hay estudiantes en alerta en {activeAlertGroup.name} •{" "}
                  {activeAlertGroup.subject}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {alertGroupStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setDetailStudent(student)}
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50/80 p-4 text-[#1E293B] transition hover:bg-red-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-xs font-extrabold text-white">
                          {getInitials(student.fullName)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-red-950">
                              {student.fullName}
                            </p>
                            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                              EN ALERTA — Clic para ver días
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-red-800">
                            {student.documentType} {student.documentNumber} • Retardos:{" "}
                            <strong>{student.lateCount}</strong> • Inasistencias:{" "}
                            <strong>{student.absentCount}</strong>
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-red-700">
                        Detalle <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {navSection === "EMERGENCY" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <EmergencyCard
                  students={students}
                  onLogAccess={(log) => setAuditLogs((prev) => [log, ...prev])}
                />
              </div>

              <div
                className={`lg:col-span-6 rounded-2xl border p-5 ${
                  darkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200/90 bg-white shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <ShieldCheck className="h-4 w-4 text-[#06B6D4]" />
                  <h2 className="text-sm font-bold">Auditoría Médica (Ley 1581)</h2>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Sin accesos médicos registrados todavía.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {auditLogs.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-xl border border-slate-200 bg-[#F4F7FA] p-3 text-xs text-[#1E293B]"
                      >
                        <p className="font-bold">
                          {log.studentName} ({log.documentNumber})
                        </p>
                        <p className="text-slate-600">Motivo: {log.reason}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {log.accessedAt}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <StudentEnrollmentModal
        isOpen={enrollmentModalOpen}
        studentToEdit={editingStudent}
        defaultGroupId={activeGroup.id}
        onClose={() => {
          setEnrollmentModalOpen(false);
          setEditingStudent(null);
        }}
        onSaveStudent={handleSaveStudentEnrollment}
      />

      <StudentDetailModal
        student={detailStudent}
        alerts={alerts}
        onClose={() => setDetailStudent(null)}
        onOpenExcuse={(s) => setExcuseStudent(s)}
        onOpenMedical={(s) => setMedicalStudent(s)}
      />

      <ExcuseModal
        student={excuseStudent}
        onClose={() => setExcuseStudent(null)}
        onSubmitExcuse={handleSubmitExcuse}
      />

      <MedicalEditModal
        student={medicalStudent}
        onClose={() => setMedicalStudent(null)}
        onSaveMedical={handleSaveMedical}
      />
    </div>
  );
}