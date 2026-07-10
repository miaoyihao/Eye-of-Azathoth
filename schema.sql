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
