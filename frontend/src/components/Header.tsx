export default function Header() {
  return (
    <header className="w-full bg-white shadow-md border-b-4 border-[#0A6B6B]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-row items-center gap-3">
        <img
          src="/logo.png"
          alt="BTS Integral"
          className="h-12 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="min-w-0">
          <p className="text-gray-500 text-[10px] font-semibold tracking-widest uppercase leading-tight">
            Programa de Soporte a Pacientes
          </p>
          <h1 className="text-gray-900 text-base sm:text-xl font-bold leading-tight truncate">
            Valentech Pharma Colombia
          </h1>
          <p className="text-[#B8860B] text-[10px] sm:text-xs font-medium mt-0.5 leading-tight">Operado por BTS Integral · Clínicas Botospa S.A.S.</p>
        </div>
      </div>
    </header>
  )
}
