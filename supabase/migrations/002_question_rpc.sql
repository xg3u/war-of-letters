-- =============================================================================
-- 002_question_rpc.sql
-- War of Letters — نظام جلب الأسئلة الذكي من طرف قاعدة البيانات
--
-- يُطبَّق عبر: Supabase Dashboard → SQL Editor → Run
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- § 1 — RPC: get_random_questions
-- ─────────────────────────────────────────────────────────────────────────────
-- المشكلة: SELECT * ORDER BY random() يقرأ كل الجدول ثم يرتّبه → بطيء جداً
--            عند وجود آلاف الأسئلة.
--
-- الحل الأمثل للجداول المتوسطة (<100k سطر):
--   1. استخدام فهرس على letter_assigned (الأسرع لتصفية الحرف)
--   2. TABLESAMPLE BERNOULLI لعينة عشوائية في الـ storage level
--   3. ORDER BY random() LIMIT داخل العينة (عدد قليل جداً → لا تكلفة)
--
-- النتيجة: الـ DB يقرأ ~5% من الصفوف فقط، ثم يختار من بينها عشوائياً.
-- ─────────────────────────────────────────────────────────────────────────────

-- فهرس على letter_assigned إذا لم يكن موجوداً (ضروري للأداء)
CREATE INDEX IF NOT EXISTS idx_questions_letter
  ON questions (letter_assigned);

-- الدالة الرئيسية
CREATE OR REPLACE FUNCTION get_random_questions(
  p_letter       text,
  p_limit        int     DEFAULT 50,
  p_exclude_ids  uuid[]  DEFAULT ARRAY[]::uuid[]
)
RETURNS SETOF questions
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_total   int;
  v_sample  numeric;
BEGIN
  -- عدد الأسئلة لهذا الحرف
  SELECT COUNT(*) INTO v_total
  FROM questions
  WHERE letter_assigned = p_letter;

  -- نسبة العينة: إما كافية لإعادة p_limit سؤال أو 100% للجداول الصغيرة
  -- الحد الأدنى 10% لضمان عشوائية كافية
  IF v_total <= 0 THEN
    RETURN;
  END IF;

  v_sample := LEAST(100.0, GREATEST(10.0, (p_limit::numeric / v_total) * 150.0));

  -- أسلوب TABLESAMPLE للجداول الكبيرة (>500 سطر)
  IF v_total > 500 THEN
    RETURN QUERY
      SELECT q.*
      FROM questions TABLESAMPLE BERNOULLI(v_sample) AS q
      WHERE q.letter_assigned = p_letter
        AND (cardinality(p_exclude_ids) = 0 OR q.id != ALL(p_exclude_ids))
      ORDER BY random()
      LIMIT p_limit;
  ELSE
    -- للجداول الصغيرة: ORDER BY random() مباشرة (سريع لأن العدد قليل)
    RETURN QUERY
      SELECT *
      FROM questions
      WHERE letter_assigned = p_letter
        AND (cardinality(p_exclude_ids) = 0 OR id != ALL(p_exclude_ids))
      ORDER BY random()
      LIMIT p_limit;
  END IF;
END;
$$;

-- منح صلاحية الاستدعاء لجميع المستخدمين
GRANT EXECUTE ON FUNCTION get_random_questions(text, int, uuid[]) TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- § 2 — RPC: get_question_counts_by_letter
-- ─────────────────────────────────────────────────────────────────────────────
-- تُستخدم في HostScreen لمعرفة عدد الأسئلة لكل حرف قبل بدء الجلسة
-- أسرع بكثير من COUNT(*) منفردة لكل حرف
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_question_counts_by_letter()
RETURNS TABLE (letter text, question_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT letter_assigned AS letter, COUNT(*) AS question_count
  FROM questions
  GROUP BY letter_assigned
  ORDER BY letter_assigned;
$$;

GRANT EXECUTE ON FUNCTION get_question_counts_by_letter() TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- § 3 — فهارس إضافية للأداء
-- ─────────────────────────────────────────────────────────────────────────────

-- فهرس مركّب: letter + category (للفلترة حسب التصنيف مستقبلاً)
CREATE INDEX IF NOT EXISTS idx_questions_letter_category
  ON questions (letter_assigned, category_id);

-- فهرس على user_seen_questions (تسريع عمليات التحقق من الأسئلة المشاهدة)
CREATE INDEX IF NOT EXISTS idx_user_seen_questions_user_question
  ON user_seen_questions (user_id, question_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- انتهى — قم بتشغيل هذا الملف في Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
