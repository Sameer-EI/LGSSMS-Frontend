import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import image from "../../assets/auth-hero.png";
import logo2 from "../../assets/logo2.png";
import logo3 from "../../assets/logo3.png";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";
import {
  validloginemail,
  validloginpassword,
} from "../../Validations/Validations";

export const Login = () => {
  const { LoginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const detectDark = () => {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const hasDarkClass =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      setIsDark(prefersDark || hasDarkClass);
    };

    detectDark();

    let mql;
    const handler = (e) => {
      setIsDark((e && e.matches) || document.documentElement.classList.contains("dark"));
    };

    if (typeof window !== "undefined" && window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      if (mql.addEventListener) {
        mql.addEventListener("change", handler);
      } else if (mql.addListener) {
        mql.addListener(handler);
      }
    }

    const observer =
      typeof document !== "undefined"
        ? new MutationObserver(() => detectDark())
        : null;

    if (observer) {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener("change", handler);
        else if (mql.removeListener) mql.removeListener(handler);
      }
      if (observer) observer.disconnect();
    };
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    setFormError("");

    try {
      const response = await LoginUser({
        email: data.email,
        password: data.password,
      });

      if (response && response["Message"] === "User logged in successfully") {
        const role = response.Roles?.[0] || "";
        const userId = response["User ID"] || "";

        // Fetch IDs for all roles
        const studentId = response.studentId || response.student_id || "";
        const guardianId = response.guardianId || response.guardian_id || "";
        const teacherId = response.teacherId || response.teacher_id || "";
        const officeStaffId =
          response.officeStaffId || response.office_staff_id || "";

        // Store in localStorage
        localStorage.setItem("access", response.access);
        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", userId);
        if (studentId) localStorage.setItem("studentId", studentId);
        if (guardianId) localStorage.setItem("guardianId", guardianId);
        if (teacherId) localStorage.setItem("teacherId", teacherId);
        if (officeStaffId) localStorage.setItem("officeStaffId", officeStaffId);

        // Normalize role for redirect
        const normalizedRole = role.toLowerCase().replace(/[_\s]/g, "");
        let redirectPath = "";
        switch (normalizedRole) {
          case "director":
            redirectPath = allRouterLink.directorDashboard;
            break;
          case "officestaff":
            redirectPath = allRouterLink.officeStaffDashboard;
            break;
          case "guardian":
            redirectPath = allRouterLink.guardianDashboard;
            break;
          case "teacher":
            redirectPath = allRouterLink.teacherDashboard;
            break;
          case "student":
            redirectPath = allRouterLink.studentDashboard;
            break;
          default:
            redirectPath = allRouterLink.login; // fallback
        }

        navigate(redirectPath, { replace: true, state: { showSuccess: true } });
      } else {
        setFormError(response?.Message || "Invalid email or password");
      }
    } catch (err) {
      setFormError(
        err.response?.data?.Message ||
        err.response?.data?.message ||
        "Something went wrong. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{constants.hideEdgeRevealStyle}</style>
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block md:w-2/3 formBgColor">
          <img
            src={image}
            alt="Authentication"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-full md:w-1/2 lg:w-1/3 min-h-screen flex flex-col p-4">

          {/* Login Form */}
          <form
            className="w-full max-w-md mx-auto my-auto space-y-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* School Header */}
            <div className="text-center mb-8 pb-4 border-b border-gray-200">
              <div className="flex justify-center items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <i className="fa-solid fa-school text-white text-xl"></i>
                </div>

                <div className="text-left">
                  <h2 className="text-lg font-bold">
                    New Progressive
                  </h2>
                  <h2 className="text-lg font-bold">
                    Education Public School
                  </h2>
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-6">
              Login
            </h1>

            {/* Email */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  Email
                </span>
              </label>

              <input
                type="email"
                placeholder="example@gmail.com"
                className="input input-bordered w-full focus:outline-none"
                autoComplete="on"
                {...register("email", {
                  validate: (val) => validloginemail(val) || true,
                })}
              />

              {errors.email && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i>
                  Password
                </span>
              </label>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="input w-full pr-10 focus:outline-none"
                autoComplete="on"
                {...register("password", {
                  validate: (val) => validloginpassword(val) || true,
                })}
              />

              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i
                  className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"
                    }`}
                ></i>
              </button>

              {errors.password && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Error */}
            {formError && (
              <div className="text-red-500 text-center font-medium">
                {formError}
              </div>
            )}

            {/* Login Button */}
            <div className="form-control w-full mt-6">
              <button
                type="submit"
                className="btn bgTheme btn-primary w-full"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                )}

                {loading ? "" : "Login"}
              </button>
            </div>

            {/* Privacy */}
            <div className="text-center mt-8 text-xs text-gray-400">
              By continuing, you agree to our{" "}
              <Link
                to={allRouterLink.privacyPolicy}
                className="underline hover:text-gray-600"
              >
                Privacy Policy
              </Link>
            </div>

            {/* Forgot Password */}
            <div className="text-center mt-4">
              <Link
                to={allRouterLink.forgotPassword}
                className="text-sm textTheme hover:underline hover:text-[#4a17b1] font-medium"
              >
                <i className="fa-solid fa-key mr-2"></i>
                Forgot Password
              </Link>
            </div>
          </form>

          {/* Powered By - Always at bottom */}
          <div className="mt-auto pb-2 flex flex-col items-center gap-0">
            <span className="text-sm text-gray-400 font-medium">
              Powered by
            </span>

            <img
              src={isDark ? logo3 : logo2}
              alt="Powered by logo"
              className="h-18 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </>
  );
};
