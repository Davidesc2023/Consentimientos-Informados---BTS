import { z } from 'zod'

export const TipoDocumento = ['CC', 'TI', 'CE', 'Pasaporte'] as const
export type TipoDocumentoType = (typeof TipoDocumento)[number]

// Documentos válidos solo para adultos (≥18 años)
const DOCS_ADULTO = ['CC', 'CE'] as const
// Documentos válidos solo para menores (< 18 años)
const DOCS_MENOR = ['TI'] as const

function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mes = hoy.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--
  }
  return edad
}

export const consentimientoSchema = z
  .object({
    // Datos del paciente
    nombre_paciente: z.string().min(3, 'Ingrese el nombre completo del paciente'),
    tipo_documento: z.enum(TipoDocumento, { error: 'Seleccione el tipo de documento' }),
    numero_documento: z
      .string()
      .min(4, 'El número de documento es requerido')
      .regex(/^[A-Za-z0-9-]+$/, 'Solo letras, números y guiones'),
    fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
    telefono: z
      .string()
      .min(7, 'Ingrese un teléfono válido')
      .regex(/^[0-9+\s()-]+$/, 'Teléfono inválido'),
    correo: z
      .string()
      .email('Correo electrónico inválido')
      .optional()
      .or(z.literal('')),
    ciudad: z
      .string()
      .min(2, 'Ingrese la ciudad'),
    direccion: z
      .string()
      .min(5, 'Ingrese la dirección de residencia'),

    // Paciente menor de edad
    menor_de_edad: z.boolean(),
    nombre_acudiente: z.string().optional().or(z.literal('')),
    tipo_doc_acudiente: z
      .enum(TipoDocumento)
      .optional()
      .or(z.literal('')),
    documento_acudiente: z.string().optional().or(z.literal('')),

    // Aceptación
    acepto_terminos: z.literal(true, {
      error: 'Debe aceptar los términos para continuar',
    }),
  })
  .superRefine((data, ctx) => {
    // ── Validación documento vs edad ──────────────────────────────────────
    if (data.fecha_nacimiento && data.tipo_documento) {
      const edad = calcularEdad(data.fecha_nacimiento)
      const esMenor = edad < 18

      if (esMenor && (DOCS_ADULTO as readonly string[]).includes(data.tipo_documento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tipo_documento'],
          message: `El documento ${data.tipo_documento} es válido solo para mayores de 18 años. El paciente tiene ${edad} años.`,
        })
      }

      if (!esMenor && (DOCS_MENOR as readonly string[]).includes(data.tipo_documento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tipo_documento'],
          message: `La Tarjeta de Identidad (TI) es válida solo para menores de 18 años. El paciente tiene ${edad} años.`,
        })
      }

      // Auto-consistencia: menor_de_edad vs edad real
      if (esMenor && !data.menor_de_edad) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['menor_de_edad'],
          message: `El paciente tiene ${edad} años. Debe marcar que es menor de edad.`,
        })
      }
      if (!esMenor && data.menor_de_edad) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['menor_de_edad'],
          message: `El paciente tiene ${edad} años y es mayor de edad. No debe marcar este campo.`,
        })
      }
    }

    // ── Representante legal requerido si menor_de_edad ────────────────────
    if (data.menor_de_edad) {
      if (!data.nombre_acudiente || data.nombre_acudiente.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nombre_acudiente'],
          message: 'Nombre del acudiente es requerido para menores de edad',
        })
      }
      if (!data.tipo_doc_acudiente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tipo_doc_acudiente'],
          message: 'Tipo de documento del acudiente es requerido para menores de edad',
        })
      }
      if (!data.documento_acudiente || data.documento_acudiente.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['documento_acudiente'],
          message: 'Documento del acudiente es requerido para menores de edad',
        })
      }
    }
  })

export type ConsentimientoFormData = z.infer<typeof consentimientoSchema>
