-- ============================================================
-- COC 七版人物卡 — Supabase (PostgreSQL) Schema
-- ============================================================
-- 使用方式：在 Supabase Dashboard → SQL Editor 中执行
-- 需要先创建 Supabase 项目（建议区域：Tokyo ap-northeast-1）
-- ============================================================

-- ============================================================
-- 1. 人物卡主表
-- ============================================================
-- 整个 investigator 以 JSONB 存储（与前端 Investigator 接口一致），
-- 简化数据模型，避免每次改前端字段时都需要改表结构。
-- ============================================================
CREATE TABLE characters (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investigator JSONB      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按用户查询加速
CREATE INDEX idx_characters_user_id ON characters(user_id);
-- 按更新时间排序加速
CREATE INDEX idx_characters_updated ON characters(user_id, updated_at DESC);

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Row Level Security（行级安全）
-- ============================================================
-- 每个用户只能看到/修改自己的数据
-- 前端使用 anon key + auth.uid() 自动隔离
-- ============================================================
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 允许用户对自己的数据进行所有操作（SELECT / INSERT / UPDATE / DELETE）
CREATE POLICY "Users can manage their own characters" ON characters
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. 可选：删除数据库用户的函数（需要开启 "Allow users to delete their own account"）
-- ============================================================
-- 如需在前端支持"删除账号"，在 Supabase Dashboard 中启用：
--   Settings → API → "Allow users to delete their own account"
-- 然后取消注释以下函数：
--
-- CREATE OR REPLACE FUNCTION delete_user_account()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   DELETE FROM auth.users WHERE id = auth.uid();
-- END;
-- $$;

-- ============================================================
-- 4. 用户角色表（profiles）
-- ============================================================
-- 每个注册用户在 auth.users 创建时自动有一条 profile 记录。
-- role 字段：'admin'（管理员）或 'user'（普通用户，默认）。
-- ============================================================
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. profiles RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 任何用户可读取所有 profile（供管理面板列表展示）
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT
  USING (true);

-- 只有管理员可以通过 RPC 更新角色，不需要行级 UPDATE 策略
-- 但为了安全，不给普通用户 UPDATE 权限

-- ============================================================
-- 6. RPC：获取当前用户 profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'role', role,
    'created_at', created_at
  )
  FROM profiles
  WHERE id = auth.uid();
$$;

-- ============================================================
-- 7. RPC：管理员列出所有用户（SECURITY DEFINER）
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION '只有管理员才能执行此操作';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'role', p.role,
      'created_at', p.created_at
    ) ORDER BY p.created_at DESC
  )
  INTO v_result
  FROM profiles p;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- 8. RPC：管理员更新用户角色（SECURITY DEFINER）
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION '只有管理员才能执行此操作';
  END IF;

  IF p_new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION '角色必须是 admin 或 user';
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', p_new_role);
END;
$$;

-- ============================================================
-- 9. 创建初始管理员账号
-- ============================================================
-- 在 Supabase Dashboard → SQL Editor 中取消注释并执行以下代码，
-- 以创建 miaoyihao@outlook.com 管理员账号。
-- 注意：需要 enable pgcrypto 扩展（通常已启用）。
-- ============================================================

-- -- 创建管理员用户（email 直接确认，无需验证）
-- INSERT INTO auth.users (
--   instance_id, id, aud, role,
--   email, encrypted_password, email_confirmed_at,
--   confirmation_sent_at, raw_app_meta_data, raw_user_meta_data,
--   created_at, updated_at, is_super_admin
-- )
-- SELECT
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'miaoyihao@outlook.com',
--   crypt('miaoyihao55', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   '{"provider":"email","providers":["email"]}',
--   '{"role":"admin"}',
--   NOW(),
--   NOW(),
--   FALSE
-- WHERE NOT EXISTS (
--   SELECT 1 FROM auth.users WHERE email = 'miaoyihao@outlook.com'
-- );
--
-- -- 创建或更新 admin profile
-- INSERT INTO profiles (id, email, role)
-- SELECT id, 'miaoyihao@outlook.com', 'admin'
-- FROM auth.users
-- WHERE email = 'miaoyihao@outlook.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
