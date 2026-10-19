import axios from "axios";
import httpStatus from "http-status";
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`,
    withCredentials: true
});

export const authClient = client;

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const router = useNavigate();

    // Load user profile on startup if token or session exists
    const getUserProfile = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await client.get("/profile", {
                params: token ? { token } : {}
            });
            if (res.status === httpStatus.OK) {
                setUserData(res.data);
                return res.data;
            }
        } catch (err) {
            console.warn("Could not fetch profile:", err.message);
            return null;
        }
    };

    useEffect(() => {
        getUserProfile();
    }, []);

    const handleRegister = async (arg1, arg2, arg3, arg4 = "", arg5 = "", arg6 = "") => {
        try {
            let payload = {};
            if (typeof arg1 === "object" && arg1 !== null) {
                payload = arg1;
            } else if (typeof arg2 === "string" && arg2.includes("@")) {
                // Positional: (name, email, password, username, phone, avatar)
                payload = { name: arg1, email: arg2, password: arg3, username: arg4, phone: arg5, avatar: arg6 };
            } else {
                // Legacy: (name, username, password, email, phone, avatar)
                payload = { name: arg1, username: arg2, password: arg3, email: arg4, phone: arg5, avatar: arg6 };
            }

            const request = await client.post("/register", payload);
            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                if (request.data.user) {
                    setUserData(request.data.user);
                } else {
                    await getUserProfile();
                }
                router("/home");
            }
        } catch (err) {
            throw err;
        }
    };

    const handleGoogleAuth = async (credentialOrPayload) => {
        try {
            const credential = typeof credentialOrPayload === "string" 
                ? credentialOrPayload 
                : credentialOrPayload.credential;

            const request = await client.post("/google_auth", {
                credential
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                if (request.data.user) {
                    setUserData(request.data.user);
                } else {
                    await getUserProfile();
                }
                router("/home");
            }
        } catch (err) {
            throw err;
        }
    };

    const updateUserProfile = async (payload) => {
        try {
            const token = localStorage.getItem("token");
            const res = await client.put("/profile", {
                token,
                ...payload
            });
            if (res.status === httpStatus.OK) {
                await getUserProfile();
                return res.data;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogout = async () => {
        try {
            await client.post("/logout");
        } catch (e) {
            // Clear local credentials even if network fails
        }
        localStorage.removeItem("token");
        setUserData(null);
        router("/auth");
    };

    const getHistoryOfUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const request = await client.get("/get_all_activity", {
                params: token ? { token } : {}
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const updatePreferences = async (preferences) => {
        try {
            const token = localStorage.getItem("token");
            const res = await client.put("/preferences", { token, ...preferences });
            if (res.status === httpStatus.OK) {
                await getUserProfile();
                return res.data;
            }
        } catch (err) {
            throw err;
        }
    };

    const logoutAllDevices = async () => {
        try {
            const token = localStorage.getItem("token");
            await client.post("/logout_all", { token });
        } catch (e) {
            console.warn("Logout all devices failed:", e);
        }
        localStorage.removeItem("token");
        setUserData(null);
        router("/auth");
    };

    const deleteAccount = async () => {
        try {
            const token = localStorage.getItem("token");
            await client.post("/delete_account", { token });
        } catch (e) {
            console.warn("Delete account failed:", e);
        }
        localStorage.removeItem("token");
        setUserData(null);
        router("/");
    };

    const sendVerificationEmail = async () => {
        const token = localStorage.getItem("token");
        const res = await client.post("/send_verification_email", { token });
        return res.data;
    };

    const addToUserHistory = async (meetingCode, duration = 0, participantCount = 1) => {
        try {
            const token = localStorage.getItem("token");
            const request = await client.post("/add_to_activity", {
                token,
                meeting_code: meetingCode,
                duration,
                participantCount
            });
            return request;
        } catch (e) {
            throw e;
        }
    };

    const deleteHistory = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const request = await client.delete("/delete_activity", {
                data: {
                    id,
                    token
                }
            });
            return request;
        } catch (e) {
            throw e;
        }
    };

    const scheduleMeeting = async (payload) => {
        const token = localStorage.getItem("token");
        const res = await client.post("/schedule_meeting", { token, ...payload });
        return res.data;
    };

    const getScheduledMeetings = async () => {
        const token = localStorage.getItem("token");
        const res = await client.get("/scheduled_meetings", {
            params: token ? { token } : {}
        });
        return res.data;
    };

    const deleteScheduledMeeting = async (id) => {
        const token = localStorage.getItem("token");
        const res = await client.delete(`/scheduled_meeting/${id}`, {
            data: { id, token },
            params: token ? { token } : {}
        });
        return res.data;
    };

    const submitFeedback = async (payload) => {
        const token = localStorage.getItem("token");
        const res = await client.post("/feedback", { token, ...payload });
        return res.data;
    };

    const value = {
        userData,
        setUserData,
        getUserProfile,
        updateUserProfile,
        updatePreferences,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        handleGoogleAuth,
        handleLogout,
        logoutAllDevices,
        deleteAccount,
        sendVerificationEmail,
        scheduleMeeting,
        getScheduledMeetings,
        deleteScheduledMeeting,
        submitFeedback,
        deleteHistory
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};