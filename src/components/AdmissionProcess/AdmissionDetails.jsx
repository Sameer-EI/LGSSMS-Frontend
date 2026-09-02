import React, { useContext, useEffect, useState, useRef } from "react";
import {
  // fetchAdmissionDetails, // Remove this import
  fetchYearLevels,
  deactivateStudents,
  fetchInactiveStudents,
  reactivateStudents,
} from "../../services/api/Api";
import { Link } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const AdmissionDetails = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [yearLevels, setYearLevels] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [error, setError] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const dropdownRef = useRef(null);
  const [studentData, setStudentData] = useState([]);

  // Delete States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("TC");
  const [customReason, setCustomReason] = useState("");
  const [showCustomReasonInput, setShowCustomReasonInput] = useState(false);

  // Result Modal
  const [resultModal, setResultModal] = useState(null);

  // Inactive Students States
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveStudents, setInactiveStudents] = useState([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);

  // --------------------------------------------------------------
  // Helper to normalize API responses (array or object)
  // --------------------------------------------------------------
  const normalizeStudents = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    if (typeof data === "object") {
      if ("student_id" in data || "student_name" in data) return [data];
      const vals = Object.values(data).filter(
        (v) =>
          v &&
          typeof v === "object" &&
          ("student_id" in v || "student_name" in v)
      );
      if (vals.length) return vals;
    }
    return [];
  };

  // --------------------------------------------------------------
  // Fetch all student data from the new API endpoint
  // --------------------------------------------------------------
  const fetchAllStudentData = async () => {
    try {
      const res = await axiosInstance.get("s/students/student_details/");
      return normalizeStudents(res.data);
    } catch (err) {
      console.error("Error fetching all students for download:", err);
      alert("Failed to load complete data. Please try again.");
      return [];
    }
  };

  // --------------------------------------------------------------
  // Fetch admission details from the new API endpoint
  // --------------------------------------------------------------
  const getAdmissionDetails = async () => {
    try {
      setLoading(true);
      // Directly fetch from the new API endpoint
      const response = await axiosInstance.get("s/students/student_details/");
      const data = normalizeStudents(response.data);
      setDetails(data);
      setStudentData(data); // Use the same data for downloads
      setLoading(false);
    } catch (error) {
      console.log("Failed to fetch admission details", error);
      setError(true);
      setLoading(false);
    }
  };

  const getYearLevels = async () => {
    try {
      const data = await fetchYearLevels();
      setYearLevels(data);
    } catch (error) {
      console.log("failed to fetch year levels", error);
    }
  };

  useEffect(() => {
    getAdmissionDetails();
    getYearLevels();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --------------------------------------------------------------
  // DELETE / DEACTIVATE
  // --------------------------------------------------------------
  const handleDeleteClick = (detail) => {
    setStudentToDelete(detail);
    setDeactivationReason("TC");
    setCustomReason("");
    setShowCustomReasonInput(false);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
    setDeactivationReason("TC");
    setCustomReason("");
    setShowCustomReasonInput(false);
  };

  const handleReasonChange = (e) => {
    const value = e.target.value;
    setDeactivationReason(value);
    if (value === "Others") {
      setShowCustomReasonInput(true);
    } else {
      setShowCustomReasonInput(false);
      setCustomReason("");
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    try {
      const studentId =
        studentToDelete.student_input?.id ??
        studentToDelete.student_id ??
        studentToDelete.id;

      // Get the reason
      const reason = deactivationReason === "Others" ? customReason : deactivationReason;

      // Call deactivateStudents with both parameters
      await deactivateStudents([studentId], reason);

      await getAdmissionDetails(); // refresh both details & studentData

      setShowDeleteModal(false);
      setStudentToDelete(null);
      setDeactivationReason("TC");
      setCustomReason("");
      setShowCustomReasonInput(false);

      setResultModal({
        type: "success",
        message: "Student has been deactivated successfully.",
      });
    } catch (error) {
      console.error("Deactivation error:", error);
      setShowDeleteModal(false);
      setStudentToDelete(null);
      setResultModal({
        type: "error",
        message: "Failed to deactivate student. Please try again.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --------------------------------------------------------------
  // INACTIVE & REACTIVATE
  // --------------------------------------------------------------
  const getInactiveStudents = async () => {
    setInactiveLoading(true);
    try {
      const response = await fetchInactiveStudents();
      console.log("Inactive students response:", response);

      // Handle different response formats
      let students = [];
      if (response && response.results && Array.isArray(response.results)) {
        students = response.results;
      } else if (Array.isArray(response)) {
        students = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        students = response.data;
      } else if (response && typeof response === 'object') {
        students = [response];
      }

      console.log("Processed inactive students:", students);
      setInactiveStudents(students);
    } catch (err) {
      console.error("Failed to fetch inactive students:", err);
      setInactiveStudents([]);
    } finally {
      setInactiveLoading(false);
    }
  };

  const handleInactiveClick = () => {
    setShowInactiveModal(true);
    getInactiveStudents();
  };

  const handleReactivate = async (studentId) => {
    setReactivatingId(studentId);
    try {
      await reactivateStudents([studentId]);

      // Remove from local list
      setInactiveStudents((prev) =>
        prev.filter((s) => (s.id ?? s.student_id) !== studentId)
      );

      // Refresh main list and studentData
      await getAdmissionDetails();

      setResultModal({
        type: "success",
        message: "Student has been reactivated successfully.",
      });
    } catch (err) {
      console.error("Reactivation failed:", err);
      setResultModal({
        type: "error",
        message: "Failed to reactivate student. Please try again.",
      });
    } finally {
      setReactivatingId(null);
    }
  };

  // --------------------------------------------------------------
  // DOWNLOAD FUNCTIONS (use studentData, already all records)
  // --------------------------------------------------------------
  const handleDownloadExcel = (input = []) => {
    const data = normalizeStudents(input);
    if (!data.length) return;

    const formattedData = data.map((s) => ({
      ID: s.student_id ?? s.id ?? "",
      "Scholar No": s["scholar number"] ?? "",
      "Enrollment No": s.enrollment_no ?? "",
      Name: s.student_name ?? "",
      Class: s.class ?? "",
      Age: s.age ?? "",
      Gender: s.gender ?? "",
      "Date of Birth": s.date_of_birth ?? "",
      Category: s.category ?? "",
      Religion: s.religion ?? "",
      "No. of Siblings": s["no. of siblings"] ?? "",
      Active: s.is_active ? "Yes" : "No",
      "RTE Status": s.is_rte ? "Yes" : "No",
      "RTE Number": s["rte number"] ?? "",
      Phone: s.contact_number ?? "",
      Email: s.email ?? "",
      Father: s.father_name ?? "",
      Mother: s.mother_name ?? "",
      Guardian: s.guardian_name ?? "",
      "Guardian Phone": s["guardian's contact no."] ?? "",
      Address: s.full_address ?? "",
      Aadhaar: s["adhaar number"] ?? s["aadhaar_number"] ?? "",
      "Bank Account": s["bank details"]?.account_no ?? "N/A",
      IFSC: s["bank details"]?.ifsc_code ?? "N/A",
      "Annual Income": s["annual income"] ?? s.annual_income ?? "",
      "School Year": s["school year"] ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "Student_Details_Report.xlsx");
  };

  const handleDownloadStudentDataPDF = (input = []) => {
    const data = normalizeStudents(input);
    if (!data.length) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Student Details Report", margin, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth - margin,
      12,
      { align: "right" }
    );

    const fmtDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      return isNaN(date)
        ? String(d)
        : date.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
    };
    const fmtNumberIN = (n) => {
      if (n === null || n === undefined || n === "" || n === "N/A")
        return "N/A";
      const num = Number(n);
      return Number.isNaN(num)
        ? String(n)
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
          num
        );
    };
    const safe = (v) => (v === null || v === undefined ? "" : String(v));

    const body = data.map((s) => {
      const id = safe(s.student_id ?? s.id);
      const scholar = safe(s["scholar number"] ?? "");
      const enroll = safe(s.enrollment_no ?? "");
      const schEnroll =
        `S:${scholar}${scholar && enroll ? "  " : ""}E:${enroll}`.trim();
      const name = safe(s.student_name);
      const className = safe(s.class);
      const age = s.age ?? "";
      const gender = s.gender
        ? s.gender[0].toUpperCase() + s.gender.slice(1)
        : "";
      const dob = fmtDate(s.date_of_birth);
      const category = safe(s.category);
      const religion = safe(s.religion);
      const catRel = `Cat:${category}\nRel:${religion}`;
      const siblings = s["no. of siblings"] ?? "";
      const active = s.is_active ? "Yes" : "No";
      const rteNo = s["rte number"] ?? "";
      const rte = s.is_rte ? `Yes${rteNo ? `\n#${rteNo}` : ""}` : "No";
      const phone = safe(s.contact_number);
      const email = safe(s.email);
      const father = safe(s.father_name);
      const mother = safe(s.mother_name);
      const parents = `F:${father}\nM:${mother}`;
      const guardianName = safe(s.guardian_name);
      const guardianPhone = safe(s["guardian's contact no."] ?? "");
      const guardian = `G:${guardianName}\nC:${guardianPhone}`;
      const address = safe(s.full_address);
      const aadhaar = safe(s["adhaar number"] ?? s["aadhaar_number"] ?? "");
      const bankAcc = safe(s["bank details"]?.account_no ?? "N/A");
      const ifsc = safe(s["bank details"]?.ifsc_code ?? "N/A");
      const bank = `A/C:${bankAcc}\nIFSC:${ifsc}`;
      const annualIncome = fmtNumberIN(
        s["annual income"] ?? s.annual_income
      );
      const year = safe(s["school year"] ?? "");

      return [
        id, schEnroll, name, className, age, gender, dob, catRel, siblings,
        active, rte, phone, email, parents, guardian, address, aadhaar, bank,
        annualIncome, year,
      ];
    });

    autoTable(doc, {
      startY: 18,
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      head: [
        [
          "ID", "Sch/En", "Name", "Class", "Age", "Gender", "DOB", "Cat/Rel",
          "Siblings", "Active", "RTE", "Phone", "Email", "Parents", "Guardian",
          "Address", "Aadhaar", "Bank", "Income", "Year",
        ],
      ],
      body,
      margin: { top: 15, left: margin, right: margin },
      styles: {
        fontSize: 6.3,
        cellPadding: 1.0,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 24 },
        2: { cellWidth: 30 },
        3: { cellWidth: 14 },
        4: { cellWidth: 8, halign: "center" },
        5: { cellWidth: 12 },
        6: { cellWidth: 16 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20, halign: "center" },
        9: { cellWidth: 10, halign: "center" },
        10: { cellWidth: 16 },
        11: { cellWidth: 20 },
        12: { cellWidth: 24 },
        13: { cellWidth: 22 },
        14: { cellWidth: 22 },
        15: { cellWidth: 50 },
        16: { cellWidth: 22 },
        17: { cellWidth: 26 },
        18: { cellWidth: 18, halign: "right" },
        19: { cellWidth: 14 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 6,
          { align: "right" }
        );
      },
    });

    doc.save("Student_Details_Report.pdf");
  };

  // --------------------------------------------------------------
  // ERROR / LOADING / NO DATA
  // --------------------------------------------------------------
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!details) {
    return <div className="p-4 text-center">No admission records found</div>;
  }

  const filterData = details.filter((detail) => {
    const classValue = (detail.year_level ?? detail.class ?? "").toLowerCase().trim();
    const selectedClassValue = selectedClass.toLowerCase().trim();

    const matchesClass = selectedClass === ""
      ? true
      : classValue === selectedClassValue;

    const matchesDate = selectedDate
      ? detail.admission_date === selectedDate
      : true;
    return matchesClass && matchesDate;
  });

  const filterBysearch = filterData.filter((detail) => {
    const search = searchInput.toLowerCase();
    // Handle both possible data structures
    let studentName = "";
    if (detail.student_input) {
      studentName = `${detail.student_input.first_name ?? ""} ${detail.student_input.last_name ?? ""}`.toLowerCase();
    } else {
      studentName = (detail.student_name || "").toLowerCase();
    }
    return studentName.startsWith(search);
  });

  // FIXED: Proper sorting function
  const getStudentName = (item) => {
    if (item.student_input) {
      return `${item.student_input.first_name ?? ""} ${item.student_input.last_name ?? ""}`.toLowerCase();
    }
    return (item.student_name || "").toLowerCase();
  };

  const sortedData = [...filterBysearch].sort((a, b) => {
    const nameA = getStudentName(a);
    const nameB = getStudentName(b);
    return nameA.localeCompare(nameB);
  });

  // --------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-md">
            <h2 className="text-lg font-semibold mb-3 dark:text-gray-100">
              Deactivate Student
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to deactivate this student?
            </p>

            {/* Reason Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for Deactivation
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                value={deactivationReason}
                onChange={handleReasonChange}
              >
                <option value="TC">TC (Transfer Certificate)</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Custom Reason Input */}
            {showCustomReasonInput && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Please specify the reason
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteLoading}
                className="btn btnThemeOutline items-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading || (deactivationReason === "Others" && !customReason.trim())}
                className="btn bgTheme text-white flex items-center"
              >
                {deleteLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL */}
      {resultModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-md">
            <div className="flex justify-center mb-4">
              {resultModal.type === "success" ? (
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <i className="fa-solid fa-circle-check text-green-500 text-3xl"></i>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <i className="fa-solid fa-circle-xmark text-red-500 text-3xl"></i>
                </div>
              )}
            </div>
            <h2
              className={`text-lg font-semibold text-center mb-2 ${resultModal.type === "success"
                ? "text-green-700"
                : "text-red-700"
                }`}
            >
              {resultModal.type === "success" ? "Success!" : "Failed!"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-5">
              {resultModal.message}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setResultModal(null)}
                className={`btn text-white px-8 ${resultModal.type === "success"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
                  }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INACTIVE STUDENTS MODAL - Professional Layout */}
      {showInactiveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700/50">

            {/* Header - Premium Design */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-800/80 border-b border-gray-200/60 dark:border-gray-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-user-slash text-red-500 dark:text-red-400 text-lg"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    Inactive Students
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {inactiveStudents.length} inactive {inactiveStudents.length === 1 ? 'student' : 'students'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
              >
                <i className="fa-solid fa-xmark text-gray-400 dark:text-gray-500 text-xl group-hover:text-gray-700 dark:group-hover:text-gray-300 transition"></i>
              </button>
            </div>

            {/* Body - Enhanced Scrolling Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/30">
              {inactiveLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-red-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Loading inactive students...
                  </p>
                </div>
              ) : inactiveStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-check-circle text-4xl text-green-500 dark:text-green-400"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    All Clear!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No inactive students found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveStudents.map((student) => {
                    const id = student.id;
                    const name = student.name || "Unknown";
                    const hasTC = student.has_tc || false;
                    const reason = student.reason;
                    const deactivationDate = student.deactivation_date;

                    const formattedDateTime = deactivationDate
                      ? new Date(deactivationDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      : "";

                    return (
                      <div
                        key={id}
                        className="group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md border border-gray-200/60 dark:border-gray-700/50 transition-all duration-200 hover:border-red-200 dark:hover:border-red-700/40"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                            <i className="fa-solid fa-user text-red-600 dark:text-red-400 text-base"></i>
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {name}
                              </h4>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hasTC
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                  }`}
                              >
                                {hasTC ? (
                                  <>
                                    <i className="fa-solid fa-file-pen mr-1 text-[10px]"></i>
                                    TC Issued
                                  </>
                                ) : (
                                  <>
                                    <i className="fa-solid fa-circle mr-1 text-[6px]"></i>
                                    No TC
                                  </>
                                )}
                              </span>
                            </div>

                            {reason && (
                              <div className="mt-1 flex items-start gap-1.5">
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span> {reason}
                                </p>
                              </div>
                            )}

                            {formattedDateTime && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <i className="fa-regular fa-calendar text-[11px]"></i>
                                <span>
                                  <span className="font-medium text-gray-600 dark:text-gray-300">Deactivation Date & Time:</span> {formattedDateTime}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Reactivate Button */}
                          <button
                            onClick={() => handleReactivate(id)}
                            disabled={reactivatingId === id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0 ${reactivatingId === id
                              ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50 dark:hover:bg-emerald-900/30 shadow-sm hover:shadow"
                              }`}
                          >
                            {reactivatingId === id ? (
                              <>
                                <i className="fa-solid fa-spinner animate-spin text-sm"></i>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-rotate-left text-sm"></i>
                                <span>Reactivate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4 border-gray-200 dark:border-gray-700">
            <i className="fa-solid fa-clipboard-list w-5"></i> Student Details
          </h1>
        </div>

        <div className="w-full px-5">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6 w-full border-b border-gray-300 dark:border-gray-700 pb-4">
            {/* Left Side: Filters */}
            <div className="flex flex-wrap items-end gap-4 w-full sm:w-auto">
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search By Class:
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {yearLevels.map((level) => (
                    <option key={level.id} value={level.level_name}>
                      {level.level_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search By Date:
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="mt-1 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setSelectedClass("");
                    setSelectedDate("");
                    setSearchInput("");
                  }}
                  className="btn bgTheme text-white"
                >
                  Reset Filters
                </button>
              </div>

              <div
                className="mt-1 w-full sm:w-auto relative group"
                ref={dropdownRef}
              >
                <button
                  className="btn bgTheme text-white flex items-center"
                  onClick={() => setShowDownloadOptions((prev) => !prev)}
                >
                  <i className="fa-solid fa-file-arrow-down mr-2"></i> Download
                  All Student Info
                  <i className="fa-solid fa-caret-down ml-2"></i>
                </button>

                {showDownloadOptions && (
                  <div className="absolute z-10 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    <button
                      onClick={() => {
                        handleDownloadStudentDataPDF(studentData);
                        setShowDownloadOptions(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Download as PDF
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadExcel(studentData);
                        setShowDownloadOptions(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Download as Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Search + Inactive Icon */}
            <div className="flex items-end gap-2 w-full sm:w-auto justify-end">
              <div className="flex flex-col w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Student Name"
                  className="input input-bordered w-full sm:w-64 focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.trimStart())}
                />
              </div>

              {/* Inactive Students Icon */}
              <button
                onClick={handleInactiveClick}
                title="View Inactive Students"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition flex-shrink-0"
              >
                <i className="fa-solid fa-user-slash text-sm"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {filterData.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No admission records found.
          </p>
        ) : (
          <div className="overflow-scroll max-h-[70vh] rounded-lg">
            <div className="inline-block min-w-full align-middle rounded-lg">
              <div className="shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-gray-300 dark:divide-gray-700">
                  <thead className="bgTheme text-white z-10 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Father Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Mother Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Date of Birth
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Gender
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        RTE
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                        Admission Date                      </th>
                      <th className="px-8 py-3 text-left text-sm font-semibold text-nowrap">
                        Status
                      </th>
                      <th className="px-10 py-3 text-left text-sm font-semibold text-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {sortedData.length > 0 ? (
                      sortedData.map((detail) => {
                        // Determine if student has student_input nested object or flat structure
                        const hasNestedStudent = detail.student_input;
                        const student = hasNestedStudent ? detail.student_input : detail;

                        return (
                          <tr
                            key={detail.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {hasNestedStudent
                                ? `${detail.student_input.first_name ?? ""} ${detail.student_input.last_name ?? ""}`
                                : detail.student_name ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {hasNestedStudent
                                ? detail.student_input.father_name ?? ""
                                : detail.father_name ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {hasNestedStudent
                                ? detail.student_input.mother_name ?? ""
                                : detail.mother_name ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              {hasNestedStudent
                                ? detail.student_input.date_of_birth ?? ""
                                : detail.date_of_birth ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              {hasNestedStudent
                                ? detail.student_input.gender ?? ""
                                : detail.gender ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              {detail.year_level ?? detail.class ?? ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              {detail.is_rte ? "Yes" : "No"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              {detail.admission_date
                                ? new Date(detail.admission_date)
                                  .toLocaleDateString("en-GB")
                                  .replaceAll("/", "-")
                                : ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                              <span
                                className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${student.is_active || detail.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {student.is_active || detail.is_active
                                  ? "Active"
                                  : "InActive"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <div className="flex space-x-2">
                                <Link
                                  to={allRouterLink.editAddmisionDetails.replace(
                                    ":id",
                                    detail.admission_id
                                  )}
                                  className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                >
                                  Edit
                                </Link>
                                <Link
                                  to={allRouterLink.addmissionDetailsById.replace(
                                    ":id",
                                    detail.admission_id
                                  )}
                                  className="inline-flex items-center px-3 py-1 border border-[#5E35B1] rounded-md shadow-sm text-sm font-medium textTheme bg-blue-50 hover:bg-blue-100"
                                >
                                  View
                                </Link>
                                <button
                                  onClick={() => handleDeleteClick(detail)}
                                  className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                                >
                                  Deactivate
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="10"
                          className="text-center py-6 text-gray-500 dark:text-gray-400"
                        >
                          No data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};