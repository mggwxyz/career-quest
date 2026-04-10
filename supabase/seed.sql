-- Seed a test user for e2e tests.
-- Supabase local dev uses the auth schema directly.
-- Password: testpassword123 (hashed with bcrypt via pgcrypto)

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  'e2e-test-user-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
) VALUES (
  'e2e-test-user-0000-0000-000000000001',
  'e2e-test-user-0000-0000-000000000001',
  jsonb_build_object('sub', 'e2e-test-user-0000-0000-000000000001', 'email', 'test@example.com'),
  'email',
  'e2e-test-user-0000-0000-000000000001',
  now(),
  now()
) ON CONFLICT (provider_id, provider) DO NOTHING;
