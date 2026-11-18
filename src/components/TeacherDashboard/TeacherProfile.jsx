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
const GENDER_OPTIONS = ["Male", "Female"];

const inputCls =
  "input input-bordered w-full min-w-0 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200";
const selectCls =
  "select select-bordered w-full min-w-0 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200";
const readOnlyCls = `${inputCls} cursor-default bg-gray-50 focus:outline-none`;

// "m" / "Male" / "MALE" -> "Male" so the <select> always matches an option.
// Anything else (e.g. legacy "Other") becomes "" so the user must pick one.
const normalizeGender = (g) => {
  if (!g) return "";
  const s = String(g).trim().toLowerCase();
  if (s === "m" || s === "male") return "Male";
  if (s === "f" || s === "female") return "Female";
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

/* -------------------------------------------------------------------------- */
/*  Small components                                                          */
/* -------------------------------------------------------------------------- */

// Label + input + error, with a red asterisk for required fields
const Field = ({ id, label, required, error, children }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label
      htmlFor={id}
      className="text-sm font-semibold text-gray-500 dark:text-gray-300"
    >
      {label}
      {required && (
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
    {error && (
      <p role="alert" className="mt-0.5 text-xs text-red-500">
        {error.message}
      </p>
    )}
  </div>
);

const ReadOnlyField = ({ id, icon, label, value }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label
      htmlFor={id}
      className="text-sm font-semibold text-gray-500 dark:text-gray-300"
    >
      <FontAwesomeIcon icon={icon} className="mr-2 h-4 w-4" />
      {label}
    </label>
    <input
      id={id}
      type="text"
      value={value || "Not provided"}
      className={readOnlyCls}
      readOnly
    />
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="border-b border-gray-200 pb-2 text-base font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
    {children}
  </h3>
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

  // Lock background scroll while the dialog is open
  useEffect(() => {
    if (!isDialogOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDialogOpen]);

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
      <div className="m-3 mx-auto max-w-7xl overflow-hidden rounded-xl bg-white px-4 py-8 shadow-md dark:bg-gray-800 sm:px-6 lg:px-8">
        <div className="text-center text-gray-500">
          <p>No profile data available</p>
        </div>
      </div>
    );
  }

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-100 p-3 pb-24 dark:bg-gray-900 sm:p-6 md:pb-10">
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-xl bg-white px-4 py-6 shadow-md dark:bg-gray-800 sm:px-6 sm:py-8 lg:px-8">
        {/* Header with image and titles */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex-shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 sm:h-28 sm:w-28">
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
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <ReadOnlyField
              id="view-first-name"
              icon={faUser}
              label="First Name"
              value={profileData.first_name}
            />
            <ReadOnlyField
              id="view-phone"
              icon={faPhone}
              label="Phone Number"
              value={profileData.phone_no}
            />
            <ReadOnlyField
              id="view-middle-name"
              icon={faSignature}
              label="Middle Name"
              value={profileData.middle_name}
            />
            <ReadOnlyField
              id="view-email"
              icon={faEnvelope}
              label="Email"
              value={profileData.email}
            />
            <ReadOnlyField
              id="view-last-name"
              icon={faSignature}
              label="Last Name"
              value={profileData.last_name}
            />
            <ReadOnlyField
              id="view-aadhaar"
              icon={faIdCard}
              label="Aadhaar Number"
              value={profileData.adhaar_no}
            />
            <ReadOnlyField
              id="view-gender"
              icon={faVenusMars}
              label="Gender"
              value={profileData.gender}
            />
            <ReadOnlyField
              id="view-pan"
              icon={faIdCard}
              label="PAN Number"
              value={profileData.pan_no}
            />
            <ReadOnlyField
              id="view-qualification"
              icon={faGraduationCap}
              label="Qualification"
              value={profileData.qualification}
            />
            {profileData.date_joined && (
              <ReadOnlyField
                id="view-date-joined"
                icon={faCalendarDay}
                label="Date Joined"
                value={profileData.date_joined}
              />
            )}
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
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:max-h-[90vh] sm:rounded-xl"
          >
            {/* Dialog header */}
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
              <h2
                id="update-profile-title"
                className="textTheme text-lg font-bold sm:text-xl"
              >
                Update Teacher Profile
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Fields marked with <span className="text-red-500">*</span> are
                required.
              </p>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-8 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6">
              {submitError && (
                <div
                  role="alert"
                  className="break-words rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                >
                  {submitError}
                </div>
              )}

              {/* Profile image */}
              <section className="space-y-4">
                <SectionTitle>Profile Image</SectionTitle>

                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Choose profile photo"
                    className="group relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100 shadow-md transition-all duration-200 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700 sm:h-32 sm:w-32"
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
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
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

                  <div className="flex flex-col items-center gap-2 sm:items-start">
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-sm bgTheme text-white"
                      >
                        <FontAwesomeIcon icon={faCamera} className="mr-2" />
                        {previewSrc ? "Change Photo" : "Upload Photo"}
                      </button>
                      {previewSrc && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="btn btn-sm border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      JPG or PNG. Optional.
                    </p>
                  </div>
                </div>
              </section>

              {/* Personal information */}
              <section className="space-y-4">
                <SectionTitle>Personal Information</SectionTitle>

                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <Field
                    id="first_name"
                    label="First Name"
                    required
                    error={errors.first_name}
                  >
                    <input
                      id="first_name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Enter first name"
                      {...register("first_name", {
                        required: "First name is required",
                      })}
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    id="middle_name"
                    label="Middle Name"
                    error={errors.middle_name}
                  >
                    <input
                      id="middle_name"
                      type="text"
                      autoComplete="additional-name"
                      placeholder="Enter middle name"
                      {...register("middle_name")}
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    id="last_name"
                    label="Last Name"
                    required
                    error={errors.last_name}
                  >
                    <input
                      id="last_name"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Enter last name"
                      {...register("last_name", {
                        required: "Last name is required",
                      })}
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    id="gender"
                    label="Gender"
                    required
                    error={errors.gender}
                  >
                    <select
                      id="gender"
                      {...register("gender", {
                        required: "Gender is required",
                      })}
                      className={selectCls}
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
              </section>

              {/* Contact information */}
              <section className="space-y-4">
                <SectionTitle>Contact Information</SectionTitle>

                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <Field
                    id="email"
                    label="Email"
                    required
                    error={errors.email}
                  >
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
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

                  <Field
                    id="phone_no"
                    label="Phone Number"
                    required
                    error={errors.phone_no}
                  >
                    <input
                      id="phone_no"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10 digit phone number"
                      {...register("phone_no", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: "Enter a 10 digit phone number",
                        },
                      })}
                      // runs before react-hook-form reads the value, so the
                      // stored value always matches what the user sees
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 10);
                      }}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </section>

              {/* Professional information */}
              <section className="space-y-4">
                <SectionTitle>Professional Information</SectionTitle>

                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field
                      id="qualification"
                      label="Qualification"
                      required
                      error={errors.qualification}
                    >
                      <input
                        id="qualification"
                        type="text"
                        placeholder="e.g. M.Sc., B.Ed."
                        {...register("qualification", {
                          required: "Qualification is required",
                        })}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field
                    id="adhaar_no"
                    label="Aadhaar Number"
                    required
                    error={errors.adhaar_no}
                  >
                    <input
                      id="adhaar_no"
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="12 digit Aadhaar number"
                      {...register("adhaar_no", {
                        required: "Aadhaar number is required",
                        pattern: {
                          value: /^[0-9]{12}$/,
                          message: "Enter a 12 digit Aadhaar number",
                        },
                      })}
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 12);
                      }}
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    id="pan_no"
                    label="PAN Number"
                    required
                    error={errors.pan_no}
                  >
                    <input
                      id="pan_no"
                      type="text"
                      maxLength={10}
                      autoCapitalize="characters"
                      placeholder="e.g. ABCDE1234F"
                      {...register("pan_no", {
                        required: "PAN number is required",
                        pattern: {
                          value: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
                          message: "Enter a valid PAN (e.g. ABCDE1234F)",
                        },
                      })}
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 10);
                      }}
                      className={`${inputCls} uppercase`}
                    />
                  </Field>
                </div>
              </section>
            </div>

            {/* Footer - always visible */}
            <div className="flex flex-shrink-0 flex-col-reverse gap-3 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="btn w-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn bgTheme w-full text-white disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;