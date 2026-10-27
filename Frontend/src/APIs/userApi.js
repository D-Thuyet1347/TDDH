import axios from "axios";

const API_URL = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/user`;

// ==================== AUTH ====================

// Đăng ký
export const registerUser = async (data) => {
    const res = await axios.post(`${API_URL}/register`, data);
    return res.data;
};

// Đăng nhập
export const loginUser = async (data) => {
    const res = await axios.post(`${API_URL}/login`, data);
    return res.data;
};

// Đổi mật khẩu
export const changePassword = async (data, token) => {
    const res = await axios.post(
        `${API_URL}/changepassword`,
        data,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data;
};

// ==================== USER MANAGEMENT ====================

// Lấy danh sách user
export const listUser = async () => {
    const res = await axios.get(`${API_URL}/list`);
    return res.data;
};
// Lấy thông tin người dùng theo ID
export const getUser = async (id, token) => {
    const res = await axios.get(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};
// Cập nhật quyền user
export const updateUserRole = async (id, role, token) => {
    const res = await axios.put(
        `${API_URL}/${id}/role`,
        { role },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data;
};
export const updateUserAvatar = async (
  id,
  image,
  token
) => {
  const response = await axios.put(
    `${API_URL}/${id}/updateUserAvatar`,
    {
      image,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};
// ==================== CURRENT USER ====================

// Lấy thông tin user hiện tại từ token
export const getCurrentUser = async (token) => {
    const res = await axios.get(
        `${API_URL}/current`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data;
};
// Xóa user
export const removeUser = async (id, token) => {
    const res = await axios.delete(
        `${API_URL}/remove/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data;
};