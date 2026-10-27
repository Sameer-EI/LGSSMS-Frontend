import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useNavigate } from "react-router-dom";
import AdmissionSuccessful from "../Modals/AdmissionSuccessful";
import { AuthContext } from "../../context/AuthContext";

// ---- Bulk admission (async job) settings ----
const BULK_START_URL = "d/admission/bulk-admission/";
const BULK_STATUS_URL = "d/admission/bulk-admission-status/";
const POLL_INTERVAL_MS = 1500; // poll every 1-2 seconds
const MAX_POLL_FAILURES = 5; // consecutive network failures tolerated while polling
const MAX_POLL_DURATION_MS = 15 * 60 * 1000; // stop waiting after 15 minutes

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Password rule ----
// At least 8 characters, no spaces, with an uppercase letter, a lowercase
// letter, a digit and ANY special character (_ - @ $ ! % * ? & # . etc.).
const PASSWORD_REGEX =
  /^(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^A-Za-z\d\s])\S{8,}$/;
const PASSWORD_MESSAGE =
  "Password must be 8+ chars with uppercase, lowercase, number and special character";

// ---- Responsive layout helpers ----
// 1 column on phones, 2 on small tablets, 3-4 on desktops.
const GRID_2 = "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6";
const GRID_3 =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";
const GRID_4 =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6";
const ROW = "mt-4 sm:mt-6";
const SECTION = "bg-base-200 p-4 sm:p-6 rounded-box mb-6";
const SECTION_TITLE = "text-xl sm:text-2xl font-bold mb-4";

const inputCls = (err) =>
  `input input-bordered w-full min-w-0 focus:outline-none ${
    err ? "input-error" : ""
  }`;
const selectCls = (err) =>
  `select select-bordered w-full min-w-0 focus:outline-none cursor-pointer ${
    err ? "select-error" : ""
  }`;
const pickerCls = (err) =>
  `input input-bordered w-full min-w-0 flex items-center justify-between cursor-pointer overflow-hidden ${
    err ? "input-error" : ""
  }`;

// Shared dropdown panel classes (city / state / country)
const panelCls =
  "absolute left-0 top-full z-20 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600";
const panelSearchCls =
  "input input-bordered w-full min-w-0 focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500";
const optionCls =
  "p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize break-words";

const byName = (a, b) => a.name.localeCompare(b.name);

// ---- Shared input handlers ----
const blockNegativeKeys = (e) => {
  if (e.key === "-" || e.key === "e") e.preventDefault();
};
const blurOnWheel = (e) => e.target.blur();

// Phone fields: digits only, max 10, first digit 6-9.
// Only printable single characters are blocked, so mobile soft keyboards
// (which can report keys like "Unidentified") are never blocked by mistake.
const handlePhoneInput = (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
};
const handlePhoneKeyDown = (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key && e.key.length === 1) {
    if (!/\d/.test(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.target.selectionStart === 0 && /[0-5]/.test(e.key)) {
      e.preventDefault();
    }
  }
};

// ---- Turning server errors into readable messages ----
// The backend (DRF) answers a bad request with something like
//   { address_input: { country: ["This field is required."] },
//     previous_standard_studied: ["Ensure this field has no more than 15 characters."] }
// applyServerErrors() (inside the component) pushes those messages onto the
// matching inputs; formatSubmitErrors() builds the summary banner.
const GENERAL_KEYS = ["message", "detail", "error", "status", "success", "code"];

const GROUP_LABELS = {
  student: "Student",
  guardian: "Guardian",
  address_input: "Address",
  banking_detail_input: "Bank",
};

const FIELD_LABELS = {
  first_name: "First Name",
  middle_name: "Middle Name",
  last_name: "Last Name",
  email: "Email",
  password: "Password",
  father_name: "Father's Name",
  mother_name: "Mother's Name",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  religion: "Religion",
  category: "Category",
  height: "Height",
  weight: "Weight",
  blood_group: "Blood Group",
  number_of_siblings: "Number of Siblings",
  scholar_number: "Scholar No.",
  aadhaar_number: "Aadhaar No.",
  FMID_number: "FMID No.",
  apaar_number: "Apaar ID No.",
  PEN_number: "PEN No.",
  BPL_number: "BPL No.",
  SSSMID: "SSSMID",
  contact_number: "Contact Number",
  roll_number: "Roll Number",
  profile_picture: "Profile Picture",
  phone_no: "Phone Number",
  annual_income: "Annual Income",
  means_of_livelihood: "Means of Livelihood",
  qualification: "Qualification",
  occupation: "Occupation",
  designation: "Designation",
  house_no: "House Number",
  habitation: "Habitation",
  ward_no: "Ward Number",
  zone_no: "Zone",
  block: "Block",
  district: "District",
  division: "Division",
  area_code: "Pin Code",
  country: "Country",
  state: "State",
  city: "City",
  address_line: "Full Address Line",
  account_no: "Account Number",
  ifsc_code: "IFSC Code",
  holder_name: "Account Holder Name",
  bank_name: "Bank Name",
  guardian_type_input: "Guardian Type",
  year_level: "Year Level",
  school_year: "School Year",
  class_section: "Class Section & Stream",
  enrollment_no: "Enrollment No.",
  previous_school_name: "Previous School Name",
  previous_standard_studied: "Previous Class/Grade",
  admission_date: "Admission Date",
  tc_letter: "TC Letter",
  emergency_contact_no: "Emergency Contact",
  entire_road_distance_from_home_to_school: "Distance to School",
  obtain_marks: "Marks Obtained",
  total_marks: "Total Marks",
  previous_percentage: "Previous Percentage",
  is_rte: "RTE Student",
  rte_number: "RTE Number",
  non_field_errors: "",
};

const humanizeKey = (key) =>
  String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const labelForPath = (path) => {
  const keys = path.filter((p) => !/^\d+$/.test(String(p)));
  if (keys.length === 0) return "";
  const last = keys[keys.length - 1];
  const lastLabel = Object.prototype.hasOwnProperty.call(FIELD_LABELS, last)
    ? FIELD_LABELS[last]
    : humanizeKey(last);
  if (keys.length > 1 && GROUP_LABELS[keys[0]]) {
    return lastLabel ? `${GROUP_LABELS[keys[0]]} – ${lastLabel}` : "";
  }
  return lastLabel;
};

const collectErrors = (node, path, out) => {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    out.push({ path, message: node });
    return;
  }
  if (Array.isArray(node)) {
    if (node.every((n) => typeof n === "string")) {
      if (node.length) out.push({ path, message: node.join(" ") });
      return;
    }
    node.forEach((item, i) => collectErrors(item, [...path, i], out));
    return;
  }
  if (typeof node === "object") {
    Object.entries(node).forEach(([k, v]) =>
      collectErrors(v, [...path, k], out)
    );
    return;
  }
  out.push({ path, message: String(node) });
};

const errorToLine = ({ path, message }) => {
  const label = labelForPath(path);
  const msg = String(message).trim();
  if (!label) return msg;
  if (/may not be (null|blank)|field is required|^required$/i.test(msg)) {
    return `${label} is required.`;
  }
  if (/^this field/i.test(msg)) {
    return `${label} ${msg.replace(/^this field\s*/i, "")}`;
  }
  return `${label}: ${msg}`;
};

const statusFallback = (err) => {
  const status = err?.response?.status;
  if (status === 400)
    return "Some information is missing or invalid. Please review the form and try again.";
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to submit this form.";
  if (status === 404) return "The admission service could not be found.";
  if (status === 409) return "This student or guardian already exists.";
  if (status === 413) return "The uploaded file is too large.";
  if (status >= 500)
    return "The server ran into a problem. Please try again later.";
  const msg = err?.message;
  if (msg && !/status code \d+/i.test(msg)) return msg;
  return "Something went wrong while submitting the form. Please try again.";
};

// Returns { title, lines } - lines is a list of plain-text messages
const formatSubmitErrors = (err) => {
  if (err && err.request && !err.response) {
    return {
      title: "Connection problem",
      lines: [
        "Unable to reach the server. Please check your internet connection and try again.",
      ],
    };
  }

  const raw =
    err?.response?.data ??
    (err && typeof err === "object" && !(err instanceof Error)
      ? err
      : undefined);

  const lines = [];

  if (raw && typeof raw === "object") {
    const source =
      raw.errors && typeof raw.errors === "object" ? raw.errors : raw;

    const collected = [];
    if (source === raw) {
      Object.entries(raw)
        .filter(([k]) => !GENERAL_KEYS.includes(k))
        .forEach(([k, v]) => collectErrors(v, [k], collected));
    } else {
      collectErrors(source, [], collected);
    }
    collected.forEach((item) => lines.push(errorToLine(item)));

    if (lines.length === 0) {
      ["message", "detail", "error"].forEach((k) => {
        if (typeof raw[k] === "string" && raw[k].trim())
          lines.push(raw[k].trim());
      });
    }
  } else if (typeof raw === "string") {
    const text = raw.trim();
    if (text && text.length < 300 && !text.startsWith("<")) lines.push(text);
  }

  const unique = [...new Set(lines.filter(Boolean))];
  if (unique.length === 0) unique.push(statusFallback(err));

  return {
    title:
      unique.length > 1
        ? `Please fix the following (${unique.length})`
        : "Could not submit the form",
    lines: unique,
  };
};

// Label + control + error message.
// When `error` is set the wrapper gets data-invalid (used for scroll-to-error)
// and every input/select/textarea inside gets a red border.
const Field = ({ icon, label, required, error, className = "", children }) => (
  <div
    data-invalid={error ? "true" : undefined}
    className={`form-control min-w-0 ${className} ${
      error
        ? "[&_input]:border-error [&_select]:border-error [&_textarea]:border-error"
        : ""
    }`}
  >
    <label className="label">
      <span className="label-text flex items-center gap-2">
        <i className={`fa-solid ${icon} text-sm`}></i>
        {label} {required && <span className="text-error">*</span>}
      </span>
    </label>
    {children}
    {error && (
      <span role="alert" className="text-error text-sm mt-1">
        {error.message}
      </span>
    )}
  </div>
);

// Reusable searchable dropdown (City / State / Country).
// A hidden registered input holds the id, so react-hook-form validates it and
// server errors can be attached to it like any other field.
const SearchSelect = ({
  icon,
  label,
  required,
  error,
  options,
  value,
  onSelect,
  registration,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = options.find((o) => String(o.id) === String(value));
  const q = query.trim().toLowerCase();
  const visible = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options;

  const pick = (o) => {
    onSelect(String(o.id));
    setQuery("");
    setOpen(false);
  };

  return (
    <Field
      icon={icon}
      label={label}
      required={required}
      error={error}
      className="relative"
    >
      <div
        ref={wrapRef}
        className="relative"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        <input type="hidden" {...registration} />

        <button
          type="button"
          className={`${pickerCls(error)} text-left`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={`truncate ${
              selected ? "text-gray-700 dark:text-gray-200" : "text-gray-400"
            }`}
          >
            {selected ? selected.name : placeholder}
          </span>
          <i className="fa-solid fa-chevron-down text-xs ml-2"></i>
        </button>

        {open && (
          <div className={panelCls}>
            <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
              <input
                type="text"
                autoFocus
                placeholder={`Search ${label}...`}
                className={panelSearchCls}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto" role="listbox">
              {visible.length > 0 ? (
                visible.map((o) => (
                  <p
                    key={o.id}
                    role="option"
                    aria-selected={String(o.id) === String(value)}
                    className={optionCls}
                    onClick={() => pick(o)}
                  >
                    {o.name}
                  </p>
                ))
              ) : (
                <p className="p-2 text-gray-500 dark:text-gray-400">
                  No results found
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
};

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
  const [loading, setLoading] = useState(false); // initial data load only
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false); // form submit in progress
  const [submitError, setSubmitError] = useState(null); // { title, lines }
  const [selectedGuardianType, setSelectedGuardianType] = useState("");
  const formRef = useRef(null);
  const bannerRef = useRef(null);
  const [showAdmissionSuccessModal, setShowAdmissionSuccessModal] =
    useState(false);
  const [isRTE, setIsRTE] = useState(false);

  const [bankNames, setBankNames] = useState([]); // all bank names from API
  const [filteredBanks, setFilteredBanks] = useState([]); // filtered names while typing
  const [showDropdown, setShowDropdown] = useState(false); // dropdown visibility
  const bankInputRef = useRef(null); // to detect clicks outside
  const [creatingBank, setCreatingBank] = useState(false);
  const [createBankError, setCreateBankError] = useState("");
  const [bankQuery, setBankQuery] = useState(""); // visible text in input

  // ---- Bulk upload states ----
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState("");
  const [bulkUploadSchoolYear, setBulkUploadSchoolYear] = useState("");
  // { processed, total, stage: "uploading" | "processing" }
  const [bulkUploadProgress, setBulkUploadProgress] = useState(null);
  // { created, failed, total, errors: [{sheet,row,reason}] }
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  // Incremented to cancel an in-flight polling loop (modal closed / unmounted / new upload)
  const bulkRunRef = useRef(0);
  const bulkCloseTimerRef = useRef(null);
  // Modal can be minimised to a small floating card while the job keeps running
  const [bulkMinimized, setBulkMinimized] = useState(false);
  const bulkMinimizedRef = useRef(false);

  const {
    register,
    watch,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
    setValue,
    reset,
    resetField,
  } = useForm({
    mode: "onChange",
    shouldFocusError: false, // we scroll/focus ourselves (hidden inputs cannot be focused)
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
      admission_date: "",
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

  const selectedBankId = watch("banking_detail_input.bank_name");
  const obtainMarks = watch("obtain_marks");
  const totalMarks = watch("total_marks");

  // Sorted lists for the searchable dropdowns (sorted once, not on every render)
  const sortedCities = useMemo(() => [...city].sort(byName), [city]);
  const sortedStates = useMemo(() => [...state].sort(byName), [state]);
  const sortedCountries = useMemo(() => [...country].sort(byName), [country]);

  useEffect(() => {
    if (selectedBankId && bankNames.length) {
      const b = bankNames.find((x) => String(x.id) === String(selectedBankId));
      if (b) setBankQuery(b.name);
    }
  }, [selectedBankId, bankNames]);

  useEffect(() => {
    bulkMinimizedRef.current = bulkMinimized;
  }, [bulkMinimized]);

  // Stop polling + timers when the component unmounts
  useEffect(() => {
    return () => {
      bulkRunRef.current += 1;
      if (bulkCloseTimerRef.current) clearTimeout(bulkCloseTimerRef.current);
    };
  }, []);

  // Auto-calculate percentage
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

  // --------------------------------------------------------------
  // BULK UPLOAD (start job -> poll status until done / failed)
  // --------------------------------------------------------------
  const clearBulkCloseTimer = () => {
    if (bulkCloseTimerRef.current) {
      clearTimeout(bulkCloseTimerRef.current);
      bulkCloseTimerRef.current = null;
    }
  };

  const resetBulkState = () => {
    setBulkMinimized(false);
    setBulkUploadFile(null);
    setBulkUploadSchoolYear("");
    setBulkUploadError("");
    setBulkUploadSuccess("");
    setBulkUploadProgress(null);
    setBulkUploadResult(null);
    setBulkUploadLoading(false);
  };

  const handleBulkUploadClick = () => {
    // A job is already open (maybe minimised): bring it back, do not cancel it
    if (showBulkUploadModal) {
      setBulkMinimized(false);
      return;
    }
    bulkRunRef.current += 1; // cancel anything still running
    clearBulkCloseTimer();
    resetBulkState();
    setShowBulkUploadModal(true);
  };

  const handleCloseBulkUploadModal = () => {
    // Cancels the polling loop (the job itself keeps running on the server)
    bulkRunRef.current += 1;
    clearBulkCloseTimer();
    setShowBulkUploadModal(false);
    resetBulkState();
  };

  const getBulkErrorMessage = (err) => {
    const d = err?.response?.data;
    if (typeof d === "string" && d.trim() && d.length < 300) return d;
    return (
      d?.message ||
      d?.detail ||
      d?.error ||
      err?.message ||
      "An error occurred during bulk upload"
    );
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

    const runId = ++bulkRunRef.current;
    clearBulkCloseTimer();

    setBulkUploadLoading(true);
    setBulkUploadError("");
    setBulkUploadSuccess("");
    setBulkUploadResult(null);
    setBulkUploadProgress({ processed: 0, total: 0, stage: "uploading" });

    try {
      // 1) Start the job
      const formData = new FormData();
      formData.append("file", bulkUploadFile);

      const startRes = await axiosInstance.post(BULK_START_URL, formData, {
        params: { school_year: bulkUploadSchoolYear },
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (runId !== bulkRunRef.current) return; // cancelled

      const jobId = startRes.data?.job_id;
      if (!jobId) {
        throw new Error(
          startRes.data?.message || "Server did not return a job id"
        );
      }

      setBulkUploadProgress({ processed: 0, total: 0, stage: "processing" });

      // 2) Poll the status endpoint every POLL_INTERVAL_MS
      const startedAt = Date.now();
      let consecutiveFailures = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await sleep(POLL_INTERVAL_MS);
        if (runId !== bulkRunRef.current) return; // cancelled while waiting

        let statusData;
        try {
          const res = await axiosInstance.get(BULK_STATUS_URL, {
            params: { job_id: jobId },
          });
          statusData = res.data || {};
          consecutiveFailures = 0;
        } catch (pollErr) {
          consecutiveFailures += 1;
          if (consecutiveFailures >= MAX_POLL_FAILURES) throw pollErr;
          continue; // transient network error -> try again
        }

        if (runId !== bulkRunRef.current) return;

        setBulkUploadProgress({
          processed: statusData.processed_rows ?? 0,
          total: statusData.total_rows ?? 0,
          stage: "processing",
        });

        const jobStatus = String(statusData.status || "").toLowerCase();

        // ---- DONE ----
        if (jobStatus === "done") {
          const errorList = Array.isArray(statusData.errors)
            ? statusData.errors
            : [];
          const created = statusData.created ?? 0;
          const failed = statusData.failed ?? errorList.length;

          setBulkUploadResult({
            created,
            failed,
            total: statusData.total_rows ?? created + failed,
            errors: errorList,
          });
          setBulkUploadFile(null);

          if (failed === 0 && errorList.length === 0) {
            setBulkUploadSchoolYear("");
            setBulkUploadSuccess(
              `Bulk admission completed successfully! ${created} student${
                created === 1 ? "" : "s"
              } created.`
            );
            // Auto close after success
            // (skipped while minimised so the floating card can show the result)
            if (!bulkMinimizedRef.current) {
              bulkCloseTimerRef.current = setTimeout(() => {
                if (bulkMinimizedRef.current) return;
                setShowBulkUploadModal(false);
                resetBulkState();
              }, 3000);
            }
          }
          return;
        }

        // ---- FAILED ----
        if (jobStatus === "failed") {
          const errorList = Array.isArray(statusData.errors)
            ? statusData.errors
            : [];
          if (errorList.length > 0) {
            setBulkUploadResult({
              created: statusData.created ?? 0,
              failed: statusData.failed ?? errorList.length,
              total: statusData.total_rows ?? 0,
              errors: errorList,
            });
          }
          setBulkUploadFile(null);
          setBulkUploadError(
            statusData.error ||
              statusData.detail ||
              statusData.message ||
              "Bulk admission failed. Please check your file and try again."
          );
          return;
        }

        // ---- still pending / processing -> keep polling (with a safety timeout) ----
        if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
          throw new Error(
            "Bulk admission is taking longer than expected. It may still be running - please check the admission list later."
          );
        }
      }
    } catch (err) {
      if (runId !== bulkRunRef.current) return;
      setBulkUploadError(`Upload failed: ${getBulkErrorMessage(err)}`);
    } finally {
      if (runId === bulkRunRef.current) {
        setBulkUploadLoading(false);
        setBulkUploadProgress(null);
      }
    }
  };

  // errors grouped by sheet for display
  const bulkErrorsBySheet = (bulkUploadResult?.errors || []).reduce(
    (acc, item) => {
      const sheet = item.sheet || "Sheet";
      if (!acc[sheet]) acc[sheet] = [];
      acc[sheet].push(item);
      return acc;
    },
    {}
  );

  const bulkPercent =
    bulkUploadProgress && bulkUploadProgress.total > 0
      ? Math.min(
          100,
          Math.round(
            (bulkUploadProgress.processed / bulkUploadProgress.total) * 100
          )
        )
      : 0;

  // --------------------------------------------------------------
  // SUBMIT + SERVER VALIDATION
  // --------------------------------------------------------------

  // Push DRF field errors onto the matching react-hook-form inputs, e.g.
  // { address_input: { country: ["This field is required."] } }
  //   -> setError("address_input.country", ...)
  const applyServerErrors = (err) => {
    const data = err?.response?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return;

    const source =
      data.errors && typeof data.errors === "object" ? data.errors : data;

    const collected = [];
    Object.entries(source)
      .filter(([k]) => !GENERAL_KEYS.includes(k) && k !== "non_field_errors")
      .forEach(([k, v]) => collectErrors(v, [k], collected));

    collected.forEach(({ path, message }) => {
      const name = path.join(".");
      if (name) {
        setFieldError(name, { type: "server", message: String(message) });
      }
    });
  };

  // Scroll to (and focus) the first invalid field, or to the banner when the
  // problem is not tied to a field (network error, 500, ...).
  const scrollToFirstError = () => {
    setTimeout(() => {
      const wrap = formRef.current?.querySelector("[data-invalid]");
      if (!wrap) {
        bannerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      wrap.scrollIntoView({ behavior: "smooth", block: "center" });
      wrap
        .querySelector("input:not([type=hidden]), select, textarea, button")
        ?.focus({ preventScroll: true });
    }, 50);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setSubmitError(null);
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

          // Skip empty arrays entirely
          if (Array.isArray(val) && val.length === 0) {
            return;
          }

          // Handle non-empty arrays
          if (Array.isArray(val)) {
            val.forEach((item, index) => {
              submitFormData.append(`${key}[${subKey}][${index}]`, item);
            });
            return;
          }

          // Convert numeric fields
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

        // enrollment_no is always sent, even when empty (empty string, not null)
        if (key === "enrollment_no") {
          const enrollmentValue =
            val === null || val === undefined ? "" : String(val);
          submitFormData.append(key, enrollmentValue);
          return;
        }

        // Skip guardian_type_input if empty or null
        if (
          key === "guardian_type_input" &&
          (val === null || val === "" || val === undefined)
        ) {
          return;
        }

        // Convert undefined to null; append only non-null, non-empty values
        if (val === undefined) val = null;
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
      await handleAdmissionForm(submitFormData);
      setShowAdmissionSuccessModal(true);
      reset();
      setSelectedGuardianType("");
      setIsRTE(false);
      setBankQuery("");
    } catch (err) {
      applyServerErrors(err); // red border + message under each input
      setSubmitError(formatSubmitErrors(err)); // summary banner (also covers network / 500)
      scrollToFirstError();
    } finally {
      setSubmitting(false);
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

      const res = await addBankName({ name: raw });

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
    <div className="mb-24 md:mb-10 px-2 sm:px-4 overflow-x-hidden">
      <style>{constants.hideEdgeRevealStyle}</style>
      <form
        ref={formRef}
        noValidate
        className="w-full max-w-7xl mx-auto p-3 sm:p-6 bg-base-100 rounded-box my-3 sm:my-5 shadow-sm focus:outline-none mb-10"
        onSubmit={handleSubmit(onSubmit, scrollToFirstError)}
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Admission Form<i className="fa-solid fa-graduation-cap ml-2"></i>
          </h1>
          <button
            type="button"
            className="btn bgTheme text-white hover:opacity-90 transition-opacity duration-200 whitespace-nowrap w-full sm:w-auto"
            onClick={handleBulkUploadClick}
          >
            <i className="fa-solid fa-upload mr-2"></i>
            Bulk Upload
          </button>
        </div>

        {/* ===================== Submit error summary ===================== */}
        {submitError && (
          <div
            ref={bannerRef}
            role="alert"
            className="mb-6 rounded-box border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i>
                  {submitError.title}
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1 break-words">
                  {submitError.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="btn btn-xs btn-ghost flex-shrink-0"
                aria-label="Dismiss"
                onClick={() => setSubmitError(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ===================== Student Information ===================== */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Student Information</h2>

          <div className="grid grid-cols-1 mb-3">
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

          <div className={GRID_3}>
            <Field
              icon="fa-user"
              label="First Name"
              required
              error={errors.student?.first_name}
            >
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
                className={inputCls(errors.student?.first_name)}
              />
            </Field>

            <Field
              icon="fa-user-pen"
              label="Middle Name"
              error={errors.student?.middle_name}
            >
              <input
                type="text"
                {...register("student.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className={inputCls(errors.student?.middle_name)}
              />
            </Field>

            <Field
              icon="fa-user-tag"
              label="Last Name"
              error={errors.student?.last_name}
            >
              <input
                type="text"
                {...register("student.last_name", {
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={inputCls(errors.student?.last_name)}
              />
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-envelope"
              label="Email"
              required
              error={errors.student?.email}
            >
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
                className={inputCls(errors.student?.email)}
              />
            </Field>

            <Field
              icon="fa-lock"
              label="Password"
              required
              error={errors.student?.password}
              className="relative"
            >
              <input
                type={showPassword ? "password" : "text"}
                {...register("student.password", {
                  required: "Password is required",
                  maxLength: {
                    value: 100,
                    message: "Password cannot exceed 100 characters",
                  },
                  pattern: {
                    value: PASSWORD_REGEX,
                    message: PASSWORD_MESSAGE,
                  },
                })}
                placeholder="eg : Password@123"
                className={`${inputCls(errors.student?.password)} pr-10`}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={handleShowPassword}
                aria-label={showPassword ? "Show password" : "Hide password"}
              >
                <i
                  className={`fa-solid ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                ></i>
              </button>
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-calendar-days"
              label="Date of Birth"
              error={errors.student?.date_of_birth}
            >
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                {...register("student.date_of_birth", {
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
                className={inputCls(errors.student?.date_of_birth)}
              />
            </Field>

            <Field
              icon="fa-venus-mars"
              label="Gender"
              error={errors.student?.gender}
            >
              <select
                {...register("student.gender")}
                className={selectCls(errors.student?.gender)}
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-user"
              label="Father's Name"
              error={errors.student?.father_name}
            >
              <input
                type="text"
                {...register("student.father_name", {
                  maxLength: {
                    value: 100,
                    message: "Father's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Father's Name"
                className={inputCls(errors.student?.father_name)}
              />
            </Field>

            <Field
              icon="fa-user"
              label="Mother's Name"
              error={errors.student?.mother_name}
            >
              <input
                type="text"
                {...register("student.mother_name", {
                  maxLength: {
                    value: 100,
                    message: "Mother's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Mother's Name"
                className={inputCls(errors.student?.mother_name)}
              />
            </Field>

            <Field
              icon="fa-hands-praying"
              label="Religion"
              error={errors.student?.religion}
            >
              <input
                type="text"
                {...register("student.religion", {
                  maxLength: {
                    value: 100,
                    message: "Religion cannot exceed 100 characters",
                  },
                })}
                placeholder="Religion"
                className={inputCls(errors.student?.religion)}
              />
            </Field>
          </div>

          <div className={`${GRID_4} ${ROW}`}>
            <Field
              icon="fa-tag"
              label="Category"
              error={errors.student?.category}
            >
              <select
                {...register("student.category")}
                className={selectCls(errors.student?.category)}
              >
                <option value="">Select Category</option>
                <option value="GEN">General</option>
                <option value="OBC">Other Backward Class</option>
                <option value="SC">Scheduled Caste</option>
                <option value="ST">Scheduled Tribe</option>
              </select>
            </Field>

            <Field
              icon="fa-ruler-vertical"
              label="Height (cm)"
              error={errors.student?.height}
            >
              <input
                type="number"
                {...register("student.height", {
                  min: { value: 0, message: "Height must be positive" },
                })}
                placeholder="Height"
                className={inputCls(errors.student?.height)}
                min={0}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-weight-scale"
              label="Weight (kg)"
              error={errors.student?.weight}
            >
              <input
                type="number"
                {...register("student.weight", {
                  min: { value: 0, message: "Weight must be positive" },
                })}
                placeholder="Weight"
                className={inputCls(errors.student?.weight)}
                min={0}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-heart-pulse"
              label="Blood Group"
              error={errors.student?.blood_group}
            >
              <select
                {...register("student.blood_group")}
                className={selectCls(errors.student?.blood_group)}
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
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-id-card"
              label="Scholar No."
              error={errors.student?.scholar_number}
            >
              <input
                type="text"
                {...register("student.scholar_number", {
                  maxLength: {
                    value: 50,
                    message: "Scholar number cannot exceed 50 characters",
                  },
                })}
                placeholder="Scholar Number"
                className={inputCls(errors.student?.scholar_number)}
              />
            </Field>

            <Field
              icon="fa-address-card"
              label="Aadhaar No."
              error={errors.student?.aadhaar_number}
            >
              <input
                type="text"
                inputMode="numeric"
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
                className={inputCls(errors.student?.aadhaar_number)}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
              />
            </Field>

            <Field
              icon="fa-file-invoice"
              label="FMID No."
              error={errors.student?.FMID_number}
            >
              <input
                type="text"
                {...register("student.FMID_number", {
                  maxLength: {
                    value: 50,
                    message: "FMID number cannot exceed 50 characters",
                  },
                })}
                placeholder="FMID Number"
                className={inputCls(errors.student?.FMID_number)}
              />
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-id-badge"
              label="Apaar ID No."
              error={errors.student?.apaar_number}
            >
              <input
                type="text"
                {...register("student.apaar_number", {
                  maxLength: {
                    value: 50,
                    message: "Apaar ID cannot exceed 50 characters",
                  },
                })}
                placeholder="Apaar ID Number"
                className={inputCls(errors.student?.apaar_number)}
              />
            </Field>

            <Field
              icon="fa-hashtag"
              label="PEN No."
              error={errors.student?.PEN_number}
            >
              <input
                type="text"
                {...register("student.PEN_number", {
                  maxLength: {
                    value: 50,
                    message: "PEN number cannot exceed 50 characters",
                  },
                })}
                placeholder="PEN Number"
                className={inputCls(errors.student?.PEN_number)}
              />
            </Field>

            <Field
              icon="fa-id-card-alt"
              label="BPL No."
              error={errors.student?.BPL_number}
            >
              <input
                type="text"
                {...register("student.BPL_number", {
                  maxLength: {
                    value: 50,
                    message: "BPL number cannot exceed 50 characters",
                  },
                })}
                placeholder="BPL Number"
                className={inputCls(errors.student?.BPL_number)}
              />
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-graduation-cap"
              label="Enrollment No."
              error={errors.enrollment_no}
            >
              <input
                type="text"
                {...register("enrollment_no", {
                  maxLength: {
                    value: 50,
                    message: "Enrollment number cannot exceed 50 characters",
                  },
                })}
                placeholder="Enrollment Number"
                className={inputCls(errors.enrollment_no)}
              />
            </Field>

            <Field
              icon="fa-server"
              label="SSSMID"
              error={errors.student?.SSSMID}
            >
              <input
                type="text"
                {...register("student.SSSMID", {
                  maxLength: {
                    value: 50,
                    message: "SSSMID cannot exceed 50 characters",
                  },
                })}
                placeholder="SSSMID"
                className={inputCls(errors.student?.SSSMID)}
              />
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-people-group"
              label="Number of Siblings"
              error={errors.student?.number_of_siblings}
            >
              <input
                type="number"
                min={0}
                max={15}
                {...register("student.number_of_siblings", {
                  min: {
                    value: 0,
                    message: "Number of siblings cannot be negative",
                  },
                  max: {
                    value: 15,
                    message: "Number of siblings cannot exceed 15",
                  },
                })}
                placeholder="Number of Siblings"
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
                onInput={(e) => {
                  const value = e.target.value;
                  if (value < 0) e.target.value = 0;
                  if (value > 15) e.target.value = 15;
                }}
                className={inputCls(errors.student?.number_of_siblings)}
              />
            </Field>

            {/* RTE number - rendered only when isRTE is true */}
            {isRTE && (
              <Field
                icon="fa-id-card"
                label="RTE Number"
                required
                error={errors.rte_number}
              >
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
                  className={inputCls(errors.rte_number)}
                />
              </Field>
            )}
          </div>
        </div>

        {/* ===================== Guardian Information ===================== */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Guardian Information</h2>

          <div className={GRID_3}>
            <Field
              icon="fa-user"
              label="First Name"
              error={errors.guardian?.first_name}
            >
              <input
                type="text"
                {...register("guardian.first_name", {
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                })}
                placeholder="First Name"
                className={inputCls(errors.guardian?.first_name)}
              />
            </Field>

            <Field
              icon="fa-user-pen"
              label="Middle Name"
              error={errors.guardian?.middle_name}
            >
              <input
                type="text"
                {...register("guardian.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className={inputCls(errors.guardian?.middle_name)}
              />
            </Field>

            <Field
              icon="fa-user-tag"
              label="Last Name"
              error={errors.guardian?.last_name}
            >
              <input
                type="text"
                {...register("guardian.last_name", {
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={inputCls(errors.guardian?.last_name)}
              />
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-envelope"
              label="Email"
              error={errors.guardian?.email}
            >
              <input
                type="email"
                {...register("guardian.email", {
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="guardian@example.com"
                className={inputCls(errors.guardian?.email)}
              />
            </Field>

            <Field
              icon="fa-lock"
              label="Password"
              error={errors.guardian?.password}
              className="relative"
            >
              <input
                type={showGuardianPassword ? "password" : "text"}
                {...register("guardian.password", {
                  maxLength: {
                    value: 100,
                    message: "Password cannot exceed 100 characters",
                  },
                  // optional field: the pattern only runs when something is typed
                  pattern: {
                    value: PASSWORD_REGEX,
                    message: PASSWORD_MESSAGE,
                  },
                })}
                placeholder="eg: Password@123"
                className={`${inputCls(errors.guardian?.password)} pr-10`}
              />
              <button
                type="button"
                className="passwordEyes text-gray-500"
                onClick={handleShowGuardianPassword}
                aria-label={
                  showGuardianPassword ? "Show password" : "Hide password"
                }
              >
                <i
                  className={`fa-solid ${
                    showGuardianPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                ></i>
              </button>
            </Field>

            <Field
              icon="fa-user-shield"
              label="Guardian Type"
              error={errors.guardian_type_input}
            >
              <select
                {...register("guardian_type_input", {})}
                className={selectCls(errors.guardian_type_input)}
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
            </Field>

            <Field
              icon="fa-phone"
              label="Phone Number"
              error={errors.guardian?.phone_no}
            >
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
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
                })}
                placeholder="Phone Number"
                className={inputCls(errors.guardian?.phone_no)}
                onInput={handlePhoneInput}
                onKeyDown={handlePhoneKeyDown}
                onPaste={(e) => {
                  const pastedData = e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "");

                  // Check if pasted data starts with valid digit
                  if (!/^[6789]/.test(pastedData)) {
                    e.preventDefault();
                    alert("Pasted phone number must start with 6, 7, 8, or 9");
                  }
                }}
              />
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-money-bill-wave"
              label="Annual Income"
              error={errors.guardian?.annual_income}
            >
              <input
                type="number"
                min={0}
                {...register("guardian.annual_income", {
                  min: {
                    value: 0,
                    message: "Annual income cannot be negative",
                  },
                })}
                placeholder="Annual Income"
                className={inputCls(errors.guardian?.annual_income)}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-briefcase"
              label="Means of Livelihood"
              error={errors.guardian?.means_of_livelihood}
            >
              <select
                {...register("guardian.means_of_livelihood")}
                className={selectCls(errors.guardian?.means_of_livelihood)}
              >
                <option value="">Select</option>
                <option value="Govt">Government</option>
                <option value="Non-Govt">Non-Government</option>
              </select>
            </Field>

            <Field
              icon="fa-graduation-cap"
              label="Qualification"
              error={errors.guardian?.qualification}
            >
              <input
                type="text"
                {...register("guardian.qualification", {
                  maxLength: {
                    value: 300,
                    message: "Qualification cannot exceed 300 characters",
                  },
                })}
                placeholder="Qualification"
                className={inputCls(errors.guardian?.qualification)}
              />
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-briefcase"
              label="Occupation"
              error={errors.guardian?.occupation}
            >
              <input
                type="text"
                {...register("guardian.occupation", {
                  maxLength: {
                    value: 300,
                    message: "Occupation cannot exceed 300 characters",
                  },
                })}
                placeholder="Occupation"
                className={inputCls(errors.guardian?.occupation)}
              />
            </Field>

            <Field
              icon="fa-id-card"
              label="Designation"
              error={errors.guardian?.designation}
            >
              <input
                type="text"
                {...register("guardian.designation", {
                  maxLength: {
                    value: 300,
                    message: "Designation cannot exceed 300 characters",
                  },
                })}
                placeholder="Designation"
                className={inputCls(errors.guardian?.designation)}
              />
            </Field>
          </div>
        </div>

        {/* ===================== Academic Information ===================== */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Academic Information</h2>

          <div className={GRID_2}>
            <Field
              icon="fa-graduation-cap"
              label="Year Level"
              required
              error={errors.year_level}
            >
              <select
                {...register("year_level", {
                  required: "Year level is required",
                })}
                className={selectCls(errors.year_level)}
              >
                <option value="">Select Year Level</option>
                {yearLevel.map((yearlev) => (
                  <option value={yearlev.level_name} key={yearlev.id}>
                    {yearlev.level_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              icon="fa-calendar"
              label="School Year"
              required
              error={errors.school_year}
            >
              <select
                {...register("school_year", {
                  required: "School year is required",
                })}
                className={selectCls(errors.school_year)}
              >
                <option value="">Select School Year</option>
                {schoolYears.map((schoolYear) => (
                  <option value={schoolYear.year_name} key={schoolYear.id}>
                    {schoolYear.year_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-chalkboard-user"
              label="Class Section & Stream"
              required
              error={errors.class_section}
            >
              <select
                {...register("class_section", {
                  required: "Class section is required",
                })}
                className={selectCls(errors.class_section)}
              >
                <option value="">Select Section or Stream</option>
                {/* Sections */}
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                {/* Streams */}
                <option value="PCM">
                  PCM (Physics, Chemistry, Mathematics)
                </option>
                <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                <option value="COMM">COMM (Commerce)</option>
                <option value="ARTS">ARTS (Arts)</option>
              </select>
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-school"
              label="Previous School Name"
              error={errors.previous_school_name}
            >
              <input
                type="text"
                {...register("previous_school_name", {
                  maxLength: {
                    value: 200,
                    message: "School name cannot exceed 200 characters",
                  },
                })}
                placeholder="Previous School Name"
                className={inputCls(errors.previous_school_name)}
              />
            </Field>

            <Field
              icon="fa-book"
              label="Previous Class/Grade"
              error={errors.previous_standard_studied}
            >
              <input
                type="text"
                maxLength={15}
                {...register("previous_standard_studied", {
                  maxLength: {
                    value: 15,
                    message: "Class/grade cannot exceed 15 characters",
                  },
                })}
                placeholder="e.g. 8th"
                className={inputCls(errors.previous_standard_studied)}
              />
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-calendar-check"
              label="Admission Date"
              error={errors.admission_date}
            >
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
                className={inputCls(errors.admission_date)}
              />
            </Field>

            <Field icon="fa-file" label="TC Letter" error={errors.tc_letter}>
              <select
                {...register("tc_letter", {})}
                className={selectCls(errors.tc_letter)}
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="not_applicable">Not Applicable</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-phone"
              label="Emergency Contact"
              error={errors.emergency_contact_no}
            >
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                {...register("emergency_contact_no", {
                  pattern: {
                    value: /^[6789]\d{9}$/,
                    message:
                      "Emergency contact must start with 6, 7, 8, or 9 and be exactly 10 digits",
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
                className={inputCls(errors.emergency_contact_no)}
                onInput={handlePhoneInput}
                onKeyDown={handlePhoneKeyDown}
              />
            </Field>

            <Field
              icon="fa-road"
              label="Distance to School (km)"
              error={errors.entire_road_distance_from_home_to_school}
            >
              <input
                type="number"
                min={0}
                {...register("entire_road_distance_from_home_to_school", {
                  min: { value: 0, message: "Distance cannot be negative" },
                })}
                placeholder="Distance in km"
                className={inputCls(
                  errors.entire_road_distance_from_home_to_school
                )}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW}`}>
            <Field
              icon="fa-marker"
              label="Marks Obtained"
              error={errors.obtain_marks}
            >
              <input
                type="number"
                min={0}
                {...register("obtain_marks", {
                  min: { value: 0, message: "Marks cannot be negative" },
                })}
                placeholder="Marks Obtained"
                className={inputCls(errors.obtain_marks)}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-chart-simple"
              label="Total Marks"
              error={errors.total_marks}
            >
              <input
                type="number"
                min={0}
                {...register("total_marks", {
                  min: { value: 0, message: "Total marks cannot be negative" },
                })}
                placeholder="Total Marks"
                className={inputCls(errors.total_marks)}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-percent"
              label="Previous Percentage"
              error={errors.previous_percentage}
            >
              <input
                type="number"
                {...register("previous_percentage", {
                  min: { value: 0, message: "Percentage cannot be negative" },
                  max: { value: 100, message: "Percentage cannot exceed 100%" },
                })}
                placeholder="Previous Percentage"
                step="0.01"
                className={inputCls(errors.previous_percentage)}
                onInput={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > 100) e.target.value = 100;
                  if (value < 0) e.target.value = 0;
                }}
              />
            </Field>
          </div>
        </div>

        {/* ===================== Residential Address ===================== */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Residential Address</h2>

          <div className={GRID_4}>
            <Field
              icon="fa-home"
              label="House Number"
              error={errors.address_input?.house_no}
            >
              <input
                type="number"
                {...register("address_input.house_no", {
                  validate: (value) => {
                    if (!value || value === "") return true;
                    const num = Number(value);
                    if (isNaN(num)) return "Invalid house number";
                    if (num < -2147483648 || num > 2147483647)
                      return "Invalid house number";
                    return true;
                  },
                })}
                placeholder="House Number"
                className={inputCls(errors.address_input?.house_no)}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-map-location"
              label="Habitation"
              error={errors.address_input?.habitation}
            >
              <input
                type="text"
                {...register("address_input.habitation", {
                  maxLength: {
                    value: 100,
                    message: "Habitation cannot exceed 100 characters",
                  },
                })}
                placeholder="Habitation"
                className={inputCls(errors.address_input?.habitation)}
              />
            </Field>

            <Field
              icon="fa-building"
              label="Block"
              error={errors.address_input?.block}
            >
              <input
                type="text"
                {...register("address_input.block", {
                  maxLength: {
                    value: 100,
                    message: "Block cannot exceed 100 characters",
                  },
                })}
                placeholder="Block"
                className={inputCls(errors.address_input?.block)}
              />
            </Field>

            <Field
              icon="fa-map"
              label="Ward Number"
              error={errors.address_input?.ward_no}
            >
              <input
                type="number"
                placeholder="Ward Number"
                min={0}
                className={inputCls(errors.address_input?.ward_no)}
                {...register("address_input.ward_no")}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>
          </div>

          <div className={`${GRID_4} ${ROW}`}>
            <Field
              icon="fa-map-pin"
              label="Zone"
              error={errors.address_input?.zone_no}
            >
              <input
                type="number"
                placeholder="Zone"
                min={0}
                className={inputCls(errors.address_input?.zone_no)}
                {...register("address_input.zone_no")}
                onKeyDown={blockNegativeKeys}
                onWheel={blurOnWheel}
              />
            </Field>

            <Field
              icon="fa-map"
              label="District"
              error={errors.address_input?.district}
            >
              <input
                type="text"
                {...register("address_input.district", {
                  maxLength: {
                    value: 50,
                    message: "District cannot exceed 50 characters",
                  },
                })}
                placeholder="District"
                className={inputCls(errors.address_input?.district)}
              />
            </Field>

            <SearchSelect
              icon="fa-city"
              label="City"
              required
              placeholder="Select City"
              options={sortedCities}
              value={watch("address_input.city")}
              registration={register("address_input.city", {
                required: "City is required",
              })}
              error={errors.address_input?.city}
              onSelect={(id) =>
                setValue("address_input.city", id, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />

            <Field
              icon="fa-map-signs"
              label="Division"
              error={errors.address_input?.division}
            >
              <input
                type="text"
                {...register("address_input.division", {
                  maxLength: {
                    value: 20,
                    message: "Division cannot exceed 20 characters",
                  },
                })}
                placeholder="Division"
                className={inputCls(errors.address_input?.division)}
              />
            </Field>
          </div>

          <div className={`${GRID_3} ${ROW} items-start`}>
            <SearchSelect
              icon="fa-flag"
              label="State"
              required
              placeholder="Select State"
              options={sortedStates}
              value={watch("address_input.state")}
              registration={register("address_input.state", {
                required: "State is required",
              })}
              error={errors.address_input?.state}
              onSelect={(id) =>
                setValue("address_input.state", id, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />

            <SearchSelect
              icon="fa-globe"
              label="Country"
              required
              placeholder="Select Country"
              options={sortedCountries}
              value={watch("address_input.country")}
              registration={register("address_input.country", {
                required: "Country is required",
              })}
              error={errors.address_input?.country}
              onSelect={(id) =>
                setValue("address_input.country", id, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />

            <Field
              icon="fa-mailbox"
              label="Pin Code"
              error={errors.address_input?.area_code}
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                {...register("address_input.area_code", {
                  validate: (value) => {
                    // Allow empty value
                    if (!value || value === "") return true;
                    // If filled, validate pattern
                    return (
                      /^[1-9][0-9]{5}$/.test(value) ||
                      "Enter a valid 6-digit Indian Pincode"
                    );
                  },
                })}
                placeholder="Pin Code"
                className={inputCls(errors.address_input?.area_code)}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
              />
            </Field>
          </div>

          <div className={`grid grid-cols-1 ${ROW}`}>
            <Field
              icon="fa-location-dot"
              label="Full Address Line"
              error={errors.address_input?.address_line}
            >
              <textarea
                maxLength={250}
                {...register("address_input.address_line", {
                  maxLength: {
                    value: 250,
                    message: "Address line cannot exceed 250 characters",
                  },
                })}
                placeholder="Full Address"
                className={`textarea textarea-bordered w-full min-w-0 focus:outline-none ${
                  errors.address_input?.address_line ? "textarea-error" : ""
                }`}
              ></textarea>
            </Field>
          </div>
        </div>

        {/* ===================== Bank Details ===================== */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Bank Account Details</h2>

          <div className={GRID_2}>
            <Field
              icon="fa-user"
              label="Account Holder Name"
              error={errors.banking_detail_input?.holder_name}
            >
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
                className={inputCls(errors.banking_detail_input?.holder_name)}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .replace(/[^A-Za-z\s]/g, "")
                    .replace(/\s+/g, " ")
                    .replace(/^\s+/g, "");
                }}
              />
            </Field>

            <Field
              icon="fa-university"
              label="Bank Name"
              error={errors.banking_detail_input?.bank_name}
            >
              <div className="relative" ref={bankInputRef}>
                <input
                  type="hidden"
                  {...register("banking_detail_input.bank_name", {
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
                  className={inputCls(errors.banking_detail_input?.bank_name)}
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

                {showDropdown && (
                  <ul className="absolute left-0 top-full z-20 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto dark:bg-[#242627] dark:border-gray-600">
                    {filteredBanks.length > 0 ? (
                      filteredBanks.map((b) => (
                        <li
                          key={b.id}
                          className="px-3 py-2 hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-600 dark:text-gray-100 break-words"
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
                          b.name.toLowerCase() ===
                          bankQuery.trim().toLowerCase()
                      ) && (
                        <li
                          className="px-3 py-2 bg-green-50 hover:bg-green-100 cursor-pointer flex items-center gap-2 border-t dark:bg-green-900 dark:hover:bg-green-800 dark:text-gray-100 break-words"
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
              </div>

              {!!createBankError && (
                <span className="text-error text-sm mt-1">
                  {createBankError}
                </span>
              )}
            </Field>
          </div>

          <div className={`${GRID_2} ${ROW}`}>
            <Field
              icon="fa-credit-card"
              label="Account Number"
              error={errors.banking_detail_input?.account_no}
            >
              <input
                type="text"
                inputMode="numeric"
                {...register("banking_detail_input.account_no", {
                  pattern: {
                    value: /^[0-9]{9,18}$/,
                    message: "Account number must be 9 to 18 digits",
                  },
                })}
                placeholder="Account Number"
                className={inputCls(errors.banking_detail_input?.account_no)}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
              />
            </Field>

            <Field
              icon="fa-code"
              label="IFSC Code"
              error={errors.banking_detail_input?.ifsc_code}
            >
              <input
                type="text"
                {...register("banking_detail_input.ifsc_code", {
                  pattern: {
                    value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                    message: "Invalid IFSC code format",
                  },
                })}
                placeholder="eg: SBIN0001234 or BARB0BHOPAL"
                className={inputCls(errors.banking_detail_input?.ifsc_code)}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "");
                }}
                maxLength={11}
              />
            </Field>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-8 sm:mt-10">
          <button
            type="submit"
            disabled={submitting}
            className="btn bgTheme text-white w-full sm:w-40"
          >
            {submitting ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane mr-2"></i>
                Register
              </>
            )}
          </button>
        </div>
      </form>

      {showAdmissionSuccessModal && (
        <AdmissionSuccessful
          handleCloseOnly={handleCloseOnly}
          handleCloseAndNavigate={handleCloseAndNavigate}
        />
      )}

      {/* ================= Bulk Upload Modal ================= */}
      {showBulkUploadModal && !bulkMinimized && (
        <div className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100 w-11/12 max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center gap-2 mb-4">
              <h3 className="font-bold text-lg sm:text-xl min-w-0">
                Bulk Upload Admission Data
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {bulkUploadLoading && (
                  <button
                    type="button"
                    onClick={() => setBulkMinimized(true)}
                    className="btn btn-sm btn-circle btn-ghost"
                    aria-label="Minimize"
                    title="Minimize - keep working while the upload runs"
                  >
                    <i className="fa-solid fa-minus"></i>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseBulkUploadModal}
                  className="btn btn-sm btn-circle btn-ghost"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              {/* ---- General error (validation / network / job failed) ---- */}
              {bulkUploadError && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 sm:p-4 dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-circle-exclamation text-red-600 dark:text-red-400 text-lg mt-0.5"></i>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 break-words min-w-0">
                      {bulkUploadError}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Success ---- */}
              {bulkUploadSuccess && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 sm:p-4 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-circle-check text-green-600 dark:text-green-400 text-lg mt-0.5"></i>
                    <p className="font-semibold text-green-800 dark:text-green-300 break-words min-w-0">
                      {bulkUploadSuccess}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Result summary + row errors ---- */}
              {bulkUploadResult && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 text-center bg-base-200">
                    <div className="p-2 sm:p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total rows
                      </p>
                      <p className="text-lg font-bold">
                        {bulkUploadResult.total}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {bulkUploadResult.created}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Failed
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          bulkUploadResult.failed > 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {bulkUploadResult.failed}
                      </p>
                    </div>
                  </div>

                  {bulkUploadResult.errors.length > 0 && (
                    <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-2 text-sm">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        {bulkUploadResult.errors.length} row
                        {bulkUploadResult.errors.length === 1 ? "" : "s"} could
                        not be created
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                        {Object.entries(bulkErrorsBySheet).map(
                          ([sheet, items]) => (
                            <div key={sheet}>
                              <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300 mb-1 break-words">
                                {sheet}
                              </p>
                              <ul className="space-y-1">
                                {items.map((item, idx) => (
                                  <li
                                    key={`${sheet}-${item.row}-${idx}`}
                                    className="text-sm text-red-700 dark:text-red-300 bg-white/70 dark:bg-gray-900/40 rounded px-2 py-1 break-words"
                                  >
                                    <span className="font-semibold">
                                      Row {item.row}:
                                    </span>{" "}
                                    {item.reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                        Fix these rows in your file and upload it again. Rows
                        that were already created will be rejected as
                        duplicates, so you can re-upload only the failed rows.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ---- Progress while the job runs ---- */}
              {bulkUploadLoading && bulkUploadProgress && (
                <div className="bg-base-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {bulkUploadProgress.stage === "uploading"
                        ? "Uploading file..."
                        : "Processing admissions..."}
                    </p>
                    {bulkUploadProgress.total > 0 && (
                      <p className="text-sm font-medium">{bulkPercent}%</p>
                    )}
                  </div>

                  {bulkUploadProgress.total > 0 ? (
                    <progress
                      className="progress progress-primary w-full"
                      value={bulkUploadProgress.processed}
                      max={bulkUploadProgress.total}
                    ></progress>
                  ) : (
                    <progress className="progress progress-primary w-full"></progress>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {bulkUploadProgress.total > 0
                      ? `${bulkUploadProgress.processed} of ${bulkUploadProgress.total} rows processed. `
                      : ""}
                    Please keep this window open.
                  </p>
                </div>
              )}

              {/* ---- File + school year ---- */}
              {!bulkUploadSuccess && (
                <div className="space-y-6">
                  <div
                    className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-8 text-center ${
                      bulkUploadLoading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <input
                      type="file"
                      id="bulk-upload-file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      disabled={bulkUploadLoading}
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
                            !file.name.match(/\.(xlsx|xls|csv)$/i)
                          ) {
                            setBulkUploadError(
                              "Please upload an Excel (.xlsx, .xls) or CSV file"
                            );
                            return;
                          }

                          setBulkUploadFile(file);
                          setBulkUploadError("");
                          setBulkUploadResult(null);
                        }
                        // allow re-selecting the same file again
                        e.target.value = "";
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
                      <div className="mt-4 p-3 sm:p-4 bg-base-200 rounded-lg flex items-center justify-between gap-3">
                        <div className="min-w-0 text-left">
                          <p className="font-medium truncate">
                            {bulkUploadFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(bulkUploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setBulkUploadFile(null)}
                          className="btn btn-sm btn-ghost text-error flex-shrink-0"
                          aria-label="Remove file"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
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
                      className={selectCls()}
                      value={bulkUploadSchoolYear}
                      disabled={bulkUploadLoading}
                      onChange={(e) => setBulkUploadSchoolYear(e.target.value)}
                    >
                      <option value="">Select School Year</option>
                      {schoolYears.map((schoolYear) => (
                        <option
                          value={schoolYear.year_name}
                          key={schoolYear.id}
                        >
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
              )}

              {/* Preview Info */}
              {bulkUploadFile && !bulkUploadLoading && !bulkUploadSuccess && (
                <div className="bg-base-200 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-eye"></i>
                    Upload Preview
                  </h4>
                  <p className="text-sm break-words">
                    File ready for upload:{" "}
                    <strong>{bulkUploadFile.name}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Click "Upload & Process" to begin bulk admission
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-action flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  className="btn btn-outline w-full sm:w-auto"
                  onClick={
                    bulkUploadLoading
                      ? () => setBulkMinimized(true) // keep the job running
                      : handleCloseBulkUploadModal
                  }
                >
                  {bulkUploadLoading ? (
                    <>
                      Stop watching
                    </>
                  ) : bulkUploadResult || bulkUploadSuccess ? (
                    "Close"
                  ) : (
                    "Cancel"
                  )}
                </button>

                {!bulkUploadSuccess && (
                  <button
                    type="button"
                    className="btn bgTheme text-white gap-2 w-full sm:w-auto"
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
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-upload"></i>
                        Upload & Process
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Minimised bulk upload card ================= */}
      {showBulkUploadModal && bulkMinimized && (
        <div
          className="fixed bottom-20 md:bottom-4 right-3 sm:right-4 z-50 w-[calc(100vw-1.5rem)] max-w-xs rounded-box border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-stretch">
            <button
              type="button"
              onClick={() => setBulkMinimized(false)}
              className="flex-1 min-w-0 p-3 text-left"
              aria-label="Open bulk upload"
              title="Click to expand"
            >
              {bulkUploadLoading ? (
                <>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span className="truncate">Bulk upload in progress</span>
                    {bulkUploadProgress?.total > 0 && (
                      <span className="ml-auto text-xs font-medium">
                        {bulkPercent}%
                      </span>
                    )}
                  </p>
                  {bulkUploadProgress?.total > 0 ? (
                    <progress
                      className="progress progress-primary w-full mt-2"
                      value={bulkUploadProgress.processed}
                      max={bulkUploadProgress.total}
                    ></progress>
                  ) : (
                    <progress className="progress progress-primary w-full mt-2"></progress>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {bulkUploadProgress?.total > 0
                      ? `${bulkUploadProgress.processed} of ${bulkUploadProgress.total} rows`
                      : bulkUploadProgress?.stage === "uploading"
                      ? "Uploading file..."
                      : "Starting..."}
                  </p>
                </>
              ) : bulkUploadResult ? (
                bulkUploadResult.failed > 0 ? (
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>
                      {bulkUploadResult.failed} of {bulkUploadResult.total} rows
                      failed. Click to view.
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>
                      Bulk upload complete: {bulkUploadResult.created} created
                    </span>
                  </p>
                )
              ) : (
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>Bulk upload failed. Click to view.</span>
                </p>
              )}
            </button>

            {/* Dismiss only once the job has finished */}
            {!bulkUploadLoading && (
              <button
                type="button"
                onClick={handleCloseBulkUploadModal}
                className="px-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};