export default function Header() {
  return (
    <header className="w-full bg-[#0A6B6B] shadow-md">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
        <img
          src="/logo.png"
          alt="BTS Integral"
          className="h-14 w-auto object-contain"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div>
          <p className="text-white text-xs font-medium tracking-wide uppercase opacity-80">
            Programa de Soporte a Pacientes
          </p>
          <h1 className="text-white text-lg font-bold leading-tight">
            Valentech Pharma Colombia
          </h1>
          <p className="text-yellow-300 text-xs mt-0.5">Operado por BTS Integral · Clínicas Botospa S.A.S.</p>
        </div>
      </div>
    </header>
  )
}
