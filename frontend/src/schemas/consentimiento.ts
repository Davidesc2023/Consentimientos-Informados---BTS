import { z } from 'zod'

export const TipoDocumento = ['CC', 'TI', 'CE', 'Pasaporte'] as const
export type TipoDocumentoType = (typeof TipoDocumento)[number]

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
    ciudad: z.string().min(2, 'Ingrese la ciudad').optional().or(z.literal('')),
    direccion: z.string().min(5, 'Ingrese la dirección de residencia').optional().or(z.literal('')),

    // Paciente menor de edad
    menor_de_edad: z.boolean(),
    nombre_acudiente: z.string().optional().or(z.literal('')),
    tipo_doc_acudiente: z
      .enum(TipoDocumento)
      .optional()
      .or(z.literal('' as never)),
    documento_acudiente: z.string().optional().or(z.literal('')),

    // Aceptación
    acepto_terminos: z.literal(true, {
      error: 'Debe aceptar los términos para continuar',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.menor_de_edad) {
      if (!data.nombre_acudiente || data.nombre_acudiente.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nombre_acudiente'],
          message: 'Nombre del acudiente es requerido para menores de edad',
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
