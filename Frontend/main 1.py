import pandas as pd
import win32com.client
import time, os, re, json, sys
from openpyxl import load_workbook
import pyperclip, time
from datetime import datetime

# ======== Đọc cấu hình từ file config.json =========
CONFIG_PATH = "config.json"

def load_config(config_path=CONFIG_PATH):
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        print("✅ Đã tải cấu hình từ file config.json.")
        return config
    except Exception as e:
        print(f"❌ Không thể đọc file config.json: {e}")
        exit(1)

config = load_config()
EXCEL_FILE = config.get("EXCEL_FILE", "Chuyen_Ton_Kho.xlsx")
SERVER_NAME = config.get("SERVER_NAME", "PRD_Upgrade")
SAP_USER = config.get("SAP_USER", "")
SAP_PASS = config.get("SAP_PASS", "")
DEFAULT_PLANT = config.get("DEFAULT_PLANT", "1600")

# ======== Toàn cục để giữ session =========
SapGuiAuto = None
application = None
connection = None
session = None
SHEET_NAME_SDN = "SĐN"


# ======== Hàm đọc danh sách coil =========
def read_coil_list(excel_file: str):
    excel_path = os.path.join(os.getcwd(), excel_file)
    df = pd.read_excel(excel_path, sheet_name=SHEET_NAME_SDN, header=3, usecols="A:C", dtype=str)
    df = df.dropna(subset=["id_coil"]).reset_index(drop=True)
    df["id_coil"] = df["id_coil"].str.strip().str.replace(r"\.0$", "", regex=True)
    coil_list = df["id_coil"].tolist()

    print("📦 Danh sách ID Coil đọc được:")
    for i, coil in enumerate(coil_list, 1):
        print(f"{i:02d}. {coil}")
    return coil_list

# ======== Kết nối SAP =========
def connect_sap(server_name: str, user: str, password: str):
    global SapGuiAuto, application, connection, session

    print("\n🔗 Kiểm tra kết nối SAP GUI...")

    try:
        # --- Lấy instance SAP đang chạy ---
        SapGuiAuto = win32com.client.GetObject("SAPGUI")
        application = SapGuiAuto.GetScriptingEngine
        print("✅ Đã tìm thấy SAP GUI đang mở.")
    except Exception:
        print("⚠️ SAP GUI chưa mở. Đang khởi động SAP...")
        os.system("start saplogon.exe")
        time.sleep(5)  # chờ SAP Logon mở lên
        SapGuiAuto = win32com.client.GetObject("SAPGUI")
        application = SapGuiAuto.GetScriptingEngine

    # --- Kiểm tra có kết nối nào không ---
    if application.Children.Count > 0:
        print("🔎 Đã phát hiện kết nối SAP hiện có.")
        connection = application.Children(0)
    else:
        print("🚀 Chưa có kết nối, tạo mới...")
        connection = application.OpenConnection(server_name, True)
        time.sleep(3)

    # --- Kiểm tra session đang chạy ---
    if connection.Children.Count > 0:
        session = connection.Children(0)
        print("✅ Sử dụng session SAP hiện có.")
    else:
        print("🧩 Tạo session mới...")
        session = connection.Children(0)
        time.sleep(2)

    # --- Thử login nếu cần ---
    try:
        if session.findById("wnd[0]/usr/txtRSYST-BNAME", False):
            print("🔑 Đang đăng nhập SAP...")
            session.findById("wnd[0]/usr/txtRSYST-BNAME").text = user
            session.findById("wnd[0]/usr/pwdRSYST-BCODE").text = password
            session.findById("wnd[0]").sendVKey(0)
            time.sleep(2)
    except Exception:
        print("⚙️ Bỏ qua đăng nhập (đã login sẵn).")

    # --- Popup xử lý login trùng ---
    try:
        if session.findById("wnd[1]").Text == "License Information for Multiple Logons":
            print("⚠️ Phát hiện login trùng, chọn 'Terminate other sessions'")
            session.findById("wnd[1]/usr/radMULTI_LOGON_OPT2").Select()
            session.findById("wnd[1]/tbar[0]/btn[0]").press()
    except:
        pass

    # --- Popup xác nhận khác ---
    try:
        if session.findById("wnd[1]").Text == "Confirm Selection":
            session.findById("wnd[1]/tbar[0]/btn[0]").press()
    except:
        pass

    print("✅ Kết nối SAP thành công và sẵn sàng thao tác!")
    return session


# ======== Mở Transaction =========
def open_tcode(t_code: str):
    global session
    print(f"\n🚀 Đang mở transaction {t_code.upper()}...")
    session.findById("wnd[0]").maximize()
    session.findById("wnd[0]/tbar[0]/okcd").text = t_code
    session.findById("wnd[0]").sendVKey(0)
    time.sleep(1)


# ======== Nhập danh sách Coil =========

def input_coil_list(coil_list, plant=DEFAULT_PLANT):
    global session
    print("🧩 Đang nhập danh sách ID Coil vào SAP (Clipboard Mode)...")

    session.findById("wnd[0]/usr/chkP_L1").selected = False
    session.findById("wnd[0]/usr/chkP_L2").selected = False
    session.findById("wnd[0]/usr/ctxtS_WERKS-LOW").text = plant
    session.findById("wnd[0]/usr/chkP_L2").setFocus()

    session.findById("wnd[0]/usr/btn%_S_ID_%_APP_%-VALU_PUSH").press()
    time.sleep(1)

    # ⚙️ Ghép danh sách thành chuỗi chuẩn CRLF + dòng trống cuối
    all_coils = "\r\n".join(str(c).strip() for c in coil_list) + "\r\n"
    pyperclip.copy(all_coils)

    # Dán vào bảng SAP
    session.findById("wnd[1]/tbar[0]/btn[24]").press()  # icon “Paste from clipboard”
    time.sleep(0.5)

    session.findById("wnd[1]/tbar[0]/btn[8]").press()
    print(f"✅ Đã nhập {len(coil_list)} ID Coil vào SAP qua clipboard thành công!")

# ======== Chọn Layout =========
def after_input_actions():
    global session
    print("▶️ Thực hiện các thao tác sau khi nhập ID Coil...")

    session.findById("wnd[0]").maximize()
    session.findById("wnd[0]/tbar[1]/btn[8]").press()
    time.sleep(1)

    session.findById("wnd[0]/tbar[1]/btn[33]").press()
    time.sleep(1)

    layout_table = (
        "wnd[1]/usr/subSUB_CONFIGURATION:SAPLSALV_CUL_LAYOUT_CHOOSE:0500/"
        "cntlD500_CONTAINER/shellcont/shell"
    )
    session.findById(layout_table).currentCellRow = 37
    session.findById(layout_table).selectedRows = "37"
    session.findById(layout_table).clickCurrentCell()
    print("✅ Đã chọn layout dòng 37 thành công!")

# ======== Đọc dữ liệu từ ALV Grid =========
def read_grid_data(columns=("ID_CUONBO", "MATNR", "WEIGHT", "CHARG")):
    global session
    print("📊 Đang đọc dữ liệu từ ALV Grid...")

    try:
        grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell/shellcont[1]/shell")
    except Exception:
        print("❌ Không tìm thấy lưới dữ liệu trong màn hình SAP!")
        return pd.DataFrame(columns=columns)

    row_count = grid.RowCount
    print(f"📋 Tổng số dòng trong bảng: {row_count}")

    records = []
    for i in range(row_count):
        row_data = {}
        for col in columns:
            try:
                value = grid.GetCellValue(i, col)
            except Exception:
                value = ""
            row_data[col] = str(value).strip()
        records.append(row_data)

    df = pd.DataFrame(records)
    print(f"✅ Đã đọc {len(df)} dòng dữ liệu từ SAP Grid.")
    return df

# ======== Ghi Material + Weight vào file Excel gốc =========
def update_excel_with_material(excel_file: str, df_sap: pd.DataFrame):
    print("📝 Đang ghi dữ liệu Material và Weight vào file Excel...")

    wb = load_workbook(excel_file)
    ws = wb[SHEET_NAME_SDN]  # Sheet đầu tiên

    # 🧹 Xóa dữ liệu cũ vùng E5:F... (bảng tổng)
    print("🧹 Đang xóa dữ liệu vùng E5:F... (nếu có)")
    row = 5
    while ws[f"E{row}"].value or ws[f"F{row}"].value:
        ws[f"E{row}"].value = None
        ws[f"F{row}"].value = None
        row += 1

    # 🧩 Tạo map từ ID_CUONBO -> (MATNR, CHARG, WEIGHT)
    sap_dict = {}
    for _, r in df_sap.iterrows():
        key = str(r["ID_CUONBO"]).strip()
        mat = str(r.get("MATNR", "")).strip()
        batch = str(r.get("CHARG", "")).strip()

        raw_weight = r.get("WEIGHT", "")
        if pd.isna(raw_weight) or str(raw_weight).strip() == "":
            weight = None
        else:
            try:
                weight = float(str(raw_weight).replace(",", ""))
            except:
                weight = None

        sap_dict[key] = (mat, weight, batch)

    # ✍️ Ghi Material vào cột C, Weight vào cột B (dựa theo ID Coil ở cột A)
    row = 5
    while True:
        id_coil = ws[f"A{row}"].value
        if id_coil is None:
            break

        id_coil_str = str(id_coil).strip()
        if id_coil_str in sap_dict:
            material, weight, batch = sap_dict[id_coil_str]

            ws[f"B{row}"].value = weight
            ws[f"C{row}"].value = material
            ws[f"D{row}"].value = batch
        else:
            print(f"⚠️ Không tìm thấy coil {id_coil_str} trong SAP")

        row += 1

    print("📊 Đang tính tổng khối lượng theo Material + Batch...")

    data = []
    row = 5

    while ws[f"A{row}"].value:
        material = ws[f"C{row}"].value
        batch = ws[f"D{row}"].value
        weight = ws[f"B{row}"].value

        # Chuẩn hóa dữ liệu
        if material:
            material = str(material).strip()
        if batch:
            batch = str(batch).strip()

        # Chỉ lấy dòng hợp lệ
        if material and batch and isinstance(weight, (int, float)):
            data.append((material, batch, float(weight)))
        else:
            # Debug nhẹ (có thể tắt nếu log nhiều quá)
            print(f"⏭️ Skip dòng {row}: material={material}, batch={batch}, weight={weight}")

        row += 1

    # Không có dữ liệu thì dừng
    if not data:
        print("⚠️ Không có dữ liệu hợp lệ để tính tổng khối lượng!")
        wb.save(excel_file)
        return

    # ===== Tổng hợp =====
    df_sum = (
        pd.DataFrame(data, columns=["material", "batch", "weight"])
        .groupby(["material", "batch"], as_index=False)["weight"]
        .sum()
        .sort_values(["material", "batch"])
    )

    # ===== Xóa dữ liệu cũ vùng E:H =====
    print("🧹 Xóa dữ liệu tổng hợp cũ (E:H)...")
    row = 5
    while ws[f"E{row}"].value or ws[f"F{row}"].value or ws[f"H{row}"].value:
        ws[f"E{row}"].value = None
        ws[f"F{row}"].value = None
        ws[f"H{row}"].value = None
        row += 1

    # ===== Ghi dữ liệu mới =====
    for i, row_data in enumerate(df_sum.itertuples(index=False), start=5):
        ws[f"E{i}"].value = row_data.material
        ws[f"F{i}"].value = float(row_data.weight)
        ws[f"H{i}"].value = row_data.batch

    wb.save(excel_file)

    print(f"✅ Đã tổng hợp Material + Batch và ghi vào Excel ({len(df_sum)} dòng)")

# ======== Thực thi Transaction ZMB21 với danh sách Material =========
def execute_zmb21_with_materials(excel_file: str):
    global session
    print("\n🔄 Đang thực thi transaction ZMB21 với danh sách Material...")

    # ---- Đọc dữ liệu từ Excel ----
    wb = load_workbook(excel_file, data_only=True)
    ws = wb[SHEET_NAME_SDN]

    # Đọc header vùng A1:H2
    headers = [ws[f"{col}1"].value for col in "ABCDEFGH"]
    values = [ws[f"{col}2"].value for col in "ABCDEFGH"]
    header_data = dict(zip(headers, values))

    # ===== 🔥 NEW: build map (material, batch) → weight =====
    excel_map = {}
    row = 5
    while True:
        mat = ws[f"E{row}"].value
        batch = ws[f"H{row}"].value
        weight = ws[f"F{row}"].value

        if not mat:
            break

        key = (str(mat).strip(), str(batch).strip())
        excel_map[key] = weight

        row += 1

    if not excel_map:
        print("⚠️ Không có dữ liệu Material + Batch để nhập vào SAP!")
        return

    materials = list(set(k[0] for k in excel_map.keys()))

    print(f"📦 Số Material cần nhập: {len(materials)}")
    print(f"🏭 Plant: {header_data.get('plan_storage_location')}, "
          f"Storage Location: {header_data.get('storage_location')}")

    # ---- SAP ----
    session.findById("wnd[0]").maximize()
    session.findById("wnd[0]/tbar[0]/okcd").text = "/nzmb21"
    session.findById("wnd[0]").sendVKey(0)
    time.sleep(1)

    # ===== Nhập Material =====
    session.findById("wnd[0]/usr/btn%_MATNR_%_APP_%-VALU_PUSH").press()
    time.sleep(1)

    try:
        session.findById("wnd[1]/tbar[0]/btn[16]").press()
        time.sleep(0.3)
    except:
        pass

    pyperclip.copy("\r\n".join(materials))
    session.findById("wnd[1]/tbar[0]/btn[24]").press()
    time.sleep(0.5)
    session.findById("wnd[1]/tbar[0]/btn[8]").press()

    # ===== 🔥 NEW: Nhập Batch =====
    batches = list(set(k[1] for k in excel_map.keys() if k[1]))

    print(f"📦 Số Batch cần nhập: {len(batches)}")

    if batches:
        session.findById("wnd[0]/usr/btn%_CHARG_%_APP_%-VALU_PUSH").press()
        time.sleep(1)

        try:
            session.findById("wnd[1]/tbar[0]/btn[16]").press()  # clear
            time.sleep(0.3)
        except:
            pass

        pyperclip.copy("\r\n".join(batches))
        session.findById("wnd[1]/tbar[0]/btn[24]").press()  # paste
        time.sleep(0.5)

        session.findById("wnd[1]/tbar[0]/btn[8]").press()  # confirm

    # Header
    session.findById("wnd[0]/usr/ctxtWERKS-LOW").text = str(header_data.get("plan_storage_location", ""))
    session.findById("wnd[0]/usr/ctxtLGORT-LOW").text = str(header_data.get("storage_location", ""))

    session.findById("wnd[0]/tbar[1]/btn[8]").press()
    time.sleep(1)
    
    # ===== Check popup Confirmation =====
    try:
        popup = session.findById("wnd[1]", False)

        if popup and "Confirmation" in popup.Text:
            print("⚠️ Phát hiện popup Confirmation -> chọn Yes")

            session.findById("wnd[1]/usr/btnBUTTON_1").press()
            time.sleep(1)

    except Exception:
        # Không có popup thì bỏ qua
        pass
        
    session.findById("wnd[0]/usr/ctxtZST_ZMB21_H01-UMLGO").text = str(header_data.get("receiving_sloc", ""))
    session.findById("wnd[0]/usr/ctxtZST_ZMB21_H01-BWART").text = str(header_data.get("movement_type", ""))
    session.findById("wnd[0]/usr/ctxtZST_ZMB21_H01-RQPER").text = str(header_data.get("user", ""))
    session.findById("wnd[0]/usr/txtZST_ZMB21_H01-HTEXT").text = str(header_data.get("note", ""))
    session.findById("wnd[0]/usr/ctxtZST_ZMB21_H01-UMWRK").text = str(header_data.get("receiving_plan", ""))

    try:
        session.findById("wnd[0]/usr/cmbZST_ZMB21_H01-ZPHONGBAN").key = str(header_data.get("phong_ban", "1000HT03"))
    except:
        session.findById("wnd[0]/usr/cmbZST_ZMB21_H01-ZPHONGBAN").key = "1000HT03"

    # ===== 🔥 FIX CHÍNH Ở ĐÂY =====
    print("🧾 Đang chọn đúng dòng theo Material + Batch...")

    table_prefix = "wnd[0]/usr/tblZMM_PG_ZMB21NTC_ITEM1"
    row = 0

    while True:
        try:
            mat_field = f"{table_prefix}/ctxtZST_ZMB21_D01-MATNR[3,{row}]"
            batch_field = f"{table_prefix}/txtZST_ZMB21_D01-CHARG[7,{row}]"

            material = str(session.findById(mat_field).text).strip()
            batch = str(session.findById(batch_field).text).strip()

            if not material:
                break

            key = (material, batch)

            if key in excel_map:
                # ✅ Tick đúng dòng
                check_field = f"{table_prefix}/chkZST_ZMB21_D01-CHECK[0,{row}]"
                session.findById(check_field).selected = True

                weight_value = excel_map[key]

                if weight_value:
                    weight_field = f"{table_prefix}/txtZST_ZMB21_D01-ERFMG[11,{row}]"
                    session.findById(weight_field).text = str(weight_value)

                    print(f"✅ {material} | Batch {batch} → {weight_value}")
            else:
                print(f"⏭️ Skip {material} | Batch {batch}")

            row += 1

        except:
            break

    # ===== Phần còn lại giữ nguyên =====
    session.findById("wnd[0]/tbar[1]/btn[2]").press()
    time.sleep(1)

    status_bar = session.findById("wnd[0]/sbar")
    status_text = status_bar.Text
    status_type = status_bar.MessageType

    if status_type == "S":
        print(f"✅ Check chứng từ thành công: {status_text}")

        try:
            session.findById("wnd[0]/tbar[0]/btn[11]").press()
            time.sleep(1)

            try:
                if "Post confirmation" in session.findById("wnd[1]").Text:
                    session.findById("wnd[1]/usr/btnBUTTON_1").press()
                    time.sleep(2)
            except:
                pass

            save_status = session.findById("wnd[0]/sbar").Text
            print(f"🧾 {save_status}")

            match = re.search(r"(\d{7,10})", save_status)
            if match:
                reservation_no = match.group(1)

                wb = load_workbook(excel_file)
                ws = wb[SHEET_NAME_SDN]

                row = 5
                while ws[f"E{row}"].value:
                    ws[f"G{row}"].value = reservation_no
                    row += 1

                wb.save(excel_file)
                log_execution_from_sdn_sheet(EXCEL_FILE)

        except Exception as e:
            print(f"❌ Lỗi khi lưu: {e}")

def log_execution_from_sdn_sheet(
    excel_file: str,
    sheet_source: str = "SĐN",
    sheet_data: str = "DATA"
):
    print("🕒 Ghi log đầy đủ sang sheet DATA...")

    wb = load_workbook(excel_file)
    ws = wb[sheet_source]

    # ===== Tạo / lấy sheet DATA + header =====
    if sheet_data not in wb.sheetnames:
        ws_data = wb.create_sheet(sheet_data)
        ws_data.append([
            "Ngày tạo SĐN",
            "id_coil",
            "weight",
            "Material",
            "SĐN",
            "plan_storage_location",
            "storage_location",
            "receiving_plan",
            "receiving_sloc",
            "movement_type",
            "note",
        ])
        print("🆕 Đã tạo sheet DATA và header.")
    else:
        ws_data = wb[sheet_data]

    # ===== Đọc metadata cấu hình (row 1–2) =====
    header_keys = [ws[f"{c}1"].value for c in "ABCDEFGH"]
    header_vals = [ws[f"{c}2"].value for c in "ABCDEFGH"]
    header_map = dict(zip(header_keys, header_vals))

    # ===== Build map Material → SĐN từ cột E–G =====
    material_to_sdn = {}
    map_row = 5
    while True:
        mat = ws[f"E{map_row}"].value
        sdn_val = ws[f"G{map_row}"].value

        if not mat:
            break

        if mat and sdn_val:
            material_to_sdn[str(mat).strip()] = str(sdn_val).strip()

        map_row += 1

    exec_time = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # ===== Ghi log theo id_coil (cột A–C) =====
    row = 5
    while True:
        id_coil = ws[f"A{row}"].value
        if not id_coil:
            break

        weight = ws[f"B{row}"].value
        material = ws[f"C{row}"].value

        sdn = None
        if material:
            sdn = material_to_sdn.get(str(material).strip())

        # Chỉ cần đủ dữ liệu là ghi
        if id_coil and weight and material and sdn:
            ws_data.append([
                exec_time,
                str(id_coil).strip(),
                weight,
                str(material).strip(),
                str(sdn).strip(),
                header_map.get("plan_storage_location", ""),
                header_map.get("storage_location", ""),
                header_map.get("receiving_plan", ""),
                header_map.get("receiving_sloc", ""),
                header_map.get("movement_type", ""),
                header_map.get("note", ""),
            ])

        row += 1

    wb.save(excel_file)
    print("📘 Ghi log DATA hoàn tất – đầy đủ theo id_coil.")

# ======== MAIN =========
def main(t_code="/nzbc04b"):
    coil_list = read_coil_list(EXCEL_FILE)
    connect_sap(SERVER_NAME, SAP_USER, SAP_PASS)
    open_tcode(t_code)
    input_coil_list(coil_list)
    after_input_actions()

    df_sap = read_grid_data()
    if not df_sap.empty:
        update_excel_with_material(EXCEL_FILE, df_sap)
        execute_zmb21_with_materials(EXCEL_FILE)  # 🆕 Gọi hàm mới ở đây
    else:
        print("⚠️ Không có dữ liệu nào đọc được từ SAP Grid!")

    print("\n🎯 Hoàn tất toàn bộ quy trình!")
    input("\nNhấn Enter để thoát...")

if __name__ == "__main__":
    main()
