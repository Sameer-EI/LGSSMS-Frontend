import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faSignature,
  faEnvelope,
  faPhone,
  faVenusMars,
  faCamera,
  faIdCard,
  faGraduationCap,
  faCalendarDay,
} from "@fortawesome/free-solid-svg-icons";
import { constants } from "../../global/constants";
import { AuthContext } from "../../context/AuthContext";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const PROFILE_URL = "/t/teacher/teacher_my_profile/";
const GENDER_OPTIONS = ["Male", "Female", "Other"];

const inputCls =
  "input input-bordered w-full min-w-0 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200";

// "m" / "Male" / "MALE" -> "Male" so the <select> always matches an option
const normalizeGender = (g) => {
  if (!g) return "";
  const s = String(g).trim().toLowerCase();
  if (s === "m" || s === "male") return "Male";
  if (s === "f" || s === "female") return "Female";
  if (s === "o" || s === "other") return "Other";
  return "";
};

// Send gender back in the same style the API gave it to us
// ("M" / "male" / "Male"), so we never break the backend's choices.
const toBackendGender = (choice, original) => {
  if (!choice) return "";
  if (typeof original !== "string" || !original) return choice;
  if (original.length === 1) {
    return original === original.toUpperCase()
      ? choice[0].toUpperCase()
      : choice[0].toLowerCase();
  }
  if (original === original.toLowerCase()) return choice.toLowerCase();
  return choice;
};

// API may return an absolute URL or a "/media/..." path
const resolveImageUrl = (path, base) => {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  const cleanBase = (base || "").replace(/\/$/, "");
  return `${cleanBase}${path.startsWith("/") ? "" : "/"}${path}`;
};

// Turn DRF validation errors / network errors into one readable line
const formatApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Something went wrong. Please try again.";

  if (typeof data === "string") {
    return data.length > 200 || data.trim().startsWith("<")
      ? `Server error (${err.response.status}). Please try again.`
      : data;
  }

  if (typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    const parts = Object.entries(data).map(([key, val]) => {
      const msg = Array.isArray(val)
        ? val.join(" ")
        : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
      return `${key.replace(/_/g, " ")}: ${msg}`;
    });
    if (parts.length) return parts.join(" | ");
  }

  return err?.message || "Something went wrong. Please try again.";
};

const Field = ({ label, error, children }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label className="text-sm font-semibold text-gray-500 dark:text-gray-300">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
  </div>
);

const ReadOnlyField = ({ icon, label, value }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label className="text-sm font-semibold text-gray-500 dark:text-gray-300">
      <FontAwesomeIcon icon={icon} className="mr-2 h-4 w-4" />
      {label}
    </label>
    <input
      type="text"
      value={value || "Not provided"}
      className={inputCls}
      readOnly
    />
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const TeacherProfile = () => {
  const { axiosInstance } = useContext(AuthContext);
  const BASE_URL = constants.baseUrl;
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Photo handling: a newly picked file, or an explicit "remove" flag
  const [photoFile, setPhotoFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ mode: "onChange" });

  /* ------------------------------- load data ------------------------------- */

  const loadProfile = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        const response = await axiosInstance.get(PROFILE_URL);
        setProfileData(response.data);
        setLoadError(null);
      } catch (err) {
        console.error("Error fetching teacher data:", err);
        // A failed background refresh must not blank the whole page
        if (showSpinner) setLoadError(formatApiError(err));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [axiosInstance],
  );

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  // Object URL for the newly picked photo (created once, cleaned up properly)
  useEffect(() => {
    if (!photoFile) {
      setObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Auto-hide the success notice
  useEffect(() => {
    if (!successMsg) return undefined;
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const existingPhotoUrl = resolveImageUrl(profileData?.user_profile, BASE_URL);
  const previewSrc = removeImage ? "" : objectUrl || existingPhotoUrl;

  /* -------------------------------- handlers ------------------------------- */

  const openDialog = () => {
    reset({
      first_name: profileData?.first_name ?? "",
      middle_name: profileData?.middle_name ?? "",
      last_name: profileData?.last_name ?? "",
      gender: normalizeGender(profileData?.gender),
      email: profileData?.email ?? "",
      phone_no: profileData?.phone_no ?? "",
      adhaar_no: profileData?.adhaar_no ?? "",
      pan_no: profileData?.pan_no ?? "",
      qualification: profileData?.qualification ?? "",
    });
    setPhotoFile(null);
    setRemoveImage(false);
    setSubmitError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setPhotoFile(null);
    setRemoveImage(false);
    setSubmitError("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setRemoveImage(false); // picking a new photo cancels a previous "remove"
    }
    e.target.value = ""; // allow re-picking the same file
  };

  const handleRemoveImage = () => {
    setPhotoFile(null);
    setRemoveImage(true);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setSubmitError("");

    try {
      const formData = new FormData();

      // Never send null / undefined (FormData would turn them into the
      // strings "null" / "undefined", which the backend rejects)
      const append = (key, value) => {
        if (value === undefined || value === null) return;
        formData.append(key, typeof value === "string" ? value.trim() : value);
      };

      append("first_name", data.first_name);
      append("middle_name", data.middle_name ?? "");
      append("last_name", data.last_name);
      append("email", data.email);
      append("phone_no", data.phone_no);
      append("gender", toBackendGender(data.gender, profileData?.gender));
      append("adhaar_no", data.adhaar_no);
      append("pan_no", data.pan_no);
      append("qualification", data.qualification);

      // Photo is appended exactly once
      if (photoFile) {
        formData.append("user_profile", photoFile);
      } else if (removeImage) {
        formData.append("user_profile", "");
      }

      // Don't set Content-Type by hand: the browser adds the multipart boundary
      await axiosInstance.put(PROFILE_URL, formData);

      const photoChanged = Boolean(photoFile) || removeImage;
      closeDialog();
      await loadProfile(false);

      if (photoChanged) {
        // refresh the header avatar too
        window.location.reload();
      } else {
        setSuccessMsg("Profile updated successfully.");
      }
    } catch (err) {
      console.error("Error updating teacher data:", err);
      // Keep the form open and show what went wrong
      setSubmitError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- states -------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex space-x-2">
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full"></div>
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.2s]"></div>
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-sm text-gray-500">Loading data...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <i className="fa-solid fa-triangle-exclamation mb-4 text-5xl text-red-400"></i>
        <p className="text-lg font-medium text-red-400">
          Failed to load data, Try Again
        </p>
        <button
          type="button"
          onClick={() => loadProfile(true)}
          className="btn bgTheme mt-4 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="mx-auto m-3 max-w-7xl overflow-hidden rounded-xl bg-white px-4 py-8 shadow-md dark:bg-gray-800 sm:px-6 lg:px-8">
        <div className="text-center text-gray-500">
          <p>No profile data available</p>
        </div>
      </div>
    );
  }

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-100 p-3 pb-24 dark:bg-gray-900 sm:p-6 md:pb-10">
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-xl bg-white px-4 py-6 shadow-md dark:bg-gray-800 sm:px-6 sm:py-8 lg:px-8">
        {/* Header with image and titles */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex-shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              {existingPhotoUrl ? (
                <img
                  src={existingPhotoUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FontAwesomeIcon
                  icon={faUser}
                  className="h-12 w-12 text-gray-400"
                />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="textTheme text-xl font-bold uppercase sm:text-2xl">
              Teacher Profile
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">
              Manage your account information and settings
            </p>
          </div>
        </div>

        {successMsg && (
          <div
            role="status"
            className="mb-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
          >
            {successMsg}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Column 1 */}
            <div className="space-y-6">
              <ReadOnlyField
                icon={faUser}
                label="First Name"
                value={profileData.first_name}
              />
              <ReadOnlyField
                icon={faSignature}
                label="Middle Name"
                value={profileData.middle_name}
              />
              <ReadOnlyField
                icon={faSignature}
                label="Last Name"
                value={profileData.last_name}
              />
              <ReadOnlyField
                icon={faVenusMars}
                label="Gender"
                value={profileData.gender}
              />
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              <ReadOnlyField
                icon={faPhone}
                label="Phone Number"
                value={profileData.phone_no}
              />
              <ReadOnlyField
                icon={faEnvelope}
                label="Email"
                value={profileData.email}
              />
              <ReadOnlyField
                icon={faIdCard}
                label="Aadhaar Number"
                value={profileData.adhaar_no}
              />
              <ReadOnlyField
                icon={faIdCard}
                label="PAN Number"
                value={profileData.pan_no}
              />
              <ReadOnlyField
                icon={faGraduationCap}
                label="Qualification"
                value={profileData.qualification}
              />
              {profileData.date_joined && (
                <ReadOnlyField
                  icon={faCalendarDay}
                  label="Date Joined"
                  value={profileData.date_joined}
                />
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={openDialog}
              className="btn bgTheme w-full text-white sm:w-auto"
            >
              <i className="fa-solid fa-pen-to-square"></i> Update
            </button>
          </div>
        </div>
      </div>

      {/* Dialog Box */}
      {isDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-profile-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:rounded-lg">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="p-4 sm:p-6">
                <h2
                  id="update-profile-title"
                  className="mb-4 text-xl font-bold text-[#167bff] dark:text-blue-400"
                >
                  Update Teacher Profile
                </h2>

                {submitError && (
                  <div
                    role="alert"
                    className="mb-4 break-words rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Column 1 - Profile Image */}
                  <div className="space-y-4 md:col-span-2 lg:col-span-1">
                    <h3 className="text-md border-b pb-2 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                      Profile Image
                    </h3>

                    <div className="flex flex-col items-center space-y-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Choose profile photo"
                        className="group relative h-32 w-32 overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100 shadow-md transition-all duration-200 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700"
                      >
                        {previewSrc ? (
                          <img
                            src={previewSrc}
                            alt="Profile Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300">
                            <FontAwesomeIcon
                              icon={faUser}
                              size="3x"
                              className="opacity-70"
                            />
                          </span>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <FontAwesomeIcon
                            icon={faCamera}
                            className="text-lg text-white"
                          />
                        </span>
                      </button>

                      <input
                        ref={fileInputRef}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />

                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn bgTheme text-white"
                        >
                          <FontAwesomeIcon icon={faCamera} className="mr-2" />
                          Photo
                        </button>
                        {previewSrc && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
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
                    <h3 className="text-md border-b pb-2 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                      Personal Information
                    </h3>

                    <Field label="First Name" error={errors.first_name}>
                      <input
                        type="text"
                        {...register("first_name", {
                          required: "First name is required",
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Middle Name" error={errors.middle_name}>
                      <input
                        type="text"
                        {...register("middle_name")}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Last Name" error={errors.last_name}>
                      <input
                        type="text"
                        {...register("last_name", {
                          required: "Last name is required",
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Gender" error={errors.gender}>
                      <select
                        {...register("gender", {
                          required: "Gender is required",
                        })}
                        className="select select-bordered w-full min-w-0 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      >
                        <option value="">Select Gender</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Column 3 - Contact & Professional Info */}
                  <div className="space-y-4">
                    <h3 className="text-md border-b pb-2 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                      Contact Information
                    </h3>

                    <Field label="Email" error={errors.email}>
                      <input
                        type="email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address",
                          },
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Phone Number" error={errors.phone_no}>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        {...register("phone_no", {
                          required: "Phone number is required",
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message: "Enter a 10 digit phone number",
                          },
                          // runs inside react-hook-form, so the form value
                          // always matches what the user sees
                          onChange: (e) => {
                            e.target.value = e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 10);
                          },
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <h3 className="text-md mt-4 border-b pb-2 font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                      Professional Information
                    </h3>

                    <Field label="Qualification" error={errors.qualification}>
                      <input
                        type="text"
                        {...register("qualification", {
                          required: "Qualification is required",
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Aadhaar Number" error={errors.adhaar_no}>
                      <input
                        type="text"
                        {...register("adhaar_no", {
                          required: "Aadhaar number is required",
                        })}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="PAN Number" error={errors.pan_no}>
                      <input
                        type="text"
                        {...register("pan_no", {
                          required: "PAN number is required",
                        })}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Buttons - stay visible at the bottom on small screens */}
              <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                  className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn bgTheme text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;