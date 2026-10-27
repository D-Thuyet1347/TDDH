import win32com.client
import pandas as pd
import time, os, json
import datetime
import calendar
from openpyxl import load_workbook
import tempfile, shutil


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
SERVER_NAME = config.get("SERVER_NAME", "PRD_Upgrade")
SAP_USER = config.get("SAP_USER", "")
SAP_PASS = config.get("SAP_PASS", "")
DEFAULT_PLANT = config.get("DEFAULT_PLANT", "1600")
folder_path_ZBC04B = config.get("ZBC04B")
folder_path_ZMES03 = config.get("ZMES03")
folder_path_ZMES04 = config.get("ZMES04")

def build_year_folder(base_path, year):
    path = os.path.join(base_path, str(year))
    os.makedirs(path, exist_ok=True)  # nếu chưa có folder thì tự tạo
    return path

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
    print(f"✅ Đã mở transaction {t_code.upper()} thành công!")


# ======== Hàm xử lý ZBC04B =========
def handle_zbc04b(session, month, year, default_plant="1600"):
    print("\n⚙️ Đang xử lý transaction ZBC04B...")

    # --- Tính ngày đầu và ngày cuối trong tháng ---
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, calendar.monthrange(year, month)[1])

    date_low = first_day.strftime("%d.%m.%Y")
    date_high = last_day.strftime("%d.%m.%Y")

    print(f"📅 Khoảng thời gian: {date_low} → {date_high}")

    try:
        # --- Nhập điều kiện lọc ---
        session.findById("wnd[0]").maximize()
        session.findById("wnd[0]/usr/ctxtS_WERKS-LOW").text = default_plant
        session.findById("wnd[0]/usr/ctxtS_NGAYSX-LOW").text = date_low
        session.findById("wnd[0]/usr/ctxtS_NGAYSX-HIGH").text = date_high

        session.findById("wnd[0]/usr/btn%_S_PX_%_APP_%-VALU_PUSH").press()
        session.findById(
            "wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/"
            "tblSAPLALDBSINGLE/ctxtRSCSEL_255-SLOW_I[0,0]"
        ).text = "8*"
        session.findById("wnd[1]/tbar[0]/btn[8]").press()

        session.findById("wnd[0]/usr/chkP_L1").selected = False
        session.findById("wnd[0]/usr/chkP_L2").selected = False
        session.findById("wnd[0]/tbar[1]/btn[8]").press()
        time.sleep(2)
        
        print("✅ Hoàn tất nhập dữ liệu cho ZBC04B!")
        
        # ===== Chọn Layout =====
        session.findById("wnd[0]/tbar[1]/btn[33]").press()
        time.sleep(1)

        layout_shell = (
            "wnd[1]/usr/subSUB_CONFIGURATION:SAPLSALV_CUL_LAYOUT_CHOOSE:0500/"
            "cntlD500_CONTAINER/shellcont/shell"
        )

        session.findById(layout_shell).setCurrentCell(37, "TEXT")
        session.findById(layout_shell).selectedRows = "37"
        session.findById(layout_shell).clickCurrentCell()

        time.sleep(1)

        print("✅ Đã chọn layout NMHRC2_BC thành công!")
        
        print("📤 Đang xuất dữ liệu ra Excel...")

        # --- Xuất Excel ---
        session.findById("wnd[0]").sendVKey(43)  # Mở cửa sổ Export as
        print("⏳ Đang chờ cửa sổ 'Export as'...")

        timeout = 30
        start = time.time()
        while time.time() - start < timeout:
            try:
                if "Export as" in session.findById("wnd[1]").Text:
                    break
            except:
                time.sleep(1)
        else:
            print("⚠️ Không tìm thấy cửa sổ 'Export as'. Dừng thao tác.")
            return

        # Nhấn Export (Shift + F8)
        session.findById("wnd[1]/tbar[0]/btn[20]").press()
        print("📦 Đang chờ cửa sổ 'Save File'...")

        timeout = 60
        start = time.time()
        while time.time() - start < timeout:
            try:
                if "Save File" in session.findById("wnd[1]").Text:
                    print("Đợi được Save File xuất hiện")
                    break
            except:
                time.sleep(1)
        else:
            print("⚠️ Không tìm thấy cửa sổ 'Save File'. Dừng thao tác.")
            return

        # --- Ghi thông tin file ---
        file_name = f"Hàng cần xử lý - Tháng {month:02d}.{year}.xlsx"
        
        folder_path_save = build_year_folder(folder_path_ZBC04B, year)
        session.findById("wnd[1]/usr/ctxtDY_PATH").text = folder_path_save
        session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = file_name
        time.sleep(1)
        session.findById("wnd[1]/tbar[0]/btn[7]").press()  # Save

        print(f"💾 Đã lưu file: {folder_path_save}\\{file_name}")
        print("🎯 Xuất Excel thành công!")
        session.findById("wnd[0]").sendVKey(12)
        session.findById("wnd[0]").sendVKey(12)

    except Exception as e:
        print(f"❌ Lỗi khi xử lý ZBC04B: {e}")

# ======== Hàm xử lý ZMES03 =========
def handle_zmes03(session, month, year, default_plant="1600"):
    print("\n⚙️ Đang xử lý transaction ZMES03...")

    # --- Tính ngày đầu và cuối tháng ---
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, calendar.monthrange(year, month)[1])

    date_low = first_day.strftime("%d.%m.%Y")
    date_high = last_day.strftime("%d.%m.%Y")

    print(f"📅 Khoảng thời gian: {date_low} → {date_high}")

    try:
        # --- Nhập dữ liệu filter ---
        session.findById("wnd[0]").maximize()
        session.findById("wnd[0]/usr/ctxtP_WERKS").text = default_plant
        session.findById("wnd[0]/usr/ctxtS_NSX-LOW").text = date_low
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").text = date_high
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").setFocus()
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").caretPosition = 10

        # --- Thực hiện chạy report ---
        session.findById("wnd[0]/tbar[1]/btn[8]").press()  # Execute
        time.sleep(2)

        # --- Xuất Excel ---
        session.findById("wnd[0]").sendVKey(43)  # Export as
        time.sleep(2)
        session.findById("wnd[1]/tbar[0]/btn[20]").press()  # Shift+F8 Export

        # --- Ghi đường dẫn file ---
        file_name = f"Phôi tấm sản xuất - Tháng {month:02d}.{year}.xlsx"

        folder_path_save = build_year_folder(folder_path_ZMES03, year)
        session.findById("wnd[1]/usr/ctxtDY_PATH").text = folder_path_save
        session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = file_name
        session.findById("wnd[1]/usr/ctxtDY_FILENAME").caretPosition = len(file_name)
        session.findById("wnd[1]/tbar[0]/btn[7]").press()  # Save

        print(f"💾 Đã lưu file: {folder_path_ZMES03}\\{file_name}")
        print("🎯 Xuất Excel ZMES03 thành công!")
        session.findById("wnd[0]").sendVKey(12)
        session.findById("wnd[0]").sendVKey(12)

    except Exception as e:
        print(f"❌ Lỗi khi xử lý ZMES03: {e}")

# ======== Hàm xử lý ZMES04 =========
def handle_zmes04(session, month, year, default_plant="1600"):
    print("\n⚙️ Đang xử lý transaction ZMES04...")

    # --- Tính ngày đầu và cuối tháng ---
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, calendar.monthrange(year, month)[1])

    date_low = first_day.strftime("%d.%m.%Y")
    date_high = last_day.strftime("%d.%m.%Y")

    print(f"📅 Khoảng thời gian: {date_low} → {date_high}")

    try:
        # --- Nhập dữ liệu filter ---
        session.findById("wnd[0]").maximize()
        session.findById("wnd[0]/usr/ctxtP_WERKS").text = default_plant
        session.findById("wnd[0]/usr/ctxtS_NSX-LOW").text = date_low
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").text = date_high
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").setFocus()
        session.findById("wnd[0]/usr/ctxtS_NSX-HIGH").caretPosition = 10

        # --- Thực hiện chạy report ---
        session.findById("wnd[0]/tbar[1]/btn[8]").press()  # Execute
        time.sleep(2)

        # --- Xuất Excel ---
        session.findById("wnd[0]").sendVKey(43)  # Export as
        time.sleep(2)
        session.findById("wnd[1]/tbar[0]/btn[20]").press()  # Shift+F8 Export

        # --- Ghi đường dẫn file ---
        file_name = f"Slab cấp cán - Tháng {month:02d}.{year}.xlsx"

        folder_path_save = build_year_folder(folder_path_ZMES04, year)
        session.findById("wnd[1]/usr/ctxtDY_PATH").text = folder_path_save
        session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = file_name
        session.findById("wnd[1]/usr/ctxtDY_FILENAME").caretPosition = len(file_name)
        session.findById("wnd[1]/tbar[0]/btn[7]").press()  # Save

        print(f"💾 Đã lưu file: {folder_path_ZMES04}\\{file_name}")
        print("🎯 Xuất Excel ZMES04 thành công!")
        session.findById("wnd[0]").sendVKey(12)
        session.findById("wnd[0]").sendVKey(12)

    except Exception as e:
        print(f"❌ Lỗi khi xử lý ZMES04: {e}")

# ===== Ghi đè lại file gốc (có kiểm tra lock) =====
def safe_overwrite(src, dest, retries=3, delay=2):
    for i in range(retries):
        try:
            if os.path.exists(dest):
                os.remove(dest)
                time.sleep(0.5)
            shutil.copy(src, dest)
            print(f"🚀 Đã ghi đè file gốc thành công: {dest}")
            return True
        except PermissionError:
            print(f"⚠️ File đang bị khóa, thử lại ({i+1}/{retries})...")
            time.sleep(delay)
        except Exception as e:
            print(f"❌ Lỗi ghi đè file: {e}")
            return False
    print("❌ Không thể ghi đè file sau nhiều lần thử.")
    return False


#========= Check data ZBC04 ==========
def process_file_zbc04b(file_path):
    print(f"\n📂 Đang xử lý file: {file_path}")

    if not os.path.exists(file_path):
        print("❌ File không tồn tại.")
        return

    temp_dir = tempfile.gettempdir()
    temp_file = os.path.join(temp_dir, os.path.basename(file_path))
    shutil.copy(file_path, temp_file)
    print(f"📄 File đã được copy tạm sang: {temp_file}")

    try:
        # ===== Đọc dữ liệu gốc + giữ lại vị trí dòng thật =====
        df = pd.read_excel(temp_file, dtype=str)
        df.columns = [str(c).strip() for c in df.columns]
        df["Excel_Row"] = df.index + 2  # lưu lại vị trí dòng thật trong file Excel (1 header + 1 offset)

        # ===== Kiểm tra cột bắt buộc =====
        required_cols = ["ID Ref", "Nhóm", "Khối lượng"]
        for col in required_cols:
            if col not in df.columns:
                print(f"⚠️ File thiếu cột bắt buộc: {col}")
                return

        # ===== Chuẩn hóa dữ liệu =====
        df["ID Ref"] = df["ID Ref"].astype(str).str.strip()
        df["Nhóm"] = df["Nhóm"].astype(str).str.strip()
        df["Khối lượng"] = pd.to_numeric(df["Khối lượng"], errors="coerce")

        invalid_refs = ["", "nan", "NaN", "None", "NULL", "null"]
        df = df[~df["ID Ref"].isin(invalid_refs)]

        # ===== Tìm ID Ref trùng =====
        duplicated_refs = df["ID Ref"][df["ID Ref"].duplicated()].unique()
        if len(duplicated_refs) == 0:
            print("✅ Không có ID Ref nào trùng nhau (sau khi loại dòng trống).")
            return

        print(f"🔍 Tìm thấy {len(duplicated_refs)} ID Ref trùng. Đang xử lý...")

        # ===== Mở workbook =====
        wb = load_workbook(temp_file)
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        col_idx = {col: headers.index(col) + 1 for col in required_cols if col in headers}

        # ===== Xử lý từng ID Ref trùng =====
        for ref in duplicated_refs:
            group = df[df["ID Ref"] == ref]
            print(f"\n📋 ID Ref {ref}: có {len(group)} dòng, Nhóm hiện tại: {group['Nhóm'].unique().tolist()}")

            if any(group["Nhóm"].str.upper() == "BBC"):
                print(f"⏭ Bỏ qua ID Ref {ref}: đã có Nhóm = BBC.")
                continue

            if len(group) >= 2:
                try:
                    idx_min = group["Khối lượng"].idxmin()
                    excel_row = int(group.loc[idx_min, "Excel_Row"])  # dùng vị trí thật trong Excel
                    ws.cell(row=excel_row, column=col_idx["Nhóm"]).value = "BBC"
                    print(f"🔧 ID Ref {ref}: dòng Excel {excel_row} đổi Nhóm thành BBC (Khối lượng nhỏ nhất).")
                except Exception as e:
                    print(f"⚠️ Lỗi xử lý ID Ref {ref}: {e}")
            else:
                print(f"⚠️ ID Ref {ref}: chỉ có 1 dòng, không xử lý.")

        wb.save(temp_file)
        wb.close()
        print("💾 Đã lưu thay đổi trong file tạm.")
        safe_overwrite(temp_file, file_path)

    except Exception as e:
        print(f"❌ Lỗi khi xử lý file: {e}")

#========== MENU FILE ZBC04 ===========
def show_files_in_folder(folder_path):
    print("\n📁 DANH SÁCH FILE TRONG THƯ MỤC:")
    if not os.path.exists(folder_path):
        print(f"⚠️ Thư mục không tồn tại: {folder_path}")
        return

    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".xlsx")]
    if not files:
        print("📂 Không có file Excel (.xlsx) nào trong thư mục này.")
        return

    for i, f in enumerate(files, start=1):
        print(f"{i}. {f}")
    print("0. ⏪ Quay lại menu chính\n")

    while True:
        choice = input("👉 Nhập số thứ tự file muốn xem (hoặc 0 để quay lại): ").strip()
        if choice == "0":
            print("⏪ Quay lại menu chính...\n")
            return
        elif choice.isdigit() and 1 <= int(choice) <= len(files):
            selected_file = files[int(choice) - 1]
            file_path_selected_file = os.path.join(folder_path, selected_file)
            process_file_zbc04b(file_path_selected_file)
        else:
            print("⚠️ Lựa chọn không hợp lệ, vui lòng nhập lại!")

# ======== Menu chọn Transaction =========
def show_menu():
    print("\n📋 CHỌN TRANSACTION CẦN MỞ:")
    print("1. ZBC04B - [Display ID cuộn bó]")
    print("2. ZMES03 - [ZMES - Data Good Reject Slab]")
    print("3. ZMES04 - [ZMES - Data Coil HRC from MES]")
    print("4. All")
    print("5. 📁 Danh sách file trong thư mục ZBC04B")  # <--- thêm dòng này
    print("0. Thoát\n")

    while True:
        choice = input("👉 Nhập lựa chọn của bạn (0-5): ").strip()
        if choice in ["0", "1", "2", "3", "4", "5"]:
            return choice
        else:
            print("⚠️ Lựa chọn không hợp lệ, vui lòng nhập lại!")

def get_month_year():
    user_input = input("🗓️ Nhập tháng/năm cần lấy (mm/yyyy) hoặc nhấn Enter để dùng tháng hiện tại: ").strip()
    if not user_input:
        today = datetime.date.today()
        return today.month, today.year
    try:
        month, year = map(int, user_input.split("/"))
        return month, year
    except ValueError:
        print("⚠️ Sai định dạng! Dùng tháng hiện tại.")
        today = datetime.date.today()
        return today.month, today.year

def main():
    while True:
        choice = show_menu()
        if choice == "0":
            print("👋 Thoát chương trình. Hẹn gặp lại anh nhé!")
            break  # thoát vòng lặp, kết thúc chương trình
        elif choice == "5":
            show_files_in_folder(folder_path_ZBC04B)
            continue
        # --- Hỏi tháng/năm trước ---
        month, year = get_month_year()

        tcode_map = {
            "1": "ZBC04B",
            "2": "ZMES03",
            "3": "ZMES04",
            "4": "All"
        }

        t_code = tcode_map[choice]

        # Kết nối SAP (giữ session cũ nếu có)
        connect_sap(SERVER_NAME, SAP_USER, SAP_PASS)

        # Gọi hàm xử lý tương ứng
        if t_code.upper() == "ZBC04B":
            open_tcode(t_code)
            handle_zbc04b(session, month, year, DEFAULT_PLANT)
        elif t_code.upper() == "ZMES03":
           open_tcode(t_code)
           handle_zmes03(session, month, year, DEFAULT_PLANT)
        elif t_code.upper() == "ZMES04":
            open_tcode(t_code)
            handle_zmes04(session, month, year, DEFAULT_PLANT)
        elif t_code.upper() == "ALL":
            open_tcode("ZBC04B")
            handle_zbc04b(session, month, year, DEFAULT_PLANT)
            time.sleep(1)
            open_tcode("ZMES03")
            handle_zmes03(session, month, year, DEFAULT_PLANT)
            time.sleep(1)
            open_tcode("ZMES04")
            handle_zmes04(session, month, year, DEFAULT_PLANT)

        print("\n🎯 Hoàn tất quy trình hiện tại!")
        print("⏪ Quay lại menu chính...\n")
        time.sleep(1)

if __name__ == "__main__":
    main()