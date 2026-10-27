import { createContext, useState, useEffect, useCallback } from "react";
import { loginUser, getCurrentUser } from "../APIs/userApi";

export const AuthContext = createContext();

const clearStoredAuth = () => {
    [localStorage, sessionStorage].forEach((storage) => {
        storage.removeItem("token");
        storage.removeItem("userId");
        storage.removeItem("role");
    });
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserInfo = useCallback(async (token) => {
        try {
          const res = await getCurrentUser(token);
          if (res.success) {
            setUser(res.data);
            return;
          } else {
            throw new Error(res.message);
          }
        } catch (error) {
          clearStoredAuth();
          setUser(null);
        } finally {
          setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
            fetchUserInfo(token);
        } else {
            setLoading(false);
        }
    }, [fetchUserInfo]);

    const login = useCallback(async (credentials, rememberMe = true) => {
        try {
            const res = await loginUser(credentials);
            if (!res.success || !res.token || !res.user) {
                return res;
            }

            clearStoredAuth();
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", res.token);
            storage.setItem("userId", String(res.user.id));
            storage.setItem("role", res.user.role);
            setUser(res.user);
            return res;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || "Đăng nhập thất bại.",
            };
        }
    }, []);

    const logout = useCallback(() => {
        clearStoredAuth();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
