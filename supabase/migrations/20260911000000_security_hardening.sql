-- Security hardening. Supabase grants every public table to the `anon` and
-- `authenticated` roles by default, so Row Level Security is the only guard.
-- This migration closes the remaining gaps.

-- 1. Destructive functions are server-only --------------------------------
-- delete_account() erases a person's data and purge_expired_data() deletes by
-- retention window. Both are SECURITY DEFINER and were executable by anyone
-- holding the public anon key.
REVOKE ALL ON FUNCTION public.delete_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.purge_expired_data(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_data(boolean) TO service_role;

-- 2. Least-privilege table grants -------------------------------------------
-- Signed-out visitors may only read active care resources (crisis help).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.care_resources TO anon;
-- Members never need these (and TRUNCATE is not subject to RLS).
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
-- Usage counters can be increased by the app but not wiped by the member.
REVOKE DELETE ON public.chat_usage, public.chat_rate_limits FROM authenticated;

-- 3. Members cannot edit billing, plan or minor-protection fields ------------
-- The "Users manage own profile" policy lets a member update their own row, so
-- without this a member could set subscription_tier = 'premium' themselves.
-- Only the server (service_role / signup trigger) may change these.
CREATE OR REPLACE FUNCTION public.guard_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- service_role and the signup trigger carry no 'authenticated'/'anon' role.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF tg_op = 'INSERT' THEN
    NEW.subscription_tier := 'free';
    NEW.org_id := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.stripe_subscription_status := NULL;
    NEW.stripe_price_id := NULL;
    NEW.stripe_billing_interval := NULL;
    NEW.subscription_current_period_end := NULL;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_subscription_status IS DISTINCT FROM OLD.stripe_subscription_status
     OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id
     OR NEW.stripe_billing_interval IS DISTINCT FROM OLD.stripe_billing_interval
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
  THEN
    RAISE EXCEPTION 'plan and billing fields can only be changed by the server'
      USING ERRCODE = '42501';
  END IF;

  -- A minor cannot lift their own guardian requirement or teen mode, or
  -- change the date of birth that put them there.
  IF (OLD.guardian_consent_required AND NOT NEW.guardian_consent_required)
     OR (OLD.account_type = 'teen' AND NEW.account_type <> 'teen')
     OR (OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth)
  THEN
    RAISE EXCEPTION 'age and guardian settings cannot be changed after signup'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_columns ON public.profiles;
CREATE TRIGGER guard_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns();

-- 4. Usage counters only go up (they enforce the free-message and daily caps) -
CREATE OR REPLACE FUNCTION public.guard_usage_counters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') OR tg_op <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF tg_table_name = 'chat_usage' THEN
    IF NEW.lifetime_messages < OLD.lifetime_messages
       OR NEW.lifetime_input_tokens < OLD.lifetime_input_tokens
       OR NEW.lifetime_output_tokens < OLD.lifetime_output_tokens
       OR (NEW.day = OLD.day AND (
            NEW.day_messages < OLD.day_messages
            OR NEW.day_input_tokens < OLD.day_input_tokens
            OR NEW.day_output_tokens < OLD.day_output_tokens))
    THEN
      RAISE EXCEPTION 'usage counters cannot be lowered' USING ERRCODE = '42501';
    END IF;
  ELSIF tg_table_name = 'chat_rate_limits' THEN
    IF NEW.day_start IS NOT DISTINCT FROM OLD.day_start AND NEW.day_count < OLD.day_count THEN
      RAISE EXCEPTION 'usage counters cannot be lowered' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_usage_counters ON public.chat_usage;
CREATE TRIGGER guard_usage_counters
  BEFORE UPDATE ON public.chat_usage
  FOR EACH ROW EXECUTE FUNCTION public.guard_usage_counters();

DROP TRIGGER IF EXISTS guard_usage_counters ON public.chat_rate_limits;
CREATE TRIGGER guard_usage_counters
  BEFORE UPDATE ON public.chat_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.guard_usage_counters();
