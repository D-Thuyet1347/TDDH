import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  changePassword,
  getCurrentUser,
  getUser,
  listUser,
  loginUser,
  registerUser,
  removeUser,
  updateUserAvatar,
  updateUserRole
} from "../controllers/userController.js";

const userRouter = express.Router();

// Auth & Password routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/current", authMiddleware, getCurrentUser);
userRouter.post("/changepassword", authMiddleware, changePassword);
userRouter.get("/:id", authMiddleware, getUser); // Thêm route để lấy thông tin người dùng theo ID
userRouter.put("/:id/updateUserAvatar", authMiddleware, updateUserAvatar);
// User Management routes
userRouter.get("/list", listUser);
userRouter.put("/:id/role", updateUserRole);
userRouter.delete("/remove/:id", removeUser);

export default userRouter;