import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faSignature,
  faEnvelope,
  faPhone,
  faMoneyBill,
  faBriefcase,
  faGraduationCap,
  faIdBadge,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
import { constants } from "../../global/constants";
import { AuthContext } from "../../context/AuthContext";

const GuardianProfile = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [guardianData, setGuardianData] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const BASE_URL = constants.baseUrl;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    const fetchGuardianData = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(
          `/s/guardian/guardian_my_profile/`
        );
        setGuardianData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching guardian data:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchGuardianData();
  }, [axiosInstance]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("first_name", data.first_name);
      formData.append("last_name", data.last_name);
      formData.append("email", data.email);
      formData.append("phone_no", data.phone_no);
      formData.append("middle_name", data.middle_name || "");
      formData.append("annual_income", data.annual_income || "");
      formData.append("means_of_livelihood", data.means_of_livelihood || "");
      formData.append("qualification", data.qualification || "");
      formData.append("occupation", data.occupation || "");
      formData.append("designation", data.designation || "");

      if (removeImage) {
        formData.append("user_profile", "");
      } else if (imagePreview && typeof imagePreview !== "string") {
        formData.append("user_profile", imagePreview);
      }

      const response = await axiosInstance.put(
        `/s/guardian/guardian_my_profile/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setGuardianData(response.data);
      setIsDialogOpen(false);
      setImagePreview(null);
      window.location.reload();
    } catch (err) {
      console.error("Error updating guardian data:", err);
      setError(err.message);
    }
  };

  const handleEditClick = () => {
    reset(guardianData);
    setIsDialogOpen(true);
    if (guardianData?.user_profile) {
      setImagePreview(`${BASE_URL}${guardianData.user_profile}`);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setRemoveImage(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-300 text-sm">
          Loading data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 dark:bg-gray-900">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  if (!guardianData) {
    return (
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-top-bottom overflow-hidden px-4 sm:px-6 lg:px-8 py-8 m-2.5">
        <div className="text-center text-gray-700 dark:text-gray-300">
          <p>No guardian data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-top-bottom overflow-hidden px-4 sm:px-6 lg:px-8 py-8 m-2.5">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-8">
          <div className="flex-shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
              <img
                src={
                  guardianData.user_profile
                    ? `${BASE_URL}${guardianData.user_profile}`
                    : "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                }
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-xl sm:text-2xl font-bold textTheme uppercase">
              Guardian Profile
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Manage your account information and settings
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  value={guardianData.first_name}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon
                    icon={faSignature}
                    className="w-4 h-4 mr-2"
                  />
                  Middle Name
                </label>
                <input
                  type="text"
                  value={guardianData.middle_name || "N/A"}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon
                    icon={faSignature}
                    className="w-4 h-4 mr-2"
                  />
                  Last Name
                </label>
                <input
                  type="text"
                  value={guardianData.last_name}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon
                    icon={faMoneyBill}
                    className="w-4 h-4 mr-2"
                  />
                  Annual Income
                </label>
                <input
                  type="text"
                  value={
                    guardianData.annual_income
                      ? `₹${guardianData.annual_income.toLocaleString()}`
                      : "N/A"
                  }
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-2" />
                  Email
                </label>
                <input
                  type="text"
                  value={guardianData.email}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon icon={faPhone} className="w-4 h-4 mr-2" />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={guardianData.phone_no || "N/A"}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon icon={faBriefcase} className="w-4 h-4 mr-2" />
                  Occupation
                </label>
                <input
                  type="text"
                  value={guardianData.occupation || "N/A"}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">
                  <FontAwesomeIcon icon={faIdBadge} className="w-4 h-4 mr-2" />
                  Designation
                </label>
                <input
                  type="text"
                  value={guardianData.designation || "N/A"}
                  className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Additional Information Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-gray-700 dark:text-gray-300">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">
                <FontAwesomeIcon
                  icon={faGraduationCap}
                  className="w-4 h-4 mr-2"
                />
                Qualification
              </label>
              <input
                type="text"
                value={guardianData.qualification || "N/A"}
                className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                readOnly
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">
                <FontAwesomeIcon icon={faBriefcase} className="w-4 h-4 mr-2" />
                Means of Livelihood
              </label>
              <input
                type="text"
                value={guardianData.means_of_livelihood || "N/A"}
                className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                readOnly
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => window.history.back()}>
              Cancel
            </button>
            <button
              onClick={handleEditClick}
              className="btn bgTheme text-white"
            >
              <i className="fa-solid fa-pen-to-square"></i> Update
            </button>
          </div>
        </div>

        {/* Dialog Box */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-transparent bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 text-gray-700 dark:text-gray-300">
                <h2 className="text-xl font-bold textTheme mb-4">
                  Update Guardian Profile
                </h2>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1 - Profile Image */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
                        Profile Image
                      </h3>

                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                          <div className="h-32 w-32 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-md border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-all duration-200">
                            {imagePreview ? (
                              typeof imagePreview === "string" ? (
                                <img
                                  src={imagePreview}
                                  alt="Profile Preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <img
                                  src={URL.createObjectURL(imagePreview)}
                                  alt="Profile Preview"
                                  className="h-full w-full object-cover"
                                />
                              )
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-300 bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-600">
                                <FontAwesomeIcon
                                  icon={faUser}
                                  size="3x"
                                  className="opacity-70"
                                />
                              </div>
                            )}
                          </div>
                          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                            <div className="bg-black bg-opacity-50 rounded-full p-2">
                              <FontAwesomeIcon
                                icon={faCamera}
                                className="text-white text-lg"
                              />
                            </div>
                            <input
                              className="hidden"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setImagePreview(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex gap-2">
                          <label className="btn bgTheme text-white">
                            <FontAwesomeIcon icon={faCamera} className="mr-2" />
                            Change
                            <input
                              className="hidden"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setImagePreview(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          {imagePreview && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 dark:bg-red-600 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-500"
                            >
                              <span className="mr-2">X</span>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2 - Personal Info */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
                        Personal Information
                      </h3>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">First Name</label>
                        <input
                          type="text"
                          {...register("first_name", { required: "First name is required" })}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                        {errors.first_name && (
                          <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                            {errors.first_name.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Middle Name</label>
                        <input
                          type="text"
                          {...register("middle_name")}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Last Name</label>
                        <input
                          type="text"
                          {...register("last_name", { required: "Last name is required" })}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                        {errors.last_name && (
                          <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                            {errors.last_name.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Annual Income</label>
                        <input
                          type="number"
                          {...register("annual_income")}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                      </div>
                    </div>

                    {/* Column 3 - Contact & Professional Info */}
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
                        Professional Information
                      </h3>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Email</label>
                        <input
                          type="email"
                          {...register("email", {
                            required: "Email is required",
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: "Invalid email address",
                            },
                          })}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                        {errors.email && (
                          <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Phone Number</label>
                        <input
                          type="tel"
                          {...register("phone_no", { required: "Phone number is required" })}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                        {errors.phone_no && (
                          <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                            {errors.phone_no.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Means of Livelihood</label>
                        <select
                          {...register("means_of_livelihood")}
                          className="select select-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        >
                          <option value="Govt">Government</option>
                          <option value="Non-Govt">Non Government</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold">Qualification</label>
                        <input
                          type="text"
                          {...register("qualification")}
                          className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional fields row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold">Occupation</label>
                      <input
                        type="text"
                        {...register("occupation")}
                        className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold">Designation</label>
                      <input
                        type="text"
                        {...register("designation")}
                        className="input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-4 mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setImagePreview(null);
                      }}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn bgTheme text-white">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardianProfile;
