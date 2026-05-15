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
    const TEAL = rgb(0.039, 0.42, 0.42) // #0A6B6B
    const BLACK = rgb(0, 0, 0)
    const GRAY = rgb(0.4, 0.4, 0.4)
    const GOLD = rgb(0.72, 0.525, 0.043) // #B8860B
    const WHITE = rgb(1, 1, 1)

    // ── Helper: dibujar encabezado de página ─────────────────────────────────
    const drawPageHeader = (page: ReturnType<typeof pdfDoc.addPage>, pageNum: number) => {
      const { width, height } = page.getSize()
      // Fondo blanco con borde inferior teal (igual que el header web)
      page.drawRectangle({ x: 0, y: height - 75, width, height: 75, color: WHITE })
      page.drawRectangle({ x: 0, y: height - 78, width, height: 3, color: TEAL })

      // Logo simulado: rectángulo teal pequeño con texto "BTS"
      page.drawRectangle({ x: 30, y: height - 65, width: 42, height: 42, color: TEAL })
      page.drawText('BTS', { x: 37, y: height - 45, size: 11, font: fontBold, color: WHITE })
      page.drawText('INTEGRAL', { x: 32, y: height - 57, size: 6, font, color: WHITE })

      // Textos del encabezado
      page.drawText('PROGRAMA DE SOPORTE A PACIENTES', {
        x: 82, y: height - 28, size: 7, font, color: GRAY,
      })
      page.drawText('Valentech Pharma Colombia', {
        x: 82, y: height - 42, size: 13, font: fontBold, color: BLACK,
      })
      page.drawText('Operado por BTS Integral \u00b7 Cl\u00ednicas Botospa S.A.S.', {
        x: 82, y: height - 56, size: 7, font, color: GOLD,
      })
      // Número de página (alineado a la derecha)
      page.drawText(`P\u00e1g. ${pageNum}/3`, {
        x: width - 60, y: height - 45, size: 7, font, color: GRAY,
      })
    }

    // ── Página 1: Datos del paciente ─────────────────────────────────────────
    const page1 = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page1.getSize()
    let y = height - 40
    drawPageHeader(page1, 1)

    y = height - 100
    page1.drawText('AUTORIZACION PARA EL TRATAMIENTO DE DATOS PERSONALES', {
      x: 30, y, size: 12, font: fontBold, color: TEAL,
    })

    y -= 20
    page1.drawText(`Radicado: ${radicado}`, { x: 30, y, size: 8, font, color: GRAY })
    y -= 12
    page1.drawText(`Fecha: ${fechaTexto}  Hora: ${horaTexto}`, { x: 30, y, size: 8, font, color: GRAY })

    y -= 20
    page1.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: TEAL })

    // Datos del paciente en tabla simple
    y -= 20
    page1.drawText('DATOS DEL PACIENTE', { x: 30, y, size: 10, font: fontBold, color: TEAL })
    y -= 15

    const campos: [string, string][] = [
      ['Nombre completo', d.nombre_paciente],
      ['Tipo de documento', d.tipo_documento],
      ['Número de documento', d.numero_documento],
      ['Fecha de nacimiento', d.fecha_nacimiento],
      ['Teléfono', d.telefono],
      ['Correo electrónico', d.correo || '—'],
      ['Ciudad', d.ciudad || '—'],
      ['Dirección', d.direccion || '—'],
    ]

    for (const [label, value] of campos) {
      page1.drawText(`${label}:`, { x: 30, y, size: 8.5, font: fontBold, color: BLACK })
      page1.drawText(value, { x: 180, y, size: 8.5, font, color: BLACK })
      y -= 14
    }

    if (d.menor_de_edad) {
      y -= 8
      page1.drawText('REPRESENTANTE LEGAL / ACUDIENTE', { x: 30, y, size: 10, font: fontBold, color: TEAL })
      y -= 15
      const acudienteCampos: [string, string][] = [
        ['Nombre', d.nombre_acudiente],
        ['Tipo doc.', d.tipo_doc_acudiente],
        ['Número doc.', d.documento_acudiente],
      ]
      for (const [label, value] of acudienteCampos) {
        page1.drawText(`${label}:`, { x: 30, y, size: 8.5, font: fontBold, color: BLACK })
        page1.drawText(value, { x: 180, y, size: 8.5, font, color: BLACK })
        y -= 14
      }
    }

    // ── Página 2: Texto legal ────────────────────────────────────────────────
    const page2 = pdfDoc.addPage([595, 842])
    drawPageHeader(page2, 2)
    page2.drawText('Autorizacion - Texto Legal Completo', {
      x: 30, y: 842 - 100, size: 11, font: fontBold, color: TEAL,
    })

    const textoLegal = [
      'El Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S., operado por la línea de',
      'servicio Best Therapeutic Service – BTS Integral de la sociedad Clínicas Botospa S.A.S., en',
      'cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, define este documento en el cual',
      'el paciente autoriza de manera previa, expresa e informada el tratamiento de sus datos personales.',
      '',
      '1. Suministro de datos: el paciente provee datos personales incluyendo información de contacto,',
      '   edad y datos necesarios para solicitar historia clínica y reportes de diagnóstico.',
      '2. Autorización de tratamiento: autoriza a BTS Integral para tratar datos y obtener información',
      '   clínica de médicos tratantes, IPS, dispensadores y aseguradoras.',
      '3. Información BTS Integral: datos sensibles incluyen historia clínica, fórmulas médicas y',
      '   autorizaciones EPS. Finalidades: contacto, gestión ante EPS/IPS, trámites INVIMA/VUCE.',
      '4. Responsables: Valentech y/o BTS Integral como responsables; encargados bajo normatividad.',
      '5. Destinatarios: autoridades de salud (INVIMA), operadores del programa, terceros necesarios.',
      '6. Transferencia internacional: autoriza transferencias a servidores fuera de Colombia cuando',
      '   sea necesario para la prestación del servicio.',
      '7. Datos sensibles: entrega facultativa y voluntaria de datos de salud, historia clínica y biométricos.',
      '8. Menores de edad: tratamiento facultativo bajo las mismas finalidades.',
      '9. Derechos del titular: conocer, actualizar, rectificar, solicitar prueba, revocar autorización.',
      '   Quejas ante la SIC. Ejercicio según Políticas de Protección de Datos.',
      '10. Estudios de vida real: uso anonimizado con fines científicos, sin modificar tratamiento.',
      '11. Políticas: valentechforlife.com y bts-integral.com',
      '    Contacto: programaapoyandovidas@bts-integral.com | (57) 3209188394',
      '    Dirección: Calle 90 # 18-59 Bogotá, Colombia | legal@bts-corporate.com',
    ]

    let y2 = 842 - 120
    for (const linea of textoLegal) {
      if (y2 < 60) break
      page2.drawText(linea, { x: 30, y: y2, size: 7.5, font, color: BLACK })
      y2 -= linea === '' ? 6 : 12
    }

    // ── Página 3: Declaración + firma ────────────────────────────────────────
    const page3 = pdfDoc.addPage([595, 842])
    drawPageHeader(page3, 3)
    page3.drawText('Declaracion de Autorizacion y Firma', {
      x: 30, y: 842 - 100, size: 11, font: fontBold, color: TEAL,
    })

    let y3 = 842 - 120
    const declaracion = [
      'DECLARACIÓN: He leído y entendido el presente documento de Autorización para el Tratamiento',
      'de Datos Personales. Declaro que se me informó sobre las finalidades y condiciones del tratamiento',
      'de mis Datos Personales, incluidos los Datos Sensibles.',
      '',
      'En consecuencia, ACEPTO / AUTORIZO expresamente a Valentech y/o BTS Integral para tratar',
      'mis datos conforme a lo aquí señalado, así como para realizar transferencias nacionales o',
      'internacionales cuando sean necesarias para cumplir tales finalidades.',
    ]

    for (const linea of declaracion) {
      page3.drawText(linea, { x: 30, y: y3, size: 8.5, font, color: BLACK })
      y3 -= linea === '' ? 6 : 14
    }

    y3 -= 20
    page3.drawText('(X) ACEPTO / AUTORIZO', { x: 30, y: y3, size: 12, font: fontBold, color: TEAL })

    y3 -= 40
    page3.drawText('FIRMA:', { x: 30, y: y3, size: 9, font: fontBold, color: BLACK })

    // Insertar imagen de firma
    try {
      const base64Data = firmaBase64.replace(/^data:image\/png;base64,/, '')
      const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(pngBytes)
      const sigDims = sigImage.scale(0.4)
      page3.drawImage(sigImage, {
        x: 30, y: y3 - sigDims.height - 10,
        width: sigDims.width, height: sigDims.height,
      })
      y3 -= sigDims.height + 20
    } catch (_e) {
      y3 -= 20
    }

    page3.drawLine({ start: { x: 30, y: y3 }, end: { x: 250, y: y3 }, thickness: 0.8, color: BLACK })
    y3 -= 12
    const nombreFirmante = d.menor_de_edad && d.nombre_acudiente
      ? `${d.nombre_acudiente} (Representante Legal)`
      : d.nombre_paciente
    page3.drawText(nombreFirmante, { x: 30, y: y3, size: 8, font, color: GRAY })
    y3 -= 12
    page3.drawText(`Doc: ${d.tipo_documento} ${d.numero_documento}`, { x: 30, y: y3, size: 8, font, color: GRAY })
    y3 -= 12
    page3.drawText(`Fecha: ${fechaTexto}  ${horaTexto}`, { x: 30, y: y3, size: 8, font, color: GRAY })
    if (ipOrigen) {
      y3 -= 12
      page3.drawText(`IP: ${ipOrigen}`, { x: 30, y: y3, size: 7, font, color: GRAY })
    }

    // Pie de página
    for (const page of [page1, page2, page3]) {
      page.drawLine({ start: { x: 30, y: 40 }, end: { x: width - 30, y: 40 }, thickness: 0.3, color: TEAL })
      page.drawText('BTS Integral · Clínicas Botospa S.A.S. · ' + CONTACT_EMAIL, {
        x: 30, y: 28, size: 7, font, color: GRAY,
      })
      page.drawText(`Radicado: ${radicado}`, {
        x: width - 200, y: 28, size: 7, font, color: GRAY,
      })
    }

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
