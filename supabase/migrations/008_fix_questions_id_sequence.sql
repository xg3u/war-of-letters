-- Fix: Add auto-increment sequence default to questions.id
-- The id column was INTEGER NOT NULL without a DEFAULT, causing insert failures.
-- Run this once in Supabase SQL Editor to fix permanently.

DO $$
DECLARE
  v_max_id bigint;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO v_max_id FROM questions;

  -- Create sequence if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'questions_id_seq'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE format('CREATE SEQUENCE public.questions_id_seq START WITH %s', v_max_id + 1);
  ELSE
    -- Bump past current max
    PERFORM setval('public.questions_id_seq', GREATEST(v_max_id, 1));
  END IF;

  -- Attach as default for id column
  ALTER TABLE questions
    ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);

  -- Own the sequence so it's dropped with the table
  ALTER SEQUENCE public.questions_id_seq OWNED BY questions.id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'questions_id_seq already configured: %', SQLERRM;
END $$;
