import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../APIs/userApi";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { errorToast, successToast,  } from "../utils/toast";

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
    
    <div className="flex justify-center items-center h-screen bg-gradient-to-r">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Đăng ký</h2>
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-left mb-[5px] text-gray-600">Tên đăng nhập:</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              minLength={3}
              maxLength={32}
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="relative mb-4">
            <label className="block text-left mb-[5px] text-gray-600">Nhập mật khẩu:</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="w-full p-3 border border-gray-300 rounded-md "
              onFocus={() => setShowPasswordRequirements(true)}
              onBlur={() => setShowPasswordRequirements(false)}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 mt-[18px] text-gray-500 cursor-pointer"
            >
              {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
            </span>

            {showPasswordRequirements && (
              <div className="bg-gray-100 p-3 mt-2 rounded-md text-sm text-left">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center ${req.validator(password) ? "text-green-500" : "text-gray-500"}`}
                  >
                    <IoMdCheckmarkCircleOutline className="mr-2" />
                    {req.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative mb-4">
            <label className="block text-left mb-[5px] text-gray-600">Xác nhận mật khẩu:</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Xác nhận mật khẩu"
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 bottom-[15px] text-gray-500 cursor-pointer"
            >
              {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
            </span>
          </div>

          <div className="flex items-center text-center  mb-4">
            <input type="checkbox" id="checkPolicy" className="mr-2 mt-[-17px]" required />
            <label htmlFor="checkPolicy" className="text-sm text-gray-600">
              Tôi đồng ý với các điều khoản và chính sách của chúng tôi
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password || !confirmPassword}
            className="w-full bg-blue-500 text-white p-3 rounded-md font-bold hover:bg-blue-600 transition disabled:bg-gray-300"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <span onClick={() => navigate("/sign-in")} className="text-blue-500 font-semibold cursor-pointer">
            Đăng nhập
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;