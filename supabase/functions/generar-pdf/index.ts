// @ts-nocheck
// supabase/functions/generar-pdf/index.ts
// Edge Function (Deno) - Genera PDF del consentimiento, lo sube a Storage y guarda registro en DB
// Deploy: supabase functions deploy generar-pdf
// Env vars requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BUCKET = 'pdfs-consentimientos'
const CONTACT_EMAIL = 'programaapoyandovidas@bts-integral.com'
const PROGRAM_NAME = 'Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S.'

// Etiquetas legibles para tipos de documento
const TIPO_DOC_LABEL: Record<string, string> = {
  CC: 'Cedula de Ciudadania (CC)',
  TI: 'Tarjeta de Identidad (TI)',
  CE: 'Cedula de Extranjeria (CE)',
  RC: 'Registro Civil (RC)',
  Pasaporte: 'Pasaporte',
}

interface DatosFormulario {
  nombre_paciente: string
  tipo_documento: string
  numero_documento: string
  fecha_nacimiento: string
  telefono: string
  correo: string
  ciudad: string
  direccion: string
  menor_de_edad: boolean
  nombre_acudiente: string
  tipo_doc_acudiente: string
  documento_acudiente: string
  acepto_terminos: boolean
}

interface RequestBody {
  datosFormulario: DatosFormulario
  firmaBase64: string
  ipOrigen?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as RequestBody
    const { datosFormulario: d, firmaBase64, ipOrigen } = body

    if (!d || !firmaBase64) {
      return new Response(JSON.stringify({ error: 'Datos o firma faltantes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const radicado = crypto.randomUUID()
    const now = new Date()
    // Hora Colombia = UTC - 5
    const nowCO = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    const fechaTexto = nowCO.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    })
    const horaTexto = nowCO.toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    })

    // ── Construir PDF ────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create()
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const TEAL      = rgb(0.039, 0.42,  0.42)
    const TEAL_DARK = rgb(0.025, 0.30,  0.30)
    const TEAL_LITE = rgb(0.88,  0.95,  0.95)
    const BLACK     = rgb(0.10,  0.10,  0.10)
    const GRAY_D    = rgb(0.42,  0.42,  0.42)
    const GRAY_L    = rgb(0.80,  0.80,  0.80)
    const GOLD      = rgb(0.72,  0.525, 0.043)
    const WHITE     = rgb(1, 1, 1)
    const W = 595; const H = 842
    const ML = 38; const MR = 38
    const CW = W - ML - MR   // 519pt de ancho de contenido

    // ── Logo desde Storage publico ──────────────────────────────────────────
    let logoImage = null
    try {
      const logoUrl = `${supabaseUrl}/storage/v1/object/public/assets/logo.png`
      const logoResp = await fetch(logoUrl)
      if (logoResp.ok) {
        const logoBytes = new Uint8Array(await logoResp.arrayBuffer())
        logoImage = await pdfDoc.embedPng(logoBytes)
      }
    } catch (_) { /* fallback texto */ }

    const HEADER_H   = 62
    const FOOTER_H   = 32   // mas alto para 2 lineas de footer
    const TOTAL_PAGES = 3

    // ── Word-wrap ────────────────────────────────────────────────────────────
    const wrapText = (text, maxW, size, f) => {
      const words = text.split(' ')
      const lines = []
      let cur = ''
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w
        if (f.widthOfTextAtSize(t, size) > maxW && cur) { lines.push(cur); cur = w }
        else { cur = t }
      }
      if (cur) lines.push(cur)
      return lines
    }

    // ── Encabezado ───────────────────────────────────────────────────────────
    const drawHeader = (page, pageNum) => {
      page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: TEAL })
      page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD })
      if (logoImage) {
        const lw = 90; const lh = lw * (logoImage.height / logoImage.width)
        page.drawImage(logoImage, { x: 14, y: H - HEADER_H + (HEADER_H - lh) / 2, width: lw, height: lh })
      } else {
        page.drawRectangle({ x: 14, y: H - HEADER_H + 9, width: 44, height: 44, color: TEAL_DARK })
        page.drawText('BTS',      { x: 22, y: H - HEADER_H + 30, size: 14, font: fontBold, color: WHITE })
        page.drawText('INTEGRAL', { x: 15, y: H - HEADER_H + 16, size: 6,  font,           color: WHITE })
      }
      const tx = logoImage ? 118 : 72
      page.drawText('PROGRAMA DE SOPORTE A PACIENTES', { x: tx, y: H - HEADER_H + 42, size: 7, font, color: rgb(0.75, 0.93, 0.93) })
      page.drawText('Valentech Pharma Colombia', { x: tx, y: H - HEADER_H + 27, size: 13.5, font: fontBold, color: WHITE })
      page.drawText('Operado por BTS Integral - Clinicas Botospa S.A.S.', { x: tx, y: H - HEADER_H + 12, size: 7.5, font, color: rgb(0.95, 0.85, 0.4) })
      // Titulo centrado en la parte superior del encabezado
      const titulo = 'AUTORIZACION PARA EL TRATAMIENTO DE DATOS PERSONALES'
      const tituloW = fontBold.widthOfTextAtSize(titulo, 7)
      page.drawText(titulo, { x: (W - tituloW) / 2, y: H - 10, size: 7, font: fontBold, color: WHITE })
      page.drawText(`${pageNum} / ${TOTAL_PAGES}`, { x: W - 46, y: H - HEADER_H + 27, size: 10, font: fontBold, color: rgb(0.8, 0.95, 0.95) })
    }

    // ── Pie de pagina con validez juridica ───────────────────────────────────
    const drawFooter = (page, rad) => {
      page.drawLine({ start: { x: 0, y: FOOTER_H + 2 }, end: { x: W, y: FOOTER_H + 2 }, thickness: 0.5, color: TEAL_LITE })
      // Linea 1: validez juridica (centrado)
      const valText = 'Documento generado electronicamente con validez juridica segun la Ley 527 de 1999 (Comercio Electronico).'
      const valW = font.widthOfTextAtSize(valText, 6.5)
      page.drawText(valText, { x: (W - valW) / 2, y: FOOTER_H - 4, size: 6.5, font, color: TEAL_DARK })
      // Linea 2: empresa | contacto | radicado
      page.drawText(`BTS Integral - Clinicas Botospa S.A.S.  |  ${CONTACT_EMAIL}`, { x: ML, y: 7, size: 6, font, color: GRAY_D })
      page.drawText(`Radicado: ${rad}`, { x: W - 190, y: 7, size: 6, font, color: TEAL_DARK })
    }

    // ── Titulo de seccion: barra teal izquierda + texto bold + linea ─────────
    const drawSection = (page, label, yPos) => {
      page.drawRectangle({ x: ML, y: yPos - 2, width: 3, height: 15, color: TEAL })
      page.drawText(label, { x: ML + 9, y: yPos + 2, size: 9.5, font: fontBold, color: TEAL_DARK })
      page.drawLine({ start: { x: ML, y: yPos - 4 }, end: { x: W - MR, y: yPos - 4 }, thickness: 0.4, color: TEAL_LITE })
      return yPos - 22
    }

    // ── Fila de tabla con borde: label | valor ───────────────────────────────
    const FIELD_H = 18
    const VAL_X   = ML + 185
    const drawTableRow = (page, label, value, yPos) => {
      // fondo alternado: solo borde
      page.drawRectangle({ x: ML, y: yPos - 6, width: CW, height: FIELD_H, borderColor: GRAY_L, borderWidth: 0.4 })
      // separador vertical
      page.drawLine({ start: { x: VAL_X - 4, y: yPos - 6 }, end: { x: VAL_X - 4, y: yPos + FIELD_H - 6 }, thickness: 0.4, color: GRAY_L })
      page.drawText(label,        { x: ML + 5,   y: yPos + 1, size: 8,   font: fontBold, color: GRAY_D })
      page.drawText(value || '—', { x: VAL_X + 2, y: yPos + 1, size: 8.5, font,           color: BLACK  })
      return yPos - FIELD_H
    }

    // ── Parrafo con wordwrap ─────────────────────────────────────────────────
    const drawParagraph = (page, text, yPos, indent = 0, size = 8, lineH = 12) => {
      const lines = wrapText(text, CW - indent - 4, size, font)
      for (const line of lines) {
        if (yPos < FOOTER_H + 14) break
        page.drawText(line, { x: ML + indent, y: yPos, size, font, color: BLACK })
        yPos -= lineH
      }
      return yPos
    }

    // ── Clausula: titulo bold TEAL + cuerpo ─────────────────────────────────
    const drawClause = (page, title, bodyLines, yPos) => {
      if (yPos < FOOTER_H + 30) return yPos
      page.drawText(title, { x: ML + 3, y: yPos, size: 8.5, font: fontBold, color: TEAL_DARK })
      yPos -= 13
      for (const line of bodyLines) {
        if (line === '') { yPos -= 5; continue }
        yPos = drawParagraph(page, line, yPos, 8, 8, 12)
        yPos -= 2
      }
      return yPos - 5
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAGINA 1 — Introduccion + Clausulas 1 a 7
    // ════════════════════════════════════════════════════════════════════════
    const page1 = pdfDoc.addPage([W, H])
    drawHeader(page1, 1)
    drawFooter(page1, radicado)

    let y = H - HEADER_H - 20

    // Parrafo introductorio
    const intro = 'El Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S. (en adelante, "Valentech"), operado por la linea de servicio Best Therapeutic Service - BTS Integral (en adelante BTS Integral) de la sociedad Clinicas Botospa S.A.S., con el fin de facilitar el acceso a los servicios ofrecidos a los pacientes interesados y en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013, las normas que modifiquen o sustituyan el regimen de proteccion de datos personales en Colombia, asi como sus Politicas de Proteccion de Datos Personales, define este documento en el cual el paciente autoriza de manera previa, expresa e informada lo siguiente:'
    y = drawParagraph(page1, intro, y, 0, 8, 12)
    y -= 8

    const clausulasPag1 = [
      ['1. Suministro de mis datos personales',
       ['Declaro que suministro mis datos personales, incluyendo informacion de contacto, edad y demas datos necesarios, con la finalidad de que BTS Integral pueda solicitar a mi medico tratante -o recibir directamente de el- mi historia clinica, reportes de diagnostico, conceptos medicos y/o cualquier informacion requerida para evaluar y comprender mi situacion clinica.']],
      ['2. Autorizacion para el tratamiento y obtencion de informacion clinica',
       ['Autorizo a BTS Integral para tratar mis Datos Personales y, cuando sea necesario, solicitar y recibir informacion relevante sobre mi estado de salud proveniente de:',
        '-mis medicos tratantes',
        '-otros prestadores de servicios de salud',
        '-de entidades que generan la dispensacion y/o infusion de mi terapia, y/o',
        '-aseguradores involucrados en mi atencion.',
        'Lo anterior exclusivamente con el proposito de realizar el seguimiento clinico y operativo, asi como las actividades de apoyo que presta el Programa, siempre con respeto pleno por las decisiones del profesional tratante.']],
      ['3. Informacion suministrada por BTS Integral',
       ['BTS Integral me ha informado de manera clara que:',
        'i. Dentro de los datos que podra recolectar el Programa se encuentran datos sensibles, tales como informacion contenida en mi historia clinica, formulas medicas, autorizaciones de servicios de salud y comunicaciones emitidas por mi EPS.',
        'ii. Que las finalidades del tratamiento de mis Datos Personales por parte de BTS Integral son las siguientes:',
        'a. Contactarme para brindarme informacion sobre los beneficios del Programa de Soporte de Pacientes, asi como informacion relacionada con mi enfermedad, los metodos de diagnostico requeridos, la terapia prescrita por mi medico tratante, los posibles eventos adversos que debo reportar y, en general, cualquier informacion pertinente a mi atencion en salud que se encuentre dentro del alcance del programa.',
        'b. Gestionar y coordinar todos los tramites administrativos necesarios ante las entidades aseguradoras de salud (EPS) para facilitar mi acceso a los servicios, incluyendo la obtencion de autorizaciones, soportes, validaciones, radicaciones, requisitos y/o aprobaciones relacionadas con la continuidad o inicio del tratamiento prescrito.',
        'c. Gestionar los tramites necesarios ante las instituciones prestadoras de servicios de salud (IPS), profesionales medicos tratantes y demas entidades asistenciales, con el fin de facilitar la atencion, acceso a servicios, programacion de procedimientos, entrega de informacion pertinente y demas actividades necesarias para la adecuada prestacion del servicio de salud que requiero para el tratamiento integral de mi estado de salud.',
        'd. Incluir mis datos personales en la solicitud de autorizacion de importacion del medicamento ante autoridades competentes, tales como INVIMA y VUCE, cuando aplique.',
        'e. Transmitir mis datos personales a IPS aliadas, EPS, profesionales de la salud tratantes y, cuando corresponda, al INVIMA, para la adecuada prestacion del servicio o para el reporte de eventos adversos.']],
      ['4. Responsables y encargados del tratamiento de la informacion',
       ['Autorizo que el tratamiento de mis datos personales sea realizado directamente por Valentech y/o por BTS Integral, en calidad de responsables del tratamiento, o por los encargados que estas designen. En todo caso, quienes intervengan en el tratamiento deberan cumplir la normatividad vigente en materia de proteccion de datos personales y las politicas internas de proteccion de datos aplicables.']],
      ['5. Destinatarios y circulacion de los datos personales',
       ['Autorizo que mis datos puedan ser compartidos, transmitidos, entregados, transferidos o divulgados para el cumplimiento de las finalidades descritas en este documento o para garantizar la continuidad del Programa en caso de que sea transferido a otra institucion. Entre los posibles destinatarios se encuentran, sin limitarse a:',
        'a. autoridades de salud competentes, como el INVIMA u otras entidades regulatorias;',
        'b. personas naturales o juridicas que participen en la operacion, gestion o apoyo del Programa de Soporte de Pacientes;',
        'c. cualquier tercero que Valentech o BTS Integral consideren necesario para el cumplimiento de las finalidades autorizadas.']],
      ['6. Transferencia internacional de datos personales',
       ['Autorizo que, cuando sea necesario para la prestacion adecuada de los servicios del Programa o para el almacenamiento seguro de la informacion en plataformas digitales cuyos servidores se ubiquen fuera de Colombia, se realicen transferencias internacionales de mis Datos Personales, de conformidad con la normatividad vigente.']],
      ['7. Datos sensibles',
       ['Reconozco que la entrega de datos sensibles -incluidos aquellos relacionados con mi estado de salud, patologias, historia clinica y datos biometricos- es facultativa. Declaro que he proporcionado dichos datos de manera libre y voluntaria, y autorizo expresamente su tratamiento para las finalidades descritas.']],
    ]

    for (const [titulo, cuerpo] of clausulasPag1) {
      y = drawClause(page1, titulo, cuerpo, y)
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAGINA 2 — Clausulas 8-11 + Tabla de datos del paciente
    // ════════════════════════════════════════════════════════════════════════
    const page2 = pdfDoc.addPage([W, H])
    drawHeader(page2, 2)
    drawFooter(page2, radicado)

    let y2 = H - HEADER_H - 20

    const clausulasPag2 = [
      ['8. Datos personales de ninas, ninos y adolescentes',
       ['Declaro que la entrega de datos de ninas, ninos o adolescentes, cuando aplique, es igualmente facultativa, y autorizo su tratamiento unicamente para las finalidades aqui establecidas.']],
      ['9. Derechos del titular de la informacion',
       ['Como titular de los datos personales, reconozco los derechos que me asisten conforme a las Leyes 1266 de 2008 y 1581 de 2012, entre ellos:',
        'a. Conocer, actualizar y rectificar mis datos;',
        'b. Solicitar prueba de esta autorizacion;',
        'c. Recibir informacion sobre el uso que se ha dado a mis datos;',
        'd. Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley;',
        'e. Revocar esta autorizacion y/o solicitar la supresion de mis datos.',
        'Podre ejercer estos derechos conforme a lo previsto en las Politicas de Proteccion de Datos de Valentech y BTS Integral.']],
      ['10. Inclusion en estudios de vida real',
       ['Autorizo el uso de mis datos personales y clinicos, o los de la persona a quien represento legalmente, para su inclusion en estudios de vida real encaminados a evaluar la efectividad, seguridad y valor de los tratamientos y servicios en condiciones reales de practica clinica. Declaro que he sido informado que estos estudios no implican cambios en mi tratamiento ni la participacion en investigaciones experimentales, y que la informacion sera utilizada unicamente con fines cientificos. Dichos datos seran tratados bajo estrictas medidas de seguridad, garantizando su confidencialidad y anonimizacion, sin que sea posible la identificacion directa del paciente.']],
      ['11. Politicas de proteccion de datos de Valentech Pharma Colombia y BTS Integral',
       ['Declaro que conozco y acepto las Politicas de Proteccion de Datos Personales de Valentech y BTS Integral, disponibles en las siguientes paginas web http://valentechforlife.com/ y http://bts-integral.com',
        'Para ejercer mis derechos o presentar consultas, peticiones o reclamos, podre contactar al Programa de Soporte de Pacientes de BTS Integral en la siguiente direccion:',
        'Direccion: Calle 90 # 18-59 Bogota, Colombia   |   Celular: (57) 3209188394',
        `Correo electronico: ${CONTACT_EMAIL}`,
        'Declaro que me fue informado que, si tengo inquietudes, solicitudes o novedades relacionadas con el tratamiento de mis datos personales, podre contactarme a traves del correo electronico legal@bts-corporate.com dispuesto por la Compania para la atencion de estos asuntos.']],
    ]

    for (const [titulo, cuerpo] of clausulasPag2) {
      y2 = drawClause(page2, titulo, cuerpo, y2)
    }

    y2 -= 12
    y2 = drawSection(page2, 'DATOS DEL FORMULARIO', y2)

    // Tabla: menor de edad
    y2 = drawTableRow(page2, 'El Paciente es Menor de edad', d.menor_de_edad ? 'Si' : 'No', y2)

    if (d.menor_de_edad) {
      y2 = drawTableRow(page2, 'Nombre Completo Representante Legal',   d.nombre_acudiente || '—', y2)
      y2 = drawTableRow(page2, 'Tipo de Documento Representante Legal', TIPO_DOC_LABEL[d.tipo_doc_acudiente] || d.tipo_doc_acudiente || '—', y2)
      y2 = drawTableRow(page2, 'Numero de Documento Representante Legal', d.documento_acudiente || '—', y2)
      y2 -= 6
      // Texto explicativo menor
      const textoMenor = 'En caso de ejercer como representante legal de un paciente por ser menor de edad u otra circunstancia donde soy la persona responsable doy mi autorizacion para el uso de datos de mi representado y la inclusion dentro del programa de pacientes, donde podra acceder a los servicios ofrecidos, en este caso los datos del paciente son:'
      y2 = drawParagraph(page2, textoMenor, y2, 0, 7.5, 11)
      y2 -= 4
      page2.drawText('Mis datos de contacto son:', { x: ML, y: y2, size: 8.5, font: fontBold, color: TEAL_DARK })
      y2 -= 14
    }

    y2 = drawTableRow(page2, 'Direccion de correo electronico', d.correo || '—', y2)
    y2 = drawTableRow(page2, 'Nombre y Apellidos Completos', d.nombre_paciente, y2)
    y2 = drawTableRow(page2, 'Tipo de Documento de Identidad', TIPO_DOC_LABEL[d.tipo_documento] || d.tipo_documento, y2)
    y2 = drawTableRow(page2, 'Numero de Documento de Identidad', d.numero_documento, y2)
    y2 = drawTableRow(page2, 'Telefono/Celular #1', d.telefono, y2)
    y2 = drawTableRow(page2, 'Ciudad/Municipio', d.ciudad || '—', y2)
    y2 = drawTableRow(page2, 'Direccion Residencia', d.direccion || '—', y2)
    y2 = drawTableRow(page2, 'Fecha de diligenciamiento', `${fechaTexto}  ${horaTexto}  (hora Colombia)`, y2)

    // ════════════════════════════════════════════════════════════════════════
    // PAGINA 3 — Autorizacion y firma
    // ════════════════════════════════════════════════════════════════════════
    const page3 = pdfDoc.addPage([W, H])
    drawHeader(page3, 3)
    drawFooter(page3, radicado)

    let y3 = H - HEADER_H - 28

    // Bloque AUTORIZACION: texto bold + parrafo
    page3.drawText('AUTORIZACION:', { x: ML, y: y3, size: 9, font: fontBold, color: BLACK })
    y3 -= 14
    const textoAutorizacion = 'Declaro que he sido informado sobre las finalidades y condiciones del tratamiento de mis Datos Personales, incluidos los Datos Sensibles. En consecuencia, autorizo expresamente a Valentech y/o BTS Integral para tratarlos conforme a lo aqui senalado, asi como para realizar transferencias nacionales o internacionales cuando sean necesarias para cumplir tales finalidades.'
    y3 = drawParagraph(page3, textoAutorizacion, y3, 0, 8.5, 13)
    y3 -= 14

    // Tabla de 3 columnas: ACEPTO / AUTORIZO | (espacio) | FIRMA
    const tableTop = y3
    const tableH   = 70
    const col1W    = 160
    const col2W    = 180
    const col3W    = CW - col1W - col2W
    // Bordes tabla
    page3.drawRectangle({ x: ML,               y: tableTop - tableH, width: col1W, height: tableH, borderColor: GRAY_L, borderWidth: 0.6 })
    page3.drawRectangle({ x: ML + col1W,        y: tableTop - tableH, width: col2W, height: tableH, borderColor: GRAY_L, borderWidth: 0.6 })
    page3.drawRectangle({ x: ML + col1W + col2W, y: tableTop - tableH, width: col3W, height: tableH, borderColor: GRAY_L, borderWidth: 0.6 })
    // Texto col1
    page3.drawText('ACEPTO / AUTORIZO', { x: ML + 6, y: tableTop - 14, size: 8.5, font: fontBold, color: BLACK })
    page3.drawText('[X]', { x: ML + 6, y: tableTop - 30, size: 13, font: fontBold, color: TEAL })
    // Texto col3
    page3.drawText('FIRMA:', { x: ML + col1W + col2W + 6, y: tableTop - tableH + 10, size: 8, font: fontBold, color: GRAY_D })

    y3 = tableTop - tableH - 22

    // Imagen de firma dentro de la tabla col3 o debajo si no cabe
    try {
      const base64Data = firmaBase64.replace(/^data:image\/png;base64,/, '')
      const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(pngBytes)
      const maxSigW = col3W - 12; const maxSigH = tableH - 20
      const ratio = Math.min(maxSigW / sigImage.width, maxSigH / sigImage.height)
      const sw = sigImage.width * ratio; const sh = sigImage.height * ratio
      const sigX = ML + col1W + col2W + 6
      const sigY = tableTop - tableH + 14
      page3.drawImage(sigImage, { x: sigX, y: sigY, width: sw, height: sh })
    } catch (_e) { /* sin firma */ }

    // Datos del firmante
    const nombreFirmante = d.menor_de_edad && d.nombre_acudiente
      ? d.nombre_acudiente
      : d.nombre_paciente
    const tipoDocFirmante = d.menor_de_edad && d.tipo_doc_acudiente
      ? (TIPO_DOC_LABEL[d.tipo_doc_acudiente] || d.tipo_doc_acudiente)
      : (TIPO_DOC_LABEL[d.tipo_documento] || d.tipo_documento)
    const numDocFirmante = d.menor_de_edad && d.documento_acudiente
      ? d.documento_acudiente
      : d.numero_documento
    const rolFirmante = d.menor_de_edad ? 'Representante Legal' : 'Paciente'

    page3.drawLine({ start: { x: ML, y: y3 + 2 }, end: { x: ML + 320, y: y3 + 2 }, thickness: 0.6, color: TEAL })
    y3 -= 4
    page3.drawText(nombreFirmante,                          { x: ML, y: y3, size: 9,   font: fontBold, color: BLACK  }); y3 -= 13
    page3.drawText(`${tipoDocFirmante}: ${numDocFirmante}`, { x: ML, y: y3, size: 8,   font,           color: GRAY_D }); y3 -= 12
    page3.drawText(rolFirmante,                             { x: ML, y: y3, size: 8,   font: fontBold, color: TEAL_DARK }); y3 -= 12
    page3.drawText(`Fecha: ${fechaTexto}  Hora: ${horaTexto} (hora Colombia)`, { x: ML, y: y3, size: 8, font, color: GRAY_D }); y3 -= 11
    if (ipOrigen) {
      page3.drawText(`IP de origen: ${ipOrigen}`, { x: ML, y: y3, size: 7.5, font, color: GRAY_D }); y3 -= 10
    }

    // ── Serializar PDF ───────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save()

    // ── Nombre del archivo: CI-{numero_documento}-{radicado} ─────────────────
    const docSlug = d.numero_documento.replace(/[^A-Za-z0-9]/g, '')
    const year = nowCO.getUTCFullYear()
    const month = String(nowCO.getUTCMonth() + 1).padStart(2, '0')
    const pdfFileName = `CI-${docSlug}-${radicado}.pdf`
    const pdfPath = `${year}/${month}/${pdfFileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: false })

    if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`)

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pdfPath, 157_680_000)
    if (signedError) throw new Error(`Signed URL: ${signedError.message}`)
    const pdfUrl = signedData.signedUrl

    const { error: dbError } = await supabase.from('consentimientos').insert({
      id: radicado,
      nombre_paciente: d.nombre_paciente,
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento,
      fecha_nacimiento: d.fecha_nacimiento,
      telefono: d.telefono,
      correo: d.correo || null,
      ciudad: d.ciudad || null,
      direccion: d.direccion || null,
      menor_de_edad: d.menor_de_edad,
      nombre_acudiente: d.nombre_acudiente || null,
      tipo_doc_acudiente: d.tipo_doc_acudiente || null,
      documento_acudiente: d.documento_acudiente || null,
      firma_base64: firmaBase64,
      pdf_url: pdfUrl,
      ip_origen: ipOrigen || null,
      acepto_terminos: true,
    })

    if (dbError) throw new Error(`DB insert: ${dbError.message}`)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && d.correo) {
      const emailBody = {
        from: `BTS Integral <noreply@bts-integral.com>`,
        to: [d.correo],
        bcc: [CONTACT_EMAIL],
        subject: `Consentimiento registrado - Radicado ${radicado}`,
        html: `
          <h2 style="color:#0A6B6B">Consentimiento Informado Registrado</h2>
          <p>Estimado/a <strong>${d.nombre_paciente}</strong>,</p>
          <p>Su autorizacion para el tratamiento de datos personales en el ${PROGRAM_NAME} ha sido registrada exitosamente.</p>
          <p><strong>Numero de radicado:</strong> <code>${radicado}</code></p>
          <p><strong>Fecha:</strong> ${fechaTexto} ${horaTexto} (hora Colombia)</p>
          <p>Puede descargar su copia del documento firmado en el siguiente enlace:<br>
          <a href="${pdfUrl}" style="color:#0A6B6B">${pdfUrl}</a></p>
          <hr>
          <p style="font-size:12px;color:#666">
            BTS Integral - Clinicas Botospa S.A.S.<br>
            Calle 90 # 18-59, Bogota, Colombia<br>
            ${CONTACT_EMAIL} - (57) 3209188394
          </p>
        `,
      }

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      })
    }

    return new Response(
      JSON.stringify({ success: true, radicado, pdf_url: pdfUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generar-pdf] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})