UPDATE public.ai_providers
SET model = 'gemini-2.5-flash', updated_at = now()
WHERE id = '4d7506df-d140-417f-ad7f-9eba75506d2e'
  AND vendor = 'gemini'
  AND category = 'text'
  AND model = 'text ai';