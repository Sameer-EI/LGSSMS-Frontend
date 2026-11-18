import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import image from "../../assets/auth-hero.png";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";

const INSTRUCTIONS =
  "Enter your registered email address. We’ll send an OTP to reset your password to that email.";

const MODAL_VARIANTS = {
  success: {
    icon: "fa-circle-check",
    iconClass: "text-green-500",
    ringClass: "bg-green-100",
    buttonLabel: "Continue",
  },
  error: {
    icon: "fa-circle-xmark",
    iconClass: "text-red-500",
    ringClass: "bg-red-100",
    buttonLabel: "Try again",
  },
};

/* Reusable status dialog (success / error). Closes on button, backdrop click or Escape. */
const StatusModal = ({ variant, title, message, onClose }) => {
  const { icon, iconClass, ringClass, buttonLabel } = MODAL_VARIANTS[variant];
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
            className="btn bgTheme text-white w-full sm:w-auto sm:min-w-32"
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { variant, title, message, email? } | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    // Trim once so the email we send to the API is the same one we navigate with
    const trimmedEmail = email.trim();

    try {
      const response = await axios.post(`${constants.baseUrl}/auth/otp/`, {
        email: trimmedEmail,
      });

      if (response.status === 200 || response.status === 201) {
        setModal({
          variant: "success",
          title: "OTP sent",
          message:
            "We’ve sent an OTP to your email. It is valid for 5 minutes.",
          email: trimmedEmail, // carried to the reset page
        });
      } else {
        setModal({
          variant: "error",
          title: "OTP not sent",
          message: "We couldn’t send the OTP. Please try again.",
        });
      }
    } catch (err) {
      setModal({
        variant: "error",
        title: "Something went wrong",
        message:
          err.response?.data?.Message ||
          err.response?.data?.message ||
          "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const successEmail = modal?.variant === "success" ? modal.email : null;
    setModal(null);
    if (successEmail) {
      navigate(allRouterLink.resetPassword, {
        state: { email: successEmail },
      });
    }
  };

  return (
    <div className="mb-24 md:mb-0">
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
            className="w-full max-w-md space-y-5"
            onSubmit={handleSubmit}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Forgot Password
            </h1>

            <p className="text-sm text-gray-600 text-center">{INSTRUCTIONS}</p>

            {/* Email */}
            <div className="form-control w-full">
              <label className="label" htmlFor="forgot-email">
                <span className="label-text flex items-center gap-2 font-medium">
                  <i className="fa-solid fa-envelope text-sm text-gray-500"></i>
                  Email Address
                </span>
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="example@gmail.com"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="form-control w-full mt-6">
              <button
                type="submit"
                className="btn bgTheme text-white w-full"
                disabled={loading}
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                )}
                {loading ? "Sending..." : "Send OTP"}
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