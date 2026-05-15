# PR-CI — Plan de Desarrollo: Sistema de Consentimientos Informados

> **Proyecto:** Plataforma web de consentimientos informados para ingreso a programa de pacientes  
> **Referencia de UX:** [prematricula.icbf.gov.co](https://prematricula.icbf.gov.co/) + MoreApp (formulario actual)  
> **Fecha de inicio estimada:** Mayo 2026  
> **Estado:** Planificación

---

## 1. Objetivo del Proyecto

Reemplazar el formulario externo de MoreApp con una plataforma propia, institucional y autónoma que permita:

- Presentar el consentimiento informado con branding de la empresa.
- Capturar datos del paciente y acudiente.
- Obtener firma digital o aceptación explícita.
- Generar y almacenar el documento firmado en PDF.
- Consultar y auditar consentimientos históricos.

---

## 2. Análisis de Referentes

### 2.1 ICBF – prematricula.icbf.gov.co

| Elemento | Descripción |
|---|---|
| Logo institucional en cabecera | Sí — prominente, centrado |
| Formulario por secciones | Sí — usuario, dirección, acudiente |
| Validación de campos requeridos | Sí |
| Enlace a política de datos | Sí (pie de página) |
| Botón de envío único | Sí — "Guardar registro" |
| Diseño responsive | Sí |
| Autenticación | No (formulario público) |

### 2.2 MoreApp (formulario actual)

| Elemento | Descripción |
|---|---|
| Formulario digital estructurado | Sí |
| Firma digital | Sí (canvas de firma) |
| Lógica condicional de campos | Sí |
| Generación de PDF automática | Sí |
| Envío por correo | Sí |
| Branding personalizable | Limitado (plan de pago) |
| Almacenamiento propio | No (datos en MoreApp) |
| Exportación de registros | Sí (CSV/PDF) |

### 2.3 Brechas a cubrir con la solución propia

- Control total sobre los datos del paciente (cumplimiento HABEAS DATA / Ley 1581 de 2012).
- Branding institucional sin restricciones de plan.
- Generación de PDF con firma embebida y sellado de fecha.
- Panel de administración para consultar y descargar consentimientos.
- Sin costos recurrentes por formulario o por envío.

---

## 3. Stack Técnico

### 3.1 Frontend

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | **React 18** (Vite) | Componentes reutilizables, ecosistema maduro |
| Estilos | **Tailwind CSS** | Diseño institucional rápido y consistente |
| Firma digital | **react-signature-canvas** | Canvas HTML5 para firma del paciente |
| Formularios | **React Hook Form + Zod** | Validación robusta y tipada |
| PDF del lado cliente | **@react-pdf/renderer** | Generación de PDF con logo y firma embebida |
| Routing | **React Router v6** | Navegación entre vistas |
| Estado global | **Zustand** | Estado ligero para sesión de formulario |

### 3.2 Backend

| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Consistencia con frontend JS |
| Framework | **Express.js** | Ligero, flexible, amplia documentación |
| Base de datos | **PostgreSQL** | Relacional, auditable, robusto para registros clínicos |
| ORM | **Prisma** | Migraciones automáticas, tipado fuerte |
| Generación PDF servidor | **puppeteer** o **pdfkit** | PDF definitivo firmado con timestamp |
| Almacenamiento archivos | **Supabase Storage** o **S3-compatible** | PDFs firmados con URL segura |
| Envío de correo | **Nodemailer + SMTP** | Copia del consentimiento al paciente/empresa |
| Autenticación admin | **JWT + bcrypt** | Panel de administración protegido |

### 3.3 Infraestructura

| Componente | Opción recomendada | Alternativa |
|---|---|---|
| Hosting frontend | **Vercel** | Netlify |
| Hosting backend/API | **Railway** | Render.com |
| Base de datos | **Supabase (PostgreSQL)** | Neon.tech |
| Almacenamiento PDF | **Supabase Storage** | Cloudflare R2 |
| Dominio | Dominio propio de la empresa | — |
| SSL | Automático (Let's Encrypt vía Vercel/Railway) | — |

---

## 4. Arquitectura General

```
┌─────────────────────────────────────────────┐
│              PACIENTE / DISPOSITIVO          │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │        React SPA (Vite)             │   │
│   │  - Logo empresa                     │   │
│   │  - Texto consentimiento informado   │   │
│   │  - Formulario datos paciente        │   │
│   │  - Canvas firma digital             │   │
│   │  - Botón "Acepto y firmo"           │   │
│   └──────────────┬──────────────────────┘   │
└──────────────────│──────────────────────────┘
                   │ POST /api/consentimientos
                   ▼
┌─────────────────────────────────────────────┐
│         Express API (Node.js)               │
│  - Validación de datos                      │
│  - Generación PDF con firma + timestamp     │
│  - Guardado en PostgreSQL                   │
│  - Upload PDF a Storage                     │
│  - Envío de correo con PDF adjunto          │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  PostgreSQL  │    │  Supabase        │
│  Registros   │    │  Storage (PDFs)  │
│  auditables  │    │                  │
└──────────────┘    └──────────────────┘

                   ┌──────────────────────────┐
                   │   Panel Admin (React)    │
                   │  - Login JWT             │
                   │  - Listado consentimientos│
                   │  - Descarga PDF          │
                   │  - Filtros por fecha     │
                   └──────────────────────────┘
```

---

## 5. Modelo de Datos

### Tabla: `consentimientos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `fecha_creacion` | TIMESTAMP | Momento exacto del registro |
| `nombre_paciente` | VARCHAR | Nombre completo |
| `tipo_documento` | VARCHAR | CC, TI, CE, Pasaporte |
| `numero_documento` | VARCHAR | Número de identificación |
| `fecha_nacimiento` | DATE | Fecha de nacimiento |
| `telefono` | VARCHAR | Contacto del paciente |
| `correo` | VARCHAR | Email para envío de copia |
| `nombre_acudiente` | VARCHAR | Aplica si es menor de edad |
| `documento_acudiente` | VARCHAR | ID del acudiente |
| `programa` | VARCHAR | Nombre del programa al que ingresa |
| `firma_base64` | TEXT | Imagen de firma en Base64 |
| `pdf_url` | VARCHAR | URL del PDF generado y almacenado |
| `ip_origen` | VARCHAR | IP de donde se firmó (auditoría) |
| `acepto_terminos` | BOOLEAN | Confirmación explícita |
| `version_consentimiento` | VARCHAR | Versión del texto del CI vigente |

---

## 6. Flujo de Usuario

```
1. Paciente accede a la URL del consentimiento
        ↓
2. Ve el logo de la empresa + encabezado institucional
        ↓
3. Lee el texto del consentimiento informado (scrollable)
        ↓
4. Completa el formulario:
   - Datos personales (nombre, documento, fecha nacimiento)
   - Teléfono y correo
   - Si es menor: datos del acudiente
        ↓
5. Firma en el canvas digital con dedo o mouse
        ↓
6. Marca checkbox: "He leído y acepto el consentimiento informado"
        ↓
7. Clic en "Firmar y enviar"
        ↓
8. Sistema genera PDF con todos los datos + firma embebida
        ↓
9. PDF se almacena y se envía al correo del paciente
        ↓
10. Pantalla de confirmación: "Su consentimiento fue registrado exitosamente"
        ↓
11. Admin puede consultar y descargar en el panel
```

---

## 7. Plan de Desarrollo por Fases

### Fase 1 — MVP Formulario + Firma (2 semanas)

| # | Tarea | Responsable | Días |
|---|---|---|---|
| 1.1 | Setup proyecto React + Vite + Tailwind | Dev | 1 |
| 1.2 | Componente de logo e header institucional | Dev | 0.5 |
| 1.3 | Formulario de datos del paciente con validación | Dev | 2 |
| 1.4 | Canvas de firma digital (react-signature-canvas) | Dev | 1 |
| 1.5 | Checkbox de aceptación + lógica de envío | Dev | 0.5 |
| 1.6 | Setup backend Express + PostgreSQL + Prisma | Dev | 2 |
| 1.7 | Endpoint POST `/api/consentimientos` | Dev | 1 |
| 1.8 | Generación de PDF con firma embebida | Dev | 2 |
| 1.9 | Deploy frontend (Vercel) + backend (Railway) | Dev | 1 |

**Entregable Fase 1:** Formulario funcional que registra y genera PDF.

---

### Fase 2 — Correo + Almacenamiento (1 semana)

| # | Tarea | Responsable | Días |
|---|---|---|---|
| 2.1 | Integración Supabase Storage para PDFs | Dev | 1 |
| 2.2 | Envío de correo con PDF adjunto (Nodemailer) | Dev | 1.5 |
| 2.3 | Página de confirmación con número de radicado | Dev | 1 |
| 2.4 | Validación de correo duplicado / documento | Dev | 0.5 |

**Entregable Fase 2:** Paciente recibe copia de su consentimiento por correo.

---

### Fase 3 — Panel de Administración (1.5 semanas)

| # | Tarea | Responsable | Días |
|---|---|---|---|
| 3.1 | Login con JWT para admin | Dev | 1 |
| 3.2 | Listado de consentimientos con filtros | Dev | 2 |
| 3.3 | Vista detalle del consentimiento | Dev | 1 |
| 3.4 | Descarga de PDF individual | Dev | 0.5 |
| 3.5 | Exportación a Excel (listado) | Dev | 1 |
| 3.6 | Indicadores básicos (total, por programa, por fecha) | Dev | 1 |

**Entregable Fase 3:** Panel admin operativo para el equipo clínico.

---

### Fase 4 — Mejoras y cumplimiento legal (1 semana)

| # | Tarea | Responsable | Días |
|---|---|---|---|
| 4.1 | Versioning del texto del consentimiento | Dev | 1 |
| 4.2 | Timestamp + IP en cada registro (auditoría) | Dev | 0.5 |
| 4.3 | Política de tratamiento de datos (modal/página) | Dev | 0.5 |
| 4.4 | Soporte para múltiples programas | Dev | 1 |
| 4.5 | QR de verificación en el PDF generado | Dev | 1 |
| 4.6 | Pruebas de carga y seguridad básica | Dev | 1 |

**Entregable Fase 4:** Sistema listo para producción con cumplimiento Ley 1581.

---

## 8. Estimado de Tiempo Total

| Fase | Duración |
|---|---|
| Fase 1 — MVP | 2 semanas |
| Fase 2 — Correo + Storage | 1 semana |
| Fase 3 — Panel Admin | 1.5 semanas |
| Fase 4 — Mejoras y legal | 1 semana |
| **Total** | **~5.5 semanas** |

---

## 9. Dependencias y Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cambios en el texto legal del consentimiento | Alta | Sistema de versioning (Fase 4) |
| Dispositivos de pacientes sin internet estable | Media | Guardado local temporal (localStorage) antes de enviar |
| Firma ilegible en pantallas pequeñas | Media | Canvas adaptable + opción de tipear nombre como firma alternativa |
| Pérdida de PDFs | Baja | Backup automático en Storage + copias en correo |
| Incumplimiento Ley 1581 | Baja | Registro de IP, timestamp, versión del consentimiento + política visible |

---

## 10. Requisitos No Funcionales

- **Disponibilidad:** 99.5% uptime (Vercel + Railway garantizan SLA)
- **Rendimiento:** Tiempo de carga < 3 segundos en 3G
- **Seguridad:** HTTPS obligatorio, sin almacenamiento de firmas en localStorage
- **Accesibilidad:** Formulario legible en móvil (touch-friendly), fuentes mínimo 16px
- **Legal Colombia:** Cumplimiento Ley 1581/2012 (HABEAS DATA), registro de consentimiento explícito

---

## 11. Próximos Pasos Inmediatos

1. **Confirmar nombre de la empresa y logo** para el header institucional.
2. **Definir texto oficial del consentimiento informado** (versión 1.0).
3. **Listar programas** a los que aplica (¿uno o varios?).
4. **Definir campos requeridos** adicionales (¿EPS, dirección, médico tratante?).
5. **Aprobar stack técnico** y dar inicio a Fase 1.

---

*Documento generado: Mayo 2026 — PR-CI v1.0*
