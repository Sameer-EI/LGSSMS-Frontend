import axios from "axios";

/**
 * One-time global setup for the default `axios` instance.
 *
 * Most functions in services/api/*.jsx call the bare `axios` object (not the
 * AuthContext `axiosInstance`), so they never carried the JWT and the backend
 * answered 401. This interceptor:
 *   1. attaches `Authorization: Bearer <access>` from localStorage("authTokens")
 *      unless the caller already set its own header, and
 *   2. collapses accidental double slashes in the path ("host//d/x" -> "host/d/x"),
 *      so it doesn't matter whether constants.baseUrl ends with "/" or not.
 *
 * Public auth endpoints are skipped on purpose: sending a stale/expired token
 * to login or refresh makes DRF reject the request with 401.
 */
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/reset_password",
  "/auth/password",
];

const getAccessToken = () => {
  try {
    const raw = localStorage.getItem("authTokens");
    return raw ? JSON.parse(raw)?.access || null : null;
  } catch {
    return null;
  }
};

const collapseSlashes = (url) =>
  typeof url === "string"
    ? url.replace(/^(https?:\/\/[^/]+)\/{2,}/i, "$1/").replace(/([^:])\/{2,}/g, "$1/")
    : url;

if (!axios.__authSetupDone) {
  axios.interceptors.request.use((config) => {
    config.url = collapseSlashes(config.url);

    const isPublic = PUBLIC_PATHS.some((p) => (config.url || "").includes(p));
    const token = getAccessToken();
    if (token && !isPublic) {
      config.headers = config.headers || {};
      const hasAuth =
        typeof config.headers.has === "function"
          ? config.headers.has("Authorization")
          : config.headers.Authorization || config.headers.authorization;
      if (!hasAuth) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  axios.__authSetupDone = true;
}

export default axios;
