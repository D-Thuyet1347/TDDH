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
    SHEET_REGISTRY,
    SKIN_HRC2_COLUMNS,
    DATA_SOURCE_COLUMNS,
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
    search: str = Query("", max_length=200),
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
        if sheet_key == "skin_hrc2":
            res = recalculate_skin_hrc2()
        elif sheet_key in ("po_hsm", "po_skin"):
            res = recalculate_po_sheet(sheet_key)
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

