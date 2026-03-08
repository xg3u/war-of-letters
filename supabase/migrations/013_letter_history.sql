-- 013_letter_history.sql
-- تتبع ظهور الحروف لكل مستخدم لضمان التنويع عبر الأجهزة

CREATE TABLE IF NOT EXISTS user_letter_history (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter     CHAR(1) NOT NULL,
  last_grid  INT NOT NULL DEFAULT 0,        -- رقم آخر شبكة ظهر فيها الحرف
  times_seen INT NOT NULL DEFAULT 0,        -- عدد مرات الظهور الإجمالي
  PRIMARY KEY (user_id, letter)
);

-- الفهرس يسرّع الجلب
CREATE INDEX IF NOT EXISTS idx_ulh_user ON user_letter_history(user_id);

-- عداد الشبكات لكل مستخدم
CREATE TABLE IF NOT EXISTS user_grid_counter (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grid_count INT NOT NULL DEFAULT 0
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE user_letter_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ulh_self_select" ON user_letter_history;
CREATE POLICY "ulh_self_select"
  ON user_letter_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ulh_self_insert" ON user_letter_history;
CREATE POLICY "ulh_self_insert"
  ON user_letter_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ulh_self_update" ON user_letter_history;
CREATE POLICY "ulh_self_update"
  ON user_letter_history FOR UPDATE
  USING (auth.uid() = user_id);

ALTER TABLE user_grid_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ugc_self_select" ON user_grid_counter;
CREATE POLICY "ugc_self_select"
  ON user_grid_counter FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ugc_self_insert" ON user_grid_counter;
CREATE POLICY "ugc_self_insert"
  ON user_grid_counter FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ugc_self_update" ON user_grid_counter;
CREATE POLICY "ugc_self_update"
  ON user_grid_counter FOR UPDATE
  USING (auth.uid() = user_id);

-- ── RPC: حفظ تاريخ الحروف دفعة واحدة ──────────────────────────────────────
CREATE OR REPLACE FUNCTION save_letter_history(
  p_letters TEXT[],
  p_grid_no INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID := auth.uid();
  l TEXT;
BEGIN
  -- تحديث عداد الشبكات
  INSERT INTO user_grid_counter (user_id, grid_count)
  VALUES (uid, p_grid_no + 1)
  ON CONFLICT (user_id) DO UPDATE SET grid_count = EXCLUDED.grid_count;

  -- إدراج أو تحديث كل حرف
  FOREACH l IN ARRAY p_letters LOOP
    INSERT INTO user_letter_history (user_id, letter, last_grid, times_seen)
    VALUES (uid, l, p_grid_no, 1)
    ON CONFLICT (user_id, letter) DO UPDATE
      SET last_grid  = p_grid_no,
          times_seen = user_letter_history.times_seen + 1;
  END LOOP;
END;
$$;
