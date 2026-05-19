-- Migracion 003: Anadir RC (Registro Civil) a los tipos de documento validos
-- Necesario tras ampliar el catalogo en el frontend

-- Eliminar constraints inline auto-nombradas por PostgreSQL en la migracion 001
ALTER TABLE consentimientos DROP CONSTRAINT IF EXISTS consentimientos_tipo_documento_check;
ALTER TABLE consentimientos DROP CONSTRAINT IF EXISTS consentimientos_tipo_doc_acudiente_check;
-- Por si una ejecucion previa de esta migracion ya creo estos nombres explicitamente
ALTER TABLE consentimientos DROP CONSTRAINT IF EXISTS consentimientos_tipo_doc_check;

-- Recrear incluyendo RC
ALTER TABLE consentimientos
  ADD CONSTRAINT consentimientos_tipo_doc_check
  CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'RC', 'Pasaporte'));

ALTER TABLE consentimientos
  ADD CONSTRAINT consentimientos_tipo_doc_acudiente_check
  CHECK (tipo_doc_acudiente IN ('CC', 'TI', 'CE', 'RC', 'Pasaporte') OR tipo_doc_acudiente IS NULL);
