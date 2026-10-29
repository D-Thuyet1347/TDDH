import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, FileSpreadsheet } from "lucide-react";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6fb] px-4 py-8 font-sans sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <section
        aria-label="Đăng nhập tài khoản"
        className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] md:min-h-[590px] md:grid-cols-[1.05fr_0.95fr]"
      >
        <aside
          aria-hidden="true"
          className="relative hidden min-w-0 overflow-hidden bg-slate-950 md:block"
        >
          <img
            src={anh}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_32%] "
          />
        </aside>

        <div className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 md:px-12 lg:px-16">
          <div className="mb-9 md:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <FileSpreadsheet size={22} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-900">HRC2 QC</p>
          </div>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Chào mừng trở lại</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Đăng nhập</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Nhập thông tin tài khoản để tiếp tục vào hệ thống.</p>
          </div>
          <form onSubmit={handleSignIn} className="w-full space-y-5" aria-busy={loading}>
            <div className="space-y-2">
              <label htmlFor="signin-username" className="text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <Input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={username}
                maxLength={32}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                required
                className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-sm placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="signin-password" className="text-sm font-medium text-slate-700">
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
                  placeholder="Mật khẩu"
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pl-4 pr-12 text-sm placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-slate-400 hover:bg-transparent hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="m-0 cursor-pointer"
                  />
                  <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold shadow-md shadow-blue-600/15 hover:bg-blue-700"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default SignInPage;
