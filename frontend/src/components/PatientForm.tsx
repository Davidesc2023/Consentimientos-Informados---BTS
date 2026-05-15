import { useFormContext } from 'react-hook-form'
import { TipoDocumento, type ConsentimientoFormData } from '../schemas/consentimiento'

function FieldError({ name }: { name: keyof ConsentimientoFormData }) {
  const {
    formState: { errors },
  } = useFormContext<ConsentimientoFormData>()
  const error = errors[name]
  if (!error) return null
  return <p className="text-red-600 text-xs mt-1">{error.message as string}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

const inputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A6B6B] focus:border-transparent'

export default function PatientForm() {
  const { register, watch } = useFormContext<ConsentimientoFormData>()
  const menorDeEdad = watch('menor_de_edad')

  return (
    <div className="space-y-5">
      <h3 className="text-[#0A6B6B] font-bold text-base border-b border-[#0A6B6B]/20 pb-2">
        Datos del Paciente
      </h3>

      {/* Nombre paciente */}
      <div>
        <Label required>Nombre y Apellidos Completos</Label>
        <input
          {...register('nombre_paciente')}
          className={inputClass}
          placeholder="Nombre completo del paciente"
        />
        <FieldError name="nombre_paciente" />
      </div>

      {/* Tipo y número de documento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Tipo de Documento</Label>
          <select {...register('tipo_documento')} className={inputClass}>
            <option value="">Seleccione…</option>
            {TipoDocumento.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <FieldError name="tipo_documento" />
        </div>
        <div>
          <Label required>Número de Documento</Label>
          <input
            {...register('numero_documento')}
            className={inputClass}
            placeholder="Número"
          />
          <FieldError name="numero_documento" />
        </div>
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <Label required>Fecha de Nacimiento</Label>
        <input type="date" {...register('fecha_nacimiento')} className={inputClass} />
        <FieldError name="fecha_nacimiento" />
      </div>

      {/* Teléfono y correo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label required>Teléfono / Celular</Label>
          <input
            {...register('telefono')}
            className={inputClass}
            placeholder="Ej: 3001234567"
          />
          <FieldError name="telefono" />
        </div>
        <div>
          <Label>Correo Electrónico</Label>
          <input
            {...register('correo')}
            type="email"
            className={inputClass}
            placeholder="correo@ejemplo.com"
          />
          <FieldError name="correo" />
        </div>
      </div>

      {/* Ciudad y dirección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Ciudad / Municipio</Label>
          <input {...register('ciudad')} className={inputClass} placeholder="Ciudad" />
          <FieldError name="ciudad" />
        </div>
        <div>
          <Label>Dirección de Residencia</Label>
          <input
            {...register('direccion')}
            className={inputClass}
            placeholder="Calle, Carrera, etc."
          />
          <FieldError name="direccion" />
        </div>
      </div>

      {/* Menor de edad toggle */}
      <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3">
        <input
          id="menor_de_edad"
          type="checkbox"
          {...register('menor_de_edad')}
          className="h-4 w-4 rounded border-gray-300 text-[#0A6B6B] focus:ring-[#0A6B6B]"
        />
        <label htmlFor="menor_de_edad" className="text-sm font-medium text-yellow-800 cursor-pointer">
          El paciente es menor de edad (diligencia el acudiente o representante legal)
        </label>
      </div>

      {/* Datos acudiente (condicional) */}
      {menorDeEdad && (
        <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50 space-y-4">
          <h4 className="text-sm font-bold text-yellow-800">Datos del Representante Legal / Acudiente</h4>

          <div>
            <Label required>Nombre Completo del Acudiente</Label>
            <input
              {...register('nombre_acudiente')}
              className={inputClass}
              placeholder="Nombre completo"
            />
            <FieldError name="nombre_acudiente" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Tipo de Documento</Label>
              <select {...register('tipo_doc_acudiente')} className={inputClass}>
                <option value="">Seleccione…</option>
                {TipoDocumento.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label required>Número de Documento</Label>
              <input
                {...register('documento_acudiente')}
                className={inputClass}
                placeholder="Número"
              />
              <FieldError name="documento_acudiente" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
