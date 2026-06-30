-- ============================================================
-- COC 七版人物卡数据库 Schema
-- 关系型方案：MySQL / MariaDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS coc_investigators
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE coc_investigators;

-- ============================================================
-- 1. 调查员核心表
-- ============================================================
CREATE TABLE investigators (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(32)  NOT NULL COMMENT '姓名',
  player          VARCHAR(32)  NOT NULL COMMENT '玩家',
  era             VARCHAR(20)  NOT NULL COMMENT '时代 (1920s/现代/1890s/...)',
  occupation_id   INT          DEFAULT 0 COMMENT '职业序号 0-230，0=自定义',
  occupation_name VARCHAR(64)  DEFAULT NULL COMMENT '职业名称（自定义时填写）',

  -- 基本信息
  age             TINYINT      DEFAULT NULL COMMENT '年龄 15-89',
  gender          VARCHAR(16)  DEFAULT NULL COMMENT '性别',
  residence       VARCHAR(128) DEFAULT NULL COMMENT '住地',
  birthplace      VARCHAR(128) DEFAULT NULL COMMENT '故乡',

  -- 时间设定
  scenario_year   SMALLINT     DEFAULT NULL COMMENT '时间-年',
  scenario_month  TINYINT      DEFAULT NULL COMMENT '时间-月',
  scenario_day    TINYINT      DEFAULT NULL COMMENT '时间-日',

  -- 九大属性（原始掷骰/分配值）
  str_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '力量 15-90',
  dex_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '敏捷',
  pow_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '意志',
  con_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '体质',
  app_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '外貌',
  edu_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '教育',
  siz_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '体型 40-90',
  int_val         TINYINT UNSIGNED DEFAULT NULL COMMENT '智力 40-90',
  luck_val        TINYINT UNSIGNED DEFAULT NULL COMMENT '幸运 15-90',

  -- 系统计算值 / 属性半值 1/5 值（冗余存储，也可查询时计算）
  str_half        TINYINT UNSIGNED GENERATED ALWAYS AS (str_val DIV 2)       STORED COMMENT '力量半值',
  dex_half        TINYINT UNSIGNED GENERATED ALWAYS AS (dex_val DIV 2)       STORED,
  pow_half        TINYINT UNSIGNED GENERATED ALWAYS AS (pow_val DIV 2)       STORED,
  con_half        TINYINT UNSIGNED GENERATED ALWAYS AS (con_val DIV 2)       STORED,
  app_half        TINYINT UNSIGNED GENERATED ALWAYS AS (app_val DIV 2)       STORED,
  edu_half        TINYINT UNSIGNED GENERATED ALWAYS AS (edu_val DIV 2)       STORED,
  siz_half        TINYINT UNSIGNED GENERATED ALWAYS AS (siz_val DIV 2)       STORED,
  int_half        TINYINT UNSIGNED GENERATED ALWAYS AS (int_val DIV 2)       STORED,
  luck_half       TINYINT UNSIGNED GENERATED ALWAYS AS (luck_val DIV 2)      STORED,
  str_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (str_val DIV 5)       STORED COMMENT '力量1/5值',
  dex_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (dex_val DIV 5)       STORED,
  pow_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (pow_val DIV 5)       STORED,
  con_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (con_val DIV 5)       STORED,
  app_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (app_val DIV 5)       STORED,
  edu_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (edu_val DIV 5)       STORED,
  siz_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (siz_val DIV 5)       STORED,
  int_fifth       TINYINT UNSIGNED GENERATED ALWAYS AS (int_val DIV 5)       STORED,
  luck_fifth      TINYINT UNSIGNED GENERATED ALWAYS AS (luck_val DIV 5)      STORED,

  -- HP / SAN / MP / MOV / DB / Build（生成列 + 可覆盖列混合）
  hp_max          TINYINT UNSIGNED GENERATED ALWAYS AS ((con_val + siz_val) DIV 10) STORED COMMENT '最大HP',
  hp_current      TINYINT UNSIGNED DEFAULT NULL COMMENT '当前HP',
  san_max         TINYINT UNSIGNED GENERATED ALWAYS AS (pow_val)                   STORED COMMENT '最大SAN = POW',
  san_current     TINYINT UNSIGNED DEFAULT NULL COMMENT '当前SAN',
  mp_max          TINYINT UNSIGNED GENERATED ALWAYS AS (pow_val DIV 5)             STORED COMMENT '最大MP',
  mp_current      TINYINT UNSIGNED DEFAULT NULL COMMENT '当前MP',
  mov             TINYINT UNSIGNED DEFAULT NULL COMMENT '移动力 MOV',
  db              VARCHAR(8)  DEFAULT NULL COMMENT '伤害加值 (无/-2/-1/+1D4/+1D6/...)',
  build           TINYINT     DEFAULT NULL COMMENT '体格 -2 ~ 2+',

  -- 点数追踪
  occupation_points_total    SMALLINT UNSIGNED DEFAULT NULL COMMENT '职业点数池',
  occupation_points_used     SMALLINT UNSIGNED DEFAULT 0    COMMENT '已用职业点',
  interest_points_total      SMALLINT UNSIGNED DEFAULT NULL COMMENT '兴趣点数池',
  interest_points_used       SMALLINT UNSIGNED DEFAULT 0    COMMENT '已用兴趣点',
  experience_points_total    SMALLINT UNSIGNED DEFAULT NULL COMMENT '经历包点数池（选择经历包后赋值）',
  experience_points_used     SMALLINT UNSIGNED DEFAULT 0    COMMENT '已用经历包点',

  -- 重伤 / 疯狂 / 不死判定状态
  major_wound         BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否重伤',
  temporary_insanity  BOOLEAN NOT NULL DEFAULT FALSE COMMENT '临时疯狂',
  indefinite_insanity BOOLEAN NOT NULL DEFAULT FALSE COMMENT '不定疯狂',
  dying               BOOLEAN NOT NULL DEFAULT FALSE COMMENT '濒死',
  unconscious         BOOLEAN NOT NULL DEFAULT FALSE COMMENT '昏迷',

  -- 克苏鲁神话
  cthulhu_mythos      TINYINT UNSIGNED DEFAULT 0 COMMENT '克苏鲁神话初始值',
  cthulhu_mythos_current TINYINT UNSIGNED DEFAULT 0 COMMENT '克苏鲁神话当前值',

  -- 经历包
  experience_pack     VARCHAR(32) DEFAULT NULL COMMENT '经历包',

  -- 叙事文本
  backstory           TEXT        DEFAULT NULL COMMENT '背景故事',
  appearance          TEXT        DEFAULT NULL COMMENT '外貌描述',
  ideology_beliefs    TEXT        DEFAULT NULL COMMENT '思想/信念',
  significant_people  TEXT        DEFAULT NULL COMMENT '重要之人',
  meaningful_location TEXT        DEFAULT NULL COMMENT '意义非凡之地',
  treasured_possession TEXT       DEFAULT NULL COMMENT '宝贵之物',
  traits              TEXT        DEFAULT NULL COMMENT '特质',
  injuries_scars      TEXT        DEFAULT NULL COMMENT '伤口与疤痕',

  -- 关联
  scenario_id         INT         DEFAULT NULL COMMENT '所属剧本ID',

  -- 元数据
  created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version             INT         NOT NULL DEFAULT 1 COMMENT '版本号（成长/变更）',

  INDEX idx_name (name),
  INDEX idx_player (player),
  INDEX idx_era (era),
  INDEX idx_scenario (scenario_id),
  INDEX idx_occupation (occupation_id),

  CONSTRAINT chk_age    CHECK (age IS NULL OR age BETWEEN 15 AND 89),
  CONSTRAINT chk_str    CHECK (str_val IS NULL OR str_val BETWEEN 15 AND 90),
  CONSTRAINT chk_siz    CHECK (siz_val IS NULL OR siz_val BETWEEN 40 AND 90),
  CONSTRAINT chk_int    CHECK (int_val IS NULL OR int_val BETWEEN 40 AND 90),
  CONSTRAINT chk_luck   CHECK (luck_val IS NULL OR luck_val BETWEEN 15 AND 99),
  CONSTRAINT chk_edu    CHECK (edu_val IS NULL OR edu_val BETWEEN 0  AND 99)
) ENGINE=InnoDB COMMENT='调查员核心表';

-- ============================================================
-- 2. 技能表
-- ============================================================
CREATE TABLE investigator_skills (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id INT         NOT NULL,
  skill_name      VARCHAR(32) NOT NULL COMMENT '技能名（会计/图书馆/母语/...）',
  base_value      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '基础值 (1-30)',
  experience_pts  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '经历包点分配',
  occupation_pts  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '职业点分配',
  interest_pts    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '兴趣点分配',
  growth_pts      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '成长点（游戏中获得）',
  is_occupation   BOOLEAN     NOT NULL DEFAULT FALSE COMMENT '是否本职技能',
  custom_name     VARCHAR(64) DEFAULT NULL COMMENT '自定义技能名',
  category        VARCHAR(16) DEFAULT NULL COMMENT '分类: 调查/交涉/战斗/特技/学识',

  -- 计算列: 成功率 = 基础值 + 经历包点 + 职业点 + 兴趣点 + 成长点
  success_rate    TINYINT UNSIGNED GENERATED ALWAYS AS (
                    base_value + experience_pts + occupation_pts + interest_pts + growth_pts
                  ) VIRTUAL COMMENT '技能成功率',

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE,
  UNIQUE KEY uk_inv_skill (investigator_id, skill_name),
  INDEX idx_category (category)
) ENGINE=InnoDB COMMENT='调查员技能表';

-- ============================================================
-- 3. 武器表
-- ============================================================
CREATE TABLE investigator_weapons (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id  INT         NOT NULL,
  weapon_name      VARCHAR(64) NOT NULL COMMENT '武器名',
  skill_used       VARCHAR(32) DEFAULT NULL COMMENT '使用技能（斗殴/手枪/弓术/...）',
  damage           VARCHAR(16) DEFAULT NULL COMMENT '伤害公式 (1D4+DB/2D8/1D3+半DB)',
  attack_range     VARCHAR(16) DEFAULT NULL COMMENT '射程（徒手/10码/25码/...）',
  attacks_per_round TINYINT UNSIGNED DEFAULT 1 COMMENT '每轮攻击次数',
  ammo             INT         DEFAULT NULL COMMENT '装弹量',
  malfunction      TINYINT UNSIGNED DEFAULT NULL COMMENT '故障值',
  is_improvised    BOOLEAN     NOT NULL DEFAULT FALSE COMMENT '是否临时武器',
  notes            VARCHAR(128) DEFAULT NULL,

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE,
  INDEX idx_inv_weapon (investigator_id)
) ENGINE=InnoDB COMMENT='调查员武器表';

-- ============================================================
-- 4. 护甲表
-- ============================================================
CREATE TABLE investigator_armors (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id INT         NOT NULL,
  armor_name      VARCHAR(64) NOT NULL,
  protection      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '护甲值',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE COMMENT '是否启用',

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='调查员护甲表';

-- ============================================================
-- 5. 法术表
-- ============================================================
CREATE TABLE investigator_spells (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id INT         NOT NULL,
  spell_name      VARCHAR(64) NOT NULL,
  cost            VARCHAR(64) DEFAULT NULL COMMENT '代价 (MP/SAN/POW)',
  casting_time    VARCHAR(32) DEFAULT NULL COMMENT '施法时间',
  effect          TEXT        DEFAULT NULL COMMENT '效果描述',

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='调查员法术表';

-- ============================================================
-- 6. 伙伴/关系表
-- ============================================================
CREATE TABLE investigator_companions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id INT         NOT NULL,
  companion_name  VARCHAR(32) NOT NULL,
  player_name     VARCHAR(32) DEFAULT NULL COMMENT '玩家名',
  notes           TEXT        DEFAULT NULL,
  changes_made    TEXT        DEFAULT NULL COMMENT '造成的改变',
  met_in_scenario VARCHAR(128) DEFAULT NULL COMMENT '相遇模组',

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='调查员伙伴/关系表';

-- ============================================================
-- 7. 疯狂/恐惧症/躁狂症表
-- ============================================================
CREATE TABLE investigator_insanity (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investigator_id INT         NOT NULL,
  type            ENUM('phobia','mania','other') NOT NULL COMMENT '类型',
  name            VARCHAR(64) NOT NULL COMMENT '名称',
  description     TEXT        DEFAULT NULL,

  FOREIGN KEY (investigator_id) REFERENCES investigators(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='调查员疯狂/恐惧症/躁狂症表';

-- ============================================================
-- 8. 职业模板表（参照表）
-- ============================================================
CREATE TABLE occupation_templates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  occupation_name VARCHAR(64) NOT NULL COMMENT '职业名称',
  description     TEXT        DEFAULT NULL,
  credit_range    VARCHAR(16) DEFAULT NULL COMMENT '信用范围 (9-30/20-60/...)',
  points_formula  VARCHAR(32) DEFAULT NULL COMMENT '点数公式 (EDU×4/EDU×2+STR×2)',
  era             VARCHAR(20) DEFAULT '1920s' COMMENT '所属时代',

  UNIQUE KEY uk_occ (occupation_name, era)
) ENGINE=InnoDB COMMENT='职业模板表';

-- 职业-本职技能关联表
CREATE TABLE occupation_skills (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  occupation_id   INT         NOT NULL,
  skill_name      VARCHAR(32) NOT NULL COMMENT '本职技能名',

  FOREIGN KEY (occupation_id) REFERENCES occupation_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uk_occ_skill (occupation_id, skill_name)
) ENGINE=InnoDB COMMENT='职业本职技能关联表';

-- ============================================================
-- 9. 剧本/模组表
-- ============================================================
CREATE TABLE scenarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(128) NOT NULL COMMENT '模组名称',
  era             VARCHAR(20)  DEFAULT NULL COMMENT '时代',
  setting         TEXT         DEFAULT NULL COMMENT '背景设定',
  house_rules     TEXT         DEFAULT NULL COMMENT '可选规则/房规',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='剧本/模组表';

-- ============================================================
-- 视图：人物卡概览（含技能总数、武器数等统计）
-- ============================================================
CREATE VIEW v_investigator_summary AS
SELECT
  i.id,
  i.name,
  i.player,
  i.era,
  i.occupation_name,
  i.age,
  i.gender,
  i.str_val, i.dex_val, i.pow_val, i.con_val,
  i.app_val, i.edu_val, i.siz_val, i.int_val, i.luck_val,
  i.hp_max, i.san_max, i.mp_max, i.mov, i.db, i.build,
  i.cthulhu_mythos_current,
  COUNT(DISTINCT s.id) AS skill_count,
  COUNT(DISTINCT w.id) AS weapon_count,
  COUNT(DISTINCT sp.id) AS spell_count
FROM investigators i
LEFT JOIN investigator_skills s   ON s.investigator_id = i.id
LEFT JOIN investigator_weapons w  ON w.investigator_id = i.id
LEFT JOIN investigator_spells sp ON sp.investigator_id = i.id
GROUP BY i.id;
