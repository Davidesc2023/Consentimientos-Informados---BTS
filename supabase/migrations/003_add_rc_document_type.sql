-- Migración 003: Añadir RC (Registro Civil) a los tipos de documento válidos
-- Necesario tras ampliar el catálogo en el frontend

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar todos los CHECK de tipo_documento en consentimientos
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
     AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_name = 'consentimientos'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%tipo_documento%'
      AND cc.check_clause NOT ILIKE '%tipo_doc_acudiente%'
  LOOP
    EXECUTE 'ALTER TABLE consentimientos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  -- Eliminar todos los CHECK de tipo_doc_acudiente
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
     AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_name = 'consentimientos'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%tipo_doc_acudiente%'
  LOOP
    EXECUTE 'ALTER TABLE consentimientos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Recrear con RC incluido
ALTER TABLE consentimientos
  ADD CONSTRAINT consentimientos_tipo_doc_check
  CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'RC', 'Pasaporte'));

ALTER TABLE consentimientos
  ADD CONSTRAINT consentimientos_tipo_doc_acudiente_check
  CHECK (tipo_doc_acudiente IN ('CC', 'TI', 'CE', 'RC', 'Pasaporte') OR tipo_doc_acudiente IS NULL);
