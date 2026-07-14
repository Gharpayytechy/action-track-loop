
-- =========================================================
-- EXECUTION OS SCHEMA
-- =========================================================

-- Enums
CREATE TYPE public.exec_stage AS ENUM (
  'login','mission','baseline',
  'block1','break1','resume1',
  'block2','break2','resume2',
  'block3','impact','done'
);

CREATE TYPE public.exec_checkpoint AS ENUM ('baseline','initial','onit','impact');

CREATE TYPE public.kpi_kind AS ENUM (
  'call','connected','tour_sched','tour_done',
  'prebook','movein','super_lead','reinstate','chat'
);

-- =========================================================
-- day_records
-- =========================================================
CREATE TABLE public.day_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  stage public.exec_stage NOT NULL DEFAULT 'login',
  mission_priorities text[] NOT NULL DEFAULT '{}',
  mission_goal text,
  mission_risk text,
  expected_finish text,
  energy int CHECK (energy BETWEEN 1 AND 4),
  energy_reason text,
  kpi_goals jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpi_totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  scorecard jsonb,
  tomorrow_priority text,
  ai_narrative text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_records TO authenticated;
GRANT ALL ON public.day_records TO service_role;

ALTER TABLE public.day_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_records self read"   ON public.day_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "day_records self write"  ON public.day_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_records self update" ON public.day_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_records mgr read"    ON public.day_records FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- stage_events
-- =========================================================
CREATE TABLE public.stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  stage public.exec_stage NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  selfie_path text,
  geo_lat double precision,
  geo_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stage_events_day_idx ON public.stage_events(day_id);
CREATE INDEX stage_events_user_idx ON public.stage_events(user_id, entered_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.stage_events TO authenticated;
GRANT ALL ON public.stage_events TO service_role;

ALTER TABLE public.stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_events self read"   ON public.stage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "stage_events self write"  ON public.stage_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stage_events self update" ON public.stage_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stage_events mgr read"    ON public.stage_events FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- whatsapp_proofs
-- =========================================================
CREATE TABLE public.whatsapp_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  checkpoint public.exec_checkpoint NOT NULL,
  image_path text NOT NULL,
  unread int,
  ocr jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, checkpoint)
);
CREATE INDEX wa_proofs_user_idx ON public.whatsapp_proofs(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_proofs TO authenticated;
GRANT ALL ON public.whatsapp_proofs TO service_role;

ALTER TABLE public.whatsapp_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa self read"   ON public.whatsapp_proofs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wa self write"  ON public.whatsapp_proofs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa self update" ON public.whatsapp_proofs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa mgr read"    ON public.whatsapp_proofs FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- kpi_events
-- =========================================================
CREATE TABLE public.kpi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  kind public.kpi_kind NOT NULL,
  delta int NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kpi_events_day_idx ON public.kpi_events(day_id, created_at DESC);
CREATE INDEX kpi_events_user_idx ON public.kpi_events(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.kpi_events TO authenticated;
GRANT ALL ON public.kpi_events TO service_role;

ALTER TABLE public.kpi_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi self read"   ON public.kpi_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "kpi self write"  ON public.kpi_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kpi self delete" ON public.kpi_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "kpi mgr read"    ON public.kpi_events FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- sla_breaches
-- =========================================================
CREATE TABLE public.sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  chat_hint text,
  hours_stuck numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sla_breaches_day_idx ON public.sla_breaches(day_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.sla_breaches TO authenticated;
GRANT ALL ON public.sla_breaches TO service_role;

ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla self read"  ON public.sla_breaches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sla self write" ON public.sla_breaches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sla mgr read"   ON public.sla_breaches FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- updates
-- =========================================================
CREATE TABLE public.exec_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  checkpoint public.exec_checkpoint NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, checkpoint)
);

GRANT SELECT, INSERT, UPDATE ON public.exec_updates TO authenticated;
GRANT ALL ON public.exec_updates TO service_role;

ALTER TABLE public.exec_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upd self read"   ON public.exec_updates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "upd self write"  ON public.exec_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd self update" ON public.exec_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd mgr read"    ON public.exec_updates FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- manager_nudges
-- =========================================================
CREATE TABLE public.manager_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.day_records(id) ON DELETE SET NULL,
  note text NOT NULL,
  acked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nudges_to_idx ON public.manager_nudges(to_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.manager_nudges TO authenticated;
GRANT ALL ON public.manager_nudges TO service_role;

ALTER TABLE public.manager_nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nudge recipient read" ON public.manager_nudges FOR SELECT TO authenticated USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
CREATE POLICY "nudge mgr write"      ON public.manager_nudges FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id AND public.is_manager_or_admin(auth.uid()));
CREATE POLICY "nudge ack"            ON public.manager_nudges FOR UPDATE TO authenticated USING (auth.uid() = to_user_id) WITH CHECK (auth.uid() = to_user_id);

-- =========================================================
-- daily_scores
-- =========================================================
CREATE TABLE public.daily_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.day_records(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  streaks jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_scores TO authenticated;
GRANT ALL ON public.daily_scores TO service_role;

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores self read" ON public.daily_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores self write" ON public.daily_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scores self update" ON public.daily_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scores mgr read" ON public.daily_scores FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE TRIGGER day_records_updated_at
  BEFORE UPDATE ON public.day_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.day_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_breaches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exec_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_proofs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_nudges;
