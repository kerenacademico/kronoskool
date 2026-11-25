// src/components/StudentEnrollmentModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Fingerprint,
  CheckCircle2,
  UserPlus,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";
import { CLASS_GROUPS } from "@/lib/mock-data";
import { Student } from "@/lib/types";
import {
  enrollFingerprintForStudent,
  isWebAuthnFingerprintAvailable,
} from "@/lib/webauthn-fingerprint";
import { linkWebAuthnCredentialToStudent } from "@/lib/supabase-students";

interface StudentEnrollmentModalProps {
  studentToEdit: Student | null;
  defaultGroupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveStudent: (student: Student, isNew: boolean) => Promise<void>;
}

export default function StudentEnrollmentModal({
  studentToEdit,
  defaultGroupId,
  isOpen,
  onClose,
  onSaveStudent,
}: StudentEnrollmentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"TI" | "CC">("TI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId ?? CLASS_GROUPS[0].id);

  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");

  const [bloodType, setBloodType] = useState("O+");
  const [epsName, setEpsName] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [medicationsText, setMedicationsText] = useState("");
  const [emergencyInstructions, setEmergencyInstructions] = useState("");

  const [fingerprintLinked, setFingerprintLinked] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (studentToEdit) {
      const parts = studentToEdit.fullName.trim().split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
      setDocumentType(studentToEdit.documentType === "CC" ? "CC" : "TI");
      setDocumentNumber(studentToEdit.documentNumber);
      setGroupId(studentToEdit.groupId);
      setGuardianName(studentToEdit.guardianName ?? "");
      setGuardianPhone(studentToEdit.guardianPhone ?? "");
      setGuardianEmail(studentToEdit.guardianEmail ?? "");
      setAddress(studentToEdit.address ?? "");
      setBloodType(studentToEdit.medical.bloodType || "O+");
      setEpsName(studentToEdit.medical.epsName || "");
      setAllergiesText((studentToEdit.medical.criticalAllergies ?? []).join(", "));
      setConditionsText((studentToEdit.medical.medicalConditions ?? []).join(", "));
      setMedicationsText((studentToEdit.medical.medications ?? []).join(", "));
      setEmergencyInstructions(studentToEdit.medical.emergencyInstructions ?? "");
      setFingerprintLinked(true);
    } else {
      setFirstName("");
      setLastName("");
      setDocumentType("TI");
      setDocumentNumber("");
      setGroupId(defaultGroupId ?? CLASS_GROUPS[0].id);
      setGuardianName("");
      setGuardianPhone("");
      setGuardianEmail("");
      setAddress("");
      setBloodType("O+");
      setEpsName("");
      setAllergiesText("");
      setConditionsText("");
      setMedicationsText("");
      setEmergencyInstructions("");
      setFingerprintLinked(false);
    }
  }, [isOpen, studentToEdit, defaultGroupId]);

  if (!isOpen) return null;

  const selectedGroup =
    CLASS_GROUPS.find((g) => g.id === groupId) ?? CLASS_GROUPS[0];
  const studentId = studentToEdit?.id ?? `stu-${Date.now()}`;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleCaptureRequiredFingerprint = async () => {
    setErrorMsg(null);
    if (!fullName || !documentNumber.trim()) {
      setErrorMsg(
        "Primero escribe Nombre, Apellido y Número de documento (TI o CC) para enlazar la huella."
      );
      return;
    }
    if (!isWebAuthnFingerprintAvailable()) {
      setErrorMsg("Este equipo o navegador no soporta lector de huella WebAuthn.");
      return;
    }

    setIsEnrolling(true);
    try {
      const record = await enrollFingerprintForStudent(
        studentId,
        fullName,
        documentNumber.trim()
      );
      await linkWebAuthnCredentialToStudent(studentId, record.credentialIdBase64);
      setFingerprintLinked(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No se pudo capturar la huella en el sensor del PC."
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Debes ingresar nombre y apellido del estudiante.");
      return;
    }
    if (!documentNumber.trim()) {
      setErrorMsg("Debes ingresar el número de TI o CC.");
      return;
    }
    if (!guardianName.trim() || !guardianPhone.trim()) {
      setErrorMsg("Debes ingresar el nombre y número de celular del acudiente.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Debes ingresar la dirección de residencia.");
      return;
    }
    if (!fingerprintLinked) {
      setErrorMsg(
        "Es obligatorio registrar la huella del estudiante en el sensor del PC antes de guardar la matrícula."
      );
      return;
    }

    const parseList = (raw: string) =>
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const updatedStudent: Student = {
      id: studentId,
      groupId: selectedGroup.id,
      fullName,
      documentType,
      documentNumber: documentNumber.trim(),
      grade: selectedGroup.name,
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      guardianEmail:
        guardianEmail.trim() || "acudiente@kronoskool.edu.co",
      address: address.trim(),
      lateCount: studentToEdit?.lateCount ?? 0,
      absentCount: studentToEdit?.absentCount ?? 0,
      todayStatus: studentToEdit?.todayStatus,
      biometricMethod: studentToEdit?.biometricMethod ?? "FINGERPRINT",
      checkInTime: studentToEdit?.checkInTime,
      minutesAfterStart: studentToEdit?.minutesAfterStart ?? 0,
      medical: {
        bloodType,
        epsName: epsName.trim() || "No especificada",
        criticalAllergies: parseList(allergiesText),
        medicalConditions: parseList(conditionsText),
        medications: parseList(medicationsText),
        emergencyInstructions:
          emergencyInstructions.trim() ||
          "Contactar al acudiente principal ante cualquier novedad.",
        emergencyContacts: [
          {
            name: guardianName.trim(),
            relation: "Acudiente",
            phone: guardianPhone.trim(),
          },
        ],
        lastVerifiedAt: new Date().toISOString().slice(0, 10),
      },
    };

    setIsSaving(true);
    try {
      await onSaveStudent(updatedStudent, !studentToEdit);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-[#1E293B] shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#312E81] text-cyan-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {studentToEdit ? "Editar matrícula de estudiante" : "Matricular estudiante"}
              </h2>
              <p className="text-xs text-slate-500">
                Datos del alumno, acudiente, emergencia médica y huella obligatoria.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos del estudiante */}
          <div className="space-y-3">
            <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#312E81]">
              1. Datos del estudiante
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 font-semibold">
                <span>Nombre *</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Valentina"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Apellido *</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Morales Pérez"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-1 space-y-1 font-semibold">
                  <span>Tipo *</span>
                  <select
                    value={documentType}
                    onChange={(e) =>
                      setDocumentType(e.target.value === "CC" ? "CC" : "TI")
                    }
                    className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-2.5 py-2 font-bold text-[#1E293B]"
                  >
                    <option value="TI">TI</option>
                    <option value="CC">CC</option>
                  </select>
                </label>

                <label className="col-span-2 space-y-1 font-semibold">
                  <span>Número de documento *</span>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ej. 1098765432"
                    className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                  />
                </label>
              </div>

              <label className="space-y-1 font-semibold">
                <span>Grupo / Clase *</span>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-bold text-[#1E293B]"
                >
                  {CLASS_GROUPS.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name} • {grp.subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Acudiente y dirección */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#312E81]">
              2. Acudiente y dirección
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 font-semibold">
                <span>Nombre del acudiente *</span>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Ej. Sandra Pérez"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Celular del acudiente *</span>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Dirección de residencia *</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Calle 45 # 52-18, Bello"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Correo del acudiente</span>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="Ej. acudiente@correo.com"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>
            </div>
          </div>

          {/* Emergencia médica */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[11px] text-[#F97316]">
              <HeartPulse className="h-3.5 w-3.5" />
              <span>3. Datos de emergencia médica</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 font-semibold">
                <span>Tipo de sangre (RH)</span>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-bold text-[#1E293B]"
                >
                  {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((rh) => (
                    <option key={rh} value={rh}>
                      {rh}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 font-semibold">
                <span>EPS</span>
                <input
                  type="text"
                  value={epsName}
                  onChange={(e) => setEpsName(e.target.value)}
                  placeholder="Ej. Sura EPS"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Alergias (separadas por coma)</span>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="Ej. Penicilina, Maní"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>

              <label className="space-y-1 font-semibold">
                <span>Condiciones médicas / Medicamentos</span>
                <input
                  type="text"
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="Ej. Asma leve"
                  className="w-full rounded-xl border border-slate-300 bg-[#F4F7FA] px-3 py-2 font-medium text-[#1E293B]"
                />
              </label>
            </div>
          </div>

          {/* Huella obligatoria */}
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#312E81] text-cyan-300">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-[#312E81]">
                  4. Huella biométrica en el sensor del PC (Obligatoria) *
                </p>
                <p className="text-[11px] text-slate-600">
                  {fingerprintLinked
                    ? "Huella capturada y vinculada a este estudiante para el kiosco."
                    : "El alumno debe registrar su huella en la matrícula para poder marcar asistencia en el kiosco."}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isEnrolling}
              onClick={() => void handleCaptureRequiredFingerprint()}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                fingerprintLinked
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-[#F97316] text-white hover:bg-orange-600"
              }`}
            >
              {fingerprintLinked ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Huella registrada (Repetir)
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  {isEnrolling ? "Leyendo sensor..." : "Registrar huella ahora"}
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#312E81] px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-900 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar matrícula"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}