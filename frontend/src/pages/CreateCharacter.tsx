import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import WizardLayout from '@/components/common/WizardLayout';
import Step1BasicInfo from '@/components/Step1BasicInfo';
import Step2Attributes from '@/components/Step2Attributes';
import Step3Occupation from '@/components/Step3Occupation';
import Step4Skills from '@/components/Step4Skills';
import Step5Equipment from '@/components/Step5Equipment';
import Step6Summary from '@/components/Step6Summary';
import { calcOccupationPoints, calcInterestPoints, calcExperiencePoints } from '@/utils/calculations';

export default function CreateCharacter() {
  const sheet = useCharacterSheet();
  const { investigator: inv, derived, pointsPool, step, isExpertMode, setIsExpertMode } = sheet;

  const occPtsTotal = calcOccupationPoints(inv.edu,
    isExpertMode ? 'EXPERIMENTAL_FEATURE' : '教育*4',
    inv.str, inv.dex, inv.app);
  const intPtsTotal = calcInterestPoints(inv.int);
  const expPtsTotal = inv.experiencePack ? calcExperiencePoints(inv.experiencePack) : 0;

  if (isExpertMode) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-coc-text">
              <span className="text-coc-gold">📝</span> 新建人物卡
              <span className="text-sm text-coc-muted ml-3">专家模式</span>
            </h1>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsExpertMode(false)} className="text-xs px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-text hover:border-coc-accent/50">向导模式</button>
              <button onClick={sheet.reset} className="text-xs px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-danger hover:border-coc-danger/50">重置</button>
            </div>
          </div>
          <div className="text-sm text-coc-warning bg-coc-warning/10 rounded-xl p-4 border border-coc-warning/20 mb-4">
            ⚠️ 专家模式正在开发中，请使用向导模式
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Global nav */}
      <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-coc-text">
          <span className="text-coc-gold">📝</span> 新建人物卡
        </h1>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <div className="hidden sm:flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <button key={s} onClick={() => sheet.goToStep(s as 1|2|3|4|5|6)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    s === step ? 'bg-coc-accent text-white' :
                    s < step ? 'bg-coc-accent/20 text-coc-accent' :
                    'bg-coc-bg text-coc-muted border border-coc-border'
                  }`}>{s}</button>
              ))}
            </div>
          )}
          <button onClick={() => setIsExpertMode(true)} className="text-xs px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-text hover:border-coc-accent/50 hidden sm:block">
            📋 专家模式
          </button>
          <button onClick={sheet.reset} className="text-xs px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-danger hover:border-coc-danger/50">
            重置
          </button>
        </div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <WizardLayout step={1} totalSteps={6} title="基本信息" subtitle="填写调查员的基本资料" progress={17}
          onNext={sheet.nextStep} nextDisabled={!inv.name.trim() || !inv.player.trim()}>
          <Step1BasicInfo inv={inv} updateField={sheet.updateField} />
        </WizardLayout>
      )}

      {step === 2 && (
        <WizardLayout step={2} totalSteps={6} title="九大属性" subtitle="设置基础属性值或使用掷骰" progress={33}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step2Attributes inv={inv} updateAttr={sheet.updateAttr} rollAttribute={sheet.rollAttribute}
            halfValues={derived.halfValues} fifthValues={derived.fifthValues} derived={derived} />
        </WizardLayout>
      )}

      {step === 3 && (
        <WizardLayout step={3} totalSteps={6} title="职业与点数" subtitle="选择职业、分配信用评级、选择经历包" progress={50}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step3Occupation inv={inv} updateField={sheet.updateField} setJobSkills={sheet.setJobSkills} />
        </WizardLayout>
      )}

      {step === 4 && (
        <WizardLayout step={4} totalSteps={6} title="技能分配" subtitle="将点数和兴趣点分配到各项技能" progress={67}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step4Skills inv={inv} updateSkill={sheet.updateSkill}
            occupationPtsTotal={occPtsTotal} interestPtsTotal={intPtsTotal} experiencePtsTotal={expPtsTotal} />
        </WizardLayout>
      )}

      {step === 5 && (
        <WizardLayout step={5} totalSteps={6} title="装备与叙事" subtitle="装备武器护甲、填写背景故事" progress={83}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step5Equipment
            inv={inv} updateField={sheet.updateField}
            updateWeapon={sheet.updateWeapon} addWeapon={sheet.addWeapon} removeWeapon={sheet.removeWeapon}
            updateArmor={sheet.updateArmor} addArmor={sheet.addArmor} removeArmor={sheet.removeArmor}
            updateSpell={sheet.updateSpell} addSpell={sheet.addSpell} removeSpell={sheet.removeSpell}
            updateCompanion={sheet.updateCompanion} addCompanion={sheet.addCompanion}
            addInsanity={sheet.addInsanity} updateInsanity={sheet.updateInsanity} removeInsanity={sheet.removeInsanity}
          />
        </WizardLayout>
      )}

      {step === 6 && (
        <WizardLayout step={6} totalSteps={6} title="状态与确认" subtitle="检查完整性并设置当前状态" progress={100}
          onPrev={sheet.prevStep}
          onNext={() => {
            const data = JSON.stringify(inv, null, 2);
            console.log('人物卡数据:', data);
            alert('人物卡已创建！数据已输出到控制台。\n\n后续将接入后端 API 进行持久化存储。');
          }}
          nextLabel="🚀 创建人物卡">
          <Step6Summary inv={inv} derived={derived} pointsPool={pointsPool} updateField={sheet.updateField} />
        </WizardLayout>
      )}
    </div>
  );
}
