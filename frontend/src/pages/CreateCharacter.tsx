import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCharacterSheet } from '@/hooks/useCharacterSheet';
import { loadCharacter, saveCharacter } from '@/services/storage';
import WizardLayout from '@/components/common/WizardLayout';
import UnsavedChangesModal from '@/components/common/UnsavedChangesModal';
import Step1BasicInfo from '@/components/Step1BasicInfo';
import Step2Attributes from '@/components/Step2Attributes';
import Step3Occupation from '@/components/Step3Occupation';
import Step4Skills from '@/components/Step4Skills';
import Step5Equipment from '@/components/Step5Equipment';
import Step6Narrative from '@/components/Step6Narrative';
import Step7Summary from '@/components/Step6Summary';
import { calcOccupationPoints, calcInterestPoints, calcExperiencePoints } from '@/utils/calculations';

export default function CreateCharacter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(!id);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const sheet = useCharacterSheet();
  const { investigator: inv, derived, pointsPool, step, isExpertMode, setIsExpertMode, dirty, markClean } = sheet;

  // In edit mode, load existing character data and inject directly via loadInvestigator
  useEffect(() => {
    (async () => {
      if (id) {
        try {
          const saved = await loadCharacter(id);
          if (saved) {
            sheet.loadInvestigator(saved.investigator);
          }
        } catch (err) {
          console.error('加载人物卡失败:', err);
        }
      }
      setLoading(false);
      setReady(true);
    })();
  }, [id]);

  const isEditMode = !!id;

  const occPtsTotal = calcOccupationPoints(inv.edu,
    isExpertMode ? 'EXPERIMENTAL_FEATURE' : '教育*4',
    inv.str, inv.dex, inv.app);
  const intPtsTotal = calcInterestPoints(inv.int);
  const expPtsTotal = inv.experiencePack ? calcExperiencePoints(inv.experiencePack) : 0;

  // ── Unsaved changes guard ──

  // Store a ref to the pending action so we can resume it after the dialog
  const pendingActionRef = useRef<() => void>(() => {});

  const promptUnsaved = useCallback((action: () => void) => {
    if (dirty) {
      pendingActionRef.current = action;
      setShowUnsavedDialog(true);
    } else {
      action();
    }
  }, [dirty]);

  // Intercept browser back button (popstate)
  useEffect(() => {
    // Push a dummy history entry so we can intercept popstate
    window.history.pushState({ fromCreatePage: true }, '');

    const onPopState = () => {
      if (dirty) {
        // Push back to prevent actual navigation
        window.history.pushState({ fromCreatePage: true }, '');
        promptUnsaved(() => {
          window.removeEventListener('popstate', onPopState);
          navigate(-1);
        });
      }
      // If not dirty, let the popstate pass through naturally
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [dirty, promptUnsaved, navigate]);

  const handleSave = async () => {
    // HP/SAN/MP 最大值始终从属性实时计算，不信任存储的旧值
    const toSave = {
      ...inv,
      hpMax: derived.hpMax,
      sanMax: derived.sanMax,
      mpMax: derived.mpMax,
      mov: inv.mov || derived.mov,
      // 当前值钳位到最大值，防止存储异常值
      hpCurrent: Math.min(inv.hpCurrent || derived.hpMax, derived.hpMax),
      sanCurrent: Math.min(inv.sanCurrent || derived.sanMax, derived.sanMax),
      mpCurrent: Math.min(inv.mpCurrent || derived.mpMax, derived.mpMax),
    };
    try {
      const savedId = await saveCharacter(toSave, id);
      if (savedId) {
        markClean();
        navigate('/');
      }
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请检查服务是否正常运行');
    }
  };

  const navigateBack = useCallback(() => {
    promptUnsaved(() => navigate('/'));
  }, [promptUnsaved, navigate]);

  const handleSaveAndExit = async () => {
    // HP/SAN/MP 最大值始终从属性实时计算，不信任存储的旧值
    const toSave = {
      ...inv,
      hpMax: derived.hpMax,
      sanMax: derived.sanMax,
      mpMax: derived.mpMax,
      mov: inv.mov || derived.mov,
      hpCurrent: Math.min(inv.hpCurrent || derived.hpMax, derived.hpMax),
      sanCurrent: Math.min(inv.sanCurrent || derived.sanMax, derived.sanMax),
      mpCurrent: Math.min(inv.mpCurrent || derived.mpMax, derived.mpMax),
    };
    try {
      const savedId = await saveCharacter(toSave, id);
      if (savedId) {
        markClean();
        setShowUnsavedDialog(false);
        pendingActionRef.current();
      }
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请检查服务是否正常运行');
    }
  };

  const handleExitWithoutSaving = () => {
    setShowUnsavedDialog(false);
    pendingActionRef.current();
  };

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false);
  };

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-coc-muted">加载中...</div>
      </div>
    );
  }

  if (isExpertMode) {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-coc-text tracking-tight">
              📝 {isEditMode ? '编辑人物卡' : '新建人物卡'}
              <span className="text-sm text-coc-muted font-normal ml-2">专家模式</span>
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={navigateBack} className="md-ripple px-3 py-1.5 rounded-lg text-xs font-medium text-coc-muted hover:bg-black/[0.04]">返回列表</button>
              <button onClick={() => setIsExpertMode(false)} className="md-ripple px-3 py-1.5 rounded-lg text-xs font-medium text-coc-accent hover:bg-coc-accent/10">向导模式</button>
              <button onClick={sheet.reset} className="md-ripple px-3 py-1.5 rounded-lg text-xs font-medium text-coc-danger hover:bg-coc-danger/10">重置</button>
            </div>
          </div>
          <div className="text-sm text-coc-warning bg-coc-warning/8 rounded-xl p-4 border border-coc-warning/20 mb-4">
            ⚠️ 专家模式正在开发中，请使用向导模式
          </div>
        </div>
        {showUnsavedDialog && (
          <UnsavedChangesModal
            onSaveAndExit={handleSaveAndExit}
            onExitWithoutSaving={handleExitWithoutSaving}
            onCancel={handleCancelDialog}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top App Bar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-coc-border/50">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={navigateBack}
              className="p-1.5 rounded-lg text-coc-muted hover:text-coc-text hover:bg-black/[0.04] transition-colors" title="返回列表">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-coc-text tracking-tight">
              {isEditMode ? '编辑人物卡' : '新建人物卡'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex gap-1 mr-1">
                {[1, 2, 3, 4, 5, 6, 7].map(s => (
                  <button key={s} onClick={() => sheet.goToStep(s as 1|2|3|4|5|6|7)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                      s === step ? 'bg-coc-accent text-white shadow-sm' :
                      s < step ? 'bg-coc-accent/12 text-coc-accent' :
                      'text-coc-muted/50 hover:text-coc-text'
                    }`}>{s}</button>
                ))}
              </div>
            <button onClick={() => setIsExpertMode(true)} className="md-ripple px-2.5 py-1.5 rounded text-xs font-medium text-coc-muted hover:bg-black/[0.04] hidden sm:inline-flex">
              专家模式
            </button>
            <button onClick={sheet.reset} className="md-ripple px-2.5 py-1.5 rounded text-xs font-medium text-coc-danger hover:bg-coc-danger/10">
              重置
            </button>
          </div>
        </div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <WizardLayout step={1} totalSteps={7} title="基本信息" subtitle="填写调查员的基本资料" progress={14}
          onNext={sheet.nextStep} nextDisabled={!inv.name.trim() || !inv.player.trim()}>
          <Step1BasicInfo inv={inv} updateField={sheet.updateField} setJobSkills={sheet.setJobSkills} />
        </WizardLayout>
      )}

      {step === 2 && (
        <WizardLayout step={2} totalSteps={7} title="九大属性" subtitle="设置基础属性值或使用掷骰" progress={29}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step2Attributes inv={inv} updateAttr={sheet.updateAttr} rollAttribute={sheet.rollAttribute}
            rollAllAttributes={sheet.rollAllAttributes}
            halfValues={derived.halfValues} fifthValues={derived.fifthValues} derived={derived} />
        </WizardLayout>
      )}

      {step === 3 && (
        <WizardLayout step={3} totalSteps={7} title="职业与点数" subtitle="选择职业与经历包" progress={43}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step3Occupation inv={inv} updateField={sheet.updateField} setJobSkills={sheet.setJobSkills} />
        </WizardLayout>
      )}

      {step === 4 && (
        <WizardLayout step={4} totalSteps={7} title="技能分配" subtitle="分配信用评级与技能点数" progress={57}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step4Skills inv={inv} updateSkill={sheet.updateSkill} updateField={sheet.updateField}
            occupationPtsTotal={occPtsTotal} interestPtsTotal={intPtsTotal} experiencePtsTotal={expPtsTotal}
            toggleFlexibleSkill={sheet.toggleFlexibleSkill} />
        </WizardLayout>
      )}

      {step === 5 && (
        <WizardLayout step={5} totalSteps={7} title="装备" subtitle="武器、护甲、法术与伙伴" progress={71}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step5Equipment
            inv={inv} updateField={sheet.updateField}
            updateWeapon={sheet.updateWeapon} addWeapon={sheet.addWeapon} removeWeapon={sheet.removeWeapon}
            updateArmor={sheet.updateArmor} addArmor={sheet.addArmor} removeArmor={sheet.removeArmor}
            updateSpell={sheet.updateSpell} addSpell={sheet.addSpell} removeSpell={sheet.removeSpell}
            updateCompanion={sheet.updateCompanion} addCompanion={sheet.addCompanion}
          />
        </WizardLayout>
      )}

      {step === 6 && (
        <WizardLayout step={6} totalSteps={7} title="叙事" subtitle="背景故事与叙事元素" progress={86}
          onPrev={sheet.prevStep} onNext={sheet.nextStep}>
          <Step6Narrative
            inv={inv} updateField={sheet.updateField}
            addInsanity={sheet.addInsanity} updateInsanity={sheet.updateInsanity} removeInsanity={sheet.removeInsanity}
          />
        </WizardLayout>
      )}

      {step === 7 && (
        <WizardLayout step={7} totalSteps={7} title="状态与确认" subtitle="检查完整性并设置当前状态" progress={100}
          onPrev={sheet.prevStep}
          onNext={handleSave}
          nextLabel={isEditMode ? "💾 保存修改" : "🚀 创建人物卡"}>
          <Step7Summary inv={inv} derived={derived} pointsPool={pointsPool} updateField={sheet.updateField} />
        </WizardLayout>
      )}

      {showUnsavedDialog && (
        <UnsavedChangesModal
          onSaveAndExit={handleSaveAndExit}
          onExitWithoutSaving={handleExitWithoutSaving}
          onCancel={handleCancelDialog}
        />
      )}
    </div>
  );
}
