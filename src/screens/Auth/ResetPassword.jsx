import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import image from "../../assets/auth-hero.png";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";
import { validNewPassword } from "../../Validations/Validations";

/* ---------- constants ---------- */

const OTP_LENGTH = 6;

const INPUT_CLASS =
  "input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-blue-500";
const TOGGLE_CLASS = "passwordEyes text-gray-500";
const ERROR_CLASS = "text-red-500 text-sm mt-1 break-words";

const INSTRUCTIONS =
  "Enter the OTP sent to your registered email and choose a new password.";

// Change this key if your forgot-password route is named differently
const FORGOT_PASSWORD_ROUTE =
  allRouterLink.forgotPassword || allRouterLink.loginUser;

const MODAL_VARIANTS = {
  success: {
    icon: "fa-circle-check",
    iconClass: "text-green-500",
    ringClass: "bg-green-100",
    buttonLabel: "Go to Login",
    buttonClass: "bgTheme text-white",
  },
  error: {
    icon: "fa-circle-xmark",
    iconClass: "text-red-500",
    ringClass: "bg-red-100",
    buttonLabel: "Try again",
    buttonClass: "bgTheme text-white",
  },
};

/* ---------- helpers ---------- */

/* Converts a validator that returns "" (valid) or a message into an RHF rule */
const toRule = (validator) => (value, formValues) => {
  const msg = validator(value, formValues);
  return msg === "" || msg;
};

/* OTP must be exactly OTP_LENGTH digits */
const validateOtp = (value) => {
  if (!value) return "OTP is required";
  if (!/^\d+$/.test(value)) return "OTP can contain digits only";
  if (value.length < OTP_LENGTH) return `Enter the complete ${OTP_LENGTH}-digit OTP`;
  return true;
};

/* Flattens DRF-style payloads: {field: ["msg"]}, {detail: "msg"}, ["msg"] ... */
const flatten = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(" ");
  if (typeof value === "object")
    return Object.values(value).map(flatten).filter(Boolean).join(" ");
  return String(value);
};

const getErrorMessage = (err) => {
  // No response: offline, CORS, timeout, server down
  if (!err?.response) {
    if (err?.code === "ECONNABORTED")
      return "The request timed out. Please try again.";
    return "Unable to reach the server. Check your internet connection and try again.";
  }

  const { status, data } = err.response;

  if (status === 429)
    return "Too many attempts. Please wait a few minutes and try again.";
  if (status >= 500)
    return "The server ran into a problem. Please try again later.";

  // Prefer the server's own message for client errors
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("<"))
    return data;
  if (data && typeof data === "object") {
    const msg =
      flatten(data.Message) ||
      flatten(data.message) ||
      flatten(data.detail) ||
      flatten(data.error) ||
      flatten(data);
    if (msg) return msg;
  }

  if (status === 400) return "Invalid OTP or password. Please check and try again.";
  if (status === 401 || status === 403)
    return "You are not authorized to perform this action.";
  if (status === 404) return "No account was found for this email.";
  return "Password could not be reset. Please try again.";
};

/* ---------- UI pieces ---------- */

const FieldLabel = ({ icon, children, hint }) => (
  <label className="label gap-2">
    <span className="label-text flex items-center gap-2 font-medium">
      <i className={`fa-solid ${icon} text-sm text-gray-500`}></i>
      {children}
    </span>
    {hint && (
      <span className="group relative inline-block">
        {/* A button is focusable, so the tooltip also works on touch devices */}
        <button
          type="button"
          className="cursor-pointer text-gray-500"
          aria-label="Show password requirements"
        >
          <i className="fa-solid fa-circle-info text-sm"></i>
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 bottom-full mb-2 w-56 max-w-[calc(100vw-3rem)] sm:w-64 rounded bg-gray-800 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 z-10"
        >
          {hint}
        </span>
      </span>
    )}
  </label>
);

/* Input with an eye toggle. Structure mirrors the Login page: the `relative`
   wrapper is the form-control itself and the button is a direct sibling of the
   input, so the `.passwordEyes` CSS positions it exactly as on Login. */
const SecretField = ({
  icon,
  label,
  hint,
  placeholder,
  visible,
  onToggle,
  error,
  inputMode,
  autoComplete,
  registration,
}) => (
  <div className="form-control w-full relative">
    <FieldLabel icon={icon} hint={hint}>
      {label}
    </FieldLabel>
    <input
      type={visible ? "text" : "password"}
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className={`${INPUT_CLASS} pr-10`}
      aria-invalid={!!error}
      {...registration}
    />
    <button
      type="button"
      className={TOGGLE_CLASS}
      onClick={onToggle}
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={visible}
    >
      <i className={`fa-solid ${visible ? "fa-eye" : "fa-eye-slash"}`}></i>
    </button>
    {error && (
      <span className={ERROR_CLASS} role="alert">
        {error.message || error}
      </span>
    )}
  </div>
);

/* Segmented OTP input: one box per digit, digits only, with auto-advance,
   backspace navigation, arrow keys, paste, and one-time-code autofill. */
const OtpInput = ({ value = "", onChange, onBlur, hasError, disabled }) => {
  const inputsRef = useRef([]);

  const focusAt = (index) => {
    const i = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputsRef.current[i]?.focus();
  };

  const handleChange = (index, e) => {
    const typed = e.target.value.replace(/\D/g, "");
    // Keep the value gap-free: never write past the first empty box
    const pos = Math.min(index, value.length);

    // Box cleared
    if (!typed) {
      onChange(value.slice(0, pos) + value.slice(pos + 1));
      return;
    }

    // Several digits at once (SMS/email autofill): spread across the boxes
    if (typed.length > 1) {
      const next = (value.slice(0, pos) + typed).slice(0, OTP_LENGTH);
      onChange(next);
      focusAt(Math.min(pos + typed.length, OTP_LENGTH - 1));
      return;
    }

    // Single digit (the focused box is selected, so it replaces the old digit)
    onChange(
      (value.slice(0, pos) + typed + value.slice(pos + 1)).slice(0, OTP_LENGTH)
    );
    focusAt(pos + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index]) {
      // Empty box: delete the previous digit and move back
      e.preventDefault();
      const pos = Math.min(index, value.length);
      if (pos > 0) {
        onChange(value.slice(0, pos - 1) + value.slice(pos));
        focusAt(pos - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div
      className="flex gap-2 sm:gap-3"
      role="group"
      aria-label={`${OTP_LENGTH}-digit one-time password`}
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          value={value[i] || ""}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          aria-invalid={hasError}
          className={`input input-bordered min-w-0 flex-1 basis-0 h-11 sm:h-12 px-0 text-center text-lg sm:text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "input-error" : ""
          }`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
};

/* Reusable status dialog (success / error). Closes on button, backdrop click or Escape. */
const StatusModal = ({ variant, title, message, onClose }) => {
  const { icon, iconClass, ringClass, buttonLabel, buttonClass } =
    MODAL_VARIANTS[variant];
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal modal-open px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      aria-describedby="status-modal-message"
      onClick={onClose}
    >
      <div
        className="modal-box w-full max-w-sm sm:max-w-md text-center p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${ringClass}`}
        >
          <i className={`fa-solid ${icon} text-3xl ${iconClass}`}></i>
        </div>

        <h3 id="status-modal-title" className="text-lg sm:text-xl font-bold">
          {title}
        </h3>
        <p
          id="status-modal-message"
          className="mt-2 text-sm text-gray-600 break-words"
        >
          {message}
        </p>

        <div className="modal-action justify-center mt-6">
          <button
            ref={buttonRef}
            type="button"
            className={`btn w-full sm:w-auto sm:min-w-32 ${buttonClass}`}
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- page ---------- */

export const ResetPassword = () => {
  const { ResetPassword: resetPassword, LogoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Email sent from the Forgot Password page via navigation state
  const email = location.state?.email || "";

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { variant, title, message } | null
  const [visible, setVisible] = useState({
    password: false,
    confirm: false,
  });

  const toggle = (field) =>
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    trigger,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onSubmit",
    defaultValues: { otp: "", newpassword: "", confirmPassword: "" },
  });

  const newPasswordValue = watch("newpassword");

  // If the new password changes after confirm was typed, re-check the match
  useEffect(() => {
    if (getValues("confirmPassword")) trigger("confirmPassword");
  }, [newPasswordValue, getValues, trigger]);

  // Opened directly without going through Forgot Password: send them back
  useEffect(() => {
    if (!email) navigate(FORGOT_PASSWORD_ROUTE, { replace: true });
  }, [email, navigate]);

  const onSubmit = async (data) => {
    if (loading || !email) return;
    setLoading(true);

    const payload = {
      email, // from navigation state (a disabled input isn't submitted by RHF)
      otp: data.otp,
      new_password: data.newpassword,
      confirm_password: data.confirmPassword,
    };

    try {
      // AuthContext.ResetPassword must rethrow errors (axios rejects on non-2xx)
      const res = await resetPassword(payload);

      // Safety net: never show success unless we got a real 2xx response
      const status = res?.status;
      if (!res || typeof status !== "number" || status < 200 || status >= 300) {
        throw { response: res };
      }

      reset();
      setModal({
        variant: "success",
        title: "Password changed",
        message:
          "Your password has been reset successfully. Please log in with your new password.",
      });
    } catch (err) {
      console.error("Reset password error:", err);
      setModal({
        variant: "error",
        title: "Couldn’t reset password",
        message: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = useCallback(async () => {
    const wasSuccess = modal?.variant === "success";
    setModal(null);

    if (wasSuccess) {
      try {
        await LogoutUser();
      } finally {
        navigate(allRouterLink.loginUser, { replace: true });
      }
    }
  }, [modal, LogoutUser, navigate]);

  // Avoid flashing the form while redirecting
  if (!email) return null;

  return (
    <div className="mb-24 md:mb-0">
      <style>{constants.hideEdgeRevealStyle}</style>

      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Hero (hidden on small screens) */}
        <div className="hidden md:block md:w-1/2 lg:w-2/3 formBgColor">
          <img
            src={image}
            alt="Authentication"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Form */}
        <div className="w-full md:w-1/2 lg:w-1/3 flex items-center justify-center px-4 py-8 sm:px-6">
          <form
            className="w-full max-w-md space-y-4 sm:space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Reset Password
            </h1>

            <p className="text-sm text-gray-600 text-center">{INSTRUCTIONS}</p>

            {/* Email: prefilled from Forgot Password and not editable */}
            <div className="form-control w-full">
              <FieldLabel icon="fa-envelope">Email Address</FieldLabel>
              <input
                type="email"
                value={email}
                disabled
                readOnly
                title={email}
                autoComplete="email"
                className={`${INPUT_CLASS} truncate bg-gray-100 text-gray-700 cursor-not-allowed`}
              />
            </div>

            {/* OTP: 6 separate digit boxes */}
            <div className="form-control w-full">
              <FieldLabel icon="fa-key">OTP</FieldLabel>
              <Controller
                name="otp"
                control={control}
                rules={{ validate: validateOtp }}
                render={({ field }) => (
                  <OtpInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hasError={!!errors.otp}
                    disabled={loading}
                  />
                )}
              />
              {errors.otp && (
                <span className={ERROR_CLASS} role="alert">
                  {errors.otp.message}
                </span>
              )}
            </div>

            {/* New password */}
            <SecretField
              icon="fa-lock"
              label="New Password"
              hint="Password must be at least 8 characters, include one letter, one number, and one special character."
              placeholder="Enter new password"
              autoComplete="new-password"
              visible={visible.password}
              onToggle={() => toggle("password")}
              error={errors.newpassword}
              registration={register("newpassword", {
                validate: toRule(validNewPassword),
              })}
            />

            {/* Confirm password: must match the new password */}
            <SecretField
              icon="fa-lock"
              label="Confirm Password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              visible={visible.confirm}
              onToggle={() => toggle("confirm")}
              error={errors.confirmPassword}
              registration={register("confirmPassword", {
                required: "Please confirm your new password",
                validate: (value) =>
                  value === getValues("newpassword") ||
                  "Passwords do not match",
              })}
            />

            {/* Submit */}
            <div className="form-control w-full mt-6">
              <button
                type="submit"
                className="btn bgTheme text-white w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                )}
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>

            <p className="text-sm text-center text-gray-500 mt-2">
              Remember your password?{" "}
              <Link
                to={allRouterLink.loginUser}
                className="textTheme hover:underline"
              >
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>

      {modal && (
        <StatusModal
          variant={modal.variant}
          title={modal.title}
          message={modal.message}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};