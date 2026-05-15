const CLAUSULAS = [
  {
    num: 1,
    titulo: 'Suministro de mis datos personales',
    texto:
      'Declaro que suministro mis datos personales, incluyendo información de contacto, edad y demás datos necesarios, con la finalidad de que BTS Integral pueda solicitar a mi médico tratante —o recibir directamente de él— mi historia clínica, reportes de diagnóstico, conceptos médicos y/o cualquier información requerida para evaluar y comprender mi situación clínica.',
  },
  {
    num: 2,
    titulo: 'Autorización para el tratamiento y obtención de información clínica',
    texto:
      'Autorizo a BTS Integral para tratar mis Datos Personales y, cuando sea necesario, solicitar y recibir información relevante sobre mi estado de salud proveniente de: mis médicos tratantes, otros prestadores de servicios de salud, de entidades que generan la dispensación y/o infusión de mi terapia, y/o aseguradores involucrados en mi atención. Lo anterior exclusivamente con el propósito de realizar el seguimiento clínico y operativo, así como las actividades de apoyo que presta el Programa, siempre con respeto pleno por las decisiones del profesional tratante.',
  },
  {
    num: 3,
    titulo: 'Información suministrada por BTS Integral',
    texto:
      'BTS Integral me ha informado de manera clara que: (i) Dentro de los datos que podrá recolectar el Programa se encuentran datos sensibles, tales como información contenida en mi historia clínica, fórmulas médicas, autorizaciones de servicios de salud y comunicaciones emitidas por mi EPS. (ii) Las finalidades del tratamiento son: contactarme para brindarme información sobre los beneficios del Programa; gestionar trámites ante EPS e IPS; incluir mis datos en solicitudes ante INVIMA/VUCE cuando aplique; y transmitir mis datos a aliados de salud para la adecuada prestación del servicio.',
  },
  {
    num: 4,
    titulo: 'Responsables y encargados del tratamiento',
    texto:
      'Autorizo que el tratamiento de mis datos personales sea realizado directamente por Valentech y/o por BTS Integral, en calidad de responsables del tratamiento, o por los encargados que estas designen. En todo caso, quienes intervengan en el tratamiento deberán cumplir la normatividad vigente en materia de protección de datos personales y las políticas internas de protección de datos aplicables.',
  },
  {
    num: 5,
    titulo: 'Destinatarios y circulación de los datos personales',
    texto:
      'Autorizo que mis datos puedan ser compartidos, transmitidos, entregados, transferidos o divulgados para el cumplimiento de las finalidades descritas en este documento o para garantizar la continuidad del Programa en caso de que sea transferido a otra institución. Entre los posibles destinatarios se encuentran: autoridades de salud (INVIMA u otras entidades regulatorias); personas naturales o jurídicas que participen en la operación del Programa; cualquier tercero que Valentech o BTS Integral consideren necesario.',
  },
  {
    num: 6,
    titulo: 'Transferencia internacional de datos personales',
    texto:
      'Autorizo que, cuando sea necesario para la prestación adecuada de los servicios del Programa o para el almacenamiento seguro de la información en plataformas digitales cuyos servidores se ubiquen fuera de Colombia, se realicen transferencias internacionales de mis Datos Personales, de conformidad con la normatividad vigente.',
  },
  {
    num: 7,
    titulo: 'Datos sensibles',
    texto:
      'Reconozco que la entrega de datos sensibles —incluidos aquellos relacionados con mi estado de salud, patologías, historia clínica y datos biométricos— es facultativa. Declaro que he proporcionado dichos datos de manera libre y voluntaria, y autorizo expresamente su tratamiento para las finalidades descritas.',
  },
  {
    num: 8,
    titulo: 'Datos personales de niñas, niños y adolescentes',
    texto:
      'Declaro que la entrega de datos de niñas, niños o adolescentes, cuando aplique, es igualmente facultativa, y autorizo su tratamiento únicamente para las finalidades aquí establecidas.',
  },
  {
    num: 9,
    titulo: 'Derechos del titular de la información',
    texto:
      'Como titular de los datos personales, reconozco los derechos que me asisten conforme a las Leyes 1266 de 2008 y 1581 de 2012, entre ellos: a) Conocer, actualizar y rectificar mis datos; b) Solicitar prueba de esta autorización; c) Recibir información sobre el uso que se ha dado a mis datos; d) Presentar quejas ante la Superintendencia de Industria y Comercio (SIC); e) Revocar esta autorización y/o solicitar la supresión de mis datos. Podré ejercer estos derechos conforme a lo previsto en las Políticas de Protección de Datos de Valentech y BTS Integral.',
  },
  {
    num: 10,
    titulo: 'Inclusión en estudios de vida real',
    texto:
      'Autorizo el uso de mis datos personales y clínicos para su inclusión en estudios de vida real encaminados a evaluar la efectividad, seguridad y valor de los tratamientos y servicios en condiciones reales de práctica clínica. Declaro que he sido informado que estos estudios no implican cambios en mi tratamiento ni la participación en investigaciones experimentales, y que la información será utilizada únicamente con fines científicos, con estrictas medidas de seguridad, confidencialidad y anonimización.',
  },
  {
    num: 11,
    titulo: 'Políticas de protección de datos',
    texto:
      'Declaro que conozco y acepto las Políticas de Protección de Datos Personales de Valentech (http://valentechforlife.com/) y BTS Integral (http://bts-integral.com). Para ejercer mis derechos o presentar consultas, peticiones o reclamos: Dirección: Calle 90 # 18-59 Bogotá, Colombia. Celular: (57) 3209188394. Correo: programaapoyandovidas@bts-integral.com. Para asuntos legales: legal@bts-corporate.com.',
  },
]

export default function ConsentText() {
  return (
    <section className="bg-white border border-gray-200 rounded-lg">
      <div className="bg-[#0A6B6B] text-white text-center py-3 px-4 rounded-t-lg">
        <h2 className="text-base font-bold uppercase tracking-wide">
          Autorización para el Tratamiento de Datos Personales
        </h2>
        <p className="text-xs mt-1 opacity-80">
          Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S. · Operado por BTS Integral
        </p>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto space-y-4 text-sm text-gray-700 leading-relaxed">
        <p className="text-gray-600 italic text-xs">
          Ley 1581 de 2012 · Decreto 1377 de 2013 · Normatividad colombiana de protección de datos personales
        </p>

        {CLAUSULAS.map((c) => (
          <div key={c.num}>
            <p className="font-semibold text-[#0A6B6B]">
              {c.num}. {c.titulo}
            </p>
            <p className="mt-1">{c.texto}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          ↑ Desplace para leer el documento completo antes de firmar
        </p>
      </div>
    </section>
  )
}
