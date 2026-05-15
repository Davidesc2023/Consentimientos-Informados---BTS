export default function Header() {
  return (
    <header className="w-full bg-white shadow-md border-b-4 border-[#0A6B6B]">
      <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-center sm:text-left">
        <img
          src="/logo.png"
          alt="BTS Integral"
          className="h-14 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div>
          <p className="text-gray-500 text-xs font-semibold tracking-widest uppercase">
            Programa de Soporte a Pacientes
          </p>
          <h1 className="text-gray-900 text-xl font-bold leading-tight">
            Valentech Pharma Colombia
          </h1>
          <p className="text-[#B8860B] text-xs font-medium mt-0.5">Operado por BTS Integral · Clínicas Botospa S.A.S.</p>
        </div>
      </div>
    </header>
  )
}
