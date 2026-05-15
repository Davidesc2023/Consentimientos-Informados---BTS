-- ============================================================
-- Migración 001: Tabla de consentimientos informados
-- Sistema de Consentimientos - BTS Integral / Valentech Pharma
-- Cumplimiento Ley 1581/2012 y Decreto 1377/2013
-- ============================================================

CREATE TABLE IF NOT EXISTS consentimientos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_creacion        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Datos del paciente
  nombre_paciente       VARCHAR(255) NOT NULL,
  tipo_documento        VARCHAR(20)  NOT NULL CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'Pasaporte')),
  numero_documento      VARCHAR(50)  NOT NULL,
  fecha_nacimiento      DATE         NOT NULL,
  telefono              VARCHAR(30)  NOT NULL,
  correo                VARCHAR(255),
  ciudad                VARCHAR(100),
  direccion             VARCHAR(255),

  -- Menor de edad / representante legal
  menor_de_edad         BOOLEAN      NOT NULL DEFAULT false,
  nombre_acudiente      VARCHAR(255),
  tipo_doc_acudiente    VARCHAR(20)  CHECK (tipo_doc_acudiente IN ('CC', 'TI', 'CE', 'Pasaporte') OR tipo_doc_acudiente IS NULL),
  documento_acudiente   VARCHAR(50),

  -- Programa
  programa              VARCHAR(255) NOT NULL DEFAULT 'Programa de Soporte a Pacientes de Valentech Pharma Colombia S.A.S.',
  version_consentimiento VARCHAR(20) NOT NULL DEFAULT 'v1.0',

  -- Firma y PDF
  firma_base64          TEXT         NOT NULL,
  pdf_url               TEXT,

  -- Metadatos técnicos
  ip_origen             INET,
  acepto_terminos       BOOLEAN      NOT NULL DEFAULT true,

  -- Índices frecuentes
  CONSTRAINT consentimientos_doc_unico UNIQUE (numero_documento, fecha_creacion)
);

-- Índice para búsquedas administrativas por paciente
CREATE INDEX IF NOT EXISTS idx_consentimientos_doc
  ON consentimientos (numero_documento);

CREATE INDEX IF NOT EXISTS idx_consentimientos_fecha
  ON consentimientos (fecha_creacion DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE consentimientos ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario anónimo puede INSERTAR (paciente llena el formulario)
CREATE POLICY "insert_anon"
  ON consentimientos
  FOR INSERT
  TO anon
  WITH CHECK (acepto_terminos = true);

-- Política: solo el rol service_role puede LEER (admin interno / Edge Functions)
-- Las consultas del admin panel usarán la service_role key del lado del servidor.
-- No se expone lectura pública.
CREATE POLICY "select_service_role"
  ON consentimientos
  FOR SELECT
  TO service_role
  USING (true);

-- Política: solo service_role puede actualizar (e.g., agregar pdf_url después de generar)
CREATE POLICY "update_service_role"
  ON consentimientos
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
