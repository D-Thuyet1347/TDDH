import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Copy, Pencil } from 'lucide-react';
import ExcelFilterDropdown from './ExcelFilterDropdown';
import { nf } from '../utils/ultils';

const ROW_HEIGHT = 30; // standard 30px per row
const BUFFER_ROWS = 15;

export default function SkinVirtualTable({
  activeSheet,
  columns,
  rows,
  rawRows,
  selectedRowIds,
  onToggleSelectRow,
  onToggleSelectAll,
  activeRowId,
  onSetActiveRowId,
  filters = {},
  onApplyFilter,
  onClearFilter,
  sortConfig = { column: null, direction: 'asc' },
  onSort,
  editingCell,
  editValue,
  setEditValue,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onRowClick,
  renderCustomCell,
  onCopySelectedIds,
  idColumnName,
  onEditRow,
}) {
  const containerRef = useRef(null);
  const cellInputRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Shortcut Ctrl+C để copy cột ID của các dòng được tick chọn
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        const sel = window.getSelection()?.toString();
        if (sel && sel.trim().length > 0) return;

        if (selectedRowIds && selectedRowIds.size > 0 && onCopySelectedIds) {
          e.preventDefault();
          onCopySelectedIds();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowIds, onCopySelectedIds]);

  // Focus cell input when editing
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [editingCell]);

  // Keep track of container height
  useEffect(() => {
    if (!containerRef.current) return;
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || 600);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalRows = rows.length;
  const totalVirtualHeight = totalRows * ROW_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2 * BUFFER_ROWS;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);

  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, totalVirtualHeight - endIndex * ROW_HEIGHT);

  const visibleRows = useMemo(() => {
    return rows.slice(startIndex, endIndex).map((row, idx) => ({
      row,
      originalIdx: startIndex + idx,
    }));
  }, [rows, startIndex, endIndex]);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const isAllSelected = totalRows > 0 && selectedRowIds.size === totalRows;
  const isIndeterminate = selectedRowIds.size > 0 && selectedRowIds.size < totalRows;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto max-h-[calc(100vh-210px)] relative"
      >
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-30 bg-slate-100 text-[11px] font-bold text-slate-700 shadow-sm">
          {activeSheet === 'CHECK_DATA_SKIN' ? (
            <>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky top-0 left-0 z-40 bg-slate-100 px-2 py-2 text-center border-r border-b border-slate-200 select-none shadow-xs w-16"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={onToggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      title="Chọn tất cả các dòng"
                    />
                    <span>STT</span>
                  </div>
                </th>
                <th colSpan={4} className="bg-emerald-50 text-emerald-900 border-r-2 border-r-slate-400 border-b border-slate-200 text-center py-1">
                  Dữ liệu SKIN & SKIN_CUST (Nguồn: DATA_SOURCE)
                </th>
                <th colSpan={5} className="bg-amber-50 text-amber-900 border-b border-slate-200 text-center py-1">
                  Dữ liệu chạy lại (Nguồn: DATA_MES)
                </th>
              </tr>
              <tr>
                {columns.map((col, colIdx) => {
                  const isFiltered = Boolean(filters[col]?.length);
                  const isDivider = colIdx === 3;
                  return (
                    <th
                      key={col}
                      className={`sticky top-6 z-20 px-3 py-2 font-bold whitespace-nowrap transition-colors shadow-xs ${
                        isDivider ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-200'
                      } ${
                        isFiltered
                          ? 'bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-600'
                          : colIdx < 4 ? 'bg-emerald-50/70 text-emerald-900' : 'bg-amber-50/70 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="select-none font-bold">{col}</span>
                        <ExcelFilterDropdown
                          columnKey={col}
                          title={col}
                          rows={rawRows || rows}
                          activeFilter={filters[col]}
                          sortState={sortConfig.column === col ? sortConfig : null}
                          onApplyFilter={onApplyFilter}
                          onClearFilter={onClearFilter}
                          onSort={onSort}
                          align={colIdx >= columns.length - 3 ? 'right' : colIdx < 2 ? 'left' : 'center'}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </>
          ) : (
            <tr>
              <th className="sticky top-0 left-0 z-40 bg-slate-100 px-2 py-2 text-center border-r border-slate-200 select-none shadow-xs w-16">
                <div className="flex items-center justify-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={onToggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Chọn tất cả các dòng"
                  />
                  <span>STT</span>
                </div>
              </th>
              {columns.map((col, colIdx) => {
                const isFiltered = Boolean(filters[col]?.length);
                return (
                  <th
                    key={col}
                    className={`sticky top-0 z-20 px-3 py-2 font-bold border-r border-slate-200 whitespace-nowrap transition-colors shadow-xs ${
                      isFiltered
                        ? 'bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-600'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="select-none font-bold">{col}</span>
                      <ExcelFilterDropdown
                        columnKey={col}
                        title={col}
                        rows={rawRows || rows}
                        activeFilter={filters[col]}
                        sortState={sortConfig.column === col ? sortConfig : null}
                        onApplyFilter={onApplyFilter}
                        onClearFilter={onClearFilter}
                        onSort={onSort}
                        align={colIdx >= columns.length - 3 ? 'right' : colIdx < 2 ? 'left' : 'center'}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          )}
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {topPadding > 0 && (
            <tr style={{ height: `${topPadding}px` }} aria-hidden="true">
              <td colSpan={columns.length + 1} style={{ padding: 0, border: 0, height: `${topPadding}px` }} />
            </tr>
          )}
          {visibleRows.map(({ row, originalIdx }) => {
            const isSelected = activeRowId === row.id;
            const isChecked = selectedRowIds.has(row.id);

            const isEmptyPlanSeparator =
              activeSheet === 'KE_HOACH' && !row.values?.['ID Cuộn Bó'] && !row.values?.['Plan ID'];
            if (isEmptyPlanSeparator) {
              return (
                <tr key={row.id || originalIdx} className="bg-slate-100/80 border-y border-slate-300 h-3">
                  <td colSpan={columns.length + 1} className="py-1 px-3 text-[10px] text-slate-400 font-semibold italic text-center select-none bg-slate-100">
                    — Phân cách cặp Plan —
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={row.id}
                onClick={() => {
                  onSetActiveRowId(row.id);
                  if (onRowClick) onRowClick(row);
                }}
                className={`transition-colors cursor-pointer group ${
                  isChecked
                    ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500/40'
                    : isSelected
                    ? 'bg-emerald-50/50 ring-1 ring-inset ring-emerald-500/30'
                    : 'hover:bg-slate-50'
                }`}
              >
                <td
                  className={`sticky left-0 z-10 px-2 py-1.5 text-center font-medium border-r border-slate-200 shadow-xs select-none ${
                    isChecked
                      ? 'bg-emerald-100/90 text-emerald-950 font-bold'
                      : isSelected
                      ? 'bg-emerald-100/70 text-emerald-950 font-bold'
                      : 'bg-slate-50 group-hover:bg-slate-100 text-slate-500'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => onToggleSelectRow(row.id, e)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="min-w-6 text-right font-mono">{originalIdx + 1}</span>
                    {onEditRow && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRow(row);
                        }}
                        className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Mở form chỉnh sửa dòng này"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                </td>
                {columns.map((col, cIdx) => {
                  const val = row.values?.[col];
                  const isEditing = editingCell?.rowId === row.id && editingCell?.col === col;
                  const isDivider = activeSheet === 'CHECK_DATA_SKIN' && cIdx === 3;

                  return (
                    <td
                      key={col}
                      onDoubleClick={() => onStartEdit(row, col)}
                      className={`px-2.5 py-1.5 max-w-xs truncate ${
                        isDivider ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-100'
                      } ${
                        activeSheet === 'CHECK_DATA_SKIN'
                          ? cIdx < 4 ? 'bg-emerald-50/20' : 'bg-amber-50/20'
                          : ''
                      }`}
                      title={String(val ?? '')}
                    >
                      {isEditing ? (
                        <input
                          ref={cellInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={onCommitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onCommitEdit();
                            else if (e.key === 'Escape') onCancelEdit();
                          }}
                          className="w-full rounded border border-emerald-500 bg-white px-1 py-0.5 text-xs outline-none"
                        />
                      ) : renderCustomCell ? (
                        renderCustomCell(row, col, val)
                      ) : (
                        <span>
                          {(() => {
                            if ((col === 'GHC' || col === 'YieldPoint') && (val === '-1.0' || val === -1.0 || val === '-1' || val === -1)) return '—';
                            if ((col === 'Thickness' || col === 'Width') && val !== null && val !== undefined && val !== '') {
                              const num = Number(String(val).replace(',', '.'));
                              if (!isNaN(num)) return num.toFixed(2);
                            }
                            return String(val ?? '');
                          })()}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {bottomPadding > 0 && (
            <tr style={{ height: `${bottomPadding}px` }} aria-hidden="true">
              <td colSpan={columns.length + 1} style={{ padding: 0, border: 0, height: `${bottomPadding}px` }} />
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* FOOTER STATUS BAR WITH TOTAL COUNTS */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 gap-3 select-none">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Đang hiển thị: <strong className="text-slate-900 font-bold">{nf(rows.length)}</strong>
            {rawRows && rawRows.length !== rows.length ? (
              <span className="text-slate-500 ml-1">
                (trên tổng <strong className="text-slate-900 font-bold">{nf(rawRows.length)}</strong> dòng)
              </span>
            ) : (
              <span className="text-slate-500 ml-1">
                / tổng <strong>{nf(rows.length)}</strong> dòng
              </span>
            )}
          </span>
          {selectedRowIds?.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                ✓ Đã chọn: {nf(selectedRowIds.size)} dòng
              </span>
              {onCopySelectedIds && (
                <button
                  type="button"
                  onClick={() => onCopySelectedIds()}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer"
                  title={`Sao chép toàn bộ mã trong cột ${idColumnName || 'ID'} của các dòng đã chọn vào Clipboard (Phím tắt: Ctrl+C)`}
                >
                  <Copy size={12} />
                  Sao chép {idColumnName ? `cột ${idColumnName}` : 'cột ID'} ({nf(selectedRowIds.size)})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
