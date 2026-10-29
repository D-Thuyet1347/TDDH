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
      if(res.success === true){
        successToast(res.message || "Đăng ký thành công!");
        setTimeout(() => {
          navigate("/sign-in");
        }, 1200);
      }
      else if(res.success === false){
        errorToast(res.message || "Thông tin đăng ký đã tồn tại!");
      }
    } catch (error) {
      errorToast(error?.response?.data?.message || "Đăng ký thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6fb] px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <Card className="relative w-full max-w-md overflow-hidden rounded-[28px] border-white/80 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
        <CardHeader className="px-7 pb-5 pt-8 text-left sm:px-9 sm:pt-10">
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <FileSpreadsheet size={22} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">HRC2 QC · Data Center</p>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tạo tài khoản</CardTitle>
          <p className="mt-2 text-sm text-slate-500">Điền thông tin để bắt đầu sử dụng hệ thống.</p>
        </CardHeader>
        <CardContent className="px-7 pb-8 sm:px-9 sm:pb-10">
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="mb-2 block text-left text-sm font-medium text-slate-700">Tên đăng nhập</label>
            <Input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              minLength={3}
              maxLength={32}
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4"
              required
            />
          </div>

          <div className="relative">
            <label className="mb-2 block text-left text-sm font-medium text-slate-700">Mật khẩu</label>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 pr-12"
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
              className="absolute right-2 top-8 text-slate-400 hover:bg-transparent hover:text-slate-700"
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </Button>

            {showPasswordRequirements && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left text-xs">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center ${req.validator(password) ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    <CheckCircle2 className="mr-2" size={16} />
                    {req.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="mb-2 block text-left text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Xác nhận mật khẩu"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 pr-12"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-8 text-slate-400 hover:bg-transparent hover:text-slate-700"
            >
              {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </Button>
          </div>

          <div className="flex items-start gap-2 pt-1 text-left">
            <Checkbox id="checkPolicy" className="mt-0.5" required />
            <label htmlFor="checkPolicy" className="text-xs leading-5 text-slate-500">
              Tôi đồng ý với các điều khoản và chính sách của chúng tôi
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !username.trim() || !password || !confirmPassword}
            className="mt-1 h-12 w-full rounded-xl bg-blue-600 font-semibold shadow-md shadow-blue-600/15 hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <button type="button" onClick={() => navigate("/sign-in")} className="font-semibold text-blue-700 hover:underline">
            Đăng nhập
          </button>
        </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default SignUpPage;