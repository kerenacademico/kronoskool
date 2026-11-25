// src/components/KronosLogo.tsx
"use client";

import React from "react";

interface KronosLogoProps {
  showSubtitle?: boolean;
}

export default function KronosLogo({ showSubtitle = false }: KronosLogoProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F7FA] ring-1 ring-slate-200/80 shadow-2xs">
        <svg
          viewBox="0 0 64 64"
          className="h-7 w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Logo KronosKool KK"
        >
          {/* Barra vertical y diagonal inferior izquierda en Índigo tech (#312E81) */}
          <path d="M12 10H20V34L12 41V10Z" fill="#312E81" />
          <path d="M20 34L36 54H25L15 41L20 34Z" fill="#312E81" />

          {/* Primera K diagonal cruzada en Cian vibrante (#06B6D4) */}
          <path d="M35 10H45L12 46V35L35 10Z" fill="#06B6D4" />

          {/* Segunda K vertical/diagonal en Índigo tech (#312E81) */}
          <path d="M32 10H40V27L32 35V10Z" fill="#312E81" />
          <path d="M36 31L54 54H43L30 37L36 31Z" fill="#312E81" />

          {/* Segunda diagonal cruzada en Cian vibrante (#06B6D4) */}
          <path d="M47 10H57L25 45L19 38L47 10Z" fill="#06B6D4" />

          {/* Acento central en Coral energético (#F97316) */}
          <polygon points="31,26 37,32 31,38 25,32" fill="#F97316" />
        </svg>
      </div>

      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight text-[#312E81]">
          <span>Kronos</span>
          <span className="text-[#06B6D4]">Kool</span>
        </div>

        {showSubtitle && (
          <p className="text-[11px] font-medium text-slate-500">
            Asistencia y Bienestar Escolar
          </p>
        )}
      </div>
    </div>
  );
}