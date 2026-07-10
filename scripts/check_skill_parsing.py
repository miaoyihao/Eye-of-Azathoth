#!/usr/bin/env python3
"""
生成完整的职业技能遗漏报告（仅报告真实遗漏，去除误报）。
规则：skill_desc 中提到的复合技能（技艺/科学/外语/格斗/射击/驾驶+具体子类），
若 job_skills 中没有对应的基础技能条目，则视为遗漏。
"""
import json, re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
with open(BASE / 'seed_data' / 'occupations.json', 'r', encoding='utf-8') as f:
    occupations = json.load(f)

def normalize(s):
    s = s.strip()
    s = re.sub(r'[:：\s]+$', '', s)
    s = re.sub(r'[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳Ω]+$', '', s)
    s = re.sub(r'\s+', '', s)
    return s

# 复合技能映射：desc文本关键词 → 对应在job_skills中的基础条目
# 值为 (前缀, 实际应出现的基础条目名)
COMPOUND_MAP = {
    '技艺': ('技艺', '技艺①'),
    '手艺': ('技艺', '技艺①'),
    '艺术': ('技艺', '技艺①'),
    '艺术及手艺': ('技艺', '技艺①'),
    '科学': ('科学', '科学①'),
    '外语': ('外语', '外语①'),
    '其他语言': ('外语', '外语①'),
    '语言': ('外语', '外语①'),
    '格斗': ('格斗', '格斗：'),
    '射击': ('射击', '射击：'),
    '驾驶': ('驾驶', '驾驶：'),
}

# 特殊：这些子类说明技能是"任选"的，不是遗漏
SKIP_SUB = {'任一', '任选', '任意', '任一种', '任二', '任三', '任一项', '任意多种'}

def check_occupation(occ):
    """返回遗漏列表"""
    oid = occ['id']
    if oid in (0, 1):
        return []
    
    desc = occ.get('skill_desc', '')
    if not desc:
        return []
    
    # 收集 job_skills 中的所有标准化技能名
    has_skills = set()
    for s in occ.get('job_skills', []):
        has_skills.add(normalize(s))
    for r in occ.get('skill_rules', []):
        for opt in r.get('skills', []):
            has_skills.add(normalize(opt))
    
    # 分段
    segments = []
    depth = 0
    cur = []
    for ch in desc:
        if ch in '（(':
            depth += 1
            cur.append(ch)
        elif ch in '）)':
            depth -= 1
            cur.append(ch)
        elif ch in '，,' and depth == 0:
            seg = ''.join(cur).strip('。. ')
            if seg:
                segments.append(seg)
            cur = []
        else:
            cur.append(ch)
    seg = ''.join(cur).strip('。. ')
    if seg:
        segments.append(seg)
    
    missing = []
    
    for seg in segments:
        # 跳过"任意N项..."和"至多N项..."和"N项社交技能(...)"
        if re.match(r'(任意|任选|至多|最多|不多于|从以下)', seg):
            continue
        if re.match(r'[一两三四五六七八九十\d]+\s*[项种]', seg):
            continue
        # 跳过 "X或Y" 选择项（它应在 skill_rules 中）
        if '或' in seg and not ('（' in seg and '）' in seg):
            continue
        
        # 找复合技能: XX(YY)
        m = re.match(r'^(.+?)[（(](.+?)[）)]$', seg)
        if m:
            base = m.group(1).strip()
            sub = m.group(2).strip()
            
            # 找映射
            target = None
            for kw, (prefix, entry) in COMPOUND_MAP.items():
                if base == kw or base.startswith(kw):
                    target = (prefix, entry)
                    break
            
            if target is None:
                continue  # 不是复合技能
            
            prefix, entry = target
            
            # 跳过"任一"类
            if sub in SKIP_SUB:
                # 仍检查是否有基础条目
                found = any(normalize(s).startswith(prefix) for s in has_skills)
                if not found:
                    missing.append(f"{seg} → 缺{entry}")
                continue
            
            # 有具体子类，检查是否有基础条目
            found = any(normalize(s).startswith(prefix) for s in has_skills)
            if not found:
                missing.append(f"{seg} → 缺{entry}")
    
    return missing

print("=" * 80)
print("职业技能遗漏报告")
print("=" * 80)
print("说明：skill_desc 中明确要求但 job_skills/skill_rules 中缺失的技能")
print("=" * 80)

all_results = []
for occ in occupations:
    missing = check_occupation(occ)
    if missing:
        all_results.append((occ, missing))

total_missing = sum(len(m) for _, m in all_results)
print(f"\n共 {len(all_results)} 个职业存在 {total_missing} 个遗漏条目：\n")

for occ, missing in all_results:
    era = occ.get('era', '')
    era_str = f" [{era}]" if era else ""
    print(f"  id={occ['id']} {occ['name']}{era_str}")
    for m in missing:
        print(f"    ❌ {m}")
    print()

print(f"总计: {len(all_results)} 个职业, {total_missing} 个遗漏")
