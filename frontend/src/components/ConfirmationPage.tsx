interface Props {
  radicado: string
  correo?: string
}

export default function ConfirmationPage({ radicado, correo }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icono check */}
        <div className="mx-auto w-16 h-16 bg-[#0A6B6B] rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[#0A6B6B] mb-2">¡Consentimiento registrado!</h2>
        <p className="text-gray-600 text-sm mb-6">
          Su autorización ha sido guardada correctamente en el sistema de BTS Integral.
        </p>

        {/* Número de radicado */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Número de Radicado</p>
          <p className="text-lg font-mono font-bold text-gray-800 break-all">{radicado}</p>
        </div>

        {correo && (
          <p className="text-sm text-gray-500 mb-6">
            Se enviará una copia del PDF firmado a <strong>{correo}</strong>
          </p>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-left">
          <p className="text-xs text-yellow-800 font-medium">Contacto BTS Integral</p>
          <p className="text-xs text-yellow-700 mt-1">
            ✉ programaapoyandovidas@bts-integral.com
            <br />
            📞 (57) 3209188394
            <br />
            📍 Calle 90 # 18-59, Bogotá
          </p>
        </div>
      </div>
    </div>
  )
}
