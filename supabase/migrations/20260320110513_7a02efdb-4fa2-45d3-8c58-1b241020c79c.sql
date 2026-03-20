
-- Fix: add SET search_path to set_updated_at function to prevent mutable search path warning
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
