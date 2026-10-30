import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckSquare,
  Filter,
  MinusSquare,
  RotateCcw,
  Search,
  Square,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

/**
 * Excel-style Column Filter Dropdown
 * Features:
 * - Sort A -> Z / Z -> A
 * - Clear filter from column
 * - Live search box for values
 * - Multi-select checkboxes with (Select All) & (Blanks)
 * - Record counts per unique value
 * - Apply / Cancel actions
 */
const NUMBER_COLUMNS = new Set([
  'kl_1c',
  'kl_1d',
  'thua_thieu_so_voi_zbc04b',
  'loai_1',
  'loai_2',
  'cho_xu_ly',
  'cho_skin',
  'tong_sl_sx_kcs',
  'ke_hoach_can',
  'ton_phoi',
  'ket_qua_can',
]);

const formatFilterLabel = (val, colKey) => {
  if (!val && val !== 0) return '(Trống)';
  const key = String(colKey || '').toLowerCase();
  if (
    NUMBER_COLUMNS.has(key) ||
    key.startsWith('kl_') ||
    key.includes('loai_') ||
    key.includes('cho_') ||
    key.includes('kcs') ||
    key.includes('thua_thieu') ||
    key.includes('ton_phoi') ||
    key.includes('ke_hoach')
  ) {
    const cleanStr = String(val).trim().replace(/\s+/g, '').replace(/,/g, '');
    if (/^-?\d+(\.\d+)?$/.test(cleanStr)) {
      const num = parseFloat(cleanStr);
      if (Number.isFinite(num)) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 3 });
      }
    }
  }
  return String(val);
};

export default function ExcelFilterDropdown({
  columnKey,
  title,
  rows = [],
  allColumnValues,
  activeFilter, // string | string[] | undefined
  sortState, // { column: string, direction: 'asc' | 'desc' } | null
  onApplyFilter, // (columnKey, selectedValues: string[] | null) => void
  onClearFilter, // (columnKey) => void
  onSort, // (columnKey, direction: 'asc' | 'desc') => void
  align = 'center', // 'left' | 'center' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState(new Set());
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // 1. Calculate all distinct values and counts for this column
  const distinctValues = useMemo(() => {
    // Ưu tiên: Lấy toàn bộ giá trị có trong toàn bộ bảng từ allColumnValues
    if (allColumnValues && (allColumnValues.counts || typeof allColumnValues.blanks === 'number')) {
      const countsMap = allColumnValues.counts || {};
      const blankCount = allColumnValues.blanks || 0;

      const sorted = Object.entries(countsMap).sort((a, b) => {
        const numA = Number(a[0]);
        const numB = Number(b[0]);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        return a[0].localeCompare(b[0], 'vi-VN', { numeric: true, sensitivity: 'base' });
      });

      const list = [];
      if (blankCount > 0) {
        list.push({ key: '__BLANK__', label: '(Trống)', count: blankCount });
      }
      for (const [val, count] of sorted) {
        list.push({ key: val, label: formatFilterLabel(val, columnKey), count });
      }
      return list;
    }

    const counts = new Map();
    let hasBlank = false;
    let blankCount = 0;

    for (const row of rows) {
      const raw = row?.values?.[columnKey];
      const str = raw === null || raw === undefined ? '' : String(raw).trim();
      if (!str || str === '—' || str === '-') {
        hasBlank = true;
        blankCount += 1;
      } else {
        counts.set(str, (counts.get(str) || 0) + 1);
      }
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => {
      const numA = Number(a[0]);
      const numB = Number(b[0]);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return a[0].localeCompare(b[0], 'vi-VN', { numeric: true, sensitivity: 'base' });
    });

    const list = [];
    if (hasBlank) {
      list.push({ key: '__BLANK__', label: '(Trống)', count: blankCount });
    }
    for (const [val, count] of sorted) {
      list.push({ key: val, label: formatFilterLabel(val, columnKey), count });
    }
    return list;
  }, [allColumnValues, rows, columnKey]);

  // All valid keys in this column
  const allKeys = useMemo(() => distinctValues.map((item) => item.key), [distinctValues]);

  // Filter distinct values by search keyword
  const filteredValues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return distinctValues;
    return distinctValues.filter((item) => item.label.toLowerCase().includes(q));
  }, [distinctValues, searchQuery]);

  // When dropdown opens, initialize selectedValues from activeFilter
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');

    if (!activeFilter || (Array.isArray(activeFilter) && activeFilter.length === 0)) {
      // Nothing filtered => all checked
      setSelectedValues(new Set(allKeys));
    } else if (Array.isArray(activeFilter)) {
      setSelectedValues(new Set(activeFilter));
    } else if (typeof activeFilter === 'string') {
      // If legacy single string filter, select matching items
      const target = activeFilter.trim().toLowerCase();
      const matched = allKeys.filter((key) => key.toLowerCase().includes(target));
      setSelectedValues(new Set(matched.length > 0 ? matched : [activeFilter]));
    }
  }, [isOpen, activeFilter, allKeys]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Select all / Indeterminate calculation for visible search results
  const visibleKeys = useMemo(() => filteredValues.map((item) => item.key), [filteredValues]);
  const visibleSelectedCount = useMemo(
    () => visibleKeys.filter((key) => selectedValues.has(key)).length,
    [visibleKeys, selectedValues]
  );
  const isAllVisibleSelected = visibleKeys.length > 0 && visibleSelectedCount === visibleKeys.length;
  const isPartiallyVisibleSelected = visibleSelectedCount > 0 && !isAllVisibleSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedValues);
    if (isAllVisibleSelected) {
      // Uncheck all visible
      for (const key of visibleKeys) next.delete(key);
    } else {
      // Check all visible
      for (const key of visibleKeys) next.add(key);
    }
    setSelectedValues(next);
  };

  const handleToggleItem = (key) => {
    const next = new Set(selectedValues);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedValues(next);
  };

  const handleApply = () => {
    // If all items are selected, that's equivalent to clearing filter
    if (allKeys.length > 0 && selectedValues.size >= allKeys.length) {
      onClearFilter?.(columnKey);
    } else if (selectedValues.size === 0) {
      // User deselected everything => no rows will match
      onApplyFilter?.(columnKey, ['__NO_MATCH__']);
    } else {
      onApplyFilter?.(columnKey, Array.from(selectedValues));
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilter?.(columnKey);
    setIsOpen(false);
  };

  const handleSortAsc = () => {
    onSort?.(columnKey, 'asc');
    setIsOpen(false);
  };

  const handleSortDesc = () => {
    onSort?.(columnKey, 'desc');
    setIsOpen(false);
  };

  const isFiltered = Boolean(
    activeFilter &&
    (Array.isArray(activeFilter) ? activeFilter.length > 0 && activeFilter.length < allKeys.length : Boolean(activeFilter))
  );

  const isSortedAsc = sortState?.column === columnKey && sortState?.direction === 'asc';
  const isSortedDesc = sortState?.column === columnKey && sortState?.direction === 'desc';

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button on Column Header */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Bộ lọc Excel cột ${title || columnKey}`}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`group inline-flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150 ${
          isFiltered
            ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/50'
            : isSortedAsc || isSortedDesc
            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
            : 'text-slate-400 hover:bg-black/10 hover:text-slate-800'
        }`}
        title={
          isFiltered
            ? `Đang lọc: ${
                Array.isArray(activeFilter)
                  ? `${activeFilter.length} giá trị đã chọn`
                  : activeFilter
              }`
            : `Bộ lọc Excel cho ${title || columnKey}`
        }
      >
        {isSortedAsc ? (
          <ArrowUp size={12} strokeWidth={2.5} />
        ) : isSortedDesc ? (
          <ArrowDown size={12} strokeWidth={2.5} />
        ) : (
          <Filter
            size={12}
            strokeWidth={isFiltered ? 2.5 : 1.8}
            className={isFiltered ? 'fill-white' : ''}
          />
        )}
      </button>

      {/* Excel-style Filter Popup Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full z-50 mt-1.5 w-72 rounded-2xl border border-slate-200/90 bg-white p-3 font-sans text-left text-xs text-slate-800 shadow-[0_12px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Bộ lọc Excel
              </span>
              <p className="truncate font-bold text-slate-900" title={title || columnKey}>
                {title || columnKey}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>

          {/* Sort Actions */}
          <div className="py-2 space-y-0.5">
            <button
              type="button"
              onClick={handleSortAsc}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                isSortedAsc
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowUp size={14} className="text-indigo-600" />
              <span>Sắp xếp từ A đến Z (Tăng dần)</span>
            </button>
            <button
              type="button"
              onClick={handleSortDesc}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                isSortedDesc
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowDown size={14} className="text-indigo-600" />
              <span>Sắp xếp từ Z đến A (Giảm dần)</span>
            </button>
          </div>

          {/* Clear filter from this column (if active) */}
          {isFiltered && (
            <div className="border-t border-slate-100 py-1.5">
              <button
                type="button"
                onClick={handleClear}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <RotateCcw size={13} />
                <span>Xóa lọc khỏi cột này</span>
              </button>
            </div>
          )}

          {/* Search within column values */}
          <div className="border-t border-slate-100 pt-2.5">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm giá trị…"
                className="h-8 w-full rounded-lg border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-normal placeholder:text-slate-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Values Checkbox List */}
          <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/40 p-1.5 space-y-0.5">
            {/* Select All Row */}
            {filteredValues.length > 0 && (
              <label
                className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs font-bold text-slate-800 hover:bg-white select-none transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-indigo-600">
                    {isAllVisibleSelected ? (
                      <CheckSquare size={14} className="fill-indigo-600 text-white" />
                    ) : isPartiallyVisibleSelected ? (
                      <MinusSquare size={14} className="fill-indigo-500 text-white" />
                    ) : (
                      <Square size={14} className="text-slate-400" />
                    )}
                  </span>
                  <span className="truncate">
                    {searchQuery ? '(Chọn tất cả kết quả)' : '(Chọn tất cả)'}
                  </span>
                </div>
                <span className="text-[10px] font-normal text-slate-400">
                  ({filteredValues.length})
                </span>
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={handleToggleSelectAll}
                  className="sr-only"
                />
              </label>
            )}

            {/* Individual Value Checkboxes */}
            {filteredValues.map((item) => {
              const isChecked = selectedValues.has(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs select-none transition ${
                    isChecked
                      ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                  title={`${item.label} (${item.count})`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span className="shrink-0 text-indigo-600">
                      {isChecked ? (
                        <CheckSquare size={14} className="fill-indigo-600 text-white" />
                      ) : (
                        <Square size={14} className="text-slate-300" />
                      )}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
                    {item.count}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleItem(item.key)}
                    className="sr-only"
                  />
                </label>
              );
            })}

            {filteredValues.length === 0 && (
              <p className="py-4 text-center text-[11px] text-slate-400">
                Không tìm thấy giá trị phù hợp
              </p>
            )}
          </div>

          {/* Footer stats & Action Buttons */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span className="text-[11px] text-slate-400 font-medium">
              Đã chọn <strong className="text-slate-700">{selectedValues.size}</strong>/{allKeys.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 text-xs font-bold text-white shadow-xs hover:from-indigo-500 hover:to-blue-500"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

