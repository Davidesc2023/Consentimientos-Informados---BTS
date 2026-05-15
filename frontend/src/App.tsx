import { useRef, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { supabase } from './lib/supabase'
import {
  consentimientoSchema,
  type ConsentimientoFormData,
} from './schemas/consentimiento'

import Header from './components/Header'
import ConsentText from './components/ConsentText'
import PatientForm from './components/PatientForm'
import SignatureCanvasWrapper, { type SignatureRef } from './components/SignatureCanvasWrapper'
import ConfirmationPage from './components/ConfirmationPage'

type AppState = 'form' | 'loading' | 'success' | 'error'

export default function App() {
  const [appState, setAppState] = useState<AppState>('form')
  const [radicado, setRadicado] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [sigError, setSigError] = useState('')
  const sigRef = useRef<SignatureRef>(null)

  const methods = useForm<ConsentimientoFormData>({
    resolver: zodResolver(consentimientoSchema),
    defaultValues: { menor_de_edad: false },
  })

  const onSubmit = async (data: ConsentimientoFormData) => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setSigError('La firma es obligatoria para continuar')
      return
    }
    setSigError('')

    const firmaBase64 = sigRef.current.getDataURL()

    setAppState('loading')
    setErrorMsg('')

    try {
      const { data: result, error } = await supabase.functions.invoke('generar-pdf', {
        body: {
          datosFormulario: {
            nombre_paciente: data.nombre_paciente,
            tipo_documento: data.tipo_documento,
            numero_documento: data.numero_documento,
            fecha_nacimiento: data.fecha_nacimiento,
            telefono: data.telefono,
            correo: data.correo ?? '',
            ciudad: data.ciudad ?? '',
            direccion: data.direccion ?? '',
            menor_de_edad: data.menor_de_edad,
            nombre_acudiente: data.nombre_acudiente ?? '',
            tipo_doc_acudiente: data.tipo_doc_acudiente ?? '',
            documento_acudiente: data.documento_acudiente ?? '',
            acepto_terminos: true,
          },
          firmaBase64,
        },
      })

      if (error) throw error

      setRadicado((result as { radicado: string }).radicado)
      setAppState('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al procesar el formulario'
      setErrorMsg(message)
      setAppState('error')
    }
  }

  if (appState === 'success') {
    return (
      <>
        <Header />
        <ConfirmationPage radicado={radicado} correo={methods.getValues('correo')} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <ConsentText />

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            noValidate
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
          >
            <PatientForm />

            <div>
              <h3 className="text-[#0A6B6B] font-bold text-base border-b border-[#0A6B6B]/20 pb-2 mb-4">
                Firma del Paciente o Representante Legal
              </h3>
              <SignatureCanvasWrapper ref={sigRef} error={sigError} />
            </div>

            <div className="flex items-start gap-3 bg-[#0A6B6B]/5 border border-[#0A6B6B]/20 rounded-lg px-4 py-4">
              <input
                id="acepto_terminos"
                type="checkbox"
                {...methods.register('acepto_terminos')}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0A6B6B] focus:ring-[#0A6B6B]"
              />
              <label htmlFor="acepto_terminos" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                He leído y entendido el documento de autorización para el tratamiento de datos
                personales. Autorizo expresamente a Valentech y/o BTS Integral para tratar mis
                datos conforme a lo señalado, según la Ley 1581 de 2012 y el Decreto 1377 de 2013.
              </label>
            </div>
            {methods.formState.errors.acepto_terminos && (
              <p className="text-red-600 text-xs -mt-4">
                {methods.formState.errors.acepto_terminos.message}
              </p>
            )}

            {appState === 'error' && errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-sm font-medium">Error al enviar el formulario</p>
                <p className="text-red-600 text-xs mt-1">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setAppState('form')}
                  className="text-xs text-red-700 underline mt-2"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={appState === 'loading'}
              className="w-full bg-[#0A6B6B] hover:bg-[#085252] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-sm uppercase tracking-wide"
            >
              {appState === 'loading' ? 'Procesando…' : 'Enviar Consentimiento'}
            </button>
          </form>
        </FormProvider>

        <footer className="text-center text-xs text-gray-400 pb-8">
          BTS Integral · Clínicas Botospa S.A.S. · Bogotá, Colombia
          <br />
          Programa de Soporte a Pacientes Valentech Pharma Colombia S.A.S.
        </footer>
      </main>
    </div>
  )
}

