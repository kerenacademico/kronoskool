# KronosKool

Plataforma web (MVP) para colegios enfocada en agilizar el registro de asistencia biométrica, prevenir el ausentismo mediante un **Semáforo de Bienestar** y ofrecer acceso rápido y auditado a la **Ficha Médica de Emergencia** de los estudiantes.

## Problema que resuelve
* **Pérdida de minutos de clase:** el llamado a lista manual consume tiempo valioso en cada sesión y facilita errores u omisiones.
* **Alertas tardías:** cuando un estudiante acumula llegadas tarde o faltas, la información a veces no llega a tiempo al docente, al acudiente o a orientación.
* **Emergencias de salud sin información inmediata:** ante un desmayo, crisis asmática, convulsión o reacción alérgica, contar con alergias, medicamentos, RH, protocolo y contactos de emergencia accesibles por documento —con trazabilidad— ayuda a responder con mayor rapidez.

## Funcionalidades del MVP
* **Control de asistencia en aula:** simulación de entrada con evaluación automática de puntualidad (`PRESENTE`, `TARDE`, `INASISTENCIA`, `EXCUSADA`) y contador de *"Tiempo de clase salvado"*.
* **Alertas automáticas escalonadas:** notificaciones y avisos según umbrales de retardos e inasistencias.
* **Justificación en 2 clics:** modal rápido para registrar motivos de inasistencia o retardo.
* **Semáforo de Bienestar Estudiantil:** clasificación preventiva (`Estable`, `Preventivo`, `Alerta Alta`) para detectar patrones de ausentismo o retardos.
* **Ficha Médica y Modo Emergencia:** edición de datos críticos de salud y consulta rápida por número de documento con registro de auditoría (motivo, usuario y hora).

## Privacidad y enfoque en Colombia (Ley 1581 de 2012)
* Los datos de menores, biometría y salud se consideran sensibles. El diseño contempla **no almacenar imágenes de rostros ni huellas crudas**, trabajar con plantillas/tokens encriptados y mantener un **registro de auditoría** cada vez que se consulta una ficha médica.

## Stack tecnológico
* **Next.js (App Router)** + **React** + **TypeScript**
* **Tailwind CSS**
* **Lucide React**

## Cómo ejecutarlo en local
1. Instala las dependencias:
   ```bash
   npm install