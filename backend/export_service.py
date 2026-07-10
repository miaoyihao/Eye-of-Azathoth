"""
COC 人物卡导出服务
===================
使用 openpyxl 以模板填充法生成保留原始样式的 Excel 文件。

流程：
  1. 从模板文件加载工作簿（预处理去除 dataValidations 以兼容旧版 openpyxl）
  2. 按传入的 Investigator JSON 数据填入对应单元格
  3. 返回生成的 xlsx 文件 buffer
"""

import copy
import io
import os
import re
import zipfile
from typing import Any, Optional

import openpyxl
from openpyxl.utils import get_column_letter

# ── 样式常量 ──
# 模板路径：优先使用环境变量 TEMPLATE_DIR，否则回退到本地开发路径
_TEMPLATE_DIR = os.environ.get('TEMPLATE_DIR') or os.path.normpath(
    os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public')
)
TEMPLATE_PATH = os.path.join(_TEMPLATE_DIR, 'template.xlsx')


# ========================================
# 工具函数
# ========================================

def rand_code() -> str:
    import random, string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))


def safe_name(s: str) -> str:
    s = (s or '未知').replace('/', '_').replace('\\', '_').replace('?', '_')
    s = s.replace('*', '_').replace(':', '_').replace('|', '_')
    s = s.replace('"', '_').replace('<', '_').replace('>', '_')
    return s.strip() or '未知'


def format_narrative(text: Optional[str], max_len: int = 500) -> str:
    if not text or not text.strip():
        return ''
    t = text.strip()
    return t[:max_len] + '……' if len(t) > max_len else t


def format_insanity(items: list[dict]) -> str:
    """格式化恐惧症/躁狂症条目"""
    if not items:
        return ''
    lines = []
    for i, item in enumerate(items):
        label = '恐惧' if item.get('type') == 'phobia' else '狂躁'
        eng = f"({item['english']})" if item.get('english') else ''
        desc = f"：{item['description']}" if item.get('description') else ''
        lines.append(f"{i + 1}. [{label}] {item['name']}{eng}{desc}")
    return '\n'.join(lines)


def calculate_derived(inv: dict) -> dict:
    """计算所有派生值（与前端 calcAllDerived 保持一致）"""
    s = lambda k: inv.get(k, 0) or 0
    str_v = s('str')
    dex = s('dex')
    pow_v = s('pow')
    con = s('con')
    siz = s('siz')
    edu = s('edu')
    app = s('app')
    int_v = s('int')
    age = s('age') or 25

    # DB/Build
    total_s = str_v + siz
    if total_s <= 64:
        db, build = '-2', -2
    elif total_s <= 84:
        db, build = '-1', -1
    elif total_s <= 124:
        db, build = '0', 0
    elif total_s <= 164:
        db, build = '+1D4', 1
    elif total_s <= 204:
        db, build = '+1D6', 2
    elif total_s <= 284:
        db, build = '+2D6', 3
    elif total_s <= 364:
        db, build = '+3D6', 4
    elif total_s <= 444:
        db, build = '+4D6', 5
    else:
        db, build = '+5D6', 6

    # HP
    hp_max = (con + siz) // 10
    # SAN
    san_max = pow_v
    # MP
    mp_max = pow_v // 5
    # MOV
    mov = 8
    if age >= 80:
        mov -= 5
    elif age >= 70:
        mov -= 4
    elif age >= 60:
        mov -= 3
    elif age >= 50:
        mov -= 2
    elif age >= 40:
        mov -= 1
    if str_v < siz and dex < siz:
        mov -= 1
    elif str_v > siz and dex > siz:
        mov += 1
    mov = max(1, mov)
    # Dodge
    dodge = dex // 2

    return {
        'hpMax': hp_max,
        'sanMax': san_max,
        'mpMax': mp_max,
        'mov': mov,
        'db': db,
        'build': build,
        'dodge': dodge,
    }


# ========================================
# 模板加载（带 dataValidations 兼容处理）
# ========================================

def _strip_data_validations(template_path: str) -> io.BytesIO:
    """
    去掉 worksheets 中的 dataValidations 标签以兼容旧版 openpyxl。
    返回 BytesIO 模拟的文件对象。
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(template_path, 'r') as zin:
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
            for name in zin.namelist():
                if name.startswith('xl/worksheets/') and name.endswith('.xml'):
                    content = zin.read(name).decode('utf-8')
                    # 移除 dataValidations 块（含跨行内容）
                    content = re.sub(
                        r'<dataValidations[^>]*>.*?</dataValidations>',
                        '',
                        content,
                        flags=re.DOTALL,
                    )
                    zout.writestr(name, content.encode('utf-8'))
                else:
                    zout.writestr(name, zin.read(name))
    buf.seek(0)
    return buf


def load_template() -> openpyxl.Workbook:
    """加载模板工作簿，返回 openpyxl Workbook 对象"""
    fixed = _strip_data_validations(TEMPLATE_PATH)
    wb = openpyxl.load_workbook(fixed)
    return wb


# ========================================
# 技能行映射（扫描模板中的技能名）
# ========================================

def _build_skill_row_map(ws: openpyxl.worksheet.worksheet.Worksheet) -> tuple[dict[str, int], dict[str, int]]:
    """扫描模板中 F16-F60 / AB16-AB60 的技能名称 → 行号映射"""
    left: dict[str, int] = {}
    right: dict[str, int] = {}
    for r in range(16, 61):
        fc = ws[f'F{r}'].value
        if fc and isinstance(fc, str):
            left[fc.strip()] = r
        ac = ws[f'AB{r}'].value
        if ac and isinstance(ac, str):
            right[ac.strip()] = r
    return left, right


def _find_skill_row(row_map: dict[str, int], skill_name: str) -> Optional[int]:
    """查找技能名对应的行号（精确→前缀→特殊匹配）"""
    # 1. 精确匹配
    if skill_name in row_map:
        return row_map[skill_name]

    # 2. 前缀匹配
    for key, row in row_map.items():
        if key.startswith(skill_name + '：') or key.startswith(skill_name + ':'):
            return row

    # 3. 特殊匹配
    special = {
        '斗殴':          ['格斗', '格斗：', '格斗①', '格斗②', '格斗③'],
        '手枪':          ['射击', '射击：', '射击①', '射击②', '射击③'],
        '步枪/霰弹枪':  ['射击', '射击：', '射击②', '射击③'],
        '冲锋枪':        ['射击', '射击：', '射击③'],
        '剑':            ['格斗', '格斗：', '格斗②'],
        '斧':            ['格斗', '格斗：', '格斗③'],
        '电锯':          ['格斗', '格斗：', '格斗③'],
        '链枷':          ['格斗', '格斗：', '格斗②'],
        '绞具':          ['格斗', '格斗：', '格斗①'],
        '鞭子':          ['格斗', '格斗：', '格斗③'],
        '弓术':          ['射击', '射击：', '射击③'],
        '机枪':          ['射击', '射击：', '射击②'],
        '炮术':          ['射击', '射击：', '射击③'],
        '格斗':          ['格斗', '格斗：', '格斗①'],
        '射击':          ['射击', '射击：', '射击①'],
        '驾驶':          ['驾驶', '驾驶：'],
        '生存':          ['生存', '生存：'],
    }
    candidates = special.get(skill_name)
    if candidates:
        for c in candidates:
            if c in row_map:
                return row_map[c]

    return None


# ========================================
# 主导出函数
# ========================================

def export_to_xlsx(investigator: dict, occupation_name: str = '', character_id: str = '') -> bytes:
    """
    核心导出函数：接收调查员数据，返回 xlsx bytes。

    参数 investigator 的结构与前端 Investigator 接口对齐：
      {
        name, player, era, occupationId, occupationName, age,
        gender, residence, birthplace,
        scenarioYear, scenarioMonth, scenarioDay,
        str, dex, pow, con, app, edu, siz, int, luck,
        creditRating, experiencePack,
        hpCurrent, hpMax, sanCurrent, sanMax, mpCurrent, mpMax, mov,
        skills: [{ name, baseValue, occupationPts, interestPts, experiencePts, growthPts, isOccupation }],
        weapons: [{ name, skill, damage, range, era, ammo, malfunction }],
        spells: [{ name, cost, castingTime, effect }],
        companions: [{ name, player, notes, changes, scenario }],
        insanity: [{ type, name, english, description }],
        backstory, appearance, ideology, importantPerson, meaningfulPlace,
        valuableThing, traits, injuries
      }
    """
    inv = investigator
    wb = load_template()
    ws = wb['人物卡']

    # 预计算派生值
    derived = calculate_derived(inv)

    # ==============================
    # 3. 基本信息
    # ==============================
    ws['E3'] = inv.get('name', '')
    ws['E4'] = inv.get('player', '')
    ws['M4'] = inv.get('era', '')
    ws['E5'] = inv.get('occupationName', '') or occupation_name
    ws['M5'] = inv.get('occupationId', 0)
    ws['E6'] = inv.get('age', '')
    ws['M6'] = inv.get('gender', '')
    ws['E7'] = inv.get('residence', '')
    ws['M7'] = inv.get('birthplace', '')

    # 日期
    ws['G8'] = inv.get('scenarioYear', 1920)
    ws['J8'] = f"{inv.get('scenarioMonth', 1)}月"
    ws['L8'] = f"{inv.get('scenarioDay', 1)}日"

    # ==============================
    # 4. 九大属性
    # ==============================
    ws['U3'] = inv.get('str', 0)
    ws['AA3'] = inv.get('dex', 0)
    ws['AG3'] = inv.get('pow', 0)
    ws['U5'] = inv.get('con', 0)
    ws['AA5'] = inv.get('app', 0)
    ws['AG5'] = inv.get('edu', 0)
    ws['U7'] = inv.get('siz', 0)
    ws['AA7'] = inv.get('int', 0)
    ws['AG7'] = inv.get('luck', 0)

    # ==============================
    # 5. 派生属性
    # ==============================
    # HP
    ws['F9'] = inv.get('hpMax', 0) or derived['hpMax']
    ws['G10'] = inv.get('hpCurrent', 0) or derived['hpMax']
    # SAN
    ws['K9'] = inv.get('sanMax', 0) or derived['sanMax']
    ws['P10'] = inv.get('sanCurrent', 0) or derived['sanMax']
    # MP
    ws['T9'] = inv.get('mpMax', 0) or derived['mpMax']
    ws['Y10'] = inv.get('mpCurrent', 0) or derived['mpMax']
    # MOV
    ws['AF10'] = inv.get('mov', 0) or derived['mov']
    # DB / Build / Dodge
    ws['AP52'] = derived['db']
    ws['AP55'] = derived['build']
    ws['AP57'] = derived['dodge']

    # ==============================
    # 6. 技能
    # ==============================
    left_rows, right_rows = _build_skill_row_map(ws)

    for skill in inv.get('skills', []):
        n = skill.get('name', '').strip()
        if not n:
            continue
        o = skill.get('occupationPts', 0) or 0
        i = skill.get('interestPts', 0) or 0
        e = skill.get('experiencePts', 0) or 0
        g = skill.get('growthPts', 0) or 0

        row = _find_skill_row(left_rows, n)
        if row is not None:
            # 左面板：N=职业, P=兴趣, L=经验包, M=成长
            ws[f'N{row}'] = o
            ws[f'P{row}'] = i
            ws[f'L{row}'] = e
            if g > 0:
                ws[f'M{row}'] = g
            continue

        row = _find_skill_row(right_rows, n)
        if row is not None:
            # 右面板：AJ=职业, AL=兴趣, AH=经验包, AI=成长
            ws[f'AJ{row}'] = o
            ws[f'AL{row}'] = i
            ws[f'AH{row}'] = e
            if g > 0:
                ws[f'AI{row}'] = g
            continue

    # ==============================
    # 7. 叙事文本
    # ==============================
    ws['AA61'] = format_narrative(inv.get('appearance'))
    ws['AA63'] = format_narrative(inv.get('ideology'))
    ws['AA65'] = format_narrative(inv.get('importantPerson'))
    ws['AA69'] = format_narrative(inv.get('valuableThing'))
    ws['AA71'] = format_narrative(inv.get('traits'))
    ws['AA73'] = format_narrative(inv.get('injuries'))
    ws['AA75'] = format_insanity(inv.get('insanity', []))
    ws['W77'] = format_narrative(inv.get('backstory'), 2000)

    # ==============================
    # 8. 其他单值字段
    # ==============================
    ep = inv.get('experiencePack', '')
    if ep and ep != '无':
        ws['F113'] = ep

    # ==============================
    # 9. 武器表 (R53-R56)
    # ==============================
    # 模板：U=名称, W=伤害, AA=基础射程, AC=贯穿, AE=时代, AG=装弹量, AJ=故障值
    for i, w in enumerate(inv.get('weapons', [])[:4]):
        row = 53 + i
        ws[f'U{row}'] = w.get('name', '')
        ws[f'W{row}'] = w.get('damage', '')
        ws[f'AA{row}'] = w.get('range', '')
        ws[f'AC{row}'] = w.get('era', '')
        ws[f'AE{row}'] = w.get('era', '')
        ws[f'AG{row}'] = w.get('ammo', '')
        ws[f'AJ{row}'] = w.get('malfunction', '')

    # ==============================
    # 10. 法术表 (R114+)
    # ==============================
    # 模板：W=编号, Y=名称, AC=使用代价, AH=作用
    for i, s in enumerate(inv.get('spells', [])[:15]):
        row = 114 + i
        ws[f'W{row}'] = i + 1
        ws[f'Y{row}'] = s.get('name', '')
        ws[f'AC{row}'] = s.get('cost', '')
        ws[f'AH{row}'] = s.get('effect', '')

    # ==============================
    # 11. 伙伴表 (R130+)
    # ==============================
    # 模板：W=姓名, AA=玩家, AD=注释, AL=造成改变, AP=相遇模组
    for i, c in enumerate(inv.get('companions', [])[:12]):
        row = 130 + i
        ws[f'W{row}'] = c.get('name', '')
        ws[f'AA{row}'] = c.get('player', '')
        ws[f'AD{row}'] = c.get('notes', '')
        ws[f'AL{row}'] = c.get('changes', '')
        ws[f'AP{row}'] = c.get('scenario', '')

    # ==============================
    # 12. 输出
    # ==============================
    id_part = f"_{character_id}" if character_id else f"_{rand_code()}"
    fname = f"{safe_name(inv.get('name', ''))}_{safe_name(inv.get('occupationName', '') or occupation_name or '未选择')}{id_part}.xlsx"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return buf.read(), fname
