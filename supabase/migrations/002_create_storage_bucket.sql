-- Crear bucket privado para los PDFs de consentimientos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs-consentimientos',
  'pdfs-consentimientos',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política: solo service_role puede leer/escribir
CREATE POLICY "service_role_all" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'pdfs-consentimientos')
  WITH CHECK (bucket_id = 'pdfs-consentimientos');
