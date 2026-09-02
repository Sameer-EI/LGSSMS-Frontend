import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import image from "../../assets/auth-hero.png";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";
import { useForm } from "react-hook-form";
import {validResetEmail,validOtp,validNewPassword,validConfirmPassword,} from "../../Validations/Validations";

export const ResetPassword = () => {
  const { ResetPassword, LogoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: "onSubmit" });

  const newPasswordValue = watch("newpassword");

  const onSubmit = async (data) => {
    setError("");
    setLoading(true);

    const userData = {
      email: data.email,
      otp: data.otp,
      new_password: data.newpassword,
      confirm_password: data.confirmPassword,
    };

    try {
      const response = await ResetPassword(userData);
      if (response.status === 200 || response.status === 201) {
        alert("Successfully changed the password");
        await LogoutUser();
        navigate(allRouterLink.loginUser);
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-24 md:mb-10">
      <style>{constants.hideEdgeRevealStyle}</style>
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block md:w-2/3 formBgColor">
          <img
            src={image}
            alt="Authentication"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full md:w-1/2 lg:w-1/3 flex items-center justify-center p-4">
          <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <h1 className="text-3xl font-bold text-center mb-6">Reset Password</h1>

            {error && (
              <div className="text-red-500 text-center font-medium">{error}</div>
            )}

            {/* Email */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  <i className="fa-solid fa-envelope text-sm mr-2"></i>Email
                </span>
              </label>
              <input
                placeholder="example@gmail.com"
                className="input input-bordered w-full focus:outline-none"
                {...register("email", {
                  validate: (value) => {
                    const msg = validResetEmail(value);
                    return msg === "" || msg;
                  },
                })}
              />
              {errors.email && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.email.message || errors.email}
                </span>
              )}
            </div>

            {/* OTP */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text">
                  <i className="fa-solid fa-key text-sm mr-2"></i>OTP
                </span>
              </label>
              <input
                type={showOtp ? "text" : "password"}
                inputMode="numeric"
                placeholder="Enter the OTP"
                className="input input-bordered w-full focus:outline-none pr-10"
                {...register("otp", {
                  validate: (value) => {
                    const msg = validOtp(value);
                    return msg === "" || msg;
                  },
                })}
              />
              {errors.otp && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.otp.message || errors.otp}
                </span>
              )}
              <button
                type="button"
                className="passwordEyes text-gray-500 absolute right-3 top-11"
                onClick={() => setShowOtp(!showOtp)}
              >
                <i className={`fa-solid ${showOtp ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>

            {/* New Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text">
                  <i className="fa-solid fa-lock text-sm mr-2"></i>New Password
                </span>
                 <div className="group relative ml-2 cursor-pointer">
                  <div className="relative group inline-block">
                    <i className="fa-solid fa-circle-info text-sm cursor-pointer"></i>
                    <div className="absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap bg-gray-800 text-white text-xs px-3 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10">
                       Password must be at least 8 characters, include one letter, one number, and one special character.
                    </div>
                  </div>
                </div>
              </label>
             
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="input input-bordered w-full pr-10 focus:outline-none"
                {...register("newpassword", {
                  validate: (value) => validNewPassword(value) || true,
                },
                )}
              />
              {errors.newpassword && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.newpassword.message || errors.newpassword}
                </span>
              )}
              <button
                type="button"
                className="passwordEyes text-gray-500 absolute right-3 top-11"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>

            {/* Confirm Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text">
                  <i className="fa-solid fa-lock text-sm mr-2"></i>Confirm Password
                </span>
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="input input-bordered w-full pr-10 focus:outline-none"
                {...register("confirmPassword", {
                  validate: (value) => {
                    const msg = validConfirmPassword(newPasswordValue, value);
                    return msg === "" || msg;
                  },
                })}
              />
              {errors.confirmPassword && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword.message || errors.confirmPassword}
                </span>
              )}
              <button
                type="button"
                className="passwordEyes text-gray-500 absolute right-3 top-11"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fa-solid ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>

            {/* Submit Button */}
            <div className="form-control w-full mt-6">
              <button
                type="submit"
                className="btn btn-primary w-full"
              // disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>

                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket mr-2"></i>
                    Reset Password
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link
                to={allRouterLink.forgotPassword}
                className="text-sm text-blue-600 hover:underline hover:text-blue-800 font-medium"
              >
                <i className="fa-solid fa-key mr-2"></i>
                Forgot Password
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};