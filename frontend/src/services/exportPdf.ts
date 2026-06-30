/**
 * 导出 COC 人物卡为 PDF 文件
 * 使用 html2canvas + jsPDF，与主页浅色主题风格一致
 */
import type { Investigator } from '@/types';
import { getSkillCategories } from '@/data';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ========================================
// 工具函数
// ========================================
function randCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

function safeName(s: string): string {
  return (s || '未知').replace(/[/\\?*:|"<>]/g, '_').trim() || '未知';
}

/** 计算派生值 */
function calcDerived(inv: Investigator) {
  const s = inv.siz || 50;
  const c = inv.con || 50;
  const p = inv.pow || 50;
  const d = inv.dex || 50;
  const str = inv.str || 50;
  const int = inv.int || 50;
  return {
    hpMax: Math.ceil((s + c) / 10),
    sanMax: p,
    mpMax: Math.ceil(p / 5),
    mov: d >= 50 && str >= 50 && s < 50 ? 8 : d >= 50 ? 9 : d >= 25 ? 8 : 7,
    db: s + c <= 64 ? '-2' : s + c <= 84 ? '-1' : s + c <= 124 ? '+0' : s + c <= 164 ? '+1d4' : '+1d6',
    build: s + c <= 64 ? -2 : s + c <= 84 ? -1 : s + c <= 124 ? 0 : s + c <= 164 ? 1 : 2,
  };
}

/** 属性半值 */
function half(v: number) { return Math.ceil(v / 2); }
/** 属性 1/5 值 */
function fifth(v: number) { return Math.ceil(v / 5); }

// ========================================
// HTML 模板工具
// ========================================
function buildHtmlContent(inv: Investigator): string {
  const derived = calcDerived(inv);
  const categories = getSkillCategories();

  // 技能按分类分组
  const skillsByCat: Record<string, typeof inv.skills> = {};
  for (const cat of categories) {
    skillsByCat[cat.category] = inv.skills.filter(
      s => cat.skills.includes(s.name),
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  // 未被任何分类覆盖的技能（如信用评级、特殊技能）
  const allCovered = new Set(categories.flatMap(c => c.skills));
  const unassigned = inv.skills.filter(s => !allCovered.has(s.name));

  // 属性渲染
  const attrs = [
    { label: '力量 STR', key: 'str', val: inv.str },
    { label: '体质 CON', key: 'con', val: inv.con },
    { label: '体型 SIZ', key: 'siz', val: inv.siz },
    { label: '敏捷 DEX', key: 'dex', val: inv.dex },
    { label: '外貌 APP', key: 'app', val: inv.app },
    { label: '智力 INT', key: 'int', val: inv.int },
    { label: '意志 POW', key: 'pow', val: inv.pow },
    { label: '教育 EDU', key: 'edu', val: inv.edu },
    { label: '幸运 Luck', key: 'luck', val: inv.luck },
  ];

  const eraBadgeColor = inv.era === '1920s' ? '#d97706' : inv.era === '现代' ? '#2563eb' : inv.era === '1890s' ? '#b45309' : '#64748b';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f3f0; color: #334155; padding: 32px; }
  .page { width: 770px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
  .header h1 { font-size: 28px; font-weight: 800; color: #1e293b; }
  .header .sub { font-size: 14px; color: #94a3b8; margin-top: 4px; }
  .era-badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; background: #fef3c7; color: ${eraBadgeColor}; border: 1px solid ${eraBadgeColor}40; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; margin-bottom: 28px; padding: 16px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; }
  .info-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .info-label { color: #94a3b8; font-weight: 500; min-width: 56px; }
  .info-value { color: #334155; font-weight: 600; }
  .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; display: flex; align-items: center; gap: 8px; }
  .section-title .icon { font-size: 18px; }
  .attr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
  .attr-card { background: linear-gradient(135deg, #f0f9ff 0%, #eef2ff 100%); border: 1px solid #c7d2fe; border-radius: 14px; padding: 12px; text-align: center; }
  .attr-label { font-size: 12px; font-weight: 600; color: #6366f1; margin-bottom: 6px; }
  .attr-value { font-size: 24px; font-weight: 800; color: #1e293b; }
  .attr-sub { display: flex; justify-content: center; gap: 16px; margin-top: 6px; font-size: 11px; color: #94a3b8; }
  .attr-sub span { background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
  .derived-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 28px; }
  .derived-card { background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border: 1px solid #fcd34d; border-radius: 12px; padding: 10px; text-align: center; }
  .derived-label { font-size: 11px; font-weight: 600; color: #b45309; }
  .derived-value { font-size: 20px; font-weight: 800; color: #78350f; margin-top: 2px; }
  .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; }
  .skill-cat { }
  .skill-cat-title { font-size: 14px; font-weight: 700; color: #3b82f6; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .skill-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 12px; }
  .skill-name { color: #475569; }
  .skill-name .base { font-size: 10px; color: #94a3b8; }
  .skill-pts { display: flex; gap: 2px; }
  .pt { display: inline-block; min-width: 22px; text-align: center; padding: 1px 4px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .pt-occ { background: #dbeafe; color: #1d4ed8; }
  .pt-int { background: #dcfce7; color: #15803d; }
  .pt-exp { background: #fef3c7; color: #b45309; }
  .pt-grw { background: #fce7f3; color: #be185d; }
  .total-val { font-weight: 700; color: #1e293b; min-width: 28px; text-align: right; font-size: 13px; }
  .sub-list { margin-bottom: 28px; }
  .sub-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .sub-table th { text-align: left; padding: 6px 8px; background: #f1f5f9; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
  .sub-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  .narrative { margin-bottom: 28px; }
  .narrative-block { margin-bottom: 12px; }
  .narrative-block h4 { font-size: 13px; font-weight: 700; color: #3b82f6; margin-bottom: 4px; }
  .narrative-block p { font-size: 12px; color: #475569; line-height: 1.7; white-space: pre-wrap; }
  .legend { display: flex; gap: 16px; margin-top: 8px; font-size: 11px; color: #94a3b8; }
  .legend span { display: flex; align-items: center; gap: 4px; }
  .legend .dot { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
  .footer { text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  .no-data { color: #cbd5e1; font-size: 12px; font-style: italic; }
</style></head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <h1>${escHtml(inv.name || '未命名角色')}</h1>
      <div class="sub">调查员 · ${escHtml(inv.player || '未指定玩家')}</div>
    </div>
    <span class="era-badge">${escHtml(inv.era || '未知时代')}</span>
  </div>

  <!-- Basic Info -->
  <div class="info-grid">
    <div class="info-item"><span class="info-label">职业</span><span class="info-value">${escHtml(inv.occupationName || '未选择')}</span></div>
    <div class="info-item"><span class="info-label">年龄</span><span class="info-value">${inv.age || '-'}</span></div>
    <div class="info-item"><span class="info-label">性别</span><span class="info-value">${escHtml(inv.gender || '-')}</span></div>
    <div class="info-item"><span class="info-label">住地</span><span class="info-value">${escHtml(inv.residence || '-')}</span></div>
    <div class="info-item"><span class="info-label">故乡</span><span class="info-value">${escHtml(inv.birthplace || '-')}</span></div>
    <div class="info-item"><span class="info-label">日期</span><span class="info-value">${inv.scenarioYear || 1920} ${inv.scenarioMonth || 1}月 ${inv.scenarioDay || 1}日</span></div>
  </div>

  <!-- Attributes -->
  <div class="section-title"><span class="icon">🎲</span> 九大属性</div>
  <div class="attr-grid">
    ${attrs.map(a => {
      const v = a.val || 50;
      return `<div class="attr-card">
        <div class="attr-label">${a.label}</div>
        <div class="attr-value">${v}</div>
        <div class="attr-sub"><span>½ ${half(v)}</span><span>⅕ ${fifth(v)}</span></div>
      </div>`;
    }).join('')}
  </div>

  <!-- Derived -->
  <div class="section-title"><span class="icon">❤️</span> 派生属性</div>
  <div class="derived-grid">
    <div class="derived-card"><div class="derived-label">HP</div><div class="derived-value">${derived.hpMax}</div></div>
    <div class="derived-card"><div class="derived-label">SAN</div><div class="derived-value">${derived.sanMax}</div></div>
    <div class="derived-card"><div class="derived-label">MP</div><div class="derived-value">${derived.mpMax}</div></div>
    <div class="derived-card"><div class="derived-label">MOV</div><div class="derived-value">${derived.mov}</div></div>
    <div class="derived-card"><div class="derived-label">DB</div><div class="derived-value">${derived.db}</div></div>
  </div>

  <!-- Skills -->
  <div class="section-title"><span class="icon">📚</span> 技能</div>
  <div style="margin-bottom:8px;font-size:11px;color:#94a3b8;">
    <span style="display:inline-block;background:#dbeafe;padding:1px 8px;border-radius:4px;margin-right:8px;">职业</span>
    <span style="display:inline-block;background:#dcfce7;padding:1px 8px;border-radius:4px;margin-right:8px;">兴趣</span>
    <span style="display:inline-block;background:#fef3c7;padding:1px 8px;border-radius:4px;margin-right:8px;">经验包</span>
    <span style="display:inline-block;background:#fce7f3;padding:1px 8px;border-radius:4px;">成长</span>
  </div>
  <div class="skills-grid">
    ${renderSkills(skillsByCat, unassigned, categories)}
  </div>

  <!-- Weapons -->
  ${inv.weapons?.length ? renderWeapons(inv.weapons) : ''}

  <!-- Armors -->
  ${inv.armors?.length ? renderArmors(inv.armors) : ''}

  <!-- Spells -->
  ${inv.spells?.length ? renderSpells(inv.spells) : ''}

  <!-- Companions -->
  ${inv.companions?.length ? renderCompanions(inv.companions) : ''}

  <!-- Insanity -->
  ${inv.insanity?.length ? renderInsanity(inv.insanity) : ''}

  <!-- Narrative -->
  ${renderNarrative(inv)}

  <!-- Footer -->
  <div class="footer">
    COC 人物卡向导 v0.4.0 · 生成于 ${new Date().toLocaleString('zh-CN')}
  </div>

</div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSkills(
  skillsByCat: Record<string, any[]>,
  unassigned: any[],
  categories: { category: string; skills: string[] }[],
): string {
  const catColors: Record<string, string> = {
    '调查': '#3b82f6', '交涉': '#10b981', '战斗': '#ef4444',
    '特技': '#8b5cf6', '学识': '#f59e0b',
  };
  let html = '';
  for (const cat of categories) {
    const skills = skillsByCat[cat.category] || [];
    if (skills.length === 0 && cat.category !== '调查') continue;
    const color = catColors[cat.category] || '#3b82f6';
    html += `<div class="skill-cat">
      <div class="skill-cat-title" style="color:${color}">${cat.category}</div>
      ${skills.length === 0 ? '<div class="no-data">暂无技能</div>' :
        skills.map(s => {
          const total = (s.occupationPts || 0) + (s.interestPts || 0) + (s.experiencePts || 0) + (s.growthPts || 0);
          const base = s.baseValue ? `<span class="base">(${s.baseValue})</span>` : '';
          return `<div class="skill-row">
            <span class="skill-name">${escHtml(s.name)} ${base}</span>
            <span class="skill-pts">
              ${(s.occupationPts || 0) > 0 ? `<span class="pt pt-occ">${s.occupationPts}</span>` : ''}
              ${(s.interestPts || 0) > 0 ? `<span class="pt pt-int">${s.interestPts}</span>` : ''}
              ${(s.experiencePts || 0) > 0 ? `<span class="pt pt-exp">${s.experiencePts}</span>` : ''}
              ${(s.growthPts || 0) > 0 ? `<span class="pt pt-grw">${s.growthPts}</span>` : ''}
              <span class="total-val">${total}</span>
            </span>
          </div>`;
        }).join('')}
    </div>`;
  }
  // 未分配分类的技能
  if (unassigned.length > 0) {
    html += `<div class="skill-cat">
      <div class="skill-cat-title" style="color:#64748b">其他</div>
      ${unassigned.map(s => {
        const total = (s.occupationPts || 0) + (s.interestPts || 0) + (s.experiencePts || 0) + (s.growthPts || 0);
        return `<div class="skill-row">
          <span class="skill-name">${escHtml(s.name)}</span>
          <span class="total-val">${total}</span>
        </div>`;
      }).join('')}
    </div>`;
  }
  return html;
}

function renderWeapons(weapons: any[]): string {
  return `<div class="section-title"><span class="icon">⚔️</span> 武器</div>
  <div class="sub-list">
  <table class="sub-table">
    <tr><th>名称</th><th>技能</th><th>伤害</th><th>次数</th><th>射程</th><th>弹药</th><th>故障</th></tr>
    ${weapons.map(w => `<tr>
      <td><strong>${escHtml(w.name || '')}</strong></td>
      <td>${escHtml(w.skill || '')}</td>
      <td>${escHtml(w.damage || '')}</td>
      <td>${escHtml(w.era || '')}</td>
      <td>${escHtml(w.range || '')}</td>
      <td>${w.ammo ?? ''}</td>
      <td>${w.malfunction ?? ''}</td>
    </tr>`).join('')}
  </table>
  </div>`;
}

function renderArmors(armors: any[]): string {
  return `<div class="section-title"><span class="icon">🛡️</span> 护甲</div>
  <div class="sub-list">
  <table class="sub-table">
    <tr><th>名称</th><th>护甲值</th></tr>
    ${armors.map(a => `<tr><td>${escHtml(a.name || '')}</td><td>${a.armorValue ?? '-'}</td></tr>`).join('')}
  </table>
  </div>`;
}

function renderSpells(spells: any[]): string {
  return `<div class="section-title"><span class="icon">🔮</span> 法术</div>
  <div class="sub-list">
  <table class="sub-table">
    <tr><th>名称</th><th>消耗</th><th>施法时间</th><th>效果</th></tr>
    ${spells.map(s => `<tr>
      <td><strong>${escHtml(s.name || '')}</strong></td>
      <td>${escHtml(s.cost || '')}</td>
      <td>${escHtml(s.castingTime || '')}</td>
      <td>${escHtml(s.effect || '')}</td>
    </tr>`).join('')}
  </table>
  </div>`;
}

function renderCompanions(companions: any[]): string {
  return `<div class="section-title"><span class="icon">👥</span> 同伴 / 盟友</div>
  <div class="sub-list">
  <table class="sub-table">
    <tr><th>名称</th><th>玩家</th><th>备注</th><th>变化</th><th>剧本</th></tr>
    ${companions.map(c => `<tr>
      <td><strong>${escHtml(c.name || '')}</strong></td>
      <td>${escHtml(c.player || '')}</td>
      <td>${escHtml(c.notes || '')}</td>
      <td>${escHtml(c.changes || '')}</td>
      <td>${escHtml(c.scenario || '')}</td>
    </tr>`).join('')}
  </table>
  </div>`;
}

function renderInsanity(insanity: any[]): string {
  return `<div class="section-title"><span class="icon">💫</span> 疯狂</div>
  <div class="sub-list">
  <table class="sub-table">
    <tr><th>类型</th><th>名称</th><th>描述</th></tr>
    ${insanity.map(i => `<tr>
      <td>${i.type === 'phobia' ? '恐惧' : i.type === 'mania' ? '躁狂' : escHtml(i.type || '')}</td>
      <td><strong>${escHtml(i.name || '')}</strong>${i.english ? ` (${escHtml(i.english)})` : ''}</td>
      <td>${escHtml(i.description || '')}</td>
    </tr>`).join('')}
  </table>
  </div>`;
}

function renderNarrative(inv: Investigator): string {
  const fields: { label: string; value: string }[] = [
    { label: '背景故事', value: inv.backstory || '' },
    { label: '外貌描述', value: inv.appearance || '' },
    { label: '信念与信仰', value: inv.ideology || '' },
    { label: '重要之人', value: inv.importantPerson || '' },
    { label: '意义非凡之地', value: inv.meaningfulPlace || '' },
    { label: '宝贵之物', value: inv.valuableThing || '' },
    { label: '特质', value: inv.traits || '' },
    { label: '伤疤与伤痕', value: inv.injuries || '' },
  ];
  const hasContent = fields.some(f => f.value.length > 0);
  if (!hasContent) return '';
  return `<div class="section-title"><span class="icon">📖</span> 叙事元素</div>
  <div class="narrative">
    ${fields.filter(f => f.value.length > 0).map(f => `
      <div class="narrative-block">
        <h4>${f.label}</h4>
        <p>${escHtml(f.value)}</p>
      </div>
    `).join('')}
  </div>`;
}

// ========================================
// 分页渲染：将 HTML 内容分页截图，每页生成 PDF 页面
// ========================================
async function renderPages(inv: Investigator): Promise<Blob> {
  const html = buildHtmlContent(inv);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '834px'; // 770 + 32*2 padding
  document.body.appendChild(container);

  try {
    const pageEl = container.querySelector('.page') as HTMLElement;
    if (!pageEl) throw new Error('PDF 页面渲染失败');

    // 获取页面总高度
    const pageWidth = 770; // page 内容的宽度
    const pagePadding = 40;
    const pageHeight = pageEl.offsetHeight;

    // A4 比例：595.28 x 841.89 pt，留边距后约 770px 宽对应 595pt
    // 实际可用的 content area height 约 700pt
    const pdfWidth = 595.28; // A4 width in points
    const pdfHeight = 841.89; // A4 height in points
    const margin = 40; // pt margins
    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;

    // 截图比例：html px → PDF pt
    // 页面宽度 770px 映射到 usableWidth pt
    const scale = usableWidth / pageWidth;

    // 计算每页能装多少 px 的内容
    const pxPerPage = usableHeight / scale;

    const totalPages = Math.max(1, Math.ceil(pageHeight / pxPerPage));
    const doc = new jsPDF('p', 'pt', 'a4');

    for (let p = 0; p < totalPages; p++) {
      // 设置容器高度为当前页内容
      pageEl.style.overflow = 'hidden';
      pageEl.style.height = `${pxPerPage}px`;

      // 滚动到当前页
      container.scrollTop = p * pxPerPage;
      pageEl.style.marginTop = `${-p * pxPerPage}px`;

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: pageWidth + pagePadding * 2,
        height: Math.min(pxPerPage, pageHeight - p * pxPerPage) + pagePadding * 2,
        x: 0,
        y: p * pxPerPage,
        onclone: (clonedDoc) => {
          const clonedPage = clonedDoc.querySelector('.page') as HTMLElement;
          if (clonedPage) {
            clonedPage.style.marginTop = '0';
            clonedPage.style.overflow = 'hidden';
          }
        },
      });

      if (p > 0) doc.addPage();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', margin, margin, usableWidth, (canvas.height * scale) / 2);
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

// ========================================
// 简单方案：全内容截图单页
// ========================================
async function renderSinglePage(inv: Investigator): Promise<Blob> {
  const html = buildHtmlContent(inv);
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '834px';
  document.body.appendChild(container);

  try {
    const pageEl = container.querySelector('.page') as HTMLElement;
    if (!pageEl) throw new Error('PDF 页面渲染失败');

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: pageEl.scrollWidth,
      height: pageEl.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    // 计算 PDF 尺寸
    const imgWidth = 595.28 - 80; // A4 margin
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    const doc = new jsPDF('p', 'pt', 'a4');

    // 如果内容超出一页，切分多页
    const pageHeight = 841.89 - 80;
    let remainingH = imgHeight;
    let yOffset = 0;
    let pageNum = 0;

    while (remainingH > 0) {
      if (pageNum > 0) doc.addPage();
      const h = Math.min(remainingH, pageHeight);
      doc.addImage(imgData, 'JPEG', 40, 40 - yOffset, imgWidth, imgHeight);
      remainingH -= pageHeight;
      yOffset += pageHeight;
      pageNum++;
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

// ========================================
// 主导出函数
// ========================================
export async function exportCharacterToPdf(investigator: Investigator): Promise<void> {
  const blob = await renderSinglePage(investigator);
  const fname = `${safeName(investigator.name)}_${safeName(investigator.occupationName || '未选择')}_${randCode()}.pdf`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
