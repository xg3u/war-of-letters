# War of Letters — Database Reference

> آخر تحديث: 2026-03-08
> Supabase Project — PostgreSQL 15+

---

## الجداول

### 1. `questions` — بنك الأسئلة
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `int4` PK | رقم تسلسلي (sequence: `questions_id_seq`) |
| `category_id` | `int4` FK → categories.id | تصنيف السؤال |
| `question_text` | `text` | نص السؤال |
| `correct_answer` | `text` | الإجابة الصحيحة |
| `letter_assigned` | `text` | الحرف العربي المخصص للسؤال |

**الفهارس:** `idx_questions_letter`, `idx_questions_letter_category`
**RLS:** قراءة عامة، الأدمن فقط يضيف/يعدل/يحذف.
**Migration:** pre-existing + 001, 002, 008, 010

---

### 2. `categories` — تصنيفات الأسئلة
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `int4` PK | معرف التصنيف |
| `name` | `text` | الاسم بالإنجليزية (مهمل) |
| `description` | `text` | وصف (مهمل) |
| `name_ar` | `text` | الاسم بالعربية |

**القيم الافتراضية:** رياضة، تاريخ، علوم، جغرافيا، ثقافة عامة، إسلامية
**RLS:** قراءة عامة، الأدمن يدير.
**Migration:** pre-existing + 010

---

### 3. `buyers` — المستخدمون والاشتراكات
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK, FK → auth.users | معرف المستخدم |
| `email` | `text` | البريد الإلكتروني |
| `created_at` | `timestamptz` | تاريخ التسجيل |
| `plan_type` | `text` | `free` \| `single` \| `3_days` \| `72_hours` \| `lifetime` |
| `subscription_status` | `text` | حالة الاشتراك |
| `expires_at` | `timestamptz` | تاريخ انتهاء الباقة المؤقتة |
| `role` | `text` | `user` \| `partner` \| `admin` |
| `referred_by_partner_id` | `uuid` FK → buyers.id | الشريك المُحيل |

**الفهارس:** `idx_buyers_email_lower` (بحث بدون حساسية حالة)
**Realtime:** مُفعّل (REPLICA IDENTITY FULL) — إشعار فوري عند تغيير الباقة.
**RLS:**
- المستخدم يقرأ/يعدل صفه فقط
- الأدمن يقرأ/يعدل/يحذف الكل (عبر `is_admin()`)
- الشريك يقرأ عملاءه فقط (عبر `is_partner()`)
- أي مستخدم مسجل يضيف صفه (`buyers_self_insert`)
**Migration:** pre-existing + 001, 005, 006, 007, 011, 012

---

### 4. `activation_codes` — أكواد التفعيل (B2B)
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK | معرف الكود |
| `code` | `text` UNIQUE | الكود النصي |
| `plan_type` | `text` | `3_days` \| `unlimited` |
| `owner_partner_id` | `uuid` FK | الشريك المالك |
| `batch_id` | `text` | معرف الدفعة |
| `is_used` | `bool` | هل تم استخدامه |
| `used_by_user_id` | `uuid` FK | المستخدم الذي استخدمه |
| `created_at` | `timestamptz` | تاريخ الإنشاء |

**Migration:** pre-existing

---

### 5. `game_sessions` — جلسات اللعب (buzzer lock)
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK | معرف تلقائي |
| `session_id` | `text` UNIQUE | كود الجلسة |
| `host_id` | `text` | معرف الجهاز المضيف |
| `buzzer_owner` | `text` | اللاعب الذي أمسك الجرس |
| `buzzer_team` | `text` | فريق اللاعب |
| `state` | `text` | `waiting` \| `buzzed` \| `answered` \| `ended` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | (trigger تلقائي) |

**الغرض:** قفل ذري للجرس — `attempt_buzz` يستخدم UPDATE SKIP LOCKED.
**Migration:** 001

---

### 6. `game_lobby` — غرفة انتظار اللاعبين (HTTP polling)
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK | |
| `session_id` | `text` | كود الجلسة |
| `player_name` | `text` | اسم اللاعب |
| `team` | `text` | `green` \| `red` |
| `avatar` | `jsonb` | إعدادات الأفاتار |
| `joined_at` | `timestamptz` | |

**UNIQUE:** `(session_id, player_name)`
**الغرض:** بديل HTTP عن WebSocket أثناء مرحلة ما قبل اللعبة لتوفير الاتصالات.
**Migration:** 004

---

### 7. `partner_profiles` — ملفات الشركاء
| العمود | النوع | الوصف |
|--------|-------|-------|
| `user_id` | `uuid` PK, FK → auth.users | |
| `full_name` | `text` | الاسم الكامل |
| `whatsapp_number` | `text` | رقم واتساب |
| `gender` | `text` | `male` \| `female` |
| `age` | `int4` | العمر (16-100) |
| `store_link` | `text` | رابط المتجر |
| `created_at` | `timestamptz` | |

**RLS:** الشريك يدير ملفه، الأدمن يقرأ الكل.
**Migration:** 003, 009, 010

---

### 8. `partner_orders` — طلبات الشركاء
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | الشريك الطالب |
| `item_name` | `text` | اسم المنتج |
| `quantity` | `int4` | الكمية (1-1000) |
| `status` | `text` | `pending` \| `approved` \| `rejected` |
| `notes` | `text` | ملاحظات |
| `created_at` | `timestamptz` | |

**الفهارس:** `idx_partner_orders_status`, `idx_partner_orders_user`
**RLS:** الشريك يقرأ/يضيف طلباته، الأدمن يدير الكل.
**Migration:** 003, 009, 010

---

### 9. `user_seen_questions` — الأسئلة المعروضة سابقاً
| العمود | النوع | الوصف |
|--------|-------|-------|
| `user_id` | `uuid` | معرف المستخدم |
| `question_id` | `text` | معرف السؤال |
| `seen_at` | `timestamptz` | وقت العرض |

**PK:** `(user_id, question_id)`
**الفهارس:** `idx_user_seen_questions_user_question`
**Migration:** pre-existing + 002

---

### 10. `user_letter_history` — تاريخ ظهور الحروف لكل مستخدم
| العمود | النوع | الوصف |
|--------|-------|-------|
| `user_id` | `uuid` FK → auth.users | |
| `letter` | `char(1)` | الحرف العربي |
| `last_grid` | `int` | رقم آخر شبكة ظهر فيها |
| `times_seen` | `int` | عدد مرات الظهور الإجمالي |

**PK:** `(user_id, letter)`
**الغرض:** منع تكرار الحروف عبر الأجهزة — اختيار ذكي لـ 25 حرف من 28.
**Migration:** 013

---

### 11. `user_grid_counter` — عداد الشبكات لكل مستخدم
| العمود | النوع | الوصف |
|--------|-------|-------|
| `user_id` | `uuid` PK, FK → auth.users | |
| `grid_count` | `int` | رقم الشبكة الحالية |

**Migration:** 013

---

### 12. `session_logs` — سجل جلسات اللعب (تحليلات)
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | `uuid` PK | |
| `session_code` | `text` | كود الغرفة |
| `host_user_id` | `uuid` FK → auth.users | المضيف |
| `host_email` | `text` | بريد المضيف (للعرض) |
| `game_mode` | `text` | وضع الفوز (wall-to-wall, most-letters, ...) |
| `play_mode` | `text` | `normal` (حرب الحروف) \| `tv-show` (حروف مع عزيز) |
| `rounds_setting` | `int` | عدد الجولات المُعد |
| `rounds_played` | `int` | عدد الجولات الفعلية |
| `peak_players` | `int` | أقصى عدد لاعبين |
| `started_at` | `timestamptz` | وقت البداية |
| `ended_at` | `timestamptz` | وقت الانتهاء (NULL = نشطة) |
| `status` | `text` | `active` \| `ended` \| `force_closed` |

**الفهارس:** `idx_session_logs_status`, `idx_session_logs_started`, `idx_session_logs_host`, `idx_session_logs_play_mode`
**RLS:** الأدمن يقرأ الكل، المضيف يدير جلساته.
**Migration:** 014, 015

---

## الدوال (RPCs)

### دوال اللعبة
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `attempt_buzz` | session_id, player_id, team | jsonb | DEFINER | قفل ذري للجرس (SKIP LOCKED) |
| `submit_move` | session_id, player_id, data | jsonb | DEFINER | حركة ذرية في اللعبة |
| `get_random_questions` | p_letter, p_limit, p_exclude_ids | SETOF questions | INVOKER | أسئلة عشوائية (TABLESAMPLE للجداول الكبيرة) |
| `get_bulk_random_questions` | p_limit_per_letter, p_exclude_ids | SETOF questions | INVOKER | أسئلة عشوائية لكل الحروف دفعة واحدة (طلب واحد بدل 29) |
| `batch_mark_seen` | p_question_ids[] | void | DEFINER | تسجيل عدة أسئلة كمشاهدة دفعة واحدة |
| `get_question_counts_by_letter` | — | TABLE(letter, question_count) | INVOKER | عدد الأسئلة لكل حرف |

### دوال الاشتراك
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `get_my_subscription` | — | TABLE(plan_type, ...) | DEFINER | بحث مزدوج (uid ثم email) |
| `redeem_activation_code` | input_code | json | DEFINER | تفعيل كود اشتراك |
| `reset_expired_plans` | — | void | DEFINER | إعادة تعيين الباقات المنتهية (pg_cron كل ساعة) |

### دوال الإدارة
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `is_admin()` | — | boolean | DEFINER | فحص صلاحية الأدمن (بدون recursion) |
| `is_partner()` | — | boolean | DEFINER | فحص صلاحية الشريك |
| `get_admin_overview` | — | json | DEFINER | إحصائيات عامة للوحة الإدارة |
| `get_partner_rows` | — | TABLE(...) | DEFINER | بيانات الشركاء المُجمعة |
| `promote_to_partner` | target_email | json | DEFINER | ترقية مستخدم لشريك |

### دوال غرفة الانتظار
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `upsert_lobby_player` | session_id, player_name, team, avatar | void | DEFINER | إضافة/تحديث لاعب في الغرفة |
| `leave_lobby` | session_id, player_name | void | DEFINER | مغادرة الغرفة |
| `clear_lobby_session` | session_id | void | DEFINER | مسح كل لاعبي الجلسة |

### دوال تتبع الحروف
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `save_letter_history` | p_letters[], p_grid_no | void | DEFINER | حفظ تاريخ الحروف دفعة واحدة |

### دوال التحليلات (014 + 015)
| الدالة | المعاملات | القيمة | الأمان | الوصف |
|--------|-----------|--------|--------|-------|
| `log_session_start` | session_code, game_mode, rounds, play_mode | UUID | DEFINER | تسجيل بداية جلسة (يشمل وضع اللعب) |
| `log_session_end` | session_code, rounds_played, peak_players | void | DEFINER | تسجيل نهاية جلسة |
| `update_session_players` | session_code, player_count | void | DEFINER | تحديث عدد اللاعبين |
| `admin_force_close_session` | session_code | void | DEFINER | إغلاق جلسة إجبارياً (أدمن فقط) |
| `get_admin_analytics` | p_days (default 30) | JSONB | DEFINER | كل التحليلات + توزيع أوضاع اللعب (mode_distribution, win_mode_distribution) |

---

## المهام المجدولة (pg_cron)

| الجدول | المهمة | الوصف |
|--------|--------|-------|
| `0 * * * *` | `SELECT reset_expired_plans()` | كل ساعة: إعادة تعيين الباقات المؤقتة المنتهية إلى `free` |

---

## الإضافات المُفعلة (Extensions)

| الإضافة | الاستخدام |
|---------|----------|
| `pg_stat_statements` | مراقبة أداء الاستعلامات |
| `uuid-ossp` | توليد UUID |
| `plpgsql` | الدوال المخزنة |
| `pgcrypto` | التشفير |
| `pg_cron` | المهام المجدولة |
| `pg_graphql` | GraphQL |

---

## ملاحظات مهمة

1. **حد الاتصالات:** 200 اتصال WebSocket متزامن (Supabase Free/Pro). يتم تنظيف الاتصالات عبر `syncManager.disconnect()` + `pagehide`/`beforeunload`.

2. **SECURITY DEFINER:** الدوال `is_admin()` و `is_partner()` تتجاوز RLS لمنع infinite recursion عند فحص جدول `buyers` من داخل سياساته.

3. **Realtime:** مُفعّل فقط على جدول `buyers` (لإشعارات تغيير الباقة). باقي المزامنة عبر Broadcast Channel.

4. **TABLESAMPLE:** `get_random_questions` يستخدم `BERNOULLI` sampling للجداول > 500 صف (أسرع من `ORDER BY random()`).

5. **Atomic Buzzer:** `attempt_buzz` يستخدم `SKIP LOCKED` لمنع السباق — أول لاعب يضغط يفوز، الباقون يحصلون على `{success: false}` فوراً.
