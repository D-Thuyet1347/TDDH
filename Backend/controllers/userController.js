import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const normalizeUsername = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";

const isValidUsername = (username) =>
  username.length >= 3 &&
  username.length <= 32 &&
  /^[\p{L}\p{N}][\p{L}\p{N}._ -]*[\p{L}\p{N}]$/u.test(username);

const isValidPassword = (password) =>
  typeof password === "string" &&
  validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });

const createToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET chưa được cấu hình.");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const registerUser = async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const { password } = req.body || {};

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập phải dài 3–32 ký tự, bắt đầu và kết thúc bằng chữ hoặc số.",
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
    }

    const existingUser = await userModel.exists({ username });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Tên đăng nhập đã tồn tại." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({
      username,
      password: hashedPassword,
      role: "user",
    });
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công. Bạn có thể đăng nhập ngay.",
      user: { id: newUser._id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    if (error.code === 11000 && (error.keyPattern?.username || error.keyValue?.username)) {
      return res.status(409).json({ success: false, message: "Tên đăng nhập đã tồn tại." });
    }
    console.error("User registration error:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tạo tài khoản lúc này." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const { password } = req.body || {};
    if (!username || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên đăng nhập và mật khẩu.",
      });
    }

    const user = await userModel.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      });
    }

    const token = createToken(user._id);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role },
      message: "Đăng nhập thành công.",
    });
  } catch (error) {
    console.error("User login error:", error.message);
    return res.status(500).json({ success: false, message: "Không thể đăng nhập lúc này." });
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      image: req.user.image,
    },
  });
};

export const changePassword = async (req, res) => {
  const userId = req.user?.id;

  try {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof oldPassword !== "string" || !oldPassword || !isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
    }
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });

    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng." });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới không được trùng mật khẩu cũ." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.status(200).json({ success: true, message: "Đổi mật khẩu thành công." });
  } catch (error) {
    console.error("Change password error:", error.message);
    return res.status(500).json({ success: false, message: "Không thể đổi mật khẩu lúc này." });
  }
};

export const updateUserAvatar = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Ảnh đại diện không được để trống",
      });
    }

    const user = await userModel
      .findByIdAndUpdate(
        req.params.id,
        { image },
        {
          new: true,
          runValidators: true,
        }
      )
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: user,
    });
  } catch (error) {
    console.error("Update avatar error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật ảnh đại diện",
    });
  }
};
// 7. Lấy danh sách tài khoản (Dành cho Admin)
export const listUser = async (req, res) => {
  try {
    const users = await userModel.find().select("-password");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách tài khoản" });
  }
};
export const getUser = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy thông tin người dùng" });
  }
};
// 8. Cập nhật quyền (Role)
export const updateUserRole = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Tài khoản không tồn tại" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật role" });
  }
};

// 9. Xóa tài khoản
export const removeUser = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    await userModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Đã xóa tài khoản thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khi xóa tài khoản" });
  }
};