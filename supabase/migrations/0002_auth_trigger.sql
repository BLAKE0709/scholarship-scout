-- Auth trigger: auto-create users row + profile when auth.users row is created
-- This is a separate migration for clarity

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role;
  new_user_id UUID;
BEGIN
  -- Get role from metadata, default to 'student'
  user_role_val := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'student'
  );

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_val
  )
  RETURNING id INTO new_user_id;

  -- Create the appropriate profile based on role
  IF user_role_val = 'student' THEN
    INSERT INTO public.student_profiles (user_id, graduation_year, state)
    VALUES (new_user_id, EXTRACT(YEAR FROM now())::INTEGER + 1, '');
  ELSIF user_role_val = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id)
    VALUES (new_user_id);
  ELSIF user_role_val = 'counselor' THEN
    INSERT INTO public.counselor_profiles (user_id)
    VALUES (new_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
