import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import image from "../../assets/auth-hero.png";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";
import axios from "axios";

export const ForgotPassword = () => {
  const instructions = `Enter your registered email address. We’ll send you OTP to reset
              your password on your registered email.`;

              
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      email: email,
    };
    try {
      const response = await axios.post(`${constants.baseUrl}/auth/otp/`, payload);
      if (response.status === 200 || response.status === 201) {
        alert('OPT is sent to your email successfully, only valid for 5 mins');
        navigate(`${allRouterLink.resetPassword}`);
      } else {
        setError("OPT was not sent, Please try again");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-24 md:mb-10">
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="hidden md:block md:w-2/3 formBgColor">
          <img
            src={image}
            alt="Authentication"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-full md:w-1/2 lg:w-1/3 flex items-center justify-center p-6">
          <form className="w-full max-w-md space-y-5" onSubmit={handleSubmit}>
            <h1 className="text-3xl font-bold text-center mb-2">
              Forgot Password
            </h1>

            <p className="text-sm text-gray-600 text-center">{instructions}</p>
            {/* Error message */}
            {error && (
              <div className="text-red-500 text-center font-medium border border-red-300 bg-red-50 rounded p-2">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text flex items-center gap-2 font-medium">
                  <i className="fa-solid fa-envelope text-sm text-gray-500"></i>{" "}
                  Email Address
                </span>
              </label>
              <input
                type="email"
                placeholder="example@gmail.com"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div className="form-control w-full mt-6">
              <button type="submit" className="btn bgTheme text-white w-full">
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fa-solid fa-right-to-bracket mr-2"></i>
                )}
                {loading ? " " : "Submit"}
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
    </div>
  );
};
