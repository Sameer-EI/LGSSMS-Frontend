import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import image from "../../assets/auth-hero.png";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import {
  // validCurrentPassword,

  validCurrentPassword,
  validNewPassword,
  validConfirmPassword,
} from "../../Validations/Validations";
import { useForm } from "react-hook-form";

export const ChangePassword = () => {
  const { ChangePassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const newPassword = watch("newPassword");

  const onSubmit = async (data) => {
    setLoading(true);
    setFormError("");

    const userData = {
      current_password: data.currentPassword,
      change_password: data.newPassword,
      confirm_password: data.confirmPassword,
    };

    try {
      const response = await ChangePassword(userData);
      if (response.status === 200 || response.status === 201) {
        alert("Password changed successfully!");
        navigate("/");
      } else {
        setFormError(response.data?.message || "Failed to change password");
      }
    } catch (err) {
      setFormError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-24 md:mb-10">
      <style>{constants.hideEdgeRevealStyle}</style>
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block md:w-2/3 formBgColor">
          <img src={image} alt="Authentication" className="w-full h-full object-cover" />
        </div>
        <div className="w-full md:w-1/2 lg:w-1/3 flex items-center justify-center p-4">
          <form className="w-full max-w-md space-y-2" onSubmit={handleSubmit(onSubmit)}>
            <h1 className="text-3xl font-bold text-center mb-6">Change Password</h1>

            {formError && (
              <div className="text-red-500 text-center font-medium">{formError}</div>
            )}

            {/* Current Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i> Current Password
                </span>
              </label>
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                className="input w-full pr-10 focus:outline-none"
                autoComplete="on"
                {...register("currentPassword", {
                  validate: (val) => validCurrentPassword(val) === "" || validCurrentPassword(val),
                })}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <i className={`fa-solid ${showCurrentPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
              {errors.currentPassword && (
                <span className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</span>
              )}
            </div>

            {/* New Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i> New Password
                </span>
                <div className="group relative ml-2 cursor-pointer">
                  <div className="relative group inline-block">
                    <i className="fa-solid fa-circle-info text-sm cursor-pointer"></i>
                    <div className="absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap bg-gray-800 text-white text-xs px-3 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10">
                      Password must be at least 8 characters, include one letter, one number, and one special character
                    </div>
                  </div>
                </div>
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="input w-full pr-10 focus:outline-none"
                autoComplete="on"
                {...register("newPassword", {
                  validate: (val) => validNewPassword(val) === "" || validNewPassword(val),
                })}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                <i className={`fa-solid ${showNewPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
              {errors.newPassword && (
                <span className="text-red-500 text-sm mt-1">{errors.newPassword.message}</span>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="form-control w-full relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i> Confirm New Password
                </span>
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="input w-full pr-10 focus:outline-none"
                autoComplete="on"
                {...register("confirmPassword", {
                  validate: (val) => validConfirmPassword(newPassword, val) === "" || validConfirmPassword(newPassword, val),
                })}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye-slash"}`}></i>
              </button>
              {errors.confirmPassword && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <div className="form-control w-full mt-6">
              <button type="submit" className="btn bgTheme text-white w-full">
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fa-solid fa-key mr-2"></i>
                )}
                {loading ? " " : "Change Password"}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link to="/login" className="text-sm textTheme hover:underline font-medium">
                <i className="fa-solid fa-arrow-left mr-2"></i> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

