// supabase/functions/generar-pdf/index.ts
// Edge Function (Deno) — Genera PDF del consentimiento, lo sube a Storage y guarda registro en DB
// Deploy: supabase functions deploy generar-pdf
// Env vars requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BUCKET = 'pdfs-consentimientos'
const CONTACT_EMAIL = 'programaapoyandovidas@bts-integral.com'
const PROGRAM_NAME = 'Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S.'

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
  firmaBase64: string  // data:image/png;base64,....
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

    // ── Supabase client (service role) ──────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // ── Generar UUID del radicado ────────────────────────────────────────────
    const radicado = crypto.randomUUID()
    const now = new Date()
    const fechaTexto = now.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const horaTexto = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

    // ── Construir PDF con pdf-lib ────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const TEAL      = rgb(0.039, 0.42, 0.42)   // #0A6B6B
    const TEAL_DARK = rgb(0.025, 0.30, 0.30)   // #075050
    const TEAL_LITE = rgb(0.88, 0.95, 0.95)    // fondo suave
    const BLACK     = rgb(0.1,  0.1,  0.1)
    const GRAY      = rgb(0.45, 0.45, 0.45)
    const GRAY_LITE = rgb(0.96, 0.96, 0.96)
    const GOLD      = rgb(0.72, 0.525, 0.043)  // #B8860B
    const WHITE     = rgb(1, 1, 1)
    const W = 595; const H = 842               // A4

    // ── Helper: encabezado de página ─────────────────────────────────────────
    const drawHeader = (page: ReturnType<typeof pdfDoc.addPage>, pageNum: number) => {
      // Banda teal superior
      page.drawRectangle({ x: 0, y: H - 72, width: W, height: 72, color: TEAL })
      // Banda dorada fina debajo
      page.drawRectangle({ x: 0, y: H - 75, width: W, height: 3, color: GOLD })

      // Bloque logo "BTS"
      page.drawRectangle({ x: 22, y: H - 60, width: 50, height: 46, color: TEAL_DARK, borderColor: WHITE, borderWidth: 1 })
      page.drawText('BTS',      { x: 30,  y: H - 38, size: 14, font: fontBold, color: WHITE })
      page.drawText('INTEGRAL', { x: 24,  y: H - 52, size:  7, font,           color: WHITE })

      // Textos de cabecera
      page.drawText('PROGRAMA DE SOPORTE A PACIENTES', {
        x: 84, y: H - 26, size: 7.5, font, color: rgb(0.8, 0.95, 0.95),
      })
      page.drawText('Valentech Pharma Colombia', {
        x: 84, y: H - 42, size: 14, font: fontBold, color: WHITE,
      })
      page.drawText('Operado por BTS Integral \u00b7 Cl\u00ednicas Botospa S.A.S.', {
        x: 84, y: H - 57, size: 8, font, color: rgb(0.95, 0.85, 0.4),
      })
      // Número de página
      page.drawText(`${pageNum} / 3`, {
        x: W - 50, y: H - 44, size: 9, font: fontBold, color: rgb(0.8, 0.95, 0.95),
      })
    }

    // ── Helper: título de sección ─────────────────────────────────────────────
    const drawSectionTitle = (page: ReturnType<typeof pdfDoc.addPage>, label: string, yPos: number) => {
      page.drawRectangle({ x: 22, y: yPos - 4, width: W - 44, height: 18, color: TEAL_LITE })
      page.drawRectangle({ x: 22, y: yPos - 4, width: 4, height: 18, color: TEAL })
      page.drawText(label, { x: 32, y: yPos, size: 9, font: fontBold, color: TEAL_DARK })
      return yPos - 22
    }

    // ── Helper: fila de dato ──────────────────────────────────────────────────
    const drawDataRow = (
      page: ReturnType<typeof pdfDoc.addPage>,
      label: string, value: string,
      yPos: number, shade: boolean,
    ) => {
      if (shade) page.drawRectangle({ x: 22, y: yPos - 3, width: W - 44, height: 16, color: GRAY_LITE })
      page.drawText(label, { x: 28,  y: yPos, size: 8, font: fontBold, color: GRAY })
      page.drawText(value, { x: 185, y: yPos, size: 8, font,           color: BLACK })
      return yPos - 16
    }

    // ── Helper: pie de página ─────────────────────────────────────────────────
    const drawFooter = (page: ReturnType<typeof pdfDoc.addPage>, rad: string) => {
      page.drawRectangle({ x: 0, y: 0, width: W, height: 32, color: TEAL_LITE })
      page.drawRectangle({ x: 0, y: 32, width: W, height: 1,  color: TEAL })
      page.drawText(`BTS Integral \u00b7 Cl\u00ednicas Botospa S.A.S. \u00b7 ${CONTACT_EMAIL}`, {
        x: 22, y: 12, size: 7, font, color: GRAY,
      })
      page.drawText(`Radicado: ${rad}`, {
        x: W - 215, y: 12, size: 7, font, color: TEAL_DARK,
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA 1 — Datos del paciente
    // ════════════════════════════════════════════════════════════════════════
    const page1 = pdfDoc.addPage([W, H])
    drawHeader(page1, 1)
    drawFooter(page1, radicado)

    let y = H - 95

    // Título del documento
    page1.drawText('AUTORIZACION TRATAMIENTO DE DATOS PERSONALES', {
      x: 22, y, size: 11, font: fontBold, color: TEAL_DARK,
    })
    y -= 16

    // Info del radicado
    page1.drawText(`Radicado:`, { x: 22, y, size: 8, font: fontBold, color: GRAY })
    page1.drawText(radicado, { x: 85, y, size: 8, font, color: BLACK })
    y -= 13
    page1.drawText(`Fecha:`, { x: 22, y, size: 8, font: fontBold, color: GRAY })
    page1.drawText(`${fechaTexto}  \u00b7  ${horaTexto}`, { x: 85, y, size: 8, font, color: BLACK })
    y -= 20

    // Sección datos del paciente
    y = drawSectionTitle(page1, 'DATOS DEL PACIENTE', y)
    y -= 6

    const campos: [string, string][] = [
      ['Nombre completo',    d.nombre_paciente],
      ['Tipo de documento',  d.tipo_documento],
      ['No. de documento',   d.numero_documento],
      ['Fecha de nacimiento',d.fecha_nacimiento],
      ['Telefono / Celular', d.telefono],
      ['Correo electronico', d.correo || '—'],
      ['Ciudad / Municipio', d.ciudad || '—'],
      ['Direccion',          d.direccion || '—'],
    ]
    campos.forEach(([label, value], i) => {
      y = drawDataRow(page1, label, value, y, i % 2 === 0)
    })

    if (d.menor_de_edad) {
      y -= 14
      y = drawSectionTitle(page1, 'REPRESENTANTE LEGAL / ACUDIENTE', y)
      y -= 6
      const acudiente: [string, string][] = [
        ['Nombre completo', d.nombre_acudiente || '—'],
        ['Tipo documento',  d.tipo_doc_acudiente || '—'],
        ['No. documento',   d.documento_acudiente || '—'],
      ]
      acudiente.forEach(([label, value], i) => {
        y = drawDataRow(page1, label, value, y, i % 2 === 0)
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA 2 — Texto legal
    // ════════════════════════════════════════════════════════════════════════
    const page2 = pdfDoc.addPage([W, H])
    drawHeader(page2, 2)
    drawFooter(page2, radicado)

    let y2 = H - 95
    y2 = drawSectionTitle(page2, 'AUTORIZACION — TEXTO LEGAL COMPLETO', y2)
    y2 -= 8

    const clausulas: [string, string][] = [
      ['Introduccion',
        'El Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S., operado por BTS Integral\n' +
        'de Clinicas Botospa S.A.S., en cumplimiento de la Ley 1581/2012 y el Decreto 1377/2013, define\n' +
        'este documento para obtener la autorizacion previa, expresa e informada del titular.'],
      ['1. Suministro de datos',
        'El paciente provee datos personales incluyendo informacion de contacto, edad y datos necesarios\n' +
        'para solicitar historia clinica y reportes de diagnostico.'],
      ['2. Autorizacion de tratamiento',
        'Autoriza a BTS Integral para tratar datos y obtener informacion clinica de medicos tratantes,\n' +
        'IPS, dispensadores y aseguradoras.'],
      ['3. Datos sensibles',
        'Incluyen historia clinica, formulas medicas y autorizaciones EPS. Finalidades: contacto,\n' +
        'gestion ante EPS/IPS, tramites INVIMA/VUCE.'],
      ['4. Responsables y encargados',
        'Valentech y/o BTS Integral como responsables del tratamiento bajo la normatividad vigente.'],
      ['5. Destinatarios',
        'Autoridades de salud (INVIMA), operadores del programa y terceros necesarios para el servicio.'],
      ['6. Transferencia internacional',
        'Autoriza transferencias a servidores fuera de Colombia cuando sea necesario para la prestacion\n' +
        'del servicio.'],
      ['7. Derechos del titular',
        'Conocer, actualizar, rectificar, solicitar prueba, revocar autorizacion. Quejas ante la SIC.\n' +
        'Ejercicio segun Politicas de Proteccion de Datos de cada empresa responsable.'],
      ['8. Estudios de vida real',
        'Uso anonimizado con fines cientificos, sin modificar el tratamiento medico del paciente.'],
      ['9. Contacto y politicas',
        'valentechforlife.com  |  bts-integral.com\n' +
        'programaapoyandovidas@bts-integral.com  |  (57) 3209188394\n' +
        'Calle 90 # 18-59, Bogota, Colombia  |  legal@bts-corporate.com'],
    ]

    for (const [titulo, texto] of clausulas) {
      if (y2 < 50) break
      page2.drawText(titulo, { x: 22, y: y2, size: 8, font: fontBold, color: TEAL_DARK })
      y2 -= 13
      const lineas = texto.split('\n')
      for (const linea of lineas) {
        if (y2 < 50) break
        page2.drawText(linea, { x: 30, y: y2, size: 7.5, font, color: BLACK })
        y2 -= 11
      }
      y2 -= 6
    }

    // ════════════════════════════════════════════════════════════════════════
    // PÁGINA 3 — Declaración y firma
    // ════════════════════════════════════════════════════════════════════════
    const page3 = pdfDoc.addPage([W, H])
    drawHeader(page3, 3)
    drawFooter(page3, radicado)

    let y3 = H - 95
    y3 = drawSectionTitle(page3, 'DECLARACION DE AUTORIZACION', y3)
    y3 -= 10

    const textosDeclaracion = [
      'He leido y entendido el presente documento de Autorizacion para el Tratamiento de Datos',
      'Personales. Declaro que se me informo sobre las finalidades y condiciones del tratamiento,',
      'incluidos los Datos Sensibles.',
      '',
      'En consecuencia, ACEPTO / AUTORIZO expresamente a Valentech y/o BTS Integral para tratar',
      'mis datos conforme a lo aqui senalado, asi como para realizar transferencias nacionales o',
      'internacionales cuando sean necesarias para cumplir tales finalidades.',
    ]

    for (const linea of textosDeclaracion) {
      page3.drawText(linea, { x: 22, y: y3, size: 9, font, color: BLACK })
      y3 -= linea === '' ? 6 : 14
    }

    // Caja de aceptación
    y3 -= 10
    page3.drawRectangle({ x: 22, y: y3 - 6, width: 200, height: 24, color: TEAL, borderColor: TEAL_DARK, borderWidth: 1 })
    page3.drawText('(X)  ACEPTO / AUTORIZO', { x: 30, y: y3 + 4, size: 12, font: fontBold, color: WHITE })
    y3 -= 36

    // Sección de firma
    y3 = drawSectionTitle(page3, 'FIRMA DEL PACIENTE O REPRESENTANTE LEGAL', y3)
    y3 -= 10

    // Insertar imagen de firma
    let sigH = 0
    try {
      const base64Data = firmaBase64.replace(/^data:image\/png;base64,/, '')
      const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(pngBytes)
      const maxW = 220; const maxSigH = 90
      const ratio = Math.min(maxW / sigImage.width, maxSigH / sigImage.height)
      const sw = sigImage.width * ratio; const sh = sigImage.height * ratio
      // Caja de firma con borde
      page3.drawRectangle({ x: 22, y: y3 - sh - 10, width: sw + 20, height: sh + 10, borderColor: GRAY, borderWidth: 0.5 })
      page3.drawImage(sigImage, { x: 32, y: y3 - sh - 5, width: sw, height: sh })
      sigH = sh + 20
    } catch (_e) {
      page3.drawRectangle({ x: 22, y: y3 - 50, width: 250, height: 50, borderColor: GRAY, borderWidth: 0.5 })
      sigH = 60
    }

    y3 -= sigH + 8

    // Línea y datos del firmante
    page3.drawLine({ start: { x: 22, y: y3 + 4 }, end: { x: 280, y: y3 + 4 }, thickness: 0.8, color: TEAL })
    y3 -= 5
    const nombreFirmante = d.menor_de_edad && d.nombre_acudiente
      ? `${d.nombre_acudiente} (Representante Legal)`
      : d.nombre_paciente
    page3.drawText(nombreFirmante, { x: 22, y: y3, size: 9, font: fontBold, color: BLACK })
    y3 -= 13
    page3.drawText(`${d.tipo_documento}: ${d.numero_documento}`, { x: 22, y: y3, size: 8, font, color: GRAY })
    y3 -= 13
    page3.drawText(`Fecha y hora: ${fechaTexto}  ${horaTexto}`, { x: 22, y: y3, size: 8, font, color: GRAY })
    if (ipOrigen) {
      y3 -= 13
      page3.drawText(`IP de origen: ${ipOrigen}`, { x: 22, y: y3, size: 7.5, font, color: GRAY })
    }

    // Nota de validez
    y3 -= 24
    page3.drawRectangle({ x: 22, y: y3 - 6, width: W - 44, height: 30, color: TEAL_LITE, borderColor: TEAL, borderWidth: 0.5 })
    page3.drawText('Documento generado electronicamente con validez juridica segun la Ley 527 de 1999 (Comercio Electronico).', {
      x: 28, y: y3 + 4, size: 7, font, color: TEAL_DARK,
    })
    page3.drawText('Para verificar autenticidad contacte: ' + CONTACT_EMAIL, {
      x: 28, y: y3 - 7, size: 7, font, color: TEAL_DARK,
    })

    // ── Serializar PDF ───────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save()

    // ── Subir a Supabase Storage ─────────────────────────────────────────────
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const pdfPath = `${year}/${month}/${radicado}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: false })

    if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`)

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(pdfPath)
    const pdfUrl = urlData.publicUrl

    // ── Insertar registro en BD ──────────────────────────────────────────────
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

    // ── Enviar email via Resend ──────────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && d.correo) {
      const emailBody = {
        from: `BTS Integral <noreply@bts-integral.com>`,
        to: [d.correo],
        bcc: [CONTACT_EMAIL],
        subject: `Consentimiento registrado – Radicado ${radicado}`,
        html: `
          <h2 style="color:#0A6B6B">Consentimiento Informado Registrado</h2>
          <p>Estimado/a <strong>${d.nombre_paciente}</strong>,</p>
          <p>Su autorización para el tratamiento de datos personales en el ${PROGRAM_NAME} ha sido registrada exitosamente.</p>
          <p><strong>Número de radicado:</strong> <code>${radicado}</code></p>
          <p><strong>Fecha:</strong> ${fechaTexto} ${horaTexto}</p>
          <p>Puede descargar su copia del documento firmado en el siguiente enlace:<br>
          <a href="${pdfUrl}" style="color:#0A6B6B">${pdfUrl}</a></p>
          <hr>
          <p style="font-size:12px;color:#666">
            BTS Integral · Clínicas Botospa S.A.S.<br>
            Calle 90 # 18-59, Bogotá, Colombia<br>
            ${CONTACT_EMAIL} · (57) 3209188394
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
