import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { constants } from "../../global/constants";
import PaymentStatusDialog from "./PaymentStatusDialog";
import PaymentStatusDialogOffline from "./PaymentStatusDialogOffline";
import { fetchSchoolYear } from "../../services/api/Api";
import ReceiptModal from "./ReceiptModal";
import { AuthContext } from "../../context/AuthContext";

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

const pad = (n) => String(n).padStart(2, "0");

// Today's date in the user's LOCAL timezone as YYYY-MM-DD
// (toISOString() would return the UTC date and can be off by one day).
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Format a YYYY-MM-DD date + current time to ISO-like format (YYYY-MM-DDTHH:MM:SS)
const formatDateWithCurrentTime = (dateString) => {
  if (!dateString) return null;
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return null;

  const now = new Date();
  const dateObj = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  if (isNaN(dateObj.getTime())) return null;

  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(
    dateObj.getHours()
  )}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
};

const inr = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

// Rounds to 2 decimals (avoids float noise like 33.300000000000004)
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Allows "", "10", "10.", "10.5", ".5" (max 2 decimals) while the user is typing
const isAmountTyping = (v) => /^\d*\.?\d{0,2}$/.test(v);

// Each month as a separate group (no grouping)
const getMonthlyGroups = (months) => {
  const groups = [];
  months.forEach((monthData) => {
    monthData.fees.forEach((fee) => {
      if (fee.fee_type && fee.fee_type.toLowerCase().includes("tuition")) {
        groups.push({
          id: `month-${monthData.month}-${fee.fee_id}`,
          label: monthData.month,
          count: 1,
          monthNames: [monthData.month],
          fee: fee,
        });
      }
    });
  });
  return groups;
};

// All monthly groups from available fees (including all months)
const getAllMonthlyGroups = (availableFees) => {
  if (!availableFees || availableFees.length === 0) return [];
  return getMonthlyGroups(availableFees);
};

// Extract month name and year from "Month Year" format
const parseMonthYear = (monthYearStr) => {
  if (!monthYearStr) return { month: "", year: "" };
  const parts = monthYearStr.trim().split(" ");
  const month = parts[0] || "";
  const year = parts.length > 1 ? parts[1] : "";
  return { month, year };
};

// Check if two month strings match
const doMonthsMatch = (month1, month2) => {
  if (!month1 || !month2) return false;
  const parsed1 = parseMonthYear(month1);
  const parsed2 = parseMonthYear(month2);
  if (parsed1.year && parsed2.year) {
    const year1 = parsed1.year.padStart(4, "20");
    const year2 = parsed2.year.padStart(4, "20");
    if (year1 !== year2) return false;
  }
  return parsed1.month.toLowerCase() === parsed2.month.toLowerCase();
};

// Check if a month is selected
const isMonthSelected = (monthFromData, selectedMonths) => {
  if (!monthFromData || !selectedMonths || selectedMonths.length === 0) return false;
  return selectedMonths.some((selectedMonth) => doMonthsMatch(monthFromData, selectedMonth));
};

/* ========================================================================== */
/*  Small presentational components                                           */
/* ========================================================================== */

const Loader = ({ label = "Loading data..." }) => (
  <div className="flex flex-col items-center justify-center py-10">
    <div className="flex space-x-2">
      <div className="h-3 w-3 animate-bounce rounded-full bgTheme"></div>
      <div className="h-3 w-3 animate-bounce rounded-full bgTheme [animation-delay:-0.2s]"></div>
      <div className="h-3 w-3 animate-bounce rounded-full bgTheme [animation-delay:-0.4s]"></div>
    </div>
    <p className="mt-3 text-sm text-base-content/60">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const cls =
    status === "Paid"
      ? "badge-success"
      : status === "Partial"
        ? "badge-warning"
        : "badge-error";
  const text = status === "Paid" || status === "Partial" ? status : "Pending";
  return <span className={`badge badge-outline badge-sm whitespace-nowrap ${cls}`}>{text}</span>;
};

const SectionCard = ({ icon, title, subtitle, action, children }) => (
  <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <i className={`fa-solid ${icon}`}></i>
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-base-content/60 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    <div className="p-4 sm:p-6">{children}</div>
  </section>
);

const Field = ({ label, icon, required, error, hint, className = "", children }) => (
  <div className={`form-control w-full ${className}`}>
    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-base-content/80">
      {icon && <i className={`fa-solid ${icon} text-xs text-base-content/50`}></i>}
      <span>{label}</span>
      {required && <span className="text-error">*</span>}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-error">{error}</p>
    ) : hint ? (
      <div className="mt-1 text-xs text-base-content/60">{hint}</div>
    ) : null}
  </div>
);

const InfoTile = ({ icon, iconColor, label, children }) => (
  <div className="rounded-xl border border-base-300 bg-base-200/60 p-3 sm:p-4">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
      <i className={`fa-solid ${icon} ${iconColor}`}></i>
      {label}
    </p>
    <div className="mt-1.5 break-words text-sm font-medium sm:text-base">{children}</div>
  </div>
);

/**
 * Fee list: a proper table on md+ screens, stacked cards on mobile.
 * rows: { id, label, feeType, original, paid, due, status, isPaid, selected,
 *         onToggle, collectAmount, onCollectChange, inputDisabled }
 * The "amount to collect" inputs are text inputs (inputMode="decimal") so that
 * values like "10." or "10.5" can be typed without the browser/React resetting them.
 */
const FeeList = ({ rows, showSelect = false, firstColumnLabel = null }) => (
  <>
    {/* Desktop / tablet table */}
    <div className="hidden overflow-x-auto rounded-xl border border-base-300 md:block">
      <table className="table w-full">
        <thead className="bg-base-200 text-xs uppercase tracking-wide">
          <tr>
            {showSelect && <th className="w-12"></th>}
            {firstColumnLabel && <th>{firstColumnLabel}</th>}
            <th>Fee Type</th>
            <th className="text-right">Original</th>
            <th className="text-right">Paid</th>
            <th className="text-right">Due</th>
            <th>Status</th>
            <th className="text-right">Amount to Collect</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover">
              {showSelect && (
                <td>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={row.selected}
                    onChange={row.onToggle}
                    disabled={row.isPaid}
                    aria-label={`Select ${row.feeType}`}
                  />
                </td>
              )}
              {firstColumnLabel && <td className="whitespace-nowrap font-semibold">{row.label}</td>}
              <td className="font-medium">{row.feeType}</td>
              <td className="text-right tabular-nums">{inr(row.original)}</td>
              <td className="text-right tabular-nums">{inr(row.paid)}</td>
              <td className={`text-right tabular-nums ${row.due > 0 ? "font-semibold text-warning" : ""}`}>
                {inr(row.due)}
              </td>
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>
                <div className="flex flex-col items-end gap-0.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input input-bordered input-sm w-28 text-right focus:outline-none"
                    value={row.collectAmount}
                    onChange={(e) => row.onCollectChange(e.target.value)}
                    disabled={row.inputDisabled}
                    aria-label={`Amount to collect for ${row.feeType}`}
                  />
                  {row.due > 0 && (
                    <span className="text-[11px] text-base-content/50">max ₹{row.due.toFixed(2)}</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile cards */}
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div
          key={row.id}
          className={`rounded-xl border p-3 transition-colors ${
            showSelect && row.selected ? "border-primary/50 bg-primary/5" : "border-base-300 bg-base-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {showSelect && (
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mt-0.5"
                  checked={row.selected}
                  onChange={row.onToggle}
                  disabled={row.isPaid}
                  aria-label={`Select ${row.feeType}`}
                />
              )}
              <div className="min-w-0">
                <p className="break-words font-semibold">{row.label || row.feeType}</p>
                {row.label && <p className="break-words text-xs text-base-content/60">{row.feeType}</p>}
              </div>
            </div>
            <StatusBadge status={row.status} />
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-base-200 px-1 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-base-content/60">Original</dt>
              <dd className="text-sm font-medium tabular-nums">{inr(row.original)}</dd>
            </div>
            <div className="rounded-lg bg-base-200 px-1 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-base-content/60">Paid</dt>
              <dd className="text-sm font-medium tabular-nums">{inr(row.paid)}</dd>
            </div>
            <div className="rounded-lg bg-base-200 px-1 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-base-content/60">Due</dt>
              <dd className={`text-sm font-semibold tabular-nums ${row.due > 0 ? "text-warning" : ""}`}>
                {inr(row.due)}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-base-content/70">
              <span>Amount to collect</span>
              {row.due > 0 && <span className="text-base-content/50">max ₹{row.due.toFixed(2)}</span>}
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="input input-bordered w-full text-base focus:outline-none"
              value={row.collectAmount}
              onChange={(e) => row.onCollectChange(e.target.value)}
              disabled={row.inputDisabled}
            />
          </div>
        </div>
      ))}
    </div>
  </>
);

/* ========================================================================== */
/*  Main component                                                            */
/* ========================================================================== */

export const AdmissionFees = () => {
  const [students, setStudents] = useState([]);
  const [availableFees, setAvailableFees] = useState([]);
  const [annualFees, setAnnualFees] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentDialog1, setShowPaymentDialog1] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [studentYearId, setStudentYearId] = useState(null);
  const [selectedSchYear, setselectedSchYear] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [schoolYear, setSchoolYear] = useState([]);
  const [apiError, setApiError] = useState("");
  const { axiosInstance } = useContext(AuthContext);
  const lastFetchKeyRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showChequeField, setShowChequeField] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState({});
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [annualCollectAmounts, setAnnualCollectAmounts] = useState({});
  const [manualPaidAmount, setManualPaidAmount] = useState("");

  // Payment date now defaults to TODAY (local date)
  const [paymentDate, setPaymentDate] = useState(getTodayString());

  const [parentName, setParentName] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [termFrom, setTermFrom] = useState("");
  const [termTo, setTermTo] = useState("");
  const [studentStream, setStudentStream] = useState("");
  const [sessionMonths, setSessionMonths] = useState([]);

  const [advancePaymentData, setAdvancePaymentData] = useState(null);
  const [showAdvancePaymentDialog, setShowAdvancePaymentDialog] = useState(false);

  const BASE_URL = constants.baseUrl;
  const UserRole = window.localStorage.getItem("userRole");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      student_id: "",
      month: "",
      paid_amount: "",
      payment_mode: "",
      cheque_number: "",
      remarks: "",
      received_by: "",
    },
  });

  const selectedStudentId = watch("student_id");
  const selectedPaymentMode = watch("payment_mode");
  const watchedPaidAmount = watch("paid_amount");

  const getClassLabel = () => {
    if (!selectedClassId) return "";
    const cls = classes.find((c) => c.id === parseInt(selectedClassId));
    return cls ? cls.level_name : "";
  };

  const getTermMonths = () => {
    if (!selectedSchYear) return { from: "July", to: "June" };
    const sy = schoolYear.find((s) => s.id === parseInt(selectedSchYear));
    if (!sy || !sy.year_name) return { from: "July", to: "June" };
    const years = sy.year_name.match(/\d{4}/g) || [];
    const startYear = years[0] || new Date().getFullYear();
    const endYear = years[1] || startYear + 1;
    return {
      from: `July ${startYear}`,
      to: `June ${endYear}`,
    };
  };

  const getSchoolYearName = () => {
    if (!selectedSchYear) return "";
    const sy = schoolYear.find((s) => s.id === parseInt(selectedSchYear));
    return sy ? sy.year_name : "";
  };

  const isClass11Or12 = () => {
    if (!selectedClassId) return false;
    const cls = classes.find((c) => c.id === parseInt(selectedClassId));
    if (!cls || !cls.level_name) return false;
    const levelName = cls.level_name.toLowerCase();
    return levelName.includes("class 11") || levelName.includes("class 12");
  };

  const getStreamFromSection = (sectionValue) => {
    if (!sectionValue) return null;
    const sectionUpper = sectionValue.toUpperCase().trim();
    const streams = ["PCM", "PCB", "COMM", "ARTS", "HUMANITIES", "SCIENCE", "COMMERCE"];
    for (const stream of streams) {
      if (sectionUpper.includes(stream) || sectionUpper === stream) {
        return stream;
      }
    }
    return null;
  };

  const generateSessionMonths = (schoolYearName) => {
    if (!schoolYearName) return [];
    const years = schoolYearName.match(/\d{4}/g) || [];
    if (years.length < 2) return [];
    const startYear = parseInt(years[0]);
    const endYear = parseInt(years[1]);
    const allMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const sessionMonthsList = [];
    for (let i = 6; i < 12; i++) {
      sessionMonthsList.push(`${allMonths[i]} ${startYear}`);
    }
    for (let i = 0; i < 6; i++) {
      sessionMonthsList.push(`${allMonths[i]} ${endYear}`);
    }
    return sessionMonthsList;
  };

  // Clears fee selections and puts the payment date back to today
  const resetFeeSelections = () => {
    setSelectedFeeIds([]);
    setSelectedGroups({});
    setAnnualCollectAmounts({});
    setManualPaidAmount("");
    setPaymentDate(getTodayString());
  };

  const fetchReceipt = async (receiptNumber) => {
    if (!receiptNumber) {
      console.error("Receipt number is required");
      return;
    }
    try {
      setIsLoadingReceipt(true);
      const response = await axiosInstance.get(
        `${BASE_URL}/d/studentfees/get_receipt/?receipt_number=${encodeURIComponent(receiptNumber)}`
      );
      if (response.data) {
        setReceiptData(response.data);
        setShowReceiptModal(true);
      } else {
        console.error("No receipt data received");
        alert("Failed to fetch receipt. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
      alert("Failed to fetch receipt. Please try again.");
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const calculateTotalAmount = () => {
    let annualTotal = 0;
    annualFees.forEach((fee) => {
      if (selectedFeeIds.includes(fee.fee_id)) {
        const raw = annualCollectAmounts[fee.fee_id];
        // not edited yet -> whole due; edited (even to 0 / "") -> exactly what was typed
        annualTotal += raw === undefined ? parseFloat(fee.due_amount) || 0 : parseFloat(raw) || 0;
      }
    });
    let monthlyTotal = 0;
    const allMonthlyGroups = getAllMonthlyGroups(availableFees);
    allMonthlyGroups.forEach((group) => {
      const sel = selectedGroups[group.id];
      if (sel && sel.checked) {
        const monthName = group.monthNames[0] || "";
        const collectAmount = parseFloat(sel.collectAmount) || 0;
        if (selectedMonths.length === 0) return;
        const matched = isMonthSelected(monthName, selectedMonths);
        if (matched) {
          monthlyTotal += collectAmount;
        }
      }
    });
    return round2(annualTotal + monthlyTotal);
  };

  useEffect(() => {
    if (selectedStudent) {
      setParentName(selectedStudent?.parent_name || selectedStudent?.guardian_name || "");
      const sectionFromStudent = selectedStudent?.section || selectedStudent?.section_name || "";
      setSection(sectionFromStudent);
      if (isClass11Or12() && sectionFromStudent) {
        const stream = getStreamFromSection(sectionFromStudent);
        if (stream) {
          setStudentStream(stream);
          // Fetching is handled by the effect that watches
          // `studentYearId`, `selectedSchYear`, and `studentStream`.
        } else {
          setStudentStream("");
        }
      } else {
        setStudentStream("");
      }
    }
    if (selectedClassId) {
      setGrade(getClassLabel());
    }
    if (selectedSchYear) {
      const terms = getTermMonths();
      setTermFrom(terms.from);
      setTermTo(terms.to);
      const schoolYearName = getSchoolYearName();
      const months = generateSessionMonths(schoolYearName);
      setSessionMonths(months);
    }
  }, [selectedStudent, selectedClassId, selectedSchYear, classes, schoolYear]);

  const filteredAvailableFees = useMemo(() => {
    if (!availableFees || availableFees.length === 0) return [];
    if (selectedMonths.length === 0) return [];
    return availableFees.filter((monthData) => isMonthSelected(monthData.month, selectedMonths));
  }, [availableFees, selectedMonths]);

  const monthlyGroups = useMemo(() => getMonthlyGroups(filteredAvailableFees), [filteredAvailableFees]);

  useEffect(() => {
    if (selectedPaymentMode === "cheque") {
      setShowChequeField(true);
    } else {
      setShowChequeField(false);
      setValue("cheque_number", "");
      clearErrors("cheque_number");
    }
  }, [selectedPaymentMode, setValue, clearErrors]);

  const getClasses = async () => {
    try {
      setIsLoading(true);
      setApiError("");
      const response = await axios.get(`${BASE_URL}/d/year-levels/`);
      setClasses(response.data);
    } catch (err) {
      console.log(err);
      setApiError("Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableFees = async (studentId, stream = null) => {
    if (!studentId || !selectedSchYear) {
      setAvailableFees([]);
      setAnnualFees([]);
      return [];
    }
    // prevent rapid duplicate fetches for same params
    try {
      const key = `${studentId}_${selectedSchYear}_${stream || ""}`;
      const now = Date.now();
      if (lastFetchKeyRef.current === key && now - (lastFetchTimeRef.current || 0) < 1000) {
        return [];
      }
      lastFetchKeyRef.current = key;
      lastFetchTimeRef.current = now;
    } catch (e) {
      // ignore
    }
    try {
      setIsLoadingFees(true);
      let url = `${BASE_URL}/d/studentfees/fee_preview/?student_year_id=${studentId}&school_year_id=${selectedSchYear}`;
      if (stream && isClass11Or12()) {
        url += `&stream=${encodeURIComponent(stream)}`;
      }
      const feePreviewRes = await axiosInstance.get(url);
      if (feePreviewRes.data && typeof feePreviewRes.data === "object") {
        const data = feePreviewRes.data;
        if (data.student) {
          if (data.student.father_name) {
            setParentName(data.student.father_name);
          } else if (data.student.mother_name) {
            setParentName(data.student.mother_name);
          }
          if (data.student.class_section) {
            setSection(data.student.class_section);
          }
        }
        if (data.annual && data.months) {
          setAnnualFees(data.annual || []);
          setAvailableFees(data.months || []);
          return data.months || [];
        }
        if (Array.isArray(data)) {
          setAnnualFees([]);
          setAvailableFees(data);
          return data;
        }
      }
      setAvailableFees([]);
      setAnnualFees([]);
      return [];
    } catch (error) {
      console.error("Error fetching fees:", error);
      setApiError("Failed to load fees");
      setAvailableFees([]);
      setAnnualFees([]);
      return [];
    } finally {
      setIsLoadingFees(false);
    }
  };

  const getStudentsBySchoolYearAndClass = async () => {
    if (!selectedSchYear || !selectedClassId) {
      setStudents([]);
      return;
    }
    try {
      setIsLoading(true);
      setApiError("");
      const schoolYearName = getSchoolYearName();
      if (!schoolYearName) {
        setStudents([]);
        return;
      }
      const response = await axiosInstance.get(
        `${BASE_URL}/s/studentyearlevels/?year__year_name=${encodeURIComponent(schoolYearName)}&level__id=${selectedClassId}`
      );
      const studentData = Array.isArray(response.data)
        ? response.data
        : response.data.results
          ? response.data.results
          : [];
      setStudents(studentData);
    } catch (err) {
      console.log(err);
      setApiError("Failed to load students");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSchool_year = async () => {
    try {
      const obj = await fetchSchoolYear();
      setSchoolYear(obj);
    } catch (err) {
      console.log("Failed to load school years. Please try again." + err);
    }
  };

  useEffect(() => {
    getClasses();
    getSchool_year();
  }, []);

  // Clears the chosen student and everything that depends on it
  const resetStudentState = () => {
    reset({
      student_id: "",
      month: "",
      paid_amount: "",
      payment_mode: "",
      cheque_number: "",
      remarks: "",
      received_by: "",
    });
    setSelectedStudent(null);
    setStudentYearId(null);
    setAvailableFees([]);
    setAnnualFees([]);
    setApiError("");
    setSelectedStudentName("");
    setStudents([]);
    setStudentStream("");
    setSection("");
    setParentName("");
    setSelectedMonths([]);
    setAdvancePaymentData(null);
    setShowAdvancePaymentDialog(false);
    resetFeeSelections();
  };

  const handleSchoolYearChange = (e) => {
    setselectedSchYear(e.target.value);
    resetStudentState();
  };

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    resetStudentState();
  };

  const handleRetry = () => {
    setApiError("");
    getClasses();
    getSchool_year();
    if (selectedSchYear && selectedClassId) getStudentsBySchoolYearAndClass();
    if (studentYearId) {
      lastFetchKeyRef.current = null;
      fetchAvailableFees(studentYearId, studentStream || null);
    }
  };

  useEffect(() => {
    if (selectedSchYear && selectedClassId) {
      getStudentsBySchoolYearAndClass();
    } else {
      setStudents([]);
    }
  }, [selectedSchYear, selectedClassId]);

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(
        (s) => s.student_id === parseInt(selectedStudentId) || s.id === parseInt(selectedStudentId)
      );
      setSelectedStudent(student || null);
      setStudentYearId(student ? student.id : null);
      if (student && student.section) {
        setSection(student.section);
      }
    } else {
      setSelectedStudent(null);
      setStudentYearId(null);
      setAvailableFees([]);
      setAnnualFees([]);
      setSelectedFeeIds([]);
      setSelectedGroups({});
      setAnnualCollectAmounts({});
      setManualPaidAmount("");
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (studentYearId && selectedSchYear) {
      if (isClass11Or12() && studentStream) {
        fetchAvailableFees(studentYearId, studentStream);
      } else if (isClass11Or12() && selectedStudent && selectedStudent.section) {
        const stream = getStreamFromSection(selectedStudent.section);
        if (stream) {
          setStudentStream(stream);
          fetchAvailableFees(studentYearId, stream);
        } else {
          fetchAvailableFees(studentYearId);
        }
      } else {
        fetchAvailableFees(studentYearId);
      }
    } else {
      setAvailableFees([]);
      setAnnualFees([]);
    }
  }, [studentYearId, selectedSchYear, studentStream]);

  // Reset fee selections when stream changes (user selected a manual stream)
  useEffect(() => {
    if (studentStream) {
      resetFeeSelections();
    }
  }, [studentStream]);

  useEffect(() => {
    resetFeeSelections();
    setAdvancePaymentData(null);
    setShowAdvancePaymentDialog(false);
  }, [studentYearId, selectedSchYear]);

  const role = localStorage.getItem("userRole");
  const isStaffOrDirector =
    role === constants.roles.officeStaff || role === constants.roles.director;
  const paymentModes = isStaffOrDirector
    ? ["cash", "cheque", "online", "QR Payment"]
    : ["online"];

  useEffect(() => {
    if (monthlyGroups.length > 0) {
      const newGroups = {};
      let shouldUpdate = false;
      monthlyGroups.forEach((group) => {
        if (!selectedGroups[group.id]) {
          shouldUpdate = true;
          const due = round2(parseFloat(group.fee.due_amount) || 0);
          newGroups[group.id] = {
            checked: true,
            collectAmount: due,
          };
        } else {
          newGroups[group.id] = selectedGroups[group.id];
        }
      });
      if (shouldUpdate) {
        setSelectedGroups((prev) => ({ ...prev, ...newGroups }));
      }
    }
  }, [monthlyGroups]);

  useEffect(() => {
    if (annualFees.length > 0) {
      const initialCollectAmounts = {};
      annualFees.forEach((fee) => {
        const due = round2(parseFloat(fee.due_amount) || 0);
        initialCollectAmounts[fee.fee_id] = due;
      });
      setAnnualCollectAmounts((prev) => {
        if (Object.keys(prev).length === 0) {
          return initialCollectAmounts;
        }
        return prev;
      });
    }
  }, [annualFees]);

  const handleAnnualFeeSelect = (feeId) => {
    setSelectedFeeIds((prev) =>
      prev.includes(feeId) ? prev.filter((id) => id !== feeId) : [...prev, feeId]
    );
  };

  const handleSelectAllAnnualFees = () => {
    if (selectedFeeIds.length === annualFees.length) {
      setSelectedFeeIds([]);
    } else {
      setSelectedFeeIds(annualFees.map((fee) => fee.fee_id));
    }
  };

  // Keeps the typed text as-is (so "10." / ".5" work) and caps it at the due amount
  const handleAnnualCollectChange = (feeId, value) => {
    if (!isAmountTyping(value)) return;
    const fee = annualFees.find((f) => f.fee_id === feeId);
    if (!fee) return;
    const due = round2(parseFloat(fee.due_amount) || 0);
    const num = parseFloat(value);
    const next = !isNaN(num) && num > due ? String(due) : value;
    setAnnualCollectAmounts((prev) => ({ ...prev, [feeId]: next }));
  };

  const handleMonthSelection = (month) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handleSelectAllMonths = () => {
    if (selectedMonths.length === sessionMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([...sessionMonths]);
    }
  };

  const handleGroupCollectChange = (groupId, value) => {
    if (!isAmountTyping(value)) return;
    const group = monthlyGroups.find((g) => g.id === groupId);
    if (!group) return;
    const due = round2(parseFloat(group.fee.due_amount) || 0);
    const num = parseFloat(value);
    const next = !isNaN(num) && num > due ? String(due) : value;
    setSelectedGroups((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], collectAmount: next },
    }));
  };

  useEffect(() => {
    const total = calculateTotalAmount();
    if (!isNaN(total) && isFinite(total)) {
      if (!manualPaidAmount || parseFloat(manualPaidAmount) === 0) {
        setValue("paid_amount", total.toFixed(2), {
          shouldValidate: true,
          shouldDirty: true,
        });
        setManualPaidAmount(total.toFixed(2));
      }
    }
  }, [selectedFeeIds, selectedGroups, annualFees, selectedMonths, availableFees, annualCollectAmounts, setValue]);

  const handlePaidAmountChange = (e) => {
    const value = e.target.value;
    if (!isAmountTyping(value)) return;
    setManualPaidAmount(value);
    setValue("paid_amount", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data) => {
    const annualSelected = annualFees.filter((fee) => selectedFeeIds.includes(fee.fee_id));
    const allMonthlyGroups = getAllMonthlyGroups(availableFees);
    const monthlySelected = allMonthlyGroups.filter(
      (g) => selectedGroups[g.id] && selectedGroups[g.id].checked
    );
    if (annualSelected.length === 0 && monthlySelected.length === 0) {
      alert("Please select at least one fee to pay");
      return;
    }
    const paymentMode = data.payment_mode.toLowerCase();
    const chequeNumber = data.cheque_number || "";
    const schoolYearId = selectedSchYear;
    const paidAmount = round2(parseFloat(data.paid_amount) || 0);
    const totalPayable = calculateTotalAmount();
    if (!selectedStudent || !studentYearId) {
      alert("Please select a student.");
      return;
    }
    if (paidAmount <= 0) {
      alert("Please enter a valid amount to pay.");
      return;
    }
    if (paymentMode !== "online" && !paymentDate) {
      alert("Please select a payment date.");
      return;
    }
    if (paidAmount > totalPayable) {
      const advanceAmount = round2(paidAmount - totalPayable);
      setAdvancePaymentData({
        advanceAmount,
        totalPayable,
        paidAmount,
        paymentMode,
        chequeNumber,
        schoolYearId,
        annualSelected,
        monthlySelected,
        data,
        paymentDate,
      });
      setShowAdvancePaymentDialog(true);
      return;
    }
    await processPayment(
      paymentMode,
      chequeNumber,
      schoolYearId,
      paidAmount,
      annualSelected,
      monthlySelected,
      data,
      null,
      paymentDate
    );
  };

  const processPayment = async (
    paymentMode,
    chequeNumber,
    schoolYearId,
    paidAmount,
    annualSelected,
    monthlySelected,
    data,
    advanceAdjustment = null,
    paymentDateParam = null
  ) => {
    const fees = [];
    let remainingAmount = round2(paidAmount);

    annualSelected.forEach((fee) => {
      const dueAmount = round2(parseFloat(annualCollectAmounts[fee.fee_id]) || 0);
      const amountToPay = round2(Math.min(dueAmount, remainingAmount));
      if (amountToPay > 0) {
        fees.push({
          fee_type_id: fee.fee_id,
          month: null,
          amount: amountToPay,
        });
        remainingAmount = round2(remainingAmount - amountToPay);
      }
    });

    monthlySelected.forEach((group) => {
      const sel = selectedGroups[group.id];
      const dueAmount = round2(parseFloat(sel.collectAmount) || 0);
      const amountToPay = round2(Math.min(dueAmount, remainingAmount));
      if (amountToPay > 0) {
        const monthMap = {
          January: 1, February: 2, March: 3, April: 4,
          May: 5, June: 6, July: 7, August: 8,
          September: 9, October: 10, November: 11, December: 12,
        };
        const monthName = group.monthNames[0]?.split(" ")[0] || "";
        const monthId = monthMap[monthName] || 0;
        if (monthId >= 1 && monthId <= 12) {
          fees.push({
            fee_type_id: group.fee.fee_id,
            month: monthId,
            amount: amountToPay,
          });
          remainingAmount = round2(remainingAmount - amountToPay);
        }
      }
    });

    if (fees.length === 0) {
      alert("No valid fees to submit. Please check the selected fees.");
      return;
    }
    const payload = {
      student_year_id: studentYearId,
      school_year_id: schoolYearId,
      payment_method: paymentMode,
      paid_amount: paidAmount,
      fees: fees,
      cheque_number: paymentMode === "cheque" ? chequeNumber : null,
      parent_name: parentName,
      grade: grade,
      section: section,
      term_from: termFrom,
      term_to: termTo,
    };
    if (paymentMode !== "online") {
      // Falls back to today if the date is somehow missing/invalid
      const formattedDate =
        formatDateWithCurrentTime(paymentDateParam) ||
        formatDateWithCurrentTime(getTodayString());
      payload.payment_date = formattedDate;
    }
    if (advanceAdjustment) {
      payload.advance_adjustment = advanceAdjustment;
    }
    try {
      const submitResInitial = await axiosInstance.post(
        `${BASE_URL}/d/studentfees/submit_fee/`,
        payload
      );
      if (submitResInitial.status === 200 || submitResInitial.status === 201) {
        if (submitResInitial?.data) {
          if (paymentMode === "online" && submitResInitial.data.redirect_url) {
            setIsRedirecting(true);
            window.location.href = submitResInitial.data.redirect_url;
            return;
          } else if (paymentMode === "cash" || paymentMode === "cheque" || paymentMode === "qr payment") {
            setPaymentStatus(submitResInitial.data);
            setShowPaymentDialog1(true);
            if (submitResInitial.data.receipt_number) {
              const receiptNumber = submitResInitial.data.receipt_number;
              setTimeout(() => {
                fetchReceipt(receiptNumber);
              }, 1500);
            }
          }
        }
      }
    } catch (err) {
      console.error("Payment failed", err);
      console.error("Error response:", err.response?.data);
      setPaymentStatus("Payment failed. Please try again.");
      if (err.response?.data) {
        const errorMsg =
          typeof err.response.data === "object"
            ? JSON.stringify(err.response.data)
            : err.response.data;
        alert(`Payment failed: ${errorMsg}`);
      }
    }
  };

  const handleAdvanceAdjustment = (adjustmentType) => {
    if (!advancePaymentData) return;
    const {
      paymentMode,
      chequeNumber,
      schoolYearId,
      paidAmount,
      annualSelected,
      monthlySelected,
      data,
      paymentDate: advPaymentDate,
    } = advancePaymentData;
    setShowAdvancePaymentDialog(false);
    processPayment(
      paymentMode,
      chequeNumber,
      schoolYearId,
      paidAmount,
      annualSelected,
      monthlySelected,
      data,
      adjustmentType,
      advPaymentDate
    );
    setAdvancePaymentData(null);
  };

  const closeAdvancePaymentDialog = () => {
    setShowAdvancePaymentDialog(false);
    setAdvancePaymentData(null);
  };

  const filteredStudents = students
    ?.filter((student) =>
      `${student?.student_name || ""} ${student?.scholar_number || ""}`
        .toLowerCase()
        .includes(searchStudentInput.trim().toLowerCase())
    )
    .sort((a, b) => (a.student_name || "").localeCompare(b.student_name || ""));

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ---------------------------- derived values ---------------------------- */

  const isPaymentModeSelected = !!selectedPaymentMode;
  const totalAmount = calculateTotalAmount();
  const isPaymentDateRequired =
    selectedPaymentMode && selectedPaymentMode !== "online" && !paymentDate;
  const hasSelectedFees =
    selectedFeeIds.length > 0 ||
    Object.values(selectedGroups).some(
      (g) => g && g.checked && (parseFloat(g.collectAmount) || 0) > 0
    );
  const isSubmitDisabled =
    isSubmitting ||
    isRedirecting ||
    !hasSelectedFees ||
    !isPaymentModeSelected ||
    !watchedPaidAmount ||
    !(parseFloat(watchedPaidAmount) > 0) ||
    isPaymentDateRequired;

  const stuYearlvlName = localStorage.getItem("stu_year_level_name");
  const stuYearlvlId = localStorage.getItem("stu_year_level_id");
  const canPickAnyClass = ["director", "office staff", "guardian"].includes(UserRole);

  const todayStr = getTodayString();
  const paidNumber = parseFloat(watchedPaidAmount) || 0;

  // Rows for the fee lists
  const annualRows = annualFees.map((fee) => {
    const due = round2(parseFloat(fee.due_amount) || 0);
    const selected = selectedFeeIds.includes(fee.fee_id);
    return {
      id: fee.fee_id,
      label: null,
      feeType: fee.fee_type,
      original: parseFloat(fee.original_amount) || 0,
      paid: parseFloat(fee.paid_amount) || 0,
      due,
      status: fee.status,
      isPaid: due <= 0,
      selected,
      onToggle: () => handleAnnualFeeSelect(fee.fee_id),
      collectAmount: annualCollectAmounts[fee.fee_id] ?? "",
      onCollectChange: (v) => handleAnnualCollectChange(fee.fee_id, v),
      inputDisabled: due <= 0 || !selected,
    };
  });

  const monthlyRows = monthlyGroups.map((group) => {
    const due = round2(parseFloat(group.fee.due_amount) || 0);
    const sel = selectedGroups[group.id] || { checked: true, collectAmount: due };
    return {
      id: group.id,
      label: group.label,
      feeType: group.fee.fee_type,
      original: parseFloat(group.fee.original_amount) || 0,
      paid: parseFloat(group.fee.paid_amount) || 0,
      due,
      status: group.fee.status,
      isPaid: due <= 0,
      selected: true,
      onToggle: null,
      collectAmount: sel.collectAmount ?? "",
      onCollectChange: (v) => handleGroupCollectChange(group.id, v),
      inputDisabled: due <= 0,
    };
  });

  /* --------------------------- initial page loader ------------------------ */

  if (isLoading && classes.length === 0 && !apiError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  /* --------------------------------- UI ----------------------------------- */

  return (
    <div className="min-h-screen bg-base-200/60 px-3 pb-32 pt-4 sm:px-6 sm:pt-6 md:pb-28 lg:px-8">
      <form
        className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {/* Page header */}
        <div className="flex flex-col items-center gap-1 text-center sm:py-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bgTheme text-xl text-white shadow-md">
            <i className="fa-solid fa-money-bill-wave"></i>
          </span>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Fee Payment</h1>
          <p className="max-w-xl text-sm text-base-content/60">
            Select a student, choose the fees to collect and record the payment.
          </p>
        </div>

        {/* Error banner */}
        {apiError && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/10 p-4 text-error sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              <p className="text-sm font-medium">{apiError}. Please try again.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm btn-error btn-outline" onClick={handleRetry}>
                Retry
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setApiError("")}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 1. Student selection */}
        <SectionCard
          icon="fa-user-graduate"
          title="Student Selection"
          subtitle="Choose the school year, class and student"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
            <Field label="School Year" icon="fa-calendar-days" required>
              <select
                className="select select-bordered w-full text-base focus:outline-none"
                onChange={handleSchoolYearChange}
                value={selectedSchYear || ""}
              >
                <option value="">Select Year</option>
                {schoolYear?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Class" icon="fa-school" required>
              <select
                className="select select-bordered w-full text-base focus:outline-none"
                onChange={handleClassChange}
                value={selectedClassId || ""}
              >
                <option value="">Select Class</option>
                {canPickAnyClass &&
                  classes?.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.level_name}
                    </option>
                  ))}
                {UserRole === "student" && (
                  <option key={stuYearlvlId} value={stuYearlvlId}>
                    {stuYearlvlName}
                  </option>
                )}
              </select>
            </Field>

            <Field
              label="Student"
              icon="fa-user"
              required
              error={errors.student_id?.message}
              hint={
                !selectedClassId || !selectedSchYear ? "Select a school year and class first" : null
              }
            >
              <div className="relative" ref={dropdownRef}>
                <div
                  role="combobox"
                  aria-expanded={showStudentDropdown}
                  aria-disabled={!selectedClassId || !selectedSchYear}
                  tabIndex={0}
                  className={`input input-bordered flex w-full items-center justify-between gap-2 text-base ${
                    !selectedClassId || !selectedSchYear
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                  onClick={() => {
                    if (selectedClassId && selectedSchYear) setShowStudentDropdown(!showStudentDropdown);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && selectedClassId && selectedSchYear) {
                      e.preventDefault();
                      setShowStudentDropdown(!showStudentDropdown);
                    }
                  }}
                >
                  <span className={`truncate ${selectedStudentName ? "" : "text-base-content/50"}`}>
                    {selectedStudentName || "Select Student"}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-down text-xs text-base-content/50 transition-transform ${
                      showStudentDropdown ? "rotate-180" : ""
                    }`}
                  ></i>
                </div>

                <input
                  type="hidden"
                  {...register("student_id", {
                    required: "Student selection is required",
                  })}
                  value={watch("student_id") || ""}
                  readOnly
                />

                {showStudentDropdown && selectedClassId && selectedSchYear && (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl">
                    <div className="border-b border-base-300 bg-base-100 p-2">
                      <input
                        type="text"
                        placeholder="Search by name or scholar no..."
                        className="input input-bordered input-sm w-full text-base focus:outline-none sm:text-sm"
                        value={searchStudentInput}
                        onChange={(e) => setSearchStudentInput(e.target.value)}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {isLoading ? (
                        <p className="p-3 text-sm text-base-content/60">Loading students...</p>
                      ) : filteredStudents?.length > 0 ? (
                        filteredStudents.map((stu) => {
                          const studentYearIdForOption = stu.id;
                          const studentName = stu.student_name || stu.name || "Unknown";
                          const scholarNo = stu.scholar_number || "";
                          const sectionDisplay = stu.section ? ` (${stu.section})` : "";
                          return (
                            <button
                              type="button"
                              key={studentYearIdForOption}
                              className="block w-full break-words px-3 py-2.5 text-left text-sm hover:bg-base-200"
                              onClick={() => {
                                const displayName = `${studentName}${
                                  scholarNo ? ` - ${scholarNo}` : ""
                                }${sectionDisplay}`;
                                setSelectedStudentName(displayName);
                                setSearchStudentInput("");
                                setShowStudentDropdown(false);
                                // The effect watching the form value updates selectedStudent
                                // and studentYearId (avoids duplicate fee-preview calls).
                                setValue("student_id", studentYearIdForOption, {
                                  shouldValidate: true,
                                });
                                clearErrors("student_id");
                                resetFeeSelections();
                                if (stu.section) {
                                  setSection(stu.section);
                                }
                              }}
                            >
                              {studentName}
                              {scholarNo ? ` - ${scholarNo}` : ""}
                              {sectionDisplay}
                            </button>
                          );
                        })
                      ) : (
                        <p className="p-3 text-sm text-base-content/60">
                          No students found for this class and year.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* 2. Student details */}
        {selectedStudent && selectedSchYear && (
          <SectionCard
            icon="fa-id-card"
            title="Student Details"
            subtitle={selectedStudent.student_name || selectedStudent.name}
          >
            {isClass11Or12() && studentStream && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">
                <i className="fa-solid fa-circle-info mt-0.5"></i>
                <span>
                  Stream: <strong>{studentStream}</strong> (fee structure loaded for this stream)
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <InfoTile icon="fa-user" iconColor="text-blue-500" label="Parent's Name">
                {parentName || <span className="text-base-content/40">—</span>}
              </InfoTile>
              <InfoTile icon="fa-graduation-cap" iconColor="text-green-500" label="Grade">
                {grade || <span className="text-base-content/40">—</span>}
              </InfoTile>
              <InfoTile icon="fa-layer-group" iconColor="text-purple-500" label="Section">
                {section || <span className="text-base-content/40">—</span>}
                {/* Class 11/12 students without a detectable stream can pick one manually */}
                {isClass11Or12() && selectedStudent && !getStreamFromSection(section) && (
                  <div className="mt-2">
                    <select
                      className="select select-bordered select-sm w-full text-base focus:outline-none sm:text-sm"
                      value={studentStream || ""}
                      onChange={(e) => setStudentStream(e.target.value)}
                    >
                      <option value="">Select Stream</option>
                      <option value="PCM">PCM (Physics, Chemistry, Maths)</option>
                      <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                      <option value="COMM">COMM (Commerce)</option>
                      <option value="ARTS">ARTS (Arts)</option>
                    </select>
                    <p className="mt-1 text-xs font-normal text-base-content/60">
                      Pick or change stream to load stream-specific fees
                    </p>
                  </div>
                )}
              </InfoTile>
            </div>
          </SectionCard>
        )}

        {/* 3. Months */}
        {selectedStudent && sessionMonths.length > 0 && (
          <SectionCard
            icon="fa-calendar"
            title="Tuition Months"
            subtitle="Select the months you want to collect tuition fees for"
            action={
              <button
                type="button"
                onClick={handleSelectAllMonths}
                className="btn btn-sm btn-outline btn-primary"
              >
                {selectedMonths.length === sessionMonths.length ? "Deselect All" : "Select All"}
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {sessionMonths.map((month) => {
                const active = selectedMonths.includes(month);
                return (
                  <button
                    key={month}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleMonthSelection(month)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary text-primary-content shadow-sm"
                        : "border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200"
                    }`}
                  >
                    {active && <i className="fa-solid fa-check mr-1.5 text-xs"></i>}
                    {month}
                  </button>
                );
              })}
            </div>
            {selectedMonths.length > 0 && (
              <p className="mt-3 text-sm text-base-content/70">
                <i className="fa-solid fa-circle-check mr-1.5 text-success"></i>
                {selectedMonths.length} month(s) selected
              </p>
            )}
          </SectionCard>
        )}

        {/* 4. Fee details */}
        {selectedStudent && (isLoadingFees || availableFees.length > 0 || annualFees.length > 0) && (
          <SectionCard
            icon="fa-receipt"
            title="Fee Details"
            subtitle={`For ${selectedStudent.student_name || selectedStudent.name}`}
          >
            {isLoadingFees ? (
              <Loader label="Loading fee details..." />
            ) : (
              <div className="space-y-8">
                {annualRows.length > 0 && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold sm:text-lg">Annual Fees</h3>
                      <button
                        type="button"
                        onClick={handleSelectAllAnnualFees}
                        className="btn btn-sm btn-outline btn-secondary"
                      >
                        {selectedFeeIds.length === annualFees.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <FeeList rows={annualRows} showSelect />
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-base font-semibold sm:text-lg">
                    Monthly Tuition Fees
                    {selectedMonths.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-base-content/60">
                        ({selectedMonths.length} selected)
                      </span>
                    )}
                  </h3>
                  {monthlyRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-base-300 py-6 text-center text-sm text-base-content/60">
                      {selectedMonths.length === 0
                        ? "Please select months from above to view tuition fees."
                        : "No tuition fees found for the selected months."}
                    </div>
                  ) : (
                    <FeeList rows={monthlyRows} firstColumnLabel="Month" />
                  )}
                </div>

                {hasSelectedFees && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                        Payment Summary
                      </p>
                      <p className="text-sm font-medium sm:text-base">Total Payable Now</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
                      {inr(totalAmount)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        )}

        {!isLoadingFees &&
          availableFees.length === 0 &&
          annualFees.length === 0 &&
          selectedStudentId && (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 py-8 text-center text-sm text-base-content/60">
              No fees found for the selected student and year.
            </div>
          )}

        {/* 5. Payment details */}
        <SectionCard
          icon="fa-credit-card"
          title="Payment Details"
          subtitle="Choose how the payment was made and confirm the amount"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            <Field
              label="Payment Mode"
              icon="fa-wallet"
              required
              error={errors.payment_mode?.message}
              hint={!selectedStudentId ? "Select a student first" : null}
            >
              {(() => {
                const paymentModeField = register("payment_mode", {
                  required: "Payment mode is required",
                });
                return (
                  <select
                    className={`select w-full text-base focus:outline-none ${
                      errors.payment_mode ? "select-error" : "select-bordered"
                    }`}
                    {...paymentModeField}
                    disabled={!selectedStudentId}
                    onChange={(e) => {
                      // keep react-hook-form in sync, then apply our own logic
                      paymentModeField.onChange(e);
                      setPaymentDate(getTodayString());
                    }}
                  >
                    <option value="">Select Payment Mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </Field>

            {selectedPaymentMode && selectedPaymentMode !== "online" && (
              <Field
                label="Payment Date"
                icon="fa-calendar-day"
                required
                hint={
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span>Defaults to today · time is set automatically</span>
                    {paymentDate !== todayStr && (
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => setPaymentDate(todayStr)}
                      >
                        Reset to today
                      </button>
                    )}
                  </div>
                }
              >
                <input
                  type="date"
                  className="input input-bordered w-full text-base focus:outline-none"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={todayStr}
                />
              </Field>
            )}

            <Field label="Paid Amount" icon="fa-calculator" required error={errors.paid_amount?.message}>
              <input
                type="text"
                inputMode="decimal"
                className={`input w-full text-base focus:outline-none ${
                  errors.paid_amount ? "input-error" : "input-bordered"
                }`}
                {...register("paid_amount", {
                  required: "Amount is required",
                  validate: (v) => parseFloat(v) > 0 || "Amount must be greater than 0",
                })}
                value={watchedPaidAmount || ""}
                onChange={handlePaidAmountChange}
                placeholder="Enter amount to pay"
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-base-content/60">Total payable: {inr(totalAmount)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setManualPaidAmount(totalAmount.toFixed(2));
                    setValue("paid_amount", totalAmount.toFixed(2), { shouldValidate: true });
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  <i className="fa-solid fa-fill-drip mr-1"></i>
                  Auto-fill
                </button>
              </div>
              {paidNumber > totalAmount && (
                <p className="mt-1 text-xs font-medium text-success">
                  <i className="fa-solid fa-arrow-up mr-1"></i>
                  Advance payment: {inr(paidNumber - totalAmount)} extra
                </p>
              )}
              {paidNumber > 0 && paidNumber < totalAmount && (
                <p className="mt-1 text-xs font-medium text-warning">
                  <i className="fa-solid fa-circle-info mr-1"></i>
                  Partial payment: {inr(totalAmount - paidNumber)} will remain due
                </p>
              )}
            </Field>

            {selectedPaymentMode === "cheque" && (
              <Field
                label="Cheque Number"
                icon="fa-file-invoice"
                required
                error={errors.cheque_number?.message}
              >
                <input
                  type="text"
                  className={`input w-full text-base focus:outline-none ${
                    errors.cheque_number ? "input-error" : "input-bordered"
                  }`}
                  {...register("cheque_number", {
                    required: selectedPaymentMode === "cheque" ? "Cheque number is required" : false,
                    minLength: {
                      value: 3,
                      message: "Cheque number must be at least 3 characters",
                    },
                    maxLength: {
                      value: 50,
                      message: "Cheque number cannot exceed 50 characters",
                    },
                    pattern: {
                      value: /^[A-Za-z0-9-]+$/,
                      message: "Only letters, numbers and hyphens are allowed",
                    },
                  })}
                  placeholder="Enter cheque number"
                  disabled={!hasSelectedFees || !isPaymentModeSelected}
                />
              </Field>
            )}

            <Field
              label="Remarks"
              icon="fa-comment"
              required
              error={errors.remarks?.message}
              className="md:col-span-2"
            >
              <input
                type="text"
                maxLength={25}
                className={`input w-full text-base focus:outline-none ${
                  errors.remarks ? "input-error" : "input-bordered"
                }`}
                {...register("remarks", {
                  required: "Remarks are required",
                  minLength: {
                    value: 3,
                    message: "Remarks must be at least 3 characters long",
                  },
                  maxLength: {
                    value: 25,
                    message: "Remarks cannot exceed 25 characters",
                  },
                })}
                placeholder="Enter any remarks"
                disabled={!hasSelectedFees || !isPaymentModeSelected}
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col items-stretch gap-3 border-t border-base-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Amount being paid</p>
              <p className="text-xl font-bold tabular-nums">{inr(paidNumber)}</p>
            </div>
            <button
              type="submit"
              className={`btn bgTheme w-full text-white sm:w-auto sm:min-w-[13rem] ${
                isSubmitDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-purple-700"
              }`}
              disabled={isSubmitDisabled}
            >
              {isSubmitting || isRedirecting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fa-solid fa-money-bill-wave mr-2"></i>
              )}
              {isRedirecting ? "Redirecting..." : isSubmitting ? "Processing..." : "Submit Payment"}
            </button>
          </div>
        </SectionCard>
      </form>

      {/* Advance payment dialog */}
      {showAdvancePaymentDialog && advancePaymentData && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeAdvancePaymentDialog}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-base-100 p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <i className="fa-solid fa-circle-plus"></i>
              </span>
              <h3 className="text-lg font-bold sm:text-xl">Advance Payment Detected</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-base-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-base-content/60">Paying</p>
                <p className="text-sm font-semibold tabular-nums">{inr(advancePaymentData.paidAmount)}</p>
              </div>
              <div className="rounded-lg bg-base-200 p-2">
                <p className="text-[11px] uppercase tracking-wide text-base-content/60">Payable</p>
                <p className="text-sm font-semibold tabular-nums">{inr(advancePaymentData.totalPayable)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <p className="text-[11px] uppercase tracking-wide text-base-content/60">Excess</p>
                <p className="text-sm font-semibold tabular-nums text-primary">
                  {inr(advancePaymentData.advanceAmount)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-base-content/80">
              The amount exceeds the total payable. Where would you like to adjust the excess amount?
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleAdvanceAdjustment("amount_fee")}
                className="btn w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                Adjust in Amount Fee
              </button>
              <button
                type="button"
                onClick={() => handleAdvanceAdjustment("activity_fee")}
                className="btn w-full bg-purple-600 text-white hover:bg-purple-700"
              >
                Adjust in Activity Fee
              </button>
              <button type="button" onClick={closeAdvancePaymentDialog} className="btn btn-outline w-full">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentDialog && paymentStatus && (
        <PaymentStatusDialog
          paymentStatus={paymentStatus}
          onClose={() => {
            setShowPaymentDialog(false);
            setPaymentStatus(null);
            window.location.reload();
          }}
        />
      )}

      {showPaymentDialog1 && paymentStatus && (
        <PaymentStatusDialogOffline
          paymentStatus={paymentStatus}
          onClose={() => {
            setShowPaymentDialog1(false);
            setPaymentStatus(null);
            window.location.reload();
          }}
        />
      )}

      {showReceiptModal && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptData(null);
            window.location.reload();
          }}
          isLoading={isLoadingReceipt}
        />
      )}
    </div>
  );
};