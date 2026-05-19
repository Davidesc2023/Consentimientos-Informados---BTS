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
    const fechaTexto = now.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const horaTexto = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

    // ── Construir PDF ────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const TEAL      = rgb(0.039, 0.42,  0.42)
    const TEAL_DARK = rgb(0.025, 0.30,  0.30)
    const TEAL_LITE = rgb(0.90,  0.96,  0.96)
    const BLACK     = rgb(0.12,  0.12,  0.12)
    const GRAY      = rgb(0.40,  0.40,  0.40)
    const GRAY_LITE = rgb(0.97,  0.97,  0.97)
    const GOLD      = rgb(0.72,  0.525, 0.043)
    const WHITE     = rgb(1, 1, 1)
    const W = 595; const H = 842

    // ── Logo real desde Storage publico ─────────────────────────────────────
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null
    try {
      const logoUrl = `${supabaseUrl}/storage/v1/object/public/assets/logo.png`
      const logoResp = await fetch(logoUrl)
      if (logoResp.ok) {
        const logoBytes = new Uint8Array(await logoResp.arrayBuffer())
        logoImage = await pdfDoc.embedPng(logoBytes)
      }
    } catch (_) { /* fallback texto */ }

    const HEADER_H = 56
    const FOOTER_H = 22
    const CONTENT_BOT = FOOTER_H + 8
    const TOTAL_PAGES = 2

    // ── Helper: encabezado ───────────────────────────────────────────────────
    const drawHeader = (page: ReturnType<typeof pdfDoc.addPage>, pageNum: number) => {
      page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: TEAL })
      page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD })

      if (logoImage) {
        const lw = 88
        const lh = lw * (logoImage.height / logoImage.width)
        page.drawImage(logoImage, { x: 14, y: H - HEADER_H + (HEADER_H - lh) / 2, width: lw, height: lh })
      } else {
        page.drawRectangle({ x: 14, y: H - HEADER_H + 6, width: 46, height: 42, color: TEAL_DARK, borderColor: WHITE, borderWidth: 1 })
        page.drawText('BTS',      { x: 22, y: H - HEADER_H + 28, size: 14, font: fontBold, color: WHITE })
        page.drawText('INTEGRAL', { x: 15, y: H - HEADER_H + 14, size: 6,  font,           color: WHITE })
      }

      const tx = logoImage ? 114 : 72
      page.drawText('PROGRAMA DE SOPORTE A PACIENTES', { x: tx, y: H - HEADER_H + 38, size: 7,    font,      color: rgb(0.75, 0.93, 0.93) })
      page.drawText('Valentech Pharma Colombia',        { x: tx, y: H - HEADER_H + 24, size: 13,   font: fontBold, color: WHITE })
      page.drawText('Operado por BTS Integral - Clinicas Botospa S.A.S.', { x: tx, y: H - HEADER_H + 10, size: 7.5, font, color: rgb(0.95, 0.85, 0.4) })
      page.drawText(`${pageNum} / ${TOTAL_PAGES}`, { x: W - 44, y: H - HEADER_H + 24, size: 9, font: fontBold, color: rgb(0.8, 0.95, 0.95) })
    }

    // ── Helper: pie de pagina ────────────────────────────────────────────────
    const drawFooter = (page: ReturnType<typeof pdfDoc.addPage>, rad: string) => {
      page.drawRectangle({ x: 0, y: 0, width: W, height: FOOTER_H, color: TEAL_LITE })
      page.drawRectangle({ x: 0, y: FOOTER_H, width: W, height: 1, color: TEAL })
      page.drawText(`BTS Integral - Clinicas Botospa S.A.S. - ${CONTACT_EMAIL}`, { x: 14, y: 7, size: 6.5, font, color: GRAY })
      page.drawText(`Radicado: ${rad}`, { x: W - 200, y: 7, size: 6.5, font, color: TEAL_DARK })
    }

    // ── Helper: titulo de seccion ────────────────────────────────────────────
    const drawSectionTitle = (page: ReturnType<typeof pdfDoc.addPage>, label: string, yPos: number): number => {
      page.drawRectangle({ x: 14, y: yPos - 3, width: W - 28, height: 16, color: TEAL_LITE })
      page.drawRectangle({ x: 14, y: yPos - 3, width: 3.5, height: 16, color: TEAL })
      page.drawText(label, { x: 22, y: yPos + 1, size: 8.5, font: fontBold, color: TEAL_DARK })
      return yPos - 20
    }

    // ── Helper: fila de dato ─────────────────────────────────────────────────
    const ROW_H = 14
    const drawDataRow = (
      page: ReturnType<typeof pdfDoc.addPage>,
      label: string, value: string,
      yPos: number, shade: boolean,
    ): number => {
      if (shade) page.drawRectangle({ x: 14, y: yPos - 2, width: W - 28, height: ROW_H, color: GRAY_LITE })
      page.drawText(label, { x: 18,  y: yPos + 1, size: 7.5, font: fontBold, color: GRAY })
      page.drawText(value, { x: 185, y: yPos + 1, size: 7.5, font,           color: BLACK })
      return yPos - ROW_H
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAGINA 1 - Datos del paciente + Texto legal
    // ════════════════════════════════════════════════════════════════════════
    const page1 = pdfDoc.addPage([W, H])
    drawHeader(page1, 1)
    drawFooter(page1, radicado)

    let y = H - HEADER_H - 10

    page1.drawText('AUTORIZACION TRATAMIENTO DE DATOS PERSONALES', {
      x: 14, y, size: 10.5, font: fontBold, color: TEAL_DARK,
    })
    y -= 13
    page1.drawText(`Radicado: ${radicado}`, { x: 14, y, size: 7.5, font, color: GRAY })
    page1.drawText(`Fecha: ${fechaTexto}  -  ${horaTexto}`, { x: 280, y, size: 7.5, font, color: GRAY })
    y -= 14

    y = drawSectionTitle(page1, 'DATOS DEL PACIENTE', y)
    y -= 2

    const campos: [string, string][] = [
      ['Nombre completo',     d.nombre_paciente],
      ['Tipo de documento',   d.tipo_documento],
      ['N. de documento',     d.numero_documento],
      ['Fecha de nacimiento', d.fecha_nacimiento],
      ['Telefono / Celular',  d.telefono],
      ['Correo electronico',  d.correo || '-'],
      ['Ciudad / Municipio',  d.ciudad || '-'],
      ['Direccion',           d.direccion || '-'],
    ]
    campos.forEach(([label, value], i) => {
      y = drawDataRow(page1, label, value, y, i % 2 === 0)
    })

    if (d.menor_de_edad) {
      y -= 6
      y = drawSectionTitle(page1, 'REPRESENTANTE LEGAL / ACUDIENTE', y)
      y -= 2
      const acudiente: [string, string][] = [
        ['Nombre completo', d.nombre_acudiente || '-'],
        ['Tipo documento',  d.tipo_doc_acudiente || '-'],
        ['N. documento',    d.documento_acudiente || '-'],
      ]
      acudiente.forEach(([label, value], i) => {
        y = drawDataRow(page1, label, value, y, i % 2 === 0)
      })
    }

    y -= 8
    y = drawSectionTitle(page1, 'AUTORIZACION - TEXTO LEGAL', y)
    y -= 4

    const clausulas: [string, string][] = [
      ['Introduccion',
        'El Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S., operado por BTS Integral de Clinicas Botospa S.A.S.,\n' +
        'en cumplimiento de la Ley 1581/2012 y el Decreto 1377/2013, solicita autorizacion previa, expresa e informada del titular.'],
      ['1. Suministro de datos',
        'El paciente provee datos personales incluyendo informacion de contacto, edad y datos necesarios para solicitar historia clinica.'],
      ['2. Autorizacion de tratamiento',
        'Autoriza a BTS Integral para tratar datos y obtener informacion clinica de medicos tratantes, IPS, dispensadores y aseguradoras.'],
      ['3. Datos sensibles',
        'Incluyen historia clinica, formulas medicas y autorizaciones EPS. Finalidades: contacto, gestion ante EPS/IPS, tramites INVIMA/VUCE.'],
      ['4. Responsables y encargados',
        'Valentech y/o BTS Integral como responsables del tratamiento bajo la normatividad vigente.'],
      ['5. Destinatarios',
        'Autoridades de salud (INVIMA), operadores del programa y terceros necesarios para el servicio.'],
      ['6. Transferencia internacional',
        'Autoriza transferencias a servidores fuera de Colombia cuando sea necesario para la prestacion del servicio.'],
      ['7. Derechos del titular',
        'Conocer, actualizar, rectificar, solicitar prueba, revocar autorizacion. Quejas ante la SIC. Segun Politicas de Proteccion de Datos.'],
      ['8. Estudios de vida real',
        'Uso anonimizado con fines cientificos, sin modificar el tratamiento medico del paciente.'],
      ['9. Contacto y politicas',
        'valentechforlife.com - bts-integral.com - programaapoyandovidas@bts-integral.com - (57) 3209188394 - Calle 90 # 18-59, Bogota'],
    ]

    for (const [titulo, texto] of clausulas) {
      if (y < CONTENT_BOT + 18) break
      page1.drawText(titulo, { x: 18, y, size: 7.5, font: fontBold, color: TEAL_DARK })
      y -= 11
      const lineas = texto.split('\n')
      for (const linea of lineas) {
        if (y < CONTENT_BOT + 8) break
        page1.drawText(linea, { x: 24, y, size: 7, font, color: BLACK })
        y -= 10
      }
      y -= 4
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAGINA 2 - Declaracion y firma
    // ════════════════════════════════════════════════════════════════════════
    const page2 = pdfDoc.addPage([W, H])
    drawHeader(page2, 2)
    drawFooter(page2, radicado)

    let y2 = H - HEADER_H - 10
    y2 = drawSectionTitle(page2, 'DECLARACION DE AUTORIZACION', y2)
    y2 -= 8

    const textosDeclaracion = [
      'He leido y entendido el presente documento de Autorizacion para el Tratamiento de Datos Personales.',
      'Declaro que fui informado sobre las finalidades y condiciones del tratamiento, incluidos los Datos Sensibles.',
      '',
      'En consecuencia, ACEPTO / AUTORIZO expresamente a Valentech y/o BTS Integral para tratar mis datos conforme',
      'a lo aqui senalado, asi como para realizar transferencias nacionales o internacionales cuando sean necesarias.',
    ]

    for (const linea of textosDeclaracion) {
      page2.drawText(linea, { x: 18, y: y2, size: 8.5, font, color: BLACK })
      y2 -= linea === '' ? 5 : 13
    }

    y2 -= 10
    page2.drawRectangle({ x: 18, y: y2 - 5, width: 195, height: 22, color: TEAL, borderColor: TEAL_DARK, borderWidth: 1 })
    page2.drawText('(X)  ACEPTO / AUTORIZO', { x: 26, y: y2 + 3, size: 11, font: fontBold, color: WHITE })
    y2 -= 32

    y2 = drawSectionTitle(page2, 'FIRMA DEL PACIENTE O REPRESENTANTE LEGAL', y2)
    y2 -= 8

    let sigH = 0
    try {
      const base64Data = firmaBase64.replace(/^data:image\/png;base64,/, '')
      const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(pngBytes)
      const maxW = 200; const maxSigH = 80
      const ratio = Math.min(maxW / sigImage.width, maxSigH / sigImage.height)
      const sw = sigImage.width * ratio; const sh = sigImage.height * ratio
      page2.drawRectangle({ x: 18, y: y2 - sh - 8, width: sw + 18, height: sh + 8, borderColor: GRAY, borderWidth: 0.5 })
      page2.drawImage(sigImage, { x: 27, y: y2 - sh - 4, width: sw, height: sh })
      sigH = sh + 16
    } catch (_e) {
      page2.drawRectangle({ x: 18, y: y2 - 48, width: 245, height: 48, borderColor: GRAY, borderWidth: 0.5 })
      sigH = 56
    }

    y2 -= sigH + 6
    page2.drawLine({ start: { x: 18, y: y2 + 3 }, end: { x: 275, y: y2 + 3 }, thickness: 0.7, color: TEAL })
    y2 -= 4
    const nombreFirmante = d.menor_de_edad && d.nombre_acudiente
      ? `${d.nombre_acudiente} (Representante Legal)`
      : d.nombre_paciente
    page2.drawText(nombreFirmante, { x: 18, y: y2, size: 8.5, font: fontBold, color: BLACK })
    y2 -= 12
    page2.drawText(`${d.tipo_documento}: ${d.numero_documento}`, { x: 18, y: y2, size: 7.5, font, color: GRAY })
    y2 -= 11
    page2.drawText(`Fecha y hora: ${fechaTexto}  ${horaTexto}`, { x: 18, y: y2, size: 7.5, font, color: GRAY })
    if (ipOrigen) {
      y2 -= 10
      page2.drawText(`IP de origen: ${ipOrigen}`, { x: 18, y: y2, size: 7, font, color: GRAY })
    }

    y2 -= 20
    page2.drawRectangle({ x: 18, y: y2 - 5, width: W - 36, height: 26, color: TEAL_LITE, borderColor: TEAL, borderWidth: 0.5 })
    page2.drawText('Documento generado electronicamente con validez juridica segun la Ley 527 de 1999 (Comercio Electronico).', {
      x: 24, y: y2 + 5, size: 6.5, font, color: TEAL_DARK,
    })
    page2.drawText(`Para verificar autenticidad contacte: ${CONTACT_EMAIL}`, {
      x: 24, y: y2 - 5, size: 6.5, font, color: TEAL_DARK,
    })

    // ── Serializar PDF ───────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save()

    // ── Nombre del archivo: CI-{numero_documento}-{radicado} ─────────────────
    const docSlug = d.numero_documento.replace(/[^A-Za-z0-9]/g, '')
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
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
          <p><strong>Fecha:</strong> ${fechaTexto} ${horaTexto}</p>
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