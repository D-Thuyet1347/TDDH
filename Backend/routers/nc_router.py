import io
from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Response, Query
from fastapi.responses import StreamingResponse

from services.nc_report_service import (
    list_order_demand_reports,
    get_order_demand_rows,
    get_order_demand_column_values,
    create_order_demand_row,
    update_order_demand_row,
    delete_order_demand_row,
    import_order_demand_report,
    sync_order_demand_with_qc_data,
    open_order_demand_workbook,
    ORDER_DEMAND_SHEET_NAME,
)

router = APIRouter()

@router.get("/reports")
async def list_nc_reports_endpoint(limit: int = 100, offset: int = 0, search: str = ""):
    return list_order_demand_reports(limit=limit, offset=offset, search=search)

@router.post("/reports")
async def upload_nc_report_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        res = import_order_demand_report(content, file.filename)
        return {
            "message": f"Đã đọc và tạo bảng thành công {res['rows_imported']:,} dòng trên {len(res['sheets'])} sheet.",
            "report": res,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports/{report_id}/file")
async def download_nc_report_endpoint(report_id: str):
    try:
        data = open_order_demand_workbook(report_id)
        fn = data["filename"]
        return StreamingResponse(
            io.BytesIO(data["workbook"]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{fn}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.api_route("/reports/{report_id}/sync-qc", methods=["GET", "POST", "PUT"])
@router.api_route("/sync-qc", methods=["GET", "POST", "PUT"])
async def sync_nc_qc_endpoint(report_id: str | None = None):
    return sync_order_demand_with_qc_data(report_id=report_id)

@router.get("/reports/{report_id}/sheets/{sheet_name}/rows")
async def get_nc_rows_endpoint(report_id: str, sheet_name: str, limit: int = 100, offset: int = 0, search: str = "", filters: str | None = None):
    return get_order_demand_rows(report_id=report_id, sheet_name=sheet_name, limit=limit, offset=offset, search=search, filters=filters)

@router.get("/reports/{report_id}/sheets/{sheet_name}/column-values")
@router.get("/reports/{report_id}/column-values")
async def get_nc_column_values_endpoint(report_id: str, sheet_name: str | None = None, column: str | None = None):
    sheet = sheet_name or ORDER_DEMAND_SHEET_NAME
    vals = get_order_demand_column_values(report_id=report_id, sheet_name=sheet, field_name=column)
    return vals

@router.post("/reports/{report_id}/sheets/{sheet_name}/rows")
async def create_nc_row_endpoint(report_id: str, sheet_name: str, request: Request):
    body = await request.json()
    row = create_order_demand_row(report_id=report_id, sheet_name=sheet_name, input_values=body.get("values", {}))
    return {"message": "Đã thêm dòng nhu cầu đơn hàng.", "row": row}

@router.put("/reports/{report_id}/sheets/{sheet_name}/rows/{row_id}")
async def update_nc_row_endpoint(report_id: str, sheet_name: str, row_id: str, request: Request):
    body = await request.json()
    row = update_order_demand_row(report_id=report_id, sheet_name=sheet_name, row_id=row_id, input_values=body.get("values", {}))
    return {"message": "Đã cập nhật dòng nhu cầu đơn hàng.", "row": row}

@router.delete("/reports/{report_id}/sheets/{sheet_name}/rows/{row_id}")
async def delete_nc_row_endpoint(report_id: str, sheet_name: str, row_id: str):
    res = delete_order_demand_row(report_id=report_id, sheet_name=sheet_name, row_id=row_id)
    return {"message": "Đã xóa dòng nhu cầu đơn hàng.", **res}
