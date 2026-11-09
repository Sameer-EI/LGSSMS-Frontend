import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { constants } from "../global/constants";

const BASE_URL = constants.baseUrl;

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userID, setUserID] = useState(
    () => localStorage.getItem("user_id") || "",
  );
  const [teacherID, setTeacherID] = useState(
    () => localStorage.getItem("teacher_id") || "",
  );
  const [guardianID, setGuardianID] = useState(
    () => localStorage.getItem("guardian_id") || "",
  );
  const [userName, setUserName] = useState(
    () => localStorage.getItem("user_name") || "",
  );
  const [userProfile, setUserProfile] = useState(
    () => localStorage.getItem("user_profile") || "",
  );
  const [authTokens, setAuthTokens] = useState(() => {
    // Corrupt / hand-edited storage must mean "logged out", never a crash.
    try {
      const parsed = JSON.parse(localStorage.getItem("authTokens"));
      return parsed?.access ? parsed : null;
    } catch {
      return null;
    }
  });
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("userRole") || "",
  );
  const [studentID, setStudentID] = useState(
    () => localStorage.getItem("student_id") || "",
  );
  const [yearLevelID, setYearLevelID] = useState(
    () => localStorage.getItem("year_level_id") || "",
  );
  const [stuyearLevelID, setstuYearLevelID] = useState(
    () => localStorage.getItem("stu_year_level_id") || "",
  );
  const [stuyearLevelName, setstuYearLevelName] = useState(
    () => localStorage.getItem("stu_year_level_name") || "",
  );
  const [loading, setLoading] = useState(true);

  // Ref to avoid stale tokens in interceptors
  const authTokensRef = useRef(authTokens);
  useEffect(() => {
    authTokensRef.current = authTokens;
  }, [authTokens]);

  // Flag & queue to handle rotational refresh
  const isRefreshing = useRef(false);
  const failedQueue = useRef([]);

  const processQueue = (error, token = null) => {
    failedQueue.current.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve(token);
    });
    failedQueue.current = [];
  };

  const normalizeProfileUrl = (url) => {
    if (!url) return "";
    if (url.includes(`http://localhost:${constants.PORT}`))
      return url.replace(`http://localhost:${constants.PORT}`, BASE_URL);
    if (!url.startsWith("http") && !url.startsWith("/"))
      return `${BASE_URL}/${url}`;
    if (!url.startsWith("http") && url.startsWith("/"))
      return `${BASE_URL}${url}`;
    return url;
  };

  // Single place that resets every piece of auth state (+ storage).
  // Once authTokens is null, isAuthenticated is false and the router's global
  // gate redirects to /login. Only stable setters/refs are used here, so it is
  // safe to call from the axios interceptor and the storage listener.
  const clearAuthState = () => {
    setAuthTokens(null);
    authTokensRef.current = null;
    setUserRole("");
    setUserID("");
    setTeacherID("");
    setGuardianID("");
    setUserName("");
    setUserProfile("");
    setStudentID("");
    setYearLevelID("");
    setstuYearLevelID("");
    setstuYearLevelName("");

    try {
      localStorage.clear();
    } catch {
      /* storage unavailable - state is already cleared */
    }
  };

  // Logged out in another tab (or storage wiped) => log out here too.
  useEffect(() => {
    const onStorage = (e) => {
      // e.key === null means localStorage.clear() was called
      if (e.key !== null && e.key !== "authTokens") return;
      let hasToken = false;
      try {
        hasToken = !!JSON.parse(localStorage.getItem("authTokens"))?.access;
      } catch {
        hasToken = false;
      }
      if (!hasToken && authTokensRef.current) clearAuthState();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Axios instance with interceptors
  const axiosInstance = useMemo(() => {
    const instance = axios.create({ baseURL: BASE_URL });

    instance.interceptors.request.use((config) => {
      if (authTokensRef.current?.access)
        config.headers.Authorization = `Bearer ${authTokensRef.current.access}`;
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 401 and we have no refresh token to recover with => the session is
        // gone. Log out so the global guard sends the user to /login.
        if (
          error.response?.status === 401 &&
          authTokensRef.current &&
          !authTokensRef.current.refresh
        ) {
          clearAuthState();
          return Promise.reject(error);
        }

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          authTokensRef.current?.refresh
        ) {
          if (isRefreshing.current) {
            // Queue the request until refresh is done
            return new Promise((resolve, reject) => {
              failedQueue.current.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axios(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing.current = true;

          try {
            const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
              refresh: authTokensRef.current.refresh,
            });

            const newTokens = {
              access: response.data.access,
              refresh: response.data.refresh,
            };

            setAuthTokens(newTokens);
            authTokensRef.current = newTokens;
            localStorage.setItem("authTokens", JSON.stringify(newTokens));

            processQueue(null, newTokens.access);

            originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
            return axios(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            await LogoutUser();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing.current = false;
          }
        }

        return Promise.reject(error);
      },
    );

    return instance;
  }, []);

  const LoginUser = async (userDetails) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login/`, userDetails);
      const data = response.data;

      const tokens = { access: data.access, refresh: data.refresh };
      setAuthTokens(tokens);
      authTokensRef.current = tokens;
      localStorage.setItem("authTokens", JSON.stringify(tokens));

      setUserRole(data.Roles[0]);
      localStorage.setItem("userRole", data.Roles[0]);

      if (data["User ID"]) {
        setUserID(data["User ID"]);
        localStorage.setItem("user_id", data["User ID"]);
      }
      if (data.teacher_id) {
        setTeacherID(data.teacher_id);
        localStorage.setItem("teacher_id", data.teacher_id);
      }
      if (data.guardian_id) {
        setGuardianID(data.guardian_id);
        setStudentID(data.student_id);
        localStorage.setItem("guardian_id", data.guardian_id);
        localStorage.setItem("student_id", data.student_id);
      }
      if (data.student_id) {
        setStudentID(data.student_id);
        localStorage.setItem("student_id", data.student_id);
      }
      if (data.students && Array.isArray(data.students)) {
        localStorage.setItem(
          "guardian_students",
          JSON.stringify(data.students),
        );
      }
      if (data.year_level_id) {
        setYearLevelID(data.year_level_id);
        localStorage.setItem("year_level_id", data.year_level_id);
      }
      if (data.name) {
        setUserName(data.name);
        localStorage.setItem("user_name", data.name);
      }
      if (data.user_profile) {
        const normalizedProfile = normalizeProfileUrl(data.user_profile);
        setUserProfile(normalizedProfile);
        localStorage.setItem("user_profile", normalizedProfile);
      }

      if (data.year_level?.id) {
        localStorage.setItem("stu_year_level_id", data.year_level.id);
        setstuYearLevelID(data.year_level.id);
      }
      if (data.year_level?.name) {
        localStorage.setItem("stu_year_level_name", data.year_level.name);
        setstuYearLevelName(data.year_level.name);
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const LogoutUser = async () => {
    try {
      if (authTokensRef.current?.refresh) {
        await axios.post(`${BASE_URL}/auth/logout/`, {
          refresh_token: authTokensRef.current.refresh,
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthState();
    }
  };

  // Other functions (RegisterUser, ResetPassword, ChangePassword) remain same
  const RegisterUser = async (userDetails) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/auth/users/`,
        userDetails,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokens?.access}`,
          },
        },
      );
      if (userRole === constants.roles.director) return response.data;
    } catch (error) {
      throw error;
    }
  };

  const ResetPassword = async (userDetails) => {
    try {
      return await axios.post(`${BASE_URL}/auth/reset_password/`, userDetails);
    } catch (error) {
      console.error("Reset password error:", error);
      throw error; // lets the page show the error modal
    }
  };

  const ChangePassword = async (userDetails) => {
    try {
      return await axios.post(
        `${BASE_URL}/auth/change_password/`,
        userDetails,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokens?.access}`,
          },
        },
      );
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  };

  useEffect(() => {
    const currentProfile = localStorage.getItem("user_profile");
    if (currentProfile) {
      const normalizedProfile = normalizeProfileUrl(currentProfile);
      if (normalizedProfile !== currentProfile) {
        setUserProfile(normalizedProfile);
        localStorage.setItem("user_profile", normalizedProfile);
      }
    }
    setLoading(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      authTokens,
      isAuthenticated: !!authTokens?.access,
      userRole,
      userID,
      loading,
      axiosInstance,
      LoginUser,
      LogoutUser,
      RegisterUser,
      ResetPassword,
      ChangePassword,
      teacherID,
      guardianID,
      studentID,
      yearLevelID,
      userName,
      userProfile: normalizeProfileUrl(userProfile),
    }),
    [
      authTokens,
      userRole,
      userID,
      loading,
      axiosInstance,
      teacherID,
      guardianID,
      userName,
      userProfile,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
