#!/usr/bin/env python3
"""
批量修复 occupations.json 中遗漏的复合技能。
同时更新 skills_base.json 的 mapping。
"""
import json, re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OCC_PATH = BASE / 'seed_data' / 'occupations.json'
SB_PATH = BASE / 'seed_data' / 'skills_base.json'

with open(OCC_PATH, 'r', encoding='utf-8') as f:
    occupations = json.load(f)

with open(SB_PATH, 'r', encoding='utf-8') as f:
    skills_data = json.load(f)

def normalize(s):
    s = s.strip()
    s = re.sub(r'[:：\s]+$', '', s)
    s = re.sub(r'[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳Ω]+$', '', s)
    s = re.sub(r'\s+', '', s)
    return s

# 复合技能映射：desc文本关键词 → 应添加的 job_skills 条目名
COMPOUND_ENTRY = {
    '技艺': '技艺①',
    '手艺': '技艺①',
    '艺术': '技艺①',
    '艺术及手艺': '技艺①',
    '科学': '科学①',
    '外语': '外语①',
    '其他语言': '外语①',
    '语言': '外语①',
    '格斗': '格斗：',
    '射击': '射击：',
    '驾驶': '驾驶：',
}

SKIP_SUB = {'任一', '任选', '任意', '任一种', '任二', '任三', '任一项', '任意多种'}

def find_missing_entries(skill_desc, existing_skills_set):
    """找出 skill_desc 中需要但 existing_skills_set 中缺失的条目"""
    if not skill_desc:
        return set()
    
    # 分段
    segments = []
    depth = 0
    cur = []
    for ch in skill_desc:
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
    
    needed = set()
    
    for seg in segments:
        if re.match(r'(任意|任选|至多|最多|不多于|从以下)', seg):
            continue
        if re.match(r'[一两三四五六七八九十\d]+\s*[项种]', seg):
            continue
        if '或' in seg and not ('（' in seg and '）' in seg):
            continue
        
        m = re.match(r'^(.+?)[（(](.+?)[）)]$', seg)
        if not m:
            continue
        
        base = m.group(1).strip()
        sub = m.group(2).strip()
        
        entry = None
        for kw, ent in COMPOUND_ENTRY.items():
            if base == kw or base.startswith(kw):
                entry = ent
                break
        
        if entry is None:
            continue
        
        if sub in SKIP_SUB:
            # 仍检查是否需要基础条目
            prefix = re.sub(r'[:：①②③]+$', '', entry)
            found = any(normalize(s).startswith(prefix) for s in existing_skills_set)
            if not found:
                needed.add(entry)
            continue
        
        prefix = re.sub(r'[:：①②③]+$', '', entry)
        found = any(normalize(s).startswith(prefix) for s in existing_skills_set)
        if not found:
            needed.add(entry)
    
    return needed

# 建立 skills_base.json skill_names 索引
skill_list = skills_data['skill_names']
skill_index = {normalize(name): i for i, name in enumerate(skill_list)}

def get_skill_index(skill_name):
    """获取技能名在 skill_list 中的索引"""
    norm = normalize(skill_name)
    # 精确匹配
    if norm in skill_index:
        return skill_index[norm]
    # 前缀匹配
    for sn, idx in skill_index.items():
        if sn.startswith(norm) or norm.startswith(sn):
            return idx
    return -1

# ========== 修复 occupations.json ==========
fix_count = 0
for occ in occupations:
    oid = occ['id']
    if oid in (0, 1):
        continue
    
    existing = set(normalize(s) for s in occ.get('job_skills', []))
    for r in occ.get('skill_rules', []):
        for opt in r.get('skills', []):
            existing.add(normalize(opt))
    
    skill_desc = occ.get('skill_desc', '')
    needed = find_missing_entries(skill_desc, existing)
    
    if needed:
        # 添加缺失的条目
        current = list(occ.get('job_skills', []))
        for entry in sorted(needed):
            if entry not in current:
                current.append(entry)
                fix_count += 1
        occ['job_skills'] = current
        print(f"  ✓ id={oid} {occ['name']}: +{sorted(needed)}")

# 回写
with open(OCC_PATH, 'w', encoding='utf-8') as f:
    json.dump(occupations, f, ensure_ascii=False, indent=2)

print(f"\noccupations.json: 修复了 {fix_count} 个遗漏条目")

# ========== 同步 skills_base.json ==========
sb_fix = 0
sb_mapping = skills_data.get('mapping', {})

for occ in occupations:
    oid_str = str(occ['id'])
    if oid_str not in sb_mapping:
        continue
    
    sb_entry = sb_mapping[oid_str]
    current_names = sb_entry.get('job_skill_names', [])
    current_indices = sb_entry.get('job_skill_indices', [])
    
    occ_skills = [normalize(s) for s in occ.get('job_skills', [])]
    
    # 检查缺失的
    existing_set = set(normalize(s) for s in current_names)
    for skill in occ.get('job_skills', []):
        norm = normalize(skill)
        if norm not in existing_set:
            current_names.append(skill)
            idx = get_skill_index(skill)
            if idx >= 0:
                current_indices.append(idx)
            sb_fix += 1
    
    sb_entry['job_skill_names'] = current_names
    sb_entry['job_skill_indices'] = current_indices

# 回写
with open(SB_PATH, 'w', encoding='utf-8') as f:
    json.dump(skills_data, f, ensure_ascii=False, indent=2)

print(f"skills_base.json: 同步了 {sb_fix} 个技能条目")
print("\n修复完成！")
