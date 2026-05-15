import { useRef, forwardRef, useImperativeHandle } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export interface SignatureRef {
  getDataURL: () => string | null
  isEmpty: () => boolean
  clear: () => void
}

interface Props {
  error?: string
}

const SignatureCanvasWrapper = forwardRef<SignatureRef, Props>(({ error }, ref) => {
  const sigRef = useRef<SignatureCanvas>(null)

  useImperativeHandle(ref, () => ({
    getDataURL: () => {
      if (!sigRef.current || sigRef.current.isEmpty()) return null
      return sigRef.current.toDataURL('image/png')
    },
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
    clear: () => sigRef.current?.clear(),
  }))

  return (
    <div className="space-y-2">
      <div
        className={`border-2 rounded-lg overflow-hidden bg-white ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        style={{ touchAction: 'none' }}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="#0A6B6B"
          canvasProps={{
            className: 'w-full',
            style: { width: '100%', height: '180px', display: 'block' },
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-red-600 text-xs">{error}</p>
        ) : (
          <p className="text-gray-500 text-xs">Firme dentro del recuadro con el dedo o el cursor</p>
        )}
        <button
          type="button"
          onClick={() => sigRef.current?.clear()}
          className="text-xs text-[#0A6B6B] underline hover:text-[#085252] transition-colors"
        >
          Borrar firma
        </button>
      </div>
    </div>
  )
})

SignatureCanvasWrapper.displayName = 'SignatureCanvasWrapper'

export default SignatureCanvasWrapper
