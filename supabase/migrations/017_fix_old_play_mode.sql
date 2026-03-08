-- 017_fix_old_play_mode.sql
-- تصحيح البيانات القديمة: كل الجلسات السابقة كانت "حروف مع عزيز" لكن سُجلت كـ 'normal' بالخطأ

UPDATE session_logs
SET play_mode = 'tv-show'
WHERE play_mode = 'normal' OR play_mode IS NULL;
