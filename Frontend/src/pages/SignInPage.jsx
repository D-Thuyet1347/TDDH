import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, FileSpreadsheet, Lock } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { errorToast, successToast } from "../utils/toast";
import anh from "../img/Background.png";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";

const SignInPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await login({ username: username.trim(), password }, rememberMe);

      if (!res?.success || !res?.token || !res?.user) {
        errorToast(res?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        return;
      }

      successToast("Đăng nhập thành công!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      errorToast(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể đăng nhập. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] px-4 py-8 font-sans antialiased sm:px-8">
      {/* Decorative ambient aura */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-sky-200/20 blur-3xl" />

      <section
        aria-label="Đăng nhập tài khoản"
        className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)] md:min-h-[600px] md:grid-cols-[1.05fr_0.95fr]"
      >
        <aside
          aria-hidden="true"
          className="relative hidden min-w-0 overflow-hidden bg-slate-950 md:block"
        >
          <img
            src={anh}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Lock size={12} className="text-indigo-300" /> Hệ thống bảo mật
            </span>
            <p className="mt-3 text-lg font-bold tracking-tight">HRC2 Quality Control</p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Quản lý tiến độ đơn hàng và đồng bộ dữ liệu báo cáo chất lượng tập trung.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col justify-center px-6 py-12 sm:px-10 md:px-12 lg:px-16">
          <div className="mb-8 md:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-600/25">
              <FileSpreadsheet size={24} />
            </span>
            <p className="mt-3 text-base font-bold text-slate-900">HRC2 QC System</p>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              Theo dõi đơn hàng HRC2
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Đăng nhập</h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Nhập tài khoản để truy cập kho dữ liệu và tiến độ đơn hàng.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="w-full space-y-5" aria-busy={loading}>
            <div className="space-y-1.5">
              <label htmlFor="signin-username" className="text-xs font-bold text-slate-700">
                Tên đăng nhập
              </label>
              <Input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={username}
                maxLength={32}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 px-3.5 text-sm placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="signin-password" className="text-xs font-bold text-slate-700">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-3.5 pr-11 text-sm placeholder:text-slate-400 focus:bg-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:bg-transparent hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <Checkbox
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:shadow-indigo-600/25"
            >
              {loading ? "Đang xử lý đăng nhập…" : "Đăng nhập hệ thống"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default SignInPage;
