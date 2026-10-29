import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../APIs/userApi";
import { CheckCircle2, Eye, EyeOff, FileSpreadsheet } from "lucide-react";
import { errorToast, successToast } from "../utils/toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";

const SignUpPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { id: "length", label: "Ít nhất 8 ký tự", validator: (p) => p.length >= 8 },
    { id: "uppercase", label: "Ít nhất 1 chữ hoa", validator: (p) => /[A-Z]/.test(p) },
    { id: "lowercase", label: "Ít nhất 1 chữ thường", validator: (p) => /[a-z]/.test(p) },
    { id: "number", label: "Ít nhất 1 chữ số", validator: (p) => /\d/.test(p) },
    { id: "special", label: "Ít nhất 1 ký tự đặc biệt", validator: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirmPassword) {
      errorToast("Mật khẩu xác nhận không khớp!");
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({ username: username.trim(), password });
      if (res.success === true) {
        successToast(res.message || "Đăng ký thành công!");
        setTimeout(() => {
          navigate("/sign-in");
        }, 1200);
      } else if (res.success === false) {
        errorToast(res.message || "Thông tin đăng ký đã tồn tại!");
      }
    } catch (error) {
      errorToast(error?.response?.data?.message || "Đăng ký thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] px-4 py-10 font-sans antialiased">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
      
      <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)]">
        <CardHeader className="px-7 pb-4 pt-9 text-left sm:px-9 sm:pt-10">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-600/25">
            <FileSpreadsheet size={24} />
          </span>
          <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
            HRC2 QC System
          </div>
          <CardTitle className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            Tạo tài khoản
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">Điền thông tin để bắt đầu sử dụng hệ thống.</p>
        </CardHeader>

        <CardContent className="px-7 pb-8 sm:px-9 sm:pb-10">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-left text-xs font-bold text-slate-700">Tên đăng nhập</label>
              <Input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                minLength={3}
                maxLength={32}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 px-3.5 text-sm placeholder:text-slate-400 focus:bg-white"
                required
              />
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-left text-xs font-bold text-slate-700">Mật khẩu</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-3.5 pr-11 text-sm placeholder:text-slate-400 focus:bg-white"
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-8 h-8 w-8 text-slate-400 hover:bg-transparent hover:text-slate-700"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </Button>

              {showPasswordRequirements && (
                <div className="mt-2.5 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left text-xs">
                  {passwordRequirements.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center text-[11px] ${req.validator(password) ? "font-semibold text-emerald-600" : "text-slate-500"}`}
                    >
                      <CheckCircle2 className="mr-1.5" size={14} />
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-left text-xs font-bold text-slate-700">Xác nhận mật khẩu</label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-3.5 pr-11 text-sm placeholder:text-slate-400 focus:bg-white"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1.5 top-8 h-8 w-8 text-slate-400 hover:bg-transparent hover:text-slate-700"
              >
                {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </Button>
            </div>

            <div className="flex items-start gap-2 pt-1 text-left">
              <Checkbox id="checkPolicy" className="mt-0.5 cursor-pointer" required />
              <label htmlFor="checkPolicy" className="cursor-pointer text-xs leading-5 text-slate-500">
                Tôi đồng ý với các quy định và chính sách bảo mật
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password || !confirmPassword}
              className="mt-2 h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20"
            >
              {loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs font-medium text-slate-500">
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => navigate("/sign-in")}
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Đăng nhập ngay
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default SignUpPage;
