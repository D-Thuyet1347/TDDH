import asyncio
from typing import Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Response
from pydantic import BaseModel

from services.skin_service import (
    get_sheet_rows,
    load_data_source_from_qc,
    add_sheet_row,
    add_sheet_rows_batch,
    transfer_data_source_to_skin,
    delete_sheet_rows_batch,
    import_paste_rows,
    paste_column_data,
    copy_po_hsm_to_skin,
    sync_check_data_skin,
    update_sheet_row,
    delete_sheet_row,
    clear_sheet,
    import_data_source_from_excel,
    get_skin_stats,
    normalize_sheet_key,
    undo_sheet_action,
    get_undo_info,
    auto_link_po_new_in_po_skin,
    recalculate_po_sheet,
    recalculate_skin_hrc2,
    generate_get_data_rows,
    export_get_data_excel,
    fetch_and_update_ghc_for_data_source,
    collect_get_data_po,
    recalculate_get_data_po,
    sync_all_demand_to_get_data_po,
    get_pivot_data,
    save_pivot_block,
    import_hang_vot_rows,
    import_hang_vot_excel,
    sync_hang_vot_data,
    generate_skin_ke_hoach,
    get_skin_ke_hoach_matrix,
    export_skin_ke_hoach_excel,
    get_skin_hrc2_coils_by_ke_hoach,
    assign_skin_hrc2_ke_hoach_batch,
    SHEET_REGISTRY,
    SKIN_HRC2_COLUMNS,
    DATA_SOURCE_COLUMNS,
    GET_DATA_PO_COLUMNS,
    PIVOT_TABLE_COLUMNS,
    HANG_VOT_COLUMNS,
    KE_HOACH_COLUMNS,
)

router = APIRouter()

class LoadDataSourceRequest(BaseModel):
    months: list[int] | None = None

class AddRowRequest(BaseModel):
    values: dict[str, Any] = {}

class AddRowsBatchRequest(BaseModel):
    count: int = 1
    values: dict[str, Any] | None = None

class PasteRowsRequest(BaseModel):
    rows: list[dict[str, Any]] = []

class PasteColumnRequest(BaseModel):
    column_name: str
    values: list[str] = []

class TransferToSkinRequest(BaseModel):
    row_ids: list[str] = []

class BatchDeleteRequest(BaseModel):
    row_ids: list[str] = []

class UpdateRowRequest(BaseModel):
    values: dict[str, Any] = {}

class GenerateGetDataRequest(BaseModel):
    selected_plans: list[str] | None = None

class FetchGhcRequest(BaseModel):
    row_ids: list[str] | None = None
    only_missing: bool = True

class CollectGetDataPoRequest(BaseModel):
    po_list: list[str] = []
    po_type: str = "skin"
    clear_first: bool = False

class SavePivotBlockRequest(BaseModel):
    block_type: str
    items: list[dict[str, Any]] = []
    clear_first: bool = False

class ImportHangVotRequest(BaseModel):
    rows: list[dict[str, Any]] = []
    clear_first: bool = False

def validate_sheet(sheet_name: str) -> str:
    key = normalize_sheet_key(sheet_name)
    if key not in SHEET_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Sheet '{sheet_name}' không hợp lệ. Các sheet được hỗ trợ: {', '.join(SHEET_REGISTRY.keys())}"
        )
    return key

@router.get("/stats")
async def get_stats_endpoint():
    try:
        return get_skin_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sheets/{sheet_name}/rows")
async def get_rows_endpoint(
    sheet_name: str,
    limit: int = Query(100000, ge=1, le=500000),
    offset: int = Query(0, ge=0),
    search: str = Query("", max_length=50000),
):
    try:
        sheet_key = validate_sheet(sheet_name)
        return get_sheet_rows(sheet_name=sheet_key, limit=limit, offset=offset, search=search)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/load-data-source")
async def load_data_source_endpoint(req: LoadDataSourceRequest | None = None):
    try:
        months = req.months if req else None
        res = load_data_source_from_qc(months=months)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-data-source")
async def upload_data_source_endpoint(file: UploadFile = File(...)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel (.xlsx, .xls).")
        buffer = await file.read()
        res = import_data_source_from_excel(buffer, file.filename)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/rows")
async def add_row_endpoint(sheet_name: str, req: AddRowRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        res = add_sheet_row(sheet_name=sheet_key, values=req.values)
        return {"success": True, "row": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/rows/batch")
async def add_rows_batch_endpoint(sheet_name: str, req: AddRowsBatchRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        count = max(1, min(1000, req.count or 1))
        res = add_sheet_rows_batch(sheet_name=sheet_key, count=count, values=req.values)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/rows/import-paste")
async def import_paste_rows_endpoint(sheet_name: str, req: PasteRowsRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        if not req.rows:
            raise HTTPException(status_code=400, detail="Danh sách dòng trống.")
        res = import_paste_rows(sheet_name=sheet_key, rows_data=req.rows)
        return res
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/paste-column")
async def paste_column_endpoint(sheet_name: str, req: PasteColumnRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        if not req.column_name:
            raise HTTPException(status_code=400, detail="Thiếu tên cột.")
        res = paste_column_data(sheet_name=sheet_key, column_name=req.column_name, column_values=req.values)
        return res
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/copy-po-hsm-to-skin")
async def copy_po_hsm_to_skin_endpoint():
    try:
        res = copy_po_hsm_to_skin()
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-check-data")
async def sync_check_data_endpoint():
    try:
        res = sync_check_data_skin()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transfer-to-skin")
async def transfer_to_skin_endpoint(req: TransferToSkinRequest):
    try:
        if not req.row_ids:
            raise HTTPException(status_code=400, detail="Danh sách ID dòng không được rỗng.")
        res = transfer_data_source_to_skin(row_ids=req.row_ids)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/rows/batch-delete")
async def batch_delete_endpoint(sheet_name: str, req: BatchDeleteRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        res = delete_sheet_rows_batch(sheet_name=sheet_key, row_ids=req.row_ids)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sheets/{sheet_name}/rows/{row_id}")
async def update_row_endpoint(sheet_name: str, row_id: str, req: UpdateRowRequest):
    try:
        sheet_key = validate_sheet(sheet_name)
        res = update_sheet_row(sheet_name=sheet_key, row_id=row_id, values=req.values)
        return {"success": True, "row": res}
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sheets/{sheet_name}/rows/{row_id}")
async def delete_row_endpoint(sheet_name: str, row_id: str):
    try:
        sheet_key = validate_sheet(sheet_name)
        ok = delete_sheet_row(sheet_name=sheet_key, row_id=row_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Không tìm thấy dòng để xóa.")
        return {"success": True, "id": row_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sheets/{sheet_name}/clear")
async def clear_sheet_endpoint(sheet_name: str):
    try:
        sheet_key = validate_sheet(sheet_name)
        clear_sheet(sheet_key)
        return {"success": True, "message": f"Đã xóa toàn bộ dữ liệu trong sheet '{sheet_name}'."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sheets/{sheet_name}/undo-info")
async def get_undo_info_endpoint(sheet_name: str):
    try:
        sheet_key = validate_sheet(sheet_name)
        return get_undo_info(sheet_key)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/undo")
async def undo_sheet_action_endpoint(sheet_name: str):
    try:
        sheet_key = validate_sheet(sheet_name)
        res = undo_sheet_action(sheet_key)
        return res
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sheets/{sheet_name}/recalculate")
async def recalculate_sheet_endpoint(sheet_name: str):
    try:
        sheet_key = validate_sheet(sheet_name)
        sheet_key_upper = sheet_key.upper()
        if sheet_key_upper == "SKIN_HRC2":
            res = recalculate_skin_hrc2()
        elif sheet_key_upper in ("PO_HSM", "PO_SKIN"):
            res = recalculate_po_sheet(sheet_key_upper)
        elif sheet_key_upper == "GET_DATA_PO":
            res = recalculate_get_data_po()
        elif sheet_key_upper == "PIVOT_TABLE":
            res = recalculate_skin_hrc2()
        else:
            return {"success": True, "message": f"Sheet {sheet_name} không có công thức phụ thuộc cần tính toán lại."}
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-link-po-new")
async def auto_link_po_new_endpoint():
    try:
        res = auto_link_po_new_in_po_skin()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-get-data")
async def generate_get_data_endpoint(req: GenerateGetDataRequest | None = None):
    try:
        plans = req.selected_plans if req else None
        res = generate_get_data_rows(selected_plans=plans)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-get-data")
async def export_get_data_endpoint():
    try:
        data = export_get_data_excel()
        return Response(
            content=data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Get_Data.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-ghc")
async def fetch_ghc_endpoint(req: FetchGhcRequest | None = None):
    try:
        row_ids = req.row_ids if req else None
        only_missing = req.only_missing if req else True
        res = await asyncio.to_thread(fetch_and_update_ghc_for_data_source, row_ids, only_missing)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-data-po/collect")
async def collect_get_data_po_endpoint(req: CollectGetDataPoRequest):
    try:
        res = collect_get_data_po(po_list=req.po_list, po_type=req.po_type, clear_first=req.clear_first)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-data-po/recalculate")
async def recalculate_get_data_po_endpoint():
    try:
        res = recalculate_get_data_po()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SyncDemandRequest(BaseModel):
    clear_first: bool = True

@router.post("/get-data-po/sync-demand")
async def sync_demand_endpoint(req: SyncDemandRequest = None):
    try:
        clear = req.clear_first if req else True
        res = sync_all_demand_to_get_data_po(clear_first=clear)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pivot/data")
async def get_pivot_data_endpoint():
    try:
        res = get_pivot_data()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pivot/save-block")
async def save_pivot_block_endpoint(req: SavePivotBlockRequest):
    try:
        res = save_pivot_block(block_type=req.block_type, items=req.items, clear_first=req.clear_first)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hang-vot/import-rows")
async def import_hang_vot_rows_endpoint(req: ImportHangVotRequest):
    try:
        res = import_hang_vot_rows(rows_data=req.rows, clear_first=req.clear_first)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hang-vot/upload-excel")
async def upload_hang_vot_excel_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        res = import_hang_vot_excel(buffer=contents, original_name=file.filename or "upload.xlsx")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SyncHangVotRequest(BaseModel):
    custom_path: str | None = None

@router.post("/hang-vot/sync")
async def sync_hang_vot_endpoint(req: SyncHangVotRequest | None = None):
    try:
        custom_p = req.custom_path if req else None
        res = sync_hang_vot_data(custom_path=custom_p)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateKeHoachRequest(BaseModel):
    skin2_target: int = 50
    skin4_target: int = 50
    update_source: bool = True
    today_date: str | None = None

@router.post("/ke-hoach/generate")
async def generate_ke_hoach_endpoint(req: GenerateKeHoachRequest | None = None):
    try:
        s2 = req.skin2_target if req else 50
        s4 = req.skin4_target if req else 50
        upd = req.update_source if req else True
        td = req.today_date if req else None
        res = generate_skin_ke_hoach(skin2_target=s2, skin4_target=s4, update_source=upd, today_date_str=td)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ke-hoach/matrix")
async def get_ke_hoach_matrix_endpoint():
    try:
        res = get_skin_ke_hoach_matrix()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ke-hoach/export")
async def export_ke_hoach_endpoint(skin2_target: int = 50, skin4_target: int = 50):
    try:
        buf = export_skin_ke_hoach_excel(skin2_target=skin2_target, skin4_target=skin4_target)
        headers = {
            "Content-Disposition": 'attachment; filename="Ke_hoach_Skin.xlsx"'
        }
        return Response(content=buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AssignKeHoachBatchRequest(BaseModel):
    coil_ids: list[str]
    ke_hoach: str = ""
    limit: int = 1000


@router.get("/hrc2/ke-hoach-coils")
async def get_hrc2_ke_hoach_coils_endpoint(date: str = Query("", alias="date"), limit: int = Query(1000, le=5000)):
    try:
        res = get_skin_hrc2_coils_by_ke_hoach(ke_hoach_query=date, limit=limit)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hrc2/ke-hoach-assign")
async def assign_hrc2_ke_hoach_batch_endpoint(req: AssignKeHoachBatchRequest):
    try:
        res = assign_skin_hrc2_ke_hoach_batch(coil_ids=req.coil_ids, ke_hoach_val=req.ke_hoach, limit=req.limit)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





