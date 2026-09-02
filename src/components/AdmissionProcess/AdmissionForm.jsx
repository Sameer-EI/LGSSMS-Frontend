import React, { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  fetchGuardianType,
  fetchSchoolYear,
  fetchYearLevels,
  fetchCountry,
  fetchState,
  fetchCity,
  fetchBankNames,
  addBankName,
  handleAdmissionForm,
} from "../../services/api/Api";
import { constants } from "../../global/constants";
import { data, useNavigate } from "react-router-dom";
import AdmissionSuccessful from "../Modals/AdmissionSuccessful";
import { AuthContext } from "../../context/AuthContext";

export const AdmissionForm = () => {
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();
  const [yearLevel, setYearLevel] = useState([]);
  const [schoolYears, setSchoolYear] = useState([]);
  const [guardianTypes, setGuardianType] = useState([]);
  const [showPassword, setShowPassword] = useState(true);
  const [showGuardianPassword, setShowGuardianPassword] = useState(true);
  const [country, setCountry] = useState([]);
  const [state, setState] = useState([]);
  const [city, setCity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedGuardianType, setSelectedGuardianType] = useState("");
  const formRef = useRef(null);
  const [showAdmissionSuccessModal, setShowAdmissionSuccessModal] =
    useState(false);
  const [isRTE, setIsRTE] = useState(false);

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState("");
  const [citySearchInput, setCitySearchInput] = useState("");

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountryName, setSelectedCountryName] = useState("");
  const [countrySearchInput, setCountrySearchInput] = useState("");

  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [selectedStateName, setSelectedStateName] = useState("");
  const [stateSearchInput, setStateSearchInput] = useState("");

  const [bankNames, setBankNames] = useState([]); // all bank names from API
  const [filteredBanks, setFilteredBanks] = useState([]); // filtered names while typing
  const [showDropdown, setShowDropdown] = useState(false); // dropdown visibility
  const bankInputRef = useRef(null); // to detect clicks outside
  const [creatingBank, setCreatingBank] = useState(false);
  const [createBankError, setCreateBankError] = useState("");
  const [bankQuery, setBankQuery] = useState(""); // visible text in input

  // Add this state near your other useState declarations
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState("");
  // Add this with your other useState declarations
  const [bulkUploadSchoolYear, setBulkUploadSchoolYear] = useState("");

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    resetField,
  } = useForm({
    mode: "onChange",
    defaultValues: {
      student: {
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        password: "",
        father_name: "",
        mother_name: "",
        date_of_birth: "",
        gender: "",
        religion: "",
        category: null,
        height: null,
        weight: null,
        blood_group: "",
        number_of_siblings: "",
        roll_number: "",
        contact_number: "",
        scholar_number: "",
        aadhaar_number: "",
        FMID_number: "",
        apaar_number: "",
        PEN_number: "",
        BPL_number: "",
        SSSMID: "",
        classes: [],
      },
      guardian: {
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        password: "",
        phone_no: "",
        annual_income: "",
        means_of_livelihood: "",
        qualification: "",
        occupation: "",
        designation: "",
      },
      address_input: {
        house_no: "",
        habitation: "",
        ward_no: "",
        zone_no: "",
        block: "",
        district: "",
        division: "",
        area_code: "",
        country: "",
        state: "",
        city: "",
        address_line: "",
      },
      banking_detail_input: {
        account_no: "",
        ifsc_code: "",
        holder_name: "",
        bank_name: "",
      },
      guardian_type_input: "",
      year_level: "",
      school_year: "",
      previous_school_name: "",
      previous_standard_studied: "",
      tc_letter: "",
      emergency_contact_no: "",
      entire_road_distance_from_home_to_school: "",
      obtain_marks: "",
      total_marks: "",
      previous_percentage: "",
      is_rte: false,
      rte_number: "",
      class_section: "",
      enrollment_no: "",
    },
  });

  const bankNameInput = watch("banking_detail_input.bank_name");
  const selectedBankId = watch("banking_detail_input.bank_name");
  const obtainMarks = watch("obtain_marks");
  const totalMarks = watch("total_marks");

  useEffect(() => {
    if (selectedBankId && bankNames.length) {
      const b = bankNames.find((x) => String(x.id) === String(selectedBankId));
      if (b) setBankQuery(b.name);
    }
  }, [selectedBankId, bankNames]);

  useEffect(() => {
    const getBankNames = async () => {
      // ... existing code
    };
    getBankNames();
  }, []);

  // NEW: Auto-calculate percentage
  useEffect(() => {
    const obtain = parseFloat(obtainMarks);
    const total = parseFloat(totalMarks);

    if (!isNaN(obtain) && !isNaN(total) && total > 0) {
      const percentage = (obtain / total) * 100;
      const rounded = Math.round(percentage * 100) / 100;
      setValue("previous_percentage", rounded, { shouldValidate: true });
    } else {
      setValue("previous_percentage", "", { shouldValidate: true });
    }
  }, [obtainMarks, totalMarks, setValue]);

  const handleShowPassword = () => setShowPassword(!showPassword);
  const handleShowGuardianPassword = () =>
    setShowGuardianPassword(!showGuardianPassword);
  const handleGuardianTypesChange = (e) => {
    setSelectedGuardianType(e.target.value);
    setValue("guardian_type_input", e.target.value);
  };

  const handleRTECheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsRTE(isChecked);
    setValue("is_rte", isChecked);

    // Clear RTE number field when unchecked
    if (!isChecked) {
      resetField("rte_number");
    }
  };

  const getYearLevels = async () => {
    try {
      const yearLevels = await fetchYearLevels();
      setYearLevel(yearLevels);
    } catch (err) {
      console.log("Failed to load year levels. Please try again.");
    }
  };

  const getSchoolYears = async () => {
    try {
      const schoolYears = await fetchSchoolYear();
      setSchoolYear(schoolYears);
    } catch (err) {
      console.log("Failed to load school years. Please try again.");
    }
  };

  const getGuardianType = async () => {
    try {
      const guardianType = await fetchGuardianType();
      setGuardianType(guardianType);
    } catch (error) {
      console.log("Failed to load guardian type. Please try again.");
    }
  };

  const getCountry = async () => {
    try {
      const countryList = await fetchCountry();
      setCountry(countryList);
    } catch (err) {
      console.log("Failed to load countries. Please try again.");
    }
  };

  const getState = async () => {
    try {
      const stateList = await fetchState();
      setState(stateList);
    } catch (err) {
      console.log("Failed to load states. Please try again.");
    }
  };

  const getCity = async () => {
    try {
      const cityList = await fetchCity();
      setCity(cityList);
    } catch (err) {
      console.log("Failed to load cities. Please try again.");
    }
  };

  useEffect(() => {
    const getBankNames = async () => {
      try {
        const res = await fetchBankNames(); // [{id, name}, ...]
        const sortedBanks = res
          .map((b) => ({ id: b.id, name: b.name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setBankNames(sortedBanks); // store objects (not strings)
        setFilteredBanks(sortedBanks);
      } catch (err) {
        console.error("Failed to fetch bank names:", err);
      }
    };

    getBankNames();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true); // loader start
        setError(null);

        await Promise.all([
          getYearLevels(),
          getSchoolYears(),
          getGuardianType(),
          getCountry(),
          getState(),
          getCity(),
        ]);
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false); // loader stop
      }
    };

    fetchAllData();
  }, []);

  // Add this handler function
  const handleBulkUploadClick = () => {
    setShowBulkUploadModal(true);
    setBulkUploadFile(null);
    setBulkUploadError("");
    setBulkUploadSuccess("");
  };

  // Add this close handler
  const handleCloseBulkUploadModal = () => {
    setShowBulkUploadModal(false);
    setBulkUploadFile(null);
    setBulkUploadSchoolYear(""); // Clear this too
    setBulkUploadError("");
    setBulkUploadSuccess("");
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      setBulkUploadError("Please select a file to upload");
      return;
    }

    if (!bulkUploadSchoolYear) {
      setBulkUploadError("Please select a school year");
      return;
    }

    setBulkUploadLoading(true);
    setBulkUploadError("");
    setBulkUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", bulkUploadFile);

      const response = await axiosInstance.post(
        `d/admission/bulk-admission/?school_year=${bulkUploadSchoolYear}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Check if there are errors in the response
      if (response.data?.errors && response.data.errors.length > 0) {
        // Format the error messages
        let errorMessages = [];

        // Group errors by sheet for better organization
        const errorsBySheet = {};
        response.data.errors.forEach((error) => {
          if (!errorsBySheet[error.sheet]) {
            errorsBySheet[error.sheet] = [];
          }
          errorsBySheet[error.sheet].push(`Row ${error.row}: ${error.reason}`);
        });

        // Build the error message
        errorMessages.push("Bulk upload completed with errors:");
        errorMessages.push(`Created: ${response.data.created || 0} records`);
        errorMessages.push("");

        // Add errors grouped by sheet
        Object.keys(errorsBySheet).forEach((sheet) => {
          errorMessages.push(`${sheet}:`);
          errorsBySheet[sheet].forEach((error) => {
            errorMessages.push(`  ${error}`);
          });
          errorMessages.push("");
        });

        // Also show a summary

        // Set the formatted error message
        setBulkUploadError(errorMessages.join("\n"));

        // Clear file but keep school year selection
        setBulkUploadFile(null);
      } else {
        // No errors - show success message
        setBulkUploadSuccess(
          response.data?.message ||
          "Bulk upload completed successfully!" +
          (response.data?.created
            ? ` Created: ${response.data.created} records`
            : "")
        );

        // Reset after successful upload
        setBulkUploadFile(null);
        setBulkUploadSchoolYear("");

        // Close modal after 2 seconds
        setTimeout(() => {
          setShowBulkUploadModal(false);
          setBulkUploadSuccess("");
          setBulkUploadError("");
        }, 2000);
      }
    } catch (error) {
      // Handle network or server errors
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "An error occurred during bulk upload";
      setBulkUploadError(`Upload failed: ${errorMessage}`);
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const submitFormData = new FormData();

    data.student.roll_number = null;
    data.student.contact_number = data.guardian.phone_no;

    Object.entries(data).forEach(([key, value]) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Handle nested objects (student, guardian, address_input, banking_detail_input)
        Object.entries(value).forEach(([subKey, subValue]) => {
          let val = subValue;

          // Convert empty or undefined to null for nested objects
          if (val === "" || val === undefined) val = null;

          // **Skip empty arrays entirely**
          if (Array.isArray(val) && val.length === 0) {
            return;
          }

          // **Handle non-empty arrays**
          if (Array.isArray(val)) {
            val.forEach((item, index) => {
              submitFormData.append(`${key}[${subKey}][${index}]`, item);
            });
            return;
          }

          // Convert numeric fields - FIXED VERSION
          if (["annual_income"].includes(subKey)) {
            if (val === "" || val === undefined || val === null) {
              val = null; // Explicitly set empty values to null
            } else {
              val = Number(val);
              if (isNaN(val)) val = null;
            }
          }

          // Append only if value is not null
          if (val !== null) {
            submitFormData.append(`${key}[${subKey}]`, val);
          }
        });
      } else {
        // Handle root-level fields (year_level, school_year, enrollment_no, etc.)
        let val = value;

        // Convert previous_percentage to number
        if (
          key === "previous_percentage" &&
          val !== null &&
          val !== "" &&
          val !== undefined
        ) {
          val = Number(val);
          if (isNaN(val)) val = null;
        }

        // **CRITICAL: Special handling for enrollment_no**
        // Always send it, even if empty (send as empty string, not null)
        if (key === "enrollment_no") {
          const enrollmentValue =
            val === null || val === undefined ? "" : String(val);
          submitFormData.append(key, enrollmentValue);
          return; // Exit early after appending
        }

        // Skip guardian_type_input if empty or null
        if (
          key === "guardian_type_input" &&
          (val === null || val === "" || val === undefined)
        ) {
          return;
        }

        // For all other root-level fields
        // Convert undefined to null, but keep empty strings for required fields
        if (val === undefined) val = null;

        // Only append non-null and non-empty-string values (except enrollment_no which was handled above)
        if (val !== null && val !== "") {
          submitFormData.append(key, val);
        }
      }
    });

    // Append files separately
    if (data.student_user_profile && data.student_user_profile[0]) {
      submitFormData.append(
        "student[profile_picture]",
        data.student_user_profile[0]
      );
    }
    if (data.guardian_user_profile && data.guardian_user_profile[0]) {
      submitFormData.append(
        "guardian[profile_picture]",
        data.guardian_user_profile[0]
      );
    }

    try {
      // Debug: Log what's being sent
      const debugPayload = {};
      for (let [key, value] of submitFormData.entries()) {
        debugPayload[key] = value;
      }

      await handleAdmissionForm(submitFormData);
      setShowAdmissionSuccessModal(true);
      reset();
      setSelectedGuardianType("");
      setIsRTE(false);
    } catch (error) {
      setAlertMessage(
        `Failed to submit the form: ${error.response?.data?.message || error.message
        }`
      );
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOnly = () => {
    setShowAdmissionSuccessModal(false);
  };

  const handleCloseAndNavigate = () => {
    setShowAdmissionSuccessModal(false);
    navigate("/addmissionDetails");
  };

  const handleBankInputChange = (e) => {
    const value = e.target.value;
    setBankQuery(value);

    if (!value.trim()) {
      setFilteredBanks(bankNames);
      setValue("banking_detail_input.bank_name", "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      setShowDropdown(true);
      return;
    }

    const filtered = bankNames.filter((b) =>
      b.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredBanks(filtered);
    setShowDropdown(true);
  };

  const handleSelectBank = (bank) => {
    setValue("banking_detail_input.bank_name", bank.id.toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setBankQuery(bank.name);
    setShowDropdown(false);
  };

  const handleCreateBank = async () => {
    const raw = (bankQuery || "").trim().replace(/\s+/g, " ");
    if (!raw) return;

    // If already exists, select it
    const existing = bankNames.find(
      (b) => b.name.toLowerCase() === raw.toLowerCase()
    );
    if (existing) {
      handleSelectBank(existing);
      return;
    }

    try {
      setCreatingBank(true);
      setCreateBankError("");

      const res = await addBankName({ name: raw }); // API you already have

      const saved = {
        id: res?.id ?? res?.data?.id,
        name: res?.name ?? res?.data?.name ?? raw,
      };
      if (!saved.id) throw new Error("New bank id not returned from API");

      const updated = [...bankNames, saved].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setBankNames(updated);
      setFilteredBanks(updated);

      setValue("banking_detail_input.bank_name", String(saved.id), {
        shouldValidate: true,
        shouldDirty: true,
      });
      setBankQuery(saved.name);
      setShowDropdown(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to add bank. Please try again.";
      setCreateBankError(msg);
    } finally {
      setCreatingBank(false);
    }
  };

  const filteredCities = city
    .filter((c) => c.name.toLowerCase().includes(citySearchInput.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredCountries = country
    .filter((c) =>
      c.name.toLowerCase().includes(countrySearchInput.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredStates = state
    .filter((s) =>
      s.name.toLowerCase().includes(stateSearchInput.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bankInputRef.current &&
        !bankInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  return (
    <div className="mb-24 md:mb-10">
      <style>{constants.hideEdgeRevealStyle}</style>
      <form
        ref={formRef}
        className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm focus:outline-none mb-10"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">
            Admission Form<i className="fa-solid fa-graduation-cap ml-2"></i>
          </h1>
          <button
            type="button"
            className="btn bgTheme text-white hover:opacity-90 transition-opacity duration-200 no-wrap"
            onClick={handleBulkUploadClick}
          >
            <i className="fa-solid fa-upload mr-2"></i>
            Bulk Upload
          </button>
        </div>

        {/* Student Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 mb-3">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-child-reaching text-sm"></i>
                  Is RTE Student?
                </span>
                <input
                  type="checkbox"
                  {...register("is_rte")}
                  onChange={handleRTECheckboxChange}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  First Name <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                {...register("student.first_name", {
                  required: "First name is required",
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                })}
                placeholder="First Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.first_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.first_name && (
                <span className="text-error text-sm">
                  {errors.student.first_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-pen text-sm"></i>
                  Middle Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.middle_name && (
                <span className="text-error text-sm">
                  {errors.student.middle_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Last Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.last_name", {
                  // required: "Last name is required",
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.last_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.last_name && (
                <span className="text-error text-sm">
                  {errors.student.last_name.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  Email <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="email"
                {...register("student.email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="student@example.com"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.email ? "input-error" : ""
                  }`}
              />
              {errors.student?.email && (
                <span className="text-error text-sm">
                  {errors.student.email.message}
                </span>
              )}
            </div>
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i>
                  Password <span className="text-error">*</span>
                </span>
              </label>
              <input
                type={showPassword ? "password" : "text"}
                {...register("student.password", {
                  required: "Password is required",
                  maxLength: {
                    value: 100,
                    message: "Password cannot exceed 100 characters",
                  },
                  pattern: {
                    value:
                      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message:
                      "Password must be 8+ chars with uppercase, lowercase, number and special character",
                  },
                })}
                placeholder="eg : Password@123"
                className={`input input-bordered w-full pr-10 focus:outline-none ${errors.student?.password ? "input-error" : ""
                  }`}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={handleShowPassword}
              >
                <i
                  className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                ></i>
              </button>
              {errors.student?.password && (
                <span className="text-error text-sm">
                  {errors.student.password.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar-days text-sm"></i>
                  Date of Birth
                </span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                {...register("student.date_of_birth", {
                  validate: (value) => {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate > today) {
                      return "Future dates are not allowed";
                    }
                    return true;
                  },
                })}
                className={`input input-bordered w-full focus:outline-none ${errors.student?.date_of_birth ? "input-error" : ""
                  }`}
              />
              {errors.student?.date_of_birth && (
                <span className="text-error text-sm">
                  {errors.student.date_of_birth.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-venus-mars text-sm"></i>
                  Gender
                </span>
              </label>
              <select
                {...register("student.gender")}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.student?.gender ? "select-error" : ""
                  }`}
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>

              {errors.student?.gender && (
                <span className="text-error text-sm">
                  {errors.student.gender.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Father's Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.father_name", {
                  maxLength: {
                    value: 100,
                    message: "Father's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Father's Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.father_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.father_name && (
                <span className="text-error text-sm">
                  {errors.student.father_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Mother's Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.mother_name", {
                  maxLength: {
                    value: 100,
                    message: "Mother's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Mother's Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.mother_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.mother_name && (
                <span className="text-error text-sm">
                  {errors.student.mother_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-hands-praying text-sm"></i>
                  Religion
                </span>
              </label>
              <input
                type="text"
                {...register("student.religion", {
                  maxLength: {
                    value: 100,
                    message: "Religion cannot exceed 100 characters",
                  },
                })}
                placeholder="Religion"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.religion ? "input-error" : ""
                  }`}
              />
              {errors.student?.religion && (
                <span className="text-error text-sm">
                  {errors.student.religion.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-tag text-sm"></i>
                  Category
                </span>
              </label>
              <select
                {...register("student.category")}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.student?.category ? "select-error" : ""
                  }`}
              >
                <option value="">Select Category</option>
                <option value="GEN">General</option>
                <option value="OBC">Other Backward Class</option>
                <option value="SC">Scheduled Caste</option>
                <option value="ST">Scheduled Tribe</option>
              </select>
              {errors.student?.category && (
                <span className="text-error text-sm">
                  {errors.student.category.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-ruler-vertical text-sm"></i>
                  Height (cm)
                </span>
              </label>
              <input
                type="number"
                {...register("student.height", {
                  min: { value: 0, message: "Height must be positive" },
                })}
                placeholder="Height"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.height ? "input-error" : ""
                  }`}
                min={0} // prevents down arrow from going negative
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault(); // prevents typing negative or 'e'
                }}
                onWheel={(e) => e.target.blur()} // prevents scroll changing value
              />
              {errors.student?.height && (
                <span className="text-error text-sm">
                  {errors.student.height.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-weight-scale text-sm"></i>
                  Weight (kg)
                </span>
              </label>
              <input
                type="number"
                {...register("student.weight", {
                  min: { value: 0, message: "Weight must be positive" },
                })}
                placeholder="Weight"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.weight ? "input-error" : ""
                  }`}
              />
              {errors.student?.weight && (
                <span className="text-error text-sm">
                  {errors.student.weight.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-heart-pulse text-sm"></i>
                  Blood Group
                </span>
              </label>
              <select
                {...register("student.blood_group")}
                className="select select-bordered w-full focus:outline-none cursor-pointer"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* New Fields Section - 9 Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Scholar No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-sm"></i>
                  Scholar No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.scholar_number", {
                  maxLength: {
                    value: 50,
                    message: "Scholar number cannot exceed 50 characters",
                  },
                })}
                placeholder="Scholar Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.scholar_number && (
                <span className="text-error text-sm">
                  {errors.student.scholar_number.message}
                </span>
              )}
            </div>

            {/* Aadhaar No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-address-card text-sm"></i>
                  Aadhaar No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.aadhaar_number", {
                  pattern: {
                    value: /^\d{12}$/,
                    message: "Aadhaar number must be 12 digits",
                  },
                  maxLength: {
                    value: 12,
                    message: "Aadhaar number cannot exceed 12 digits",
                  },
                })}
                placeholder="Aadhaar Number"
                className="input input-bordered w-full focus:outline-none"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
              />
              {errors.student?.aadhaar_number && (
                <span className="text-error text-sm">
                  {errors.student.aadhaar_number.message}
                </span>
              )}
            </div>

            {/* FMID No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-sm"></i>
                  FMID No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.FMID_number", {
                  maxLength: {
                    value: 50,
                    message: "FMID number cannot exceed 50 characters",
                  },
                })}
                placeholder="FMID Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.FMID_number && (
                <span className="text-error text-sm">
                  {errors.student.FMID_number.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Apaar ID No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-badge text-sm"></i>
                  Apaar ID No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.apaar_number", {
                  maxLength: {
                    value: 50,
                    message: "Apaar ID cannot exceed 50 characters",
                  },
                })}
                placeholder="Apaar ID Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.apaar_number && (
                <span className="text-error text-sm">
                  {errors.student.apaar_number.message}
                </span>
              )}
            </div>

            {/* PEN No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-hashtag text-sm"></i>
                  PEN No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.PEN_number", {
                  maxLength: {
                    value: 50,
                    message: "PEN number cannot exceed 50 characters",
                  },
                })}
                placeholder="PEN Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.PEN_number && (
                <span className="text-error text-sm">
                  {errors.student.PEN_number.message}
                </span>
              )}
            </div>

            {/* BPL No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card-alt text-sm"></i>
                  BPL No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.BPL_number", {
                  maxLength: {
                    value: 50,
                    message: "BPL number cannot exceed 50 characters",
                  },
                })}
                placeholder="BPL Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.BPL_number && (
                <span className="text-error text-sm">
                  {errors.student.BPL_number.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Enrollment No. */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Enrollment No.
                </span>
              </label>
              <input
                type="text"
                {...register("enrollment_no", {
                  maxLength: {
                    value: 50,
                    message: "Enrollment number cannot exceed 50 characters",
                  },
                })}
                placeholder="Enrollment Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.enrollment_no && (
                <span className="text-error text-sm">
                  {errors.enrollment_no.message}
                </span>
              )}
            </div>
            {/* SSSMID */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-server text-sm"></i>
                  SSSMID
                </span>
              </label>
              <input
                type="text"
                {...register("student.SSSMID", {
                  maxLength: {
                    value: 50,
                    message: "SSSMID cannot exceed 50 characters",
                  },
                })}
                placeholder="SSSMID"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.SSSMID && (
                <span className="text-error text-sm">
                  {errors.student.SSSMID.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-people-group text-sm"></i>
                  Number of Siblings
                </span>
              </label>
              <input
                type="number"
                {...register("student.number_of_siblings", {
                  min: {
                    value: 0,
                    message: "Number of siblings cannot be negative",
                  },
                  max: {
                    value: 10,
                    message: "Sibling cannot exceed more than 15",
                  },
                  validate: (value) => {
                    if (value < 0)
                      return "Number of siblings cannot be negative";
                    if (value > 15) return "Sibling cannot exceed more than 15";
                    return true;
                  },
                })}
                placeholder="Number of Siblings"
                onInput={(e) => {
                  const value = e.target.value;
                  // Negative and 15+ value block
                  if (value < 0) e.target.value = 0;
                  if (value > 15) e.target.value = 15;
                }}
                className={`input input-bordered w-full focus:outline-none ${errors.student?.number_of_siblings ? "input-error" : ""
                  }`}
              />
              {errors.student?.number_of_siblings && (
                <span className="text-error text-sm">
                  {errors.student.number_of_siblings.message}
                </span>
              )}
            </div>

            {/*RTE number field Render only when isRTE is true */}
            {isRTE && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <i className="fa-solid fa-id-card text-sm"></i>
                    RTE Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  {...register("rte_number", {
                    required: "RTE number is required for RTE students",
                    maxLength: {
                      value: 50,
                      message: "RTE number cannot exceed 50 characters",
                    },
                  })}
                  placeholder="RTE Number"
                  className={`input input-bordered w-full focus:outline-none ${errors.rte_number ? "input-error" : ""
                    }`}
                />
                {errors.rte_number && (
                  <span className="text-error text-sm">
                    {errors.rte_number.message}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guardian Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  First Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.first_name", {
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                })}
                placeholder="First Name"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.first_name ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.first_name && (
                <span className="text-error text-sm">
                  {errors.guardian.first_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-pen text-sm"></i>
                  Middle Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.guardian?.middle_name && (
                <span className="text-error text-sm">
                  {errors.guardian.middle_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Last Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.last_name", {
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.last_name ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.last_name && (
                <span className="text-error text-sm">
                  {errors.guardian.last_name.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  Email
                </span>
              </label>
              <input
                type="email"
                {...register("guardian.email", {
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="guardian@example.com"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.email ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.email && (
                <span className="text-error text-sm">
                  {errors.guardian.email.message}
                </span>
              )}
            </div>
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-lock text-sm"></i>
                  Password
                </span>
              </label>
              <input
                type={showGuardianPassword ? "password" : "text"}
                {...register("guardian.password", {
                  maxLength: {
                    value: 100,
                    message: "Password cannot exceed 100 characters",
                  },
                  pattern: {
                    value:
                      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message:
                      "Password must be 8+ chars with uppercase, lowercase, number and special character",
                  },
                })}
                placeholder="eg: Password@123"
                className={`input input-bordered w-full pr-10 focus:outline-none ${errors.guardian?.password ? "input-error" : ""
                  }`}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={handleShowGuardianPassword}
              >
                <i
                  className={`fa-solid ${showGuardianPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                ></i>
              </button>
              {errors.guardian?.password && (
                <span className="text-error text-sm">
                  {errors.guardian.password.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-shield text-sm"></i>
                  Guardian Type
                </span>
              </label>
              <select
                {...register("guardian_type_input", {})}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.guardian_type_input ? "select-error" : ""
                  }`}
                value={selectedGuardianType}
                onChange={handleGuardianTypesChange}
              >
                <option value="">Select Guardian Type</option>
                {guardianTypes.map((guardianTy) => (
                  <option value={guardianTy.name} key={guardianTy.id}>
                    {guardianTy.name}
                  </option>
                ))}
              </select>
              {errors.guardian_type_input && (
                <span className="text-error text-sm">
                  {errors.guardian_type_input.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-phone text-sm"></i>
                  Phone Number
                </span>
              </label>
              <input
                type="tel"
                {...register("guardian.phone_no", {
                  pattern: {
                    value: /^[6789]\d{9}$/,
                    message:
                      "Phone number must start with 6, 7, 8, or 9 and be exactly 10 digits",
                  },
                  minLength: {
                    value: 10,
                    message: "Phone number must be exactly 10 digits",
                  },
                  maxLength: {
                    value: 10,
                    message: "Phone number must be exactly 10 digits",
                  },
                  validate: (value) => {
                    if (!value) return true; // ✅ skip validation if empty
                    if (!/^[6789]/.test(value))
                      return "Phone number must start with 6, 7, 8, or 9";
                    return true;
                  },
                })}
                placeholder="Phone Number"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.phone_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  // Remove any non-digit characters
                  e.target.value = e.target.value.replace(/\D/g, "");
                  // Limit to 10 digits
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent typing of non-numeric characters except Backspace, Tab, Delete, Arrow keys
                  if (
                    !/[\d]|Backspace|Tab|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown/.test(
                      e.key
                    )
                  ) {
                    e.preventDefault();
                  }

                  // Prevent typing if first character is not 6,7,8,9 when at position 0
                  if (e.target.selectionStart === 0 && /[0-5]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  // Get pasted data
                  const pastedData = e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "");

                  // Check if pasted data starts with valid digit
                  if (!/^[6789]/.test(pastedData)) {
                    e.preventDefault();
                    // Optional: Show a temporary message
                    alert("Pasted phone number must start with 6, 7, 8, or 9");
                  }
                }}
              />
              {errors.guardian?.phone_no && (
                <span className="text-error text-sm">
                  {errors.guardian.phone_no.type === "validStart"
                    ? errors.guardian.phone_no.message
                    : errors.guardian.phone_no.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-money-bill-wave text-sm"></i>
                  Annual Income
                </span>
              </label>
              <input
                type="number"
                {...register("guardian.annual_income", {
                  min: {
                    value: 0,
                    message: "Annual income cannot be negative",
                  },
                })}
                placeholder="Annual Income"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.annual_income ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.annual_income && (
                <span className="text-error text-sm">
                  {errors.guardian.annual_income.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-sm"></i>
                  Means of Livelihood
                </span>
              </label>
              <select
                {...register("guardian.means_of_livelihood")}
                className="select select-bordered w-full focus:outline-none cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Govt">Government</option>
                <option value="Non-Govt">Non-Government</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Qualification
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.qualification", {
                  maxLength: {
                    value: 300,
                    message: "Qualification cannot exceed 300 characters",
                  },
                })}
                placeholder="Qualification"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.qualification ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.qualification && (
                <span className="text-error text-sm">
                  {errors.guardian.qualification.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-sm"></i>
                  Occupation
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.occupation", {
                  maxLength: {
                    value: 300,
                    message: "Occupation cannot exceed 300 characters",
                  },
                })}
                placeholder="Occupation"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.occupation ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.occupation && (
                <span className="text-error text-sm">
                  {errors.guardian.occupation.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-sm"></i>
                  Designation
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.designation", {
                  maxLength: {
                    value: 300,
                    message: "Designation cannot exceed 300 characters",
                  },
                })}
                placeholder="Designation"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.guardian?.designation && (
                <span className="text-error text-sm">
                  {errors.guardian.designation.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Information Section */}
        {/* Academic Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Academic Information</h2>

          {/* Row 1: Year Level & School Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Year Level <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("year_level", {
                  required: "Year level is required",
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.year_level ? "select-error" : ""
                  }`}
              >
                <option value="">Select Year Level</option>
                {yearLevel.map((yearlev) => (
                  <option value={yearlev.level_name} key={yearlev.id}>
                    {yearlev.level_name}
                  </option>
                ))}
              </select>
              {errors.year_level && (
                <span className="text-error text-sm">
                  {errors.year_level.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar text-sm"></i>
                  School Year <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("school_year", {
                  required: "School year is required",
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.school_year ? "select-error" : ""
                  }`}
              >
                <option value="">Select School Year</option>
                {schoolYears.map((schoolYear) => (
                  <option value={schoolYear.year_name} key={schoolYear.id}>
                    {schoolYear.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <span className="text-error text-sm">
                  {errors.school_year.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Class Section & Stream - NEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-chalkboard-user text-sm"></i>
                  Class Section & Stream <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("class_section", {
                  required: "Class section is required"
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.class_section ? "select-error" : ""
                  }`}
              >
                <option value="">Select Section or Stream</option>
                {/* Sections */}
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                {/* Streams */}
                <option value="PCM">PCM (Physics, Chemistry, Mathematics)</option>
                <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                <option value="COMM">COMM (Commerce)</option>
                <option value="ARTS">ARTS (Arts)</option>
              </select>
              {errors.class_section && (
                <span className="text-error text-sm">
                  {errors.class_section.message}
                </span>
              )}
            </div>

            {/* Optional: Extra field if needed */}
            <div className="form-control">
              {/* You can add another field here if needed */}
            </div>
          </div>

          {/* Row 3: Previous School & Previous Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-school text-sm"></i>
                  Previous School Name
                </span>
              </label>
              <input
                type="text"
                {...register("previous_school_name", {
                  maxLength: {
                    value: 200,
                    message: "School name cannot exceed 200 characters",
                  },
                })}
                placeholder="Previous School Name"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_school_name ? "input-error" : ""
                  }`}
              />
              {errors.previous_school_name && (
                <span className="text-error text-sm">
                  {errors.previous_school_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-book text-sm"></i>
                  Previous Class/Grade
                </span>
              </label>
              <input
                type="text"
                {...register("previous_standard_studied", {
                  maxLength: {
                    value: 200,
                    message: "Class/grade cannot exceed 200 characters",
                  },
                })}
                placeholder="Previous Class/Grade"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_standard_studied ? "input-error" : ""
                  }`}
              />
              {errors.previous_standard_studied && (
                <span className="text-error text-sm">
                  {errors.previous_standard_studied.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Admission Date & TC Letter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar-check text-sm"></i>
                  Admission Date
                </span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                {...register("admission_date", {
                  validate: (value) => {
                    if (!value) return true;
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate > today) {
                      return "Future dates are not allowed";
                    }
                    return true;
                  },
                })}
                className={`input input-bordered w-full focus:outline-none ${errors.admission_date ? "input-error" : ""
                  }`}
              />
              {errors.admission_date && (
                <span className="text-error text-sm">
                  {errors.admission_date.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-file text-sm"></i>
                  TC Letter
                </span>
              </label>
              <select
                {...register("tc_letter", {
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.tc_letter ? "select-error" : ""
                  }`}
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="not_applicable">Not Applicable</option>
                <option value="yes">Yes</option>
              </select>
              {errors.tc_letter && (
                <span className="text-error text-sm">
                  {errors.tc_letter.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 5: Emergency Contact & Distance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-phone text-sm"></i>
                  Emergency Contact
                </span>
              </label>
              <input
                type="tel"
                {...register("emergency_contact_no", {
                  pattern: {
                    value: /^[6789]\d{9}$/,
                    message: "Emergency contact must start with 6, 7, 8, or 9 and be exactly 10 digits",
                  },
                  minLength: {
                    value: 10,
                    message: "Emergency contact must be exactly 10 digits",
                  },
                  maxLength: {
                    value: 10,
                    message: "Emergency contact must be exactly 10 digits",
                  },
                })}
                placeholder="Emergency Contact"
                className={`input input-bordered w-full focus:outline-none ${errors.emergency_contact_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    !/[\d]|Backspace|Tab|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown/.test(
                      e.key
                    )
                  ) {
                    e.preventDefault();
                  }
                  if (e.target.selectionStart === 0 && /[0-5]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              {errors.emergency_contact_no && (
                <span className="text-error text-sm">
                  {errors.emergency_contact_no.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-road text-sm"></i>
                  Distance to School (km)
                </span>
              </label>
              <input
                type="number"
                {...register("entire_road_distance_from_home_to_school", {
                  min: { value: 0, message: "Distance cannot be negative" },
                  maxLength: {
                    value: 100,
                    message: "Distance cannot exceed 100 characters",
                  },
                })}
                placeholder="Distance in km"
                className={`input input-bordered w-full focus:outline-none ${errors.entire_road_distance_from_home_to_school
                  ? "input-error"
                  : ""
                  }`}
              />
              {errors.entire_road_distance_from_home_to_school && (
                <span className="text-error text-sm">
                  {errors.entire_road_distance_from_home_to_school.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 6: Marks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-marker text-sm"></i>
                  Marks Obtained
                </span>
              </label>
              <input
                type="number"
                {...register("obtain_marks", {
                  min: { value: 0, message: "Marks cannot be negative" },
                })}
                placeholder="Marks Obtained"
                className={`input input-bordered w-full focus:outline-none ${errors.obtain_marks ? "input-error" : ""
                  }`}
              />
              {errors.obtain_marks && (
                <span className="text-error text-sm">
                  {errors.obtain_marks.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-chart-simple text-sm"></i>
                  Total Marks
                </span>
              </label>
              <input
                type="number"
                {...register("total_marks", {
                  min: { value: 0, message: "Total marks cannot be negative" },
                })}
                placeholder="Total Marks"
                className={`input input-bordered w-full focus:outline-none ${errors.total_marks ? "input-error" : ""
                  }`}
              />
              {errors.total_marks && (
                <span className="text-error text-sm">
                  {errors.total_marks.message}
                </span>
              )}
            </div>

            {/* Previous Percentage Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-percent text-sm"></i>
                  Previous Percentage
                </span>
              </label>
              <input
                type="number"
                {...register("previous_percentage", {
                  min: { value: 0, message: "Percentage cannot be negative" },
                  max: { value: 100, message: "Percentage cannot exceed 100%" },
                  validate: (value) => {
                    if (value && (value < 0 || value > 100)) {
                      return "Percentage must be between 0 and 100";
                    }
                    return true;
                  },
                })}
                placeholder="Previous Percentage"
                step="0.01"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_percentage ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > 100) e.target.value = 100;
                  if (value < 0) e.target.value = 0;
                }}
              />
              {errors.previous_percentage && (
                <span className="text-error text-sm">
                  {errors.previous_percentage.message}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Residential Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* House Number - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-home text-sm"></i>
                  House Number
                </span>
              </label>
              <input
                type="number"
                {...register("address_input.house_no", {
                  validate: (value) => {
                    if (!value || value === "") return true;
                    const num = Number(value);
                    if (isNaN(num)) return "Invalid house number";
                    if (num < -2147483648 || num > 2147483647) return "Invalid house number";
                    return true;
                  }
                })}
                placeholder="House Number"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.house_no ? "input-error" : ""
                  }`}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                onWheel={(e) => e.target.blur()}
              />
              {errors.address_input?.house_no && (
                <span className="text-error text-sm">
                  {errors.address_input.house_no.message}
                </span>
              )}
            </div>

            {/* Habitation - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-location text-sm"></i>
                  Habitation
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.habitation", {
                  maxLength: {
                    value: 100,
                    message: "Habitation cannot exceed 100 characters",
                  },
                })}
                placeholder="Habitation"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.habitation ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.habitation && (
                <span className="text-error text-sm">
                  {errors.address_input.habitation.message}
                </span>
              )}
            </div>

            {/* Block - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-building text-sm"></i>
                  Block
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.block", {
                  maxLength: {
                    value: 100,
                    message: "Block cannot exceed 100 characters",
                  },
                })}
                placeholder="Block"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.block ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.block && (
                <span className="text-error text-sm">
                  {errors.address_input.block.message}
                </span>
              )}
            </div>

            {/* Ward Number - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map text-sm"></i>
                  Ward Number
                </span>
              </label>
              <input
                type="number"
                placeholder="Ward Number"
                min={0}
                className="input input-bordered w-full focus:outline-none"
                {...register("address_input.ward_no")}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                onWheel={(e) => e.target.blur()}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {/* Zone - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-pin text-sm"></i>
                  Zone
                </span>
              </label>
              <input
                type="number"
                placeholder="Zone"
                min={0}
                className="input input-bordered w-full focus:outline-none"
                {...register("address_input.zone_no")}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                onWheel={(e) => e.target.blur()}
              />
            </div>

            {/* District - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map text-sm"></i>
                  District
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.district", {
                  maxLength: {
                    value: 50,
                    message: "District cannot exceed 100 characters",
                  },
                })}
                placeholder="District"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.district ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.district && (
                <span className="text-error text-sm">
                  {errors.address_input.district.message}
                </span>
              )}
            </div>

            {/* City - OPTIONAL */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-city text-sm"></i>
                  City
                </span>
              </label>
              <div
                className={`input input-bordered w-full flex items-center justify-between cursor-pointer ${errors.address_input?.city ? "input-error" : ""
                  }`}
                onClick={() => setShowCityDropdown(!showCityDropdown)}
              >
                <span className="text-gray-700 dark:text-gray-200">
                  {selectedCityName || "Select City"}
                </span>
              </div>

              {showCityDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
                    <input
                      type="text"
                      placeholder="Search City..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={citySearchInput}
                      onChange={(e) => setCitySearchInput(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <p
                          key={city.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("address_input.city", city.id.toString(), {
                              shouldValidate: true,
                            });
                            setSelectedCityName(city.name);
                            setCitySearchInput("");
                            setShowCityDropdown(false);
                          }}
                        >
                          {city.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No cities found
                      </p>
                    )}
                  </div>
                </div>
              )}
              {errors.address_input?.city && (
                <span className="text-error text-sm">
                  {errors.address_input.city.message}
                </span>
              )}
            </div>

            {/* Division - OPTIONAL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-signs text-sm"></i>
                  Division
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.division", {
                  maxLength: {
                    value: 20,
                    message: "Division cannot exceed 20 characters",
                  },
                })}
                placeholder="Division"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.division ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.division && (
                <span className="text-error text-sm">
                  {errors.address_input.division.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 items-start">
            {/* State - OPTIONAL */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-flag text-sm"></i> State
                </span>
              </label>
              <div
                className={`input input-bordered w-full flex items-center cursor-pointer py-2`}
                onClick={() => setShowStateDropdown(!showStateDropdown)}
              >
                <span className="text-gray-700 dark:text-gray-200">
                  {selectedStateName || "Select State"}
                </span>
              </div>

              {showStateDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
                    <input
                      type="text"
                      placeholder="Search State..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 py-1"
                      value={stateSearchInput}
                      onChange={(e) => setStateSearchInput(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredStates.length > 0 ? (
                      filteredStates.map((state) => (
                        <p
                          key={state.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("address_input.state", state.id.toString(), {
                              shouldValidate: true,
                            });
                            setSelectedStateName(state.name);
                            setStateSearchInput("");
                            setShowStateDropdown(false);
                          }}
                        >
                          {state.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No states found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Country - OPTIONAL */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-globe text-sm"></i> Country
                </span>
              </label>
              <div
                className={`input input-bordered w-full flex items-center cursor-pointer py-2`}
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              >
                <span className="text-gray-700 dark:text-gray-200">
                  {selectedCountryName || "Select Country"}
                </span>
              </div>

              {showCountryDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
                    <input
                      type="text"
                      placeholder="Search Country..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 py-1"
                      value={countrySearchInput}
                      onChange={(e) => setCountrySearchInput(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country) => (
                        <p
                          key={country.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("address_input.country", country.id.toString(), {
                              shouldValidate: true,
                            });
                            setSelectedCountryName(country.name);
                            setCountrySearchInput("");
                            setShowCountryDropdown(false);
                          }}
                        >
                          {country.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No countries found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pin Code - OPTIONAL with conditional validation */}
            <div className="form-control flex flex-col justify-start relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-mailbox text-sm"></i> Pin Code
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.area_code", {
                  validate: (value) => {
                    // Allow empty value
                    if (!value || value === "") return true;
                    // If filled, validate pattern
                    return /^[1-9][0-9]{5}$/.test(value) || "Enter a valid 6-digit Indian Pincode";
                  }
                })}
                placeholder="Pin Code"
                className={`input input-bordered w-full focus:outline-none py-2 ${errors.address_input?.area_code ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.area_code && (
                <span className="text-error text-sm mt-1">
                  {errors.address_input.area_code.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-sm"></i>
                  Full Address Line
                </span>
              </label>
              <textarea
                maxLength={250}
                {...register("address_input.address_line", {
                  maxLength: {
                    value: 250,
                    message: "Address line cannot exceed 250 characters",
                  },
                })}
                placeholder="Full Address"
                className={`textarea textarea-bordered w-full focus:outline-none ${errors.address_input?.address_line ? "textarea-error" : ""
                  }`}
              ></textarea>
              {errors.address_input?.address_line && (
                <span className="text-error text-sm">
                  {errors.address_input.address_line.message}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Bank Details Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Bank Account Details</h2>

          {/* Row 1: Account Holder Name & Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Holder Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Account Holder Name
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.holder_name", {
                  maxLength: {
                    value: 50,
                    message: "Holder name cannot exceed 50 characters",
                  },
                  validate: (value) => {
                    if (!value) return true; // allow empty
                    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(value))
                      return "Enter a valid name (alphabets & single spaces only)";
                    return true;
                  },
                })}
                placeholder="Full Name as in Bank"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.holder_name ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .replace(/[^A-Za-z\s]/g, "")
                    .replace(/\s+/g, " ")
                    .replace(/^\s+/g, "");
                }}
              />
              {errors.banking_detail_input?.holder_name && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.holder_name.message}
                </span>
              )}
            </div>

            {/* Bank Name */}
            <div className="form-control relative" ref={bankInputRef}>
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-university text-sm"></i>
                  Bank Name
                </span>
              </label>

              <input
                type="hidden"
                {...register("banking_detail_input.bank_name", {
                  validate: (v) => true, // allow empty
                  pattern: {
                    value: /^\d+$/,
                    message: "Invalid bank selection",
                  },
                })}
              />

              <input
                type="text"
                value={bankQuery}
                placeholder="Bank Name"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.bank_name ? "input-error" : ""
                  }`}
                onChange={handleBankInputChange}
                onFocus={() => {
                  setFilteredBanks(bankNames);
                  setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const raw = (bankQuery || "").trim();
                    if (!raw) return;

                    const matched = bankNames.find(
                      (b) => b.name.toLowerCase() === raw.toLowerCase()
                    );
                    matched ? handleSelectBank(matched) : handleCreateBank();
                  }
                  if (e.key === "Escape") setShowDropdown(false);
                }}
              />

              {errors.banking_detail_input?.bank_name && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.bank_name.message}
                </span>
              )}

              {showDropdown && (
                <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto dark:bg-[#242627] dark:border-gray-600">
                  {filteredBanks.length > 0 ? (
                    filteredBanks.map((b) => (
                      <li
                        key={b.id}
                        className="px-3 py-2 hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-600 dark:text-gray-100"
                        onClick={() => handleSelectBank(b)}
                      >
                        {b.name}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      No matches found
                    </li>
                  )}
                  {bankQuery?.trim() &&
                    !bankNames.some(
                      (b) =>
                        b.name.toLowerCase() === bankQuery.trim().toLowerCase()
                    ) && (
                      <li
                        className="px-3 py-2 bg-green-50 hover:bg-green-100 cursor-pointer flex items-center gap-2 border-t dark:bg-green-900 dark:hover:bg-green-800 dark:text-gray-100"
                        onClick={handleCreateBank}
                      >
                        {creatingBank ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-plus"></i>
                        )}
                        Add "{bankQuery.trim()}" as new bank
                      </li>
                    )}
                </ul>
              )}

              {!!createBankError && (
                <span className="text-error text-sm mt-1">
                  {createBankError}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Account Number & IFSC Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Account Number */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Account Number
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.account_no", {
                  pattern: {
                    value: /^[0-9]{9,18}$/,
                    message: "Account number must be 9 to 18 digits",
                  },
                })}
                placeholder="Account Number"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.account_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
              />
              {errors.banking_detail_input?.account_no && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.account_no.message}
                </span>
              )}
            </div>

            {/* IFSC Code */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-code text-sm"></i>
                  IFSC Code
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.ifsc_code", {
                  pattern: {
                    value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                    message: "Invalid IFSC code format",
                  },
                })}
                placeholder=" eg: SBIN0001234 or BARB0BHOPAL"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.ifsc_code ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "");
                }}
                maxLength={11}
              />
              {errors.banking_detail_input?.ifsc_code && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.ifsc_code.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-10">
          <button type="submit" className="btn bgTheme text-white w-40">
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-paper-plane mr-2"></i>
            )}
            {loading ? "" : "Register"}
          </button>
        </div>
      </form>
      {showAdmissionSuccessModal && (
        <AdmissionSuccessful
          handleCloseOnly={handleCloseOnly}
          handleCloseAndNavigate={handleCloseAndNavigate}
        />
      )}
      {/* Modal */}
      {showAlert && (
        <dialog open className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Admission Form</h3>
            <p className="py-4">{alertMessage}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
                onClick={() => setShowAlert(false)}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">Bulk Upload Admission Data</h3>
              <button
                onClick={handleCloseBulkUploadModal}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-2">
              {/* Error/Success Messages */}
              {bulkUploadError && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-circle-exclamation text-red-600 dark:text-red-400 text-lg mt-0.5"></i>
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                        Bulk Upload Completed with Errors
                      </p>
                      <div className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line font-mono bg-red-50 dark:bg-red-900/30 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                        {bulkUploadError}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bulkUploadSuccess && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-circle-check text-green-600 dark:text-green-400 text-lg mt-0.5"></i>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        {bulkUploadSuccess}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-6">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="bulk-upload-file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setBulkUploadError(
                            "File size must be less than 10MB"
                          );
                          return;
                        }

                        const validTypes = [
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          "application/vnd.ms-excel",
                          "text/csv",
                        ];

                        if (
                          !validTypes.includes(file.type) &&
                          !file.name.match(/\.(xlsx|xls)$/i)
                        ) {
                          setBulkUploadError("Please upload Excel");
                          return;
                        }

                        setBulkUploadFile(file);
                        setBulkUploadError("");
                      }
                    }}
                  />

                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-gray-500">
                      Upload Excel or CSV file (Max 10MB)
                    </p>
                    <label htmlFor="bulk-upload-file" className="btn btn-sm">
                      Choose File
                    </label>
                  </div>

                  {bulkUploadFile && (
                    <div className="mt-4 p-4 bg-base-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{bulkUploadFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(bulkUploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        onClick={() => setBulkUploadFile(null)}
                        className="btn btn-sm btn-ghost text-error"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* School Year Section - FIXED */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <i className="fa-solid fa-calendar text-sm"></i>
                      School Year <span className="text-error">*</span>
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full focus:outline-none cursor-pointer"
                    value={bulkUploadSchoolYear}
                    onChange={(e) => setBulkUploadSchoolYear(e.target.value)}
                  >
                    <option value="">Select School Year</option>
                    {schoolYears.map((schoolYear) => (
                      <option value={schoolYear.year_name} key={schoolYear.id}>
                        {schoolYear.year_name}
                      </option>
                    ))}
                  </select>

                  {!bulkUploadSchoolYear && bulkUploadFile && (
                    <span className="text-error text-sm mt-1">
                      School year is required for bulk upload
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Info */}
              {bulkUploadFile && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-eye"></i>
                    Upload Preview
                  </h4>
                  <p className="text-sm">
                    File ready for upload:{" "}
                    <strong>{bulkUploadFile.name}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Click "Upload & Process" to begin bulk admission
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCloseBulkUploadModal}
                  disabled={bulkUploadLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn bgTheme text-white gap-2"
                  disabled={
                    !bulkUploadFile ||
                    !bulkUploadSchoolYear ||
                    bulkUploadLoading
                  }
                  onClick={handleBulkUpload}
                >
                  {bulkUploadLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload"></i>
                      Upload & Process
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
