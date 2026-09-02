import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { constants } from "../../global/constants";
import PaymentStatusDialog from "./PaymentStatusDialog";
import PaymentStatusDialogOffline from "./PaymentStatusDialogOffline";
import { fetchSchoolYear, fetchStudents1 } from "../../services/api/Api";
import ReceiptModal from "./ReceiptModal";
import { AuthContext } from "../../context/AuthContext";

// ----- Helper: Format date with current time to ISO format (YYYY-MM-DDTHH:MM:SS) -----
const formatDateWithCurrentTime = (dateString) => {
  if (!dateString) return null;
  
  const now = new Date();
  const dateObj = new Date(dateString);
  dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  
  if (isNaN(dateObj.getTime())) return null;
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// ----- Helper: each month as separate group (no grouping) -----
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

// ----- Helper: Get all monthly groups from available fees (including all months) -----
const getAllMonthlyGroups = (availableFees) => {
  const groups = [];
  if (!availableFees || availableFees.length === 0) return groups;
  
  availableFees.forEach((monthData) => {
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

// ----- Helper: Extract month name and year from "Month Year" format -----
const parseMonthYear = (monthYearStr) => {
  if (!monthYearStr) return { month: "", year: "" };
  const parts = monthYearStr.trim().split(' ');
  const month = parts[0] || "";
  const year = parts.length > 1 ? parts[1] : "";
  return { month, year };
};

// ----- Helper: Check if two month strings match -----
const doMonthsMatch = (month1, month2) => {
  if (!month1 || !month2) return false;
  const parsed1 = parseMonthYear(month1);
  const parsed2 = parseMonthYear(month2);
  if (parsed1.year && parsed2.year) {
    const year1 = parsed1.year.padStart(4, '20');
    const year2 = parsed2.year.padStart(4, '20');
    if (year1 !== year2) return false;
  }
  return parsed1.month.toLowerCase() === parsed2.month.toLowerCase();
};

// ----- Helper: Check if a month is selected -----
const isMonthSelected = (monthFromData, selectedMonths) => {
  if (!monthFromData || !selectedMonths || selectedMonths.length === 0) return false;
  return selectedMonths.some(selectedMonth => {
    return doMonthsMatch(monthFromData, selectedMonth);
  });
};

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
  const [paymentDate, setPaymentDate] = useState("");

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
    const cls = classes.find(c => c.id === parseInt(selectedClassId));
    return cls ? cls.level_name : "";
  };

  const getTermMonths = () => {
    if (!selectedSchYear) return { from: "July", to: "June" };
    const sy = schoolYear.find(s => s.id === parseInt(selectedSchYear));
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
    const sy = schoolYear.find(s => s.id === parseInt(selectedSchYear));
    return sy ? sy.year_name : "";
  };

  const isClass11Or12 = () => {
    if (!selectedClassId) return false;
    const cls = classes.find(c => c.id === parseInt(selectedClassId));
    if (!cls || !cls.level_name) return false;
    const levelName = cls.level_name.toLowerCase();
    return levelName.includes("class 11") || levelName.includes("class 12");
  };

  const getStreamFromSection = (section) => {
    if (!section) return null;
    const sectionUpper = section.toUpperCase().trim();
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
      "July", "August", "September", "October", "November", "December"
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
        const collectAmount = annualCollectAmounts[fee.fee_id];
        if (collectAmount !== undefined && collectAmount !== null && collectAmount > 0) {
          annualTotal += parseFloat(collectAmount);
        } else {
          annualTotal += parseFloat(fee.due_amount) || 0;
        }
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
    const total = annualTotal + monthlyTotal;
    return parseFloat(total.toFixed(2));
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
          // Do not fetch here — fetching is handled by the effect that
          // watches `studentYearId`, `selectedSchYear`, and `studentStream`.
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
    return availableFees.filter(monthData => {
      const matches = isMonthSelected(monthData.month, selectedMonths);
      return matches;
    });
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
      const key = `${studentId}_${selectedSchYear}_${stream || ''}`;
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
      if (feePreviewRes.data && typeof feePreviewRes.data === 'object') {
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
      const studentData = Array.isArray(response.data) ? response.data :
        (response.data.results ? response.data.results : []);
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

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    reset({
      student_id: "",
      month: "",
      paid_amount: "",
      payment_mode: "",
      remarks: "",
      received_by: "",
    });
    setSelectedFeeIds([]);
    setSelectedStudent(null);
    setStudentYearId(null);
    setAvailableFees([]);
    setAnnualFees([]);
    setApiError("");
    setSelectedStudentName("");
    setSelectedGroups({});
    setStudents([]);
    setStudentStream("");
    setSection("");
    setParentName("");
    setSelectedMonths([]);
    setAnnualCollectAmounts({});
    setManualPaidAmount("");
    setAdvancePaymentData(null);
    setShowAdvancePaymentDialog(false);
    setPaymentDate("");
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
      setSelectedFeeIds([]);
      setSelectedGroups({});
      setAnnualCollectAmounts({});
      setManualPaidAmount("");
      setPaymentDate("");
    }
  }, [studentStream]);

  useEffect(() => {
    setSelectedFeeIds([]);
    setSelectedGroups({});
    setAnnualCollectAmounts({});
    setManualPaidAmount("");
    setAdvancePaymentData(null);
    setShowAdvancePaymentDialog(false);
    setPaymentDate("");
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
          const due = parseFloat(group.fee.due_amount) || 0;
          newGroups[group.id] = {
            checked: true,
            collectAmount: due,
          };
        } else {
          newGroups[group.id] = selectedGroups[group.id];
        }
      });
      if (shouldUpdate) {
        setSelectedGroups(prev => ({ ...prev, ...newGroups }));
      }
    }
  }, [monthlyGroups]);

  useEffect(() => {
    if (annualFees.length > 0) {
      const initialCollectAmounts = {};
      annualFees.forEach((fee) => {
        const due = parseFloat(fee.due_amount) || 0;
        initialCollectAmounts[fee.fee_id] = due;
      });
      setAnnualCollectAmounts(prev => {
        if (Object.keys(prev).length === 0) {
          return initialCollectAmounts;
        }
        return prev;
      });
    }
  }, [annualFees]);

  const handleAnnualFeeSelect = (feeId) => {
    setSelectedFeeIds(prev => {
      if (prev.includes(feeId)) {
        return prev.filter(id => id !== feeId);
      } else {
        return [...prev, feeId];
      }
    });
  };

  const handleSelectAllAnnualFees = () => {
    if (selectedFeeIds.length === annualFees.length) {
      setSelectedFeeIds([]);
    } else {
      const allFeeIds = annualFees.map(fee => fee.fee_id);
      setSelectedFeeIds(allFeeIds);
    }
  };

  const handleAnnualCollectChange = (feeId, value) => {
    const fee = annualFees.find(f => f.fee_id === feeId);
    if (!fee) return;
    const due = parseFloat(fee.due_amount) || 0;
    if (value === '' || value === null || value === undefined) {
      setAnnualCollectAmounts(prev => ({
        ...prev,
        [feeId]: 0,
      }));
      return;
    }
    const inputValue = parseFloat(value);
    if (isNaN(inputValue)) {
      return;
    }
    const collectAmount = Math.min(Math.max(0, inputValue), due);
    setAnnualCollectAmounts(prev => ({
      ...prev,
      [feeId]: collectAmount,
    }));
  };

  const handleMonthSelection = (month) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };

  const handleSelectAllMonths = () => {
    if (selectedMonths.length === sessionMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([...sessionMonths]);
    }
  };

  const handleGroupCollectChange = (groupId, value) => {
    const group = monthlyGroups.find((g) => g.id === groupId);
    if (!group) return;
    const due = parseFloat(group.fee.due_amount) || 0;
    if (value === '' || value === null || value === undefined) {
      setSelectedGroups((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          collectAmount: 0,
        },
      }));
      return;
    }
    const inputValue = parseFloat(value);
    if (isNaN(inputValue)) {
      return;
    }
    const collectAmount = Math.min(Math.max(0, inputValue), due);
    setSelectedGroups((prev) => {
      const updated = {
        ...prev,
        [groupId]: {
          ...prev[groupId],
          collectAmount: collectAmount,
        },
      };
      return updated;
    });
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
    setManualPaidAmount(value);
    setValue("paid_amount", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data) => {
    const annualSelected = annualFees.filter((fee) =>
      selectedFeeIds.includes(fee.fee_id)
    );
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
    const paidAmount = parseFloat(data.paid_amount) || 0;
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
      const advanceAmount = paidAmount - totalPayable;
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
        paymentDate
      });
      setShowAdvancePaymentDialog(true);
      return;
    }
    await processPayment(paymentMode, chequeNumber, schoolYearId, paidAmount, annualSelected, monthlySelected, data, null, paymentDate);
  };

  const processPayment = async (paymentMode, chequeNumber, schoolYearId, paidAmount, annualSelected, monthlySelected, data, advanceAdjustment = null, paymentDateParam = null) => {
    const fees = [];
    let remainingAmount = paidAmount;
    annualSelected.forEach((fee) => {
      const dueAmount = parseFloat(annualCollectAmounts[fee.fee_id]) || 0;
      if (dueAmount > 0 && remainingAmount > 0) {
        const amountToPay = Math.min(dueAmount, remainingAmount);
        if (amountToPay > 0) {
          fees.push({
            fee_type_id: fee.fee_id,
            month: null,
            amount: amountToPay,
          });
          remainingAmount -= amountToPay;
        }
      }
    });
    monthlySelected.forEach((group) => {
      const sel = selectedGroups[group.id];
      const dueAmount = parseFloat(sel.collectAmount) || 0;
      if (dueAmount > 0 && remainingAmount > 0) {
        const amountToPay = Math.min(dueAmount, remainingAmount);
        if (amountToPay > 0) {
          const monthMap = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12
          };
          const monthName = group.monthNames[0]?.split(' ')[0] || "";
          const monthId = monthMap[monthName] || 0;
          if (monthId >= 1 && monthId <= 12) {
            fees.push({
              fee_type_id: group.fee.fee_id,
              month: monthId,
              amount: amountToPay,
            });
            remainingAmount -= amountToPay;
          }
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
    if (paymentMode !== "online" && paymentDateParam) {
      const formattedDate = formatDateWithCurrentTime(paymentDateParam);
      if (formattedDate) {
        payload.payment_date = formattedDate;
        console.log("Formatted payment date:", formattedDate);
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        payload.payment_date = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        console.log("Fallback payment date:", payload.payment_date);
      }
    }
    if (advanceAdjustment) {
      payload.advance_adjustment = advanceAdjustment;
    }
    console.log("Submitting payload:", payload);
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
        const errorMsg = typeof err.response.data === 'object'
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
      paymentDate: advPaymentDate
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

  const isPaymentModeSelected = !!selectedPaymentMode;
  const totalAmount = calculateTotalAmount();
  const isPaymentDateRequired = selectedPaymentMode && selectedPaymentMode !== "online" && !paymentDate;
  const isSubmitDisabled =
    isSubmitting ||
    (selectedFeeIds.length === 0 &&
      !Object.values(selectedGroups).some((g) => g && g.checked && g.collectAmount > 0)) ||
    !isPaymentModeSelected ||
    !watchedPaidAmount ||
    parseFloat(watchedPaidAmount) <= 0 ||
    isPaymentDateRequired;

  const stuId = window.localStorage.getItem("student_id");
  const stuYearlvlName = localStorage.getItem("stu_year_level_name");
  const stuYearlvlId = localStorage.getItem("stu_year_level_id");

  if (isLoading && !apiError) {
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

  if (isLoadingFees && !apiError) {
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

  if (apiError) {
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
      <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900">
        <form
          className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm focus:outline-none"
          onSubmit={handleSubmit(onSubmit)}
        >
          <h1 className="text-3xl font-bold text-center mb-8">
            Fee Payment
            <i className="fa-solid fa-money-bill-wave ml-2"></i>
          </h1>

          {isClass11Or12() && studentStream && selectedStudent && (
            <div className="alert alert-info mb-4">
              <i className="fa-solid fa-info-circle"></i>
              <span>Stream: <strong>{studentStream}</strong> (Fee structure loaded for this stream)</span>
            </div>
          )}

          {/* Stream dropdown moved into the Section card below for better layout */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-school text-sm"></i>
                  School Year <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                onChange={(e) => setselectedSchYear(e.target.value)}
                value={selectedSchYear || ""}
              >
                <option value="">Select Year</option>
                {schoolYear?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-school text-sm"></i>
                  Class <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                onChange={handleClassChange}
                value={selectedClassId || ""}
              >
                <option value="">Select Class</option>
                {UserRole === "director"
                  ? classes?.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.level_name}
                    </option>
                  ))
                  : UserRole === "office staff"
                    ? classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.level_name}
                      </option>
                    ))
                    : UserRole === "guardian"
                      ? classes?.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.level_name}
                        </option>
                      ))
                      : null}
                {UserRole === "student" && (
                  <option key={stuYearlvlId} value={stuYearlvlId}>
                    {stuYearlvlName}
                  </option>
                )}
              </select>
            </div>

            <div className="form-control relative" ref={dropdownRef}>
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-user-graduate text-sm"></i>
                  Student <span className="text-error">*</span>
                </span>
              </label>
              <div
                className={`input input-bordered w-full flex items-center justify-between cursor-pointer ${!selectedClassId || !selectedSchYear ? "cursor-not-allowed opacity-70" : ""
                  }`}
                disabled={!selectedClassId || !selectedSchYear}
                onClick={() => {
                  if (selectedClassId && selectedSchYear)
                    setShowStudentDropdown(!showStudentDropdown);
                }}
              >
                {selectedStudentName || "Select Student"}
                <div>
                  <span className="arrow">&#9662;</span>
                </div>
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
                <div className="absolute z-10 bg-white text-gray-700 dark:bg-[#191b1b] dark:text-amber-50 rounded w-full mt-1 shadow-lg">
                  <div className="p-2 sticky top-0 dark:bg-[#1c1f1f] shadow-sm bg-base-100">
                    <input
                      type="text"
                      placeholder="Search Student by Name or Scholar No..."
                      className="input input-bordered w-full focus:outline-none"
                      value={searchStudentInput}
                      onChange={(e) => setSearchStudentInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {isLoading ? (
                      <p className="p-2">Loading students...</p>
                    ) : filteredStudents?.length > 0 ? (
                      filteredStudents.map((stu) => {
                        const studentYearIdForOption = stu.id;
                        const studentName = stu.student_name || stu.name || "Unknown";
                        const scholarNo = stu.scholar_number || "";
                        const sectionDisplay = stu.section ? ` (${stu.section})` : "";
                        return (
                          <p
                            key={studentYearIdForOption}
                            className="p-2 hover:bg-base-200 cursor-pointer"
                            onClick={() => {
                              const displayName = `${studentName}${scholarNo ? ` - ${scholarNo}` : ''}${sectionDisplay}`;
                              setSelectedStudentName(displayName);
                              setSearchStudentInput("");
                              setShowStudentDropdown(false);
                              // set the form value to the student-year id (unique) and let the
                              // effect that watches the form value update selectedStudent and studentYearId.
                              setValue("student_id", studentYearIdForOption, {
                                shouldValidate: true,
                              });
                              clearErrors("student_id");
                              // reset dependent UI state; don't set selectedStudent/studentYearId here
                              // to avoid duplicate updates and duplicate fee-preview API calls
                              setSelectedFeeIds([]);
                              setSelectedGroups({});
                              setAnnualCollectAmounts({});
                              setManualPaidAmount("");
                              setPaymentDate("");
                              if (stu.section) {
                                setSection(stu.section);
                              }
                            }}
                          >
                            {studentName}{scholarNo ? ` - ${scholarNo}` : ''}{sectionDisplay}
                          </p>
                        );
                      })
                    ) : (
                      <p className="p-2">No students found for this class and year.</p>
                    )}
                  </div>
                </div>
              )}
              {errors.student_id && (
                <p className="text-error text-sm mt-1">
                  {errors.student_id.message}
                </p>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Payment Mode <span className="text-error">*</span>
                </span>
              </label>
              <select
                className={`select w-full focus:outline-none ${errors.payment_mode ? "select-error" : "select-bordered"
                  }`}
                {...register("payment_mode", {
                  required: "Payment mode is required",
                })}
                disabled={!selectedStudentId}
                onChange={(e) => {
                  if (e.target.value === "online") {
                    setPaymentDate("");
                  }
                }}
              >
                <option value="">Select Payment Mode</option>
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              {errors.payment_mode && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.payment_mode.message}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* PAYMENT DATE FIELD - FEES SELECTION SE INDEPENDENT */}
          {/* Jaise hi non-online payment mode select ho, yeh turant dikhega */}
          {/* ============================================================ */}
          {selectedPaymentMode && selectedPaymentMode !== "online" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <i className="fa-solid fa-calendar-day text-sm"></i>
                    Payment Date <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full focus:outline-none"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                {!paymentDate && (
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      Please select a payment date (time will be auto-set)
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {selectedStudent && selectedSchYear && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mt-6 border-2 border-blue-200 shadow-lg">
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fa-solid fa-user text-blue-600"></i>
                  Parent's Name
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full focus:outline-none bg-gray-100 cursor-not-allowed mt-1 font-medium text-gray-800"
                  value={parentName}
                  disabled
                  readOnly
                  placeholder="Parent name will auto-populate"
                />
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-green-600"></i>
                  Grade
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full focus:outline-none bg-gray-100 cursor-not-allowed mt-1 font-medium text-gray-800"
                  value={grade}
                  disabled readOnly
                  placeholder="Grade will auto-populate"
                />
              </div>
              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-purple-600"></i>
                  Section
                </label>
                {/* For Class 11/12 students show an editable stream selector so user can change selection */}
                {isClass11Or12() && selectedStudent && !getStreamFromSection(section) && (
                  <div className="mt-1">
                    <select
                      className="select select-bordered w-full focus:outline-none"
                      value={studentStream || ""}
                      onChange={(e) => setStudentStream(e.target.value)}
                    >
                      <option value="">Select Stream</option>
                      <option value="PCM">PCM (Physics, Chemistry, Maths)</option>
                      <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                      <option value="COMM">COMM (Commerce)</option>
                      <option value="ARTS">ARTS (Arts)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Pick or change stream to load stream-specific fees</p>
                  </div>
                )}
                {/* Always show section (read-only) */}
                <input
                  type="text"
                  className="input input-bordered w-full focus:outline-none bg-gray-100 cursor-not-allowed mt-3 font-medium text-gray-800"
                  value={section}
                  disabled
                  readOnly
                  placeholder="Section will auto-populate"
                />
              </div>
            </div>
          )}

          {selectedStudent && sessionMonths.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  <i className="fa-solid fa-calendar mr-2"></i>
                  Select Months for Tuition Fees
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className="btn btn-sm btn-outline btn-primary"
                >
                  {selectedMonths.length === sessionMonths.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sessionMonths.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthSelection(month)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${selectedMonths.includes(month)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <i className="fa-solid fa-check-circle text-green-500 mr-1"></i>
                  {selectedMonths.length} month(s) selected
                </div>
              )}
            </div>
          )}

          {(availableFees.length > 0 || annualFees.length > 0) &&
            selectedStudent && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
                  Fee Details for {selectedStudent.student_name || selectedStudent.name}
                </h2>

                {annualFees.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">Annual Fees</h3>
                      <button
                        type="button"
                        onClick={handleSelectAllAnnualFees}
                        className="btn btn-sm btn-outline btn-secondary"
                      >
                        {selectedFeeIds.length === annualFees.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table w-full border">
                        <thead className="bg-base-200">
                          <tr>
                            <th className="w-12">Select</th>
                            <th>Fee Type</th>
                            <th>Original</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Amount to Collect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {annualFees.map((fee) => {
                            const original = parseFloat(fee.original_amount) || 0;
                            const paid = parseFloat(fee.paid_amount) || 0;
                            const due = parseFloat(fee.due_amount) || 0;
                            const isSelected = selectedFeeIds.includes(fee.fee_id);
                            const isPaid = due <= 0;
                            const collectAmount = annualCollectAmounts[fee.fee_id] || 0;

                            return (
                              <tr key={fee.fee_id} className="hover">
                                <td>
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={isSelected}
                                    onChange={() => handleAnnualFeeSelect(fee.fee_id)}
                                    disabled={isPaid}
                                  />
                                </td>
                                <td className="font-medium">{fee.fee_type}</td>
                                <td>₹{original.toFixed(2)}</td>
                                <td>₹{paid.toFixed(2)}</td>
                                <td className={due > 0 ? "text-warning font-semibold" : ""}>
                                  ₹{due.toFixed(2)}
                                </td>
                                <td>
                                  {fee.status === "Paid" ? (
                                    <span className="badge badge-success text-gray-900 dark:text-white">
                                      Paid
                                    </span>
                                  ) : fee.status === "Partial" ? (
                                    <span className="badge badge-warning text-gray-900 dark:text-white">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="badge badge-error text-gray-900 dark:text-white">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      className="input input-bordered input-sm w-24 focus:outline-none"
                                      min="0"
                                      max={due}
                                      step="1"
                                      value={collectAmount}
                                      onChange={(e) =>
                                        handleAnnualCollectChange(
                                          fee.fee_id,
                                          e.target.value
                                        )
                                      }
                                      disabled={isPaid || !isSelected}
                                    />
                                    {due > 0 && (
                                      <span className="text-xs text-gray-500">
                                        (max: ₹{due.toFixed(0)})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold mb-4">
                    Monthly Tuition Fees
                    {selectedMonths.length > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Showing {selectedMonths.length} selected months)
                      </span>
                    )}
                  </h3>
                  {monthlyGroups.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      {selectedMonths.length === 0
                        ? "Please select months from above to view tuition fees."
                        : "No Tuition fees found for the selected months."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table w-full border">
                        <thead className="bg-base-200">
                          <tr>
                            <th>Month</th>
                            <th>Fee Type</th>
                            <th>Original</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Amount to Collect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyGroups.map((group) => {
                            const due = parseFloat(group.fee.due_amount) || 0;
                            const original = parseFloat(group.fee.original_amount) || 0;
                            const paid = parseFloat(group.fee.paid_amount) || 0;
                            const status = group.fee.status;
                            const sel = selectedGroups[group.id] || {
                              checked: true,
                              collectAmount: due,
                            };
                            const isPaid = due <= 0;

                            return (
                              <tr key={group.id} className="hover">
                                <td className="font-semibold">{group.label}</td>
                                <td>{group.fee.fee_type}</td>
                                <td>₹{original.toFixed(2)}</td>
                                <td>₹{paid.toFixed(2)}</td>
                                <td className={due > 0 ? "text-warning font-semibold" : ""}>
                                  ₹{due.toFixed(2)}
                                </td>
                                <td>
                                  {status === "Paid" ? (
                                    <span className="badge badge-success text-gray-900 dark:text-white">
                                      Paid
                                    </span>
                                  ) : status === "Partial" ? (
                                    <span className="badge badge-warning text-gray-900 dark:text-white">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="badge badge-error text-gray-900 dark:text-white">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      className="input input-bordered input-sm w-24 focus:outline-none"
                                      min="0"
                                      max={due}
                                      step="1"
                                      value={sel.collectAmount}
                                      onChange={(e) =>
                                        handleGroupCollectChange(
                                          group.id,
                                          e.target.value
                                        )
                                      }
                                      disabled={isPaid}
                                    />
                                    {due > 0 && (
                                      <span className="text-xs text-gray-500">
                                        (max: ₹{due.toFixed(0)})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {(selectedFeeIds.length > 0 ||
                  Object.values(selectedGroups).some((g) => g && g.checked && g.collectAmount > 0)) && (
                    <div className="bg-base-300 p-4 rounded-lg mt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Payment Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-bold text-lg mt-2 border-t pt-2">
                          Total Payable Now:
                        </div>
                        <div className="text-right font-bold text-lg mt-2 border-t pt-2 text-primary">
                          ₹{totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

          {!isLoadingFees &&
            availableFees.length === 0 &&
            annualFees.length === 0 &&
            selectedStudentId && (
              <div className="text-center mt-8 text-gray-500">
                No fees found for the selected student and year.
              </div>
            )}

          <div
            className={`grid gap-6 mt-6 ${selectedPaymentMode === "cheque"
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2"
              }`}
          >
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-sm"></i>
                  Paid Amount <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                className={`input w-full focus:outline-none ${errors.paid_amount ? "input-error" : "input-bordered"
                  }`}
                {...register("paid_amount", {
                  required: "Amount is required",
                  min: { value: 0.01 },
                })}
                value={watchedPaidAmount || ""}
                onChange={handlePaidAmountChange}
                step="1"
                placeholder="Enter amount to pay"
              />
              {errors.paid_amount && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.paid_amount.message}
                  </span>
                </label>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  Total Payable: ₹{totalAmount.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setManualPaidAmount(totalAmount.toFixed(2));
                    setValue("paid_amount", totalAmount.toFixed(2));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <i className="fa-solid fa-fill-drip mr-1"></i>
                  Auto-fill
                </button>
              </div>
              {watchedPaidAmount && parseFloat(watchedPaidAmount) > totalAmount && (
                <div className="mt-1 text-xs text-green-600 font-medium">
                  <i className="fa-solid fa-arrow-up mr-1"></i>
                  Advance Payment: ₹{(parseFloat(watchedPaidAmount) - totalAmount).toFixed(2)} extra
                </div>
              )}
              {watchedPaidAmount && parseFloat(watchedPaidAmount) < totalAmount && parseFloat(watchedPaidAmount) > 0 && (
                <div className="mt-1 text-xs text-orange-600 font-medium">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Partial Payment: ₹{(totalAmount - parseFloat(watchedPaidAmount)).toFixed(2)} will remain due
                </div>
              )}
            </div>

            {selectedPaymentMode === "cheque" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <i className="fa-solid fa-file-invoice text-sm"></i>
                    Cheque Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  className={`input w-full focus:outline-none ${errors.cheque_number ? "input-error" : "input-bordered"
                    }`}
                  {...register("cheque_number", {
                    required:
                      selectedPaymentMode === "cheque"
                        ? "Cheque number is required"
                        : false,
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
                  disabled={
                    (selectedFeeIds.length === 0 &&
                      !Object.values(selectedGroups).some((g) => g && g.checked && g.collectAmount > 0)) ||
                    !isPaymentModeSelected
                  }
                />
                {errors.cheque_number && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.cheque_number.message}
                    </span>
                  </label>
                )}
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-comment text-sm"></i>
                  Remarks <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                maxLength={25}
                className={`input w-full focus:outline-none ${errors.remarks ? "input-error" : "input-bordered"
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
                disabled={
                  (selectedFeeIds.length === 0 &&
                    !Object.values(selectedGroups).some((g) => g && g.checked && g.collectAmount > 0)) ||
                  !isPaymentModeSelected
                }
              />
              {errors.remarks && (
                <label className="label">
                  <span className="label-text-alt text-sm text-error">
                    {errors.remarks.message}
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className={`btn bgTheme text-white w-52 ${isSubmitDisabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-purple-700"
                }`}
              disabled={isSubmitDisabled}
            >
              {isSubmitting || isRedirecting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fa-solid fa-money-bill-wave ml-2"></i>
              )}
              {isSubmitting || isRedirecting
                ? "Redirecting..."
                : "Submit Payment"}
            </button>
          </div>
        </form>

        {showAdvancePaymentDialog && advancePaymentData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Advance Payment Detected
              </h3>
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300">
                  You are trying to pay <strong>₹{advancePaymentData.paidAmount.toFixed(2)}</strong> which exceeds the total payable amount of <strong>₹{advancePaymentData.totalPayable.toFixed(2)}</strong>.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  The excess amount is <strong className="text-blue-600">₹{advancePaymentData.advanceAmount.toFixed(2)}</strong>.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  Where would you like to adjust this advance amount?
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleAdvanceAdjustment('amount_fee')}
                  className="btn bg-blue-600 text-white hover:bg-blue-700 w-full"
                >
                  Adjust in Amount Fee
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvanceAdjustment('activity_fee')}
                  className="btn bg-purple-600 text-white hover:bg-purple-700 w-full"
                >
                  Adjust in Activity Fee
                </button>
                <button
                  type="button"
                  onClick={closeAdvancePaymentDialog}
                  className="btn btn-outline w-full"
                >
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
    </div>
  );
};