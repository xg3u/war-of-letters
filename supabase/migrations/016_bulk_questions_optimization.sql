-- 016_bulk_questions_optimization.sql
-- تحسين أداء جلب الأسئلة: طلب واحد بدل 29 طلب
--
-- المشكلة: prefetchAllArabicLetters يرسل 29 RPC منفصل (واحد لكل حرف)
-- الحل: دالة واحدة ترجع أسئلة عشوائية لكل الحروف دفعة واحدة

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. RPC: get_bulk_random_questions
--    يرجع p_limit سؤال عشوائي لكل حرف عربي موجود في الجدول
--    = استدعاء DB واحد بدل 29
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_bulk_random_questions(
  p_limit_per_letter INT DEFAULT 60,
  p_exclude_ids      INT[] DEFAULT '{}'
)
RETURNS SETOF questions
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_letter TEXT;
BEGIN
  -- نمر على كل حرف موجود في الجدول ونرجع p_limit سؤال لكل واحد
  FOR v_letter IN
    SELECT DISTINCT letter_assigned FROM questions ORDER BY letter_assigned
  LOOP
    RETURN QUERY
      SELECT q.*
      FROM questions q
      WHERE q.letter_assigned = v_letter
        AND (cardinality(p_exclude_ids) = 0 OR q.id != ALL(p_exclude_ids))
      ORDER BY random()
      LIMIT p_limit_per_letter;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_bulk_random_questions(INT, INT[]) TO authenticated, anon;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RPC: batch_mark_seen
--    تسجيل عدة أسئلة كمشاهدة دفعة واحدة (بدل INSERT واحد لكل سؤال)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION batch_mark_seen(
  p_question_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  INSERT INTO user_seen_questions (user_id, question_id)
  SELECT uid, unnest(p_question_ids)
  ON CONFLICT (user_id, question_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_mark_seen(TEXT[]) TO authenticated;
