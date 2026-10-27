import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { AuthContext } from "../context/AuthContext";
import { errorToast, successToast } from "../utils/toast";
import anh from "../img/Background.png";
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
    <main className="flex min-h-screen items-center justify-center bg-[#b1bff9] bg-[length:80px_80px] px-3 py-[18px] font-sans md:px-[18px] md:py-10">
      <section
        aria-label="Đăng nhập tài khoản"
        className="grid w-full max-w-[450px] grid-cols-1 overflow-hidden rounded-[22px] bg-white shadow-[0_18px_46px_rgba(66,78,156,0.18)] md:aspect-[650/418] md:min-h-[430px] md:max-w-[1060px] md:grid-cols-[51%_49%] md:w-[82vw]"
      >
        {/* Hình minh họa */}
        <aside
          aria-hidden="true"
          className="h-[185px] min-w-0 overflow-hidden bg-[#ffe1ad] max-[360px]:h-[145px] md:h-full"
        >
          <img
            src={anh}
            alt=""
            className="block h-full w-full object-cover object-[center_32%] md:object-fill"
          />
        </aside>

        {/* Form đăng nhập */}
        <div className="relative flex min-w-0 flex-col justify-center bg-white px-[25px] pb-[30px] pt-7 max-[360px]:px-[17px] md:p-[clamp(28px,4.15vw,64px)]">
          {/* <Link
            to="/home"
            className="absolute right-[18px] top-3 text-[11px] font-medium text-[#946675] transition hover:text-[#b51e31] hover:underline md:right-[22px] md:top-4 md:text-[clamp(11px,1vw,13px)]"
          >
            ← Trở về trang chủ
          </Link> */}

          <h1 className="mb-[22px] mt-2 text-center text-[23px] font-extrabold leading-[1.3] text-[#292929] md:mb-4 md:mt-[2px] md:text-[clamp(23px,2.3vw,32px)]">
            Đăng nhập
          </h1>

          <form onSubmit={handleSignIn} className="w-full" aria-busy={loading}>
            {/* Khung đỏ theo ảnh mẫu */}
            <div className="-mx-[18px] flex flex-col gap-[10px] border-2 border-[#cf2436] px-[14px] pb-3 pt-4 md:px-[18px] md:pb-[10px] md:pt-[13px]">
              <label htmlFor="signin-username" className="sr-only">
                Tên đăng nhập
              </label>
              <input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={username}
                maxLength={32}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                required
                className="h-[43px] w-full rounded-full border border-[#c6a2a5] bg-white px-4 text-[13px] text-[#292929] outline-none transition placeholder:text-[#7d7070] focus:border-[#ae1d2c] focus:ring-[3px] focus:ring-[#b81f311a] md:h-[clamp(38px,3.5vw,49px)] md:text-[clamp(12px,1.1vw,14px)]"
              />

              <div className="relative">
                <label htmlFor="signin-password" className="sr-only">
                  Mật khẩu
                </label>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  required
                  className="h-[43px] w-full rounded-full border border-[#c6a2a5] bg-[#f8f8f8] pl-4 pr-11 text-[13px] text-[#292929] outline-none transition placeholder:text-[#7d7070] focus:border-[#ae1d2c] focus:ring-[3px] focus:ring-[#b81f311a] md:h-[clamp(38px,3.5vw,49px)] md:text-[clamp(12px,1.1vw,14px)]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-[13px] top-1/2 flex h-[26px] w-[25px] -translate-y-1/2 items-center justify-center text-[#777] hover:text-[#ad1e2c]"
                >
                  {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-[9px] text-[12px] text-[#3e3e3e] md:text-[clamp(11px,1.05vw,13px)]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="m-0 h-[15px] w-[15px] cursor-pointer accent-[#ba2031]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-3 flex h-[45px] w-full items-center justify-center rounded-full border border-[#c21e32] bg-[#be1d30] text-sm font-bold text-white transition hover:bg-[#a91529] enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70 md:h-[clamp(42px,4vw,50px)] md:text-[clamp(13px,1.14vw,16px)]"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-600">
            Chưa có tài khoản?{" "}
            <Link to="/sign-up" className="font-bold text-[#a21e30] hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default SignInPage;
