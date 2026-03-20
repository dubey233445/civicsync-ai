
-- CivicSync Database Schema

-- ── 1. Profiles table (extends auth.users) ───────────────────────────
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'worker')) DEFAULT 'worker',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  performance_score NUMERIC(4,2) DEFAULT 7.5 CHECK (performance_score >= 0 AND performance_score <= 10),
  avatar_url        TEXT,
  phone             TEXT,
  region            TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Tasks ─────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  latitude      DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude     DOUBLE PRECISION NOT NULL DEFAULT 0,
  location_name TEXT,
  region        TEXT,
  priority      TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  category      TEXT DEFAULT 'general',
  status        TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  assigned_to   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  due_date      TIMESTAMPTZ,
  ai_assigned   BOOLEAN DEFAULT false,
  ai_score      NUMERIC(5,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Submissions ───────────────────────────────────────────────────
CREATE TABLE public.submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url   TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  notes       TEXT,
  status      TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')) DEFAULT 'submitted',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Row Level Security ─────────────────────────────────────────────
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin')
$$;

CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "tasks_select_auth"   ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_admin_insert"  ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tasks_admin_update"  ON public.tasks FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "tasks_admin_delete"  ON public.tasks FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "submissions_select"       ON public.submissions FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "submissions_insert_own"   ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submissions_admin_update" ON public.submissions FOR UPDATE USING (public.is_admin(auth.uid()));

-- ── 5. Auto-create profile on signup ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. Task status auto-update on submission ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_task_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.tasks SET status = 'in_progress', updated_at = now()
  WHERE id = NEW.task_id AND status = 'assigned';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_submission_created
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_submission();

-- ── 7. Performance score update on approval ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_submission_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.tasks SET status = 'completed', updated_at = now() WHERE id = NEW.task_id;
    UPDATE public.profiles SET performance_score = LEAST(10.0, performance_score + 0.1), updated_at = now() WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_submission_status_change
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_submission_approved();

-- ── 8. Updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasks_updated_at    BEFORE UPDATE ON public.tasks    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 9. Storage bucket for proof images ───────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('task-proofs', 'task-proofs', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "task_proofs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-proofs');
CREATE POLICY "task_proofs_select" ON storage.objects FOR SELECT USING (bucket_id = 'task-proofs');
