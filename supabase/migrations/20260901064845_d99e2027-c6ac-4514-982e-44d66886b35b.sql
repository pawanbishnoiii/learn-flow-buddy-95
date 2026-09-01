CREATE TABLE public.session_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'pause',
  note text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_breaks TO authenticated;
GRANT ALL ON public.session_breaks TO service_role;

ALTER TABLE public.session_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own breaks" ON public.session_breaks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX session_breaks_user_started_idx ON public.session_breaks (user_id, started_at DESC);

ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0;

CREATE TABLE public.motivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'quote',
  title text NOT NULL,
  body text NOT NULL,
  author text,
  month smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.motivations TO anon;
GRANT SELECT ON public.motivations TO authenticated;
GRANT ALL ON public.motivations TO service_role;

ALTER TABLE public.motivations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "motivations readable" ON public.motivations FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.motivations (kind, title, body, author, month) VALUES
('quote', 'Start small, stay daily', 'Ek din ka 2 ghanta consistent padhna, mahine me 60 ghante ban jata hai. Aaj shuru karo.', 'Chronodeck', NULL),
('quote', 'Focus beats intensity', 'Deep work of one hour is worth three distracted hours. Phone door rakho, timer chalu karo.', 'Cal Newport (paraphrased)', NULL),
('quote', 'Track what you treasure', 'What gets measured gets improved. Har session log karo, hafte ke end me sach dikhega.', 'Peter Drucker (paraphrased)', NULL),
('quote', 'Rest is part of the plan', 'Breaks are not cheating. 50 minute padho, 10 minute breathe karo, phir wapas.', 'Chronodeck', NULL),
('quote', 'Show up on bad days', 'Motivation aati jaati hai, system rehta hai. Aaj sirf 20 minute karo — momentum wapas aayega.', 'James Clear (paraphrased)', NULL),
('magazine', 'Monthly read: Science Reporter', 'Ek mahine me kam se kam ek magazine poori padho. Science Reporter general science aur current tech ke liye best hai.', 'NISCAIR', 1),
('magazine', 'Monthly read: Yojana', 'Policy, economy aur governance samajhne ke liye Yojana. Notes banao har chapter ke baad.', 'Govt of India', 2),
('magazine', 'Monthly read: Down To Earth', 'Environment aur sustainability ke liye. Weekly ek article summarise karo apne words me.', 'CSE', 3),
('magazine', 'Monthly read: Kurukshetra', 'Rural development aur schemes. Padhne ke baad 5 bullet points likho.', 'Govt of India', 4),
('magazine', 'Monthly read: Frontline', 'Long-form journalism — reading speed aur comprehension dono improve hoti hai.', 'The Hindu Group', 5),
('magazine', 'Monthly read: Economic & Political Weekly', 'Analytical writing ke liye. Ek article per week kaafi hai.', 'EPW', 6);