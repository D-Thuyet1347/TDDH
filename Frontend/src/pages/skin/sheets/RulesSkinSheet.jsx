import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Plus,
  X,
  Save,
  RefreshCw,
  LoaderCircle,
  Search,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  getSkinRules,
  addSkinRuleGrade,
  removeSkinRuleGrade,
  saveSkinElongationRules,
  resetSkinRulesDefaults,
} from '../../../APIs';
import { successToast, errorToast } from '../../../utils/toast';

const GROUP_META = {
  MC: {
    title: 'Nhóm MC',
    subtitle: 'Các cuộn thuộc nhóm MC sẽ vào chung 1 Plan',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    headerClass: 'bg-blue-50/80 border-blue-200',
    tagClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  LC: {
    title: 'Nhóm LC',
    subtitle: 'Các cuộn thuộc nhóm LC sẽ vào chung 1 Plan',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    headerClass: 'bg-emerald-50/80 border-emerald-200',
    tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  HC: {
    title: 'Nhóm HC',
    subtitle: 'Các cuộn thuộc nhóm HC sẽ vào chung 1 Plan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    headerClass: 'bg-amber-50/80 border-amber-200',
    tagClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
};

export default function RulesSkinSheet({ onRulesChanged }) {
  const [loading, setLoading] = useState(true);
  const [savingElongation, setSavingElongation] = useState(false);
  const [mutatingGrade, setMutatingGrade] = useState(false);

  const [gradeGroups, setGradeGroups] = useState({ MC: [], LC: [], HC: [] });
  const [elongationTable, setElongationTable] = useState([]);
  const [thicknessSteps, setThicknessSteps] = useState([]);
  const [unmatchedGrades, setUnmatchedGrades] = useState([]);
  const [elongationDirty, setElongationDirty] = useState(false);

  const [gradeInputs, setGradeInputs] = useState({ MC: '', LC: '', HC: '' });
  const [searchGrade, setSearchGrade] = useState('');
  const [groupsCollapsed, setGroupsCollapsed] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({ MC: false, LC: false, HC: false });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSkinRules();
      setGradeGroups(res.grade_groups || { MC: [], LC: [], HC: [] });
      setElongationTable(res.elongation_table || []);
      setThicknessSteps(res.thickness_steps || []);
      setUnmatchedGrades(res.unmatched_grades || []);
      setElongationDirty(false);
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi tải cấu hình Rules_SKIN');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const applyResponse = (res) => {
    if (res.grade_groups) setGradeGroups(res.grade_groups);
    if (res.elongation_table) setElongationTable(res.elongation_table);
    if (res.thickness_steps) setThicknessSteps(res.thickness_steps);
    if (res.unmatched_grades) setUnmatchedGrades(res.unmatched_grades);
    onRulesChanged?.();
  };

  const handleAddGrades = async (group, rawText) => {
    const tokens = String(rawText || '')
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tokens.length) {
      errorToast(`Vui lòng nhập ít nhất 1 mác phôi cho nhóm ${group}!`);
      return;
    }
    try {
      setMutatingGrade(true);
      const res = await addSkinRuleGrade({ group, grades: tokens });
      applyResponse(res);
      setGradeInputs((prev) => ({ ...prev, [group]: '' }));
      successToast(res.message || `Đã thêm vào nhóm ${group}!`);
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi thêm mác phôi');
    } finally {
      setMutatingGrade(false);
    }
  };

  const handleAssignUnmatched = async (grade, group) => {
    try {
      setMutatingGrade(true);
      const res = await addSkinRuleGrade({ group, grades: [grade] });
      applyResponse(res);
      successToast(`Đã thêm mác "${grade}" vào nhóm ${group}!`);
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi gán mác phôi');
    } finally {
      setMutatingGrade(false);
    }
  };

  const handleRemoveGrade = async (group, grade) => {
    try {
      setMutatingGrade(true);
      const res = await removeSkinRuleGrade({ group, grade });
      applyResponse(res);
      successToast(res.message || `Đã xóa mác "${grade}" khỏi nhóm ${group}`);
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi xóa mác phôi');
    } finally {
      setMutatingGrade(false);
    }
  };

  const handleElongationCellChange = (rowIdx, stepKey, val) => {
    setElongationTable((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, [stepKey]: val } : row))
    );
    setElongationDirty(true);
  };

  const handleSaveElongation = async () => {
    try {
      setSavingElongation(true);
      const res = await saveSkinElongationRules({ elongationTable });
      applyResponse(res);
      setElongationDirty(false);
      successToast(res.message || 'Đã lưu bảng tra Elongation!');
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi lưu bảng Elongation');
    } finally {
      setSavingElongation(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Khôi phục nhóm mác phôi MC / LC / HC và bảng tra Elongation về mặc định?')) return;
    try {
      setMutatingGrade(true);
      const res = await resetSkinRulesDefaults();
      applyResponse(res);
      setElongationDirty(false);
      successToast(res.message || 'Đã khôi phục cấu hình mặc định!');
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi khôi phục mặc định');
    } finally {
      setMutatingGrade(false);
    }
  };

  const normalizedSearch = searchGrade.trim().toUpperCase();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-10">
        <div className="flex items-center gap-2.5 text-slate-600 text-sm">
          <LoaderCircle className="w-5 h-5 animate-spin text-blue-600" />
          <span>Đang tải cấu hình Rules_SKIN...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-4 pr-1">
      {/* 1. Mác thép chưa thuộc nhóm MC / LC / HC */}
      <div className={`rounded-xl border p-4 shadow-sm ${
        unmatchedGrades.length > 0
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-emerald-50/60 border-emerald-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {unmatchedGrades.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <h3 className={`text-sm font-bold ${
                unmatchedGrades.length > 0 ? 'text-rose-900' : 'text-emerald-900'
              }`}>
                {unmatchedGrades.length > 0
                  ? `Phát hiện ${unmatchedGrades.length} mác phôi trong SKIN_HRC2 chưa nằm trong nhóm MC / LC / HC`
                  : 'Tất cả mác phôi đang tồn kho trên SKIN_HRC2 đều đã được phân nhóm MC / LC / HC'}
              </h3>
              <p className="text-xs text-slate-600">
                Các cuộn chưa phân nhóm sẽ bị xếp cuối (sau HC) khi chạy Kế hoạch. Bấm nút + MC / + LC / + HC để phân loại nhanh.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            disabled={loading || mutatingGrade}
            className="h-8 text-xs bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Quét lại SKIN_HRC2
          </Button>
        </div>

        {unmatchedGrades.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {unmatchedGrades.map((item) => (
              <div
                key={item.grade}
                className="flex items-center justify-between gap-2 bg-white border border-rose-200 rounded-lg px-3 py-2 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate" title={item.grade}>
                    {item.grade}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.count > 0
                      ? `${item.count} cuộn (${item.pending_plan_count} chưa KH)${item.sample_coil ? ` • VD: ${item.sample_coil}` : ''}`
                      : 'Chưa nằm trong nhóm • Bấm để thêm'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {['MC', 'LC', 'HC'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      disabled={mutatingGrade}
                      onClick={() => handleAssignUnmatched(item.grade, grp)}
                      className="px-1.5 py-0.5 text-[11px] font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors disabled:opacity-50"
                      title={`Thêm "${item.grade}" vào nhóm ${grp}`}
                    >
                      +{grp}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Quản lý 3 nhóm mác thép MC, LC, HC */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className={`flex flex-wrap items-center justify-between gap-3 ${groupsCollapsed ? '' : 'mb-3'}`}>
          <button
            type="button"
            onClick={() => setGroupsCollapsed((prev) => !prev)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            title={groupsCollapsed ? 'Mở rộng danh sách nhóm mác phôi' : 'Thu gọn danh sách nhóm mác phôi'}
          >
            {groupsCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 " />
            )}
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              Cấu hình nhóm Mác phôi (Cùng nhóm sẽ gom vào chung 1 Plan)
            </h3>
          </button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mutatingGrade}
              onClick={handleResetDefaults}
              className="h-8 text-xs text-slate-700"
              title="Nạp lại danh sách MC, LC, HC và bảng Elongation mặc định"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Nạp lại mặc định
            </Button>
            <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchGrade}
              onChange={(e) => setSearchGrade(e.target.value)}
              placeholder="Tìm mác phôi..."
              className="w-full h-8 pl-8 pr-7 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchGrade && (
              <button
                type="button"
                onClick={() => setSearchGrade('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            </div>
          </div>
        </div>

        {!groupsCollapsed && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {['MC', 'LC', 'HC'].map((grp) => {
              const meta = GROUP_META[grp];
              const grades = gradeGroups[grp] || [];
              const filtered = normalizedSearch
                ? grades.filter((g) => g.toUpperCase().includes(normalizedSearch))
                : grades;
              const isCardCollapsed = !!collapsedGroups[grp];

              return (
                <div key={grp} className="flex flex-col rounded-lg border border-slate-200 overflow-hidden bg-slate-50/40">
                  <div className={`px-3 py-2 border-b flex items-center justify-between ${meta.headerClass}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{meta.title}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.badgeClass}`}>
                          {grades.length} mác
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600">{meta.subtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }))}
                      className="p-1 rounded hover:bg-white/70 text-slate-600 transition-colors"
                      title={isCardCollapsed ? `Mở rộng danh sách ${grp}` : `Thu gọn danh sách ${grp}`}
                    >
                      {isCardCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {!isCardCollapsed && (
                    <>
                      <div className="p-2.5 border-b border-slate-200 bg-white flex items-center gap-1.5">
                        <input
                          type="text"
                          value={gradeInputs[grp]}
                          onChange={(e) => setGradeInputs((prev) => ({ ...prev, [grp]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddGrades(grp, gradeInputs[grp]);
                            }
                          }}
                          placeholder={`Nhập hoặc dán mác vào ${grp} (cách nhau dấu phẩy)...`}
                          className="flex-1 h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          disabled={mutatingGrade}
                          onClick={() => handleAddGrades(grp, gradeInputs[grp])}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Thêm
                        </Button>
                      </div>

                      <div className="p-2.5 flex-1 max-h-64 overflow-y-auto flex flex-wrap content-start gap-1.5">
                        {filtered.length === 0 ? (
                          <span className="text-xs text-slate-400 italic p-1">
                            {normalizedSearch ? 'Không tìm thấy mác phù hợp' : 'Chưa có mác phôi nào'}
                          </span>
                        ) : (
                          filtered.map((g) => (
                            <span
                              key={g}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${meta.tagClass}`}
                            >
                              <span>{g}</span>
                              <button
                                type="button"
                                disabled={mutatingGrade}
                                onClick={() => handleRemoveGrade(grp, g)}
                                className="opacity-60 hover:opacity-100 hover:text-rose-600 transition-opacity"
                                title={`Xóa "${g}" khỏi nhóm ${grp}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Bảng tra Elongation Setup */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bảng tra Elongation Setup (theo Giới hạn chảy & Độ dày Thickness)
              </h3>
              <p className="text-xs text-slate-500">
                Chỉnh sửa trực tiếp các giá trị và bấm Lưu để áp dụng cho tính toán Elongation trên SKIN_HRC2.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveElongation}
            disabled={savingElongation || !elongationDirty}
            className={`h-8 text-xs ${elongationDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
          >
            {savingElongation ? (
              <LoaderCircle className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Lưu bảng Elongation
          </Button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="px-3 py-2 text-left font-bold border-r border-slate-200 whitespace-nowrap">
                  GHC \ Độ dày (mm)
                </th>
                {thicknessSteps.map((step) => (
                  <th
                    key={step}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 min-w-[60px]"
                  >
                    ≤ {step}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {elongationTable.map((row, rowIdx) => (
                <tr key={row.ghc_range} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-3 py-1.5 font-bold text-slate-800 bg-slate-50 border-r border-slate-200 whitespace-nowrap">
                    {row.ghc_range}
                  </td>
                  {thicknessSteps.map((step) => (
                    <td key={step} className="p-1 border-r border-slate-100">
                      <input
                        type="text"
                        value={row[step] ?? ''}
                        onChange={(e) => handleElongationCellChange(rowIdx, step, e.target.value)}
                        className="w-full h-7 text-center text-xs rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none bg-transparent font-medium text-slate-800"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
