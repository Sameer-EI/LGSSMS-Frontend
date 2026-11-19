import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchSchoolYear, fetchYearLevels } from "../../services/api/Api";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";

/* ----------------------------- helpers ----------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Academic order: Annual first, then April → March
const MONTH_ORDER = ["Annual", "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"];

const FEE_TYPES = [
  "Tuition Fee (General)", "Tuition Fee (PCM/PCB)", "Tuition Fee (Comm/Arts)",
  "Admission Fee", "Exam Fee", "Activity Fee", "Caution Fee", "Maintenance", "Others",
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const inr = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2,
  }).format(v || 0);

const monthRank = (m) => {
  const i = MONTH_ORDER.indexOf(m);
  return i === -1 ? 99 : i;
};

/**
 * Receipt (API) -> flat monthly rows (one per payment line).
 * ⚠️ If your payment line uses different field names for amounts,
 * adjust ONLY this function.
 */
const normalizeReceipts = (receipts) => {
  const rows = [];
  receipts.forEach((rec, rIdx) => {
    const st = rec.student || {};
    const base = {
      scholarNo: String(st.scholar_number ?? st.scholar_no ?? st.scholarNo ?? st.id ?? ""),
      studentId: st.student_year_id || st.id,
      studentName: st.name || "—",
      studentClass: [st.class_name, st.class_section].filter(Boolean).join(" ") || "—",
      year: rec.school_year || "—",
      receiptNumber: rec.receipt_number,
      paymentDate: rec.payment_date,
    };
    const payments = Array.isArray(rec.payments) ? rec.payments : [];

    if (payments.length === 0) {
      const paid = num(rec.total_amount_paid);
      const due = num(rec.total_due ?? rec.due_amount);
      rows.push({
        ...base, id: `${rec.receipt_number}-${rIdx}`, month: "—", feeType: "—",
        totalAmount: num(rec.total_amount ?? paid + due), paidAmount: paid, dueAmount: due,
      });
      return;
    }

    payments.forEach((p, pIdx) => {
      const paid = num(p.amount_paid ?? p.paid_amount ?? p.amount);
      const due = num(p.due_amount ?? p.balance ?? p.due);
      rows.push({
        ...base,
        id: `${rec.receipt_number}-${rIdx}-${pIdx}`,
        month: p.month || p.fee_type || "—",
        feeType: p.fee_type || "—",
        totalAmount: num(p.total_amount ?? p.fee_amount ?? paid + due),
        paidAmount: paid,
        dueAmount: due,
      });
    });
  });
  return rows;
};

/** Flat rows -> one summary per student (grouped by scholarNo + year) */
const getGroupedStudents = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.scholarNo || r.studentName}__${r.year}`;
    if (!map.has(key)) {
      map.set(key, {
        key, scholarNo: r.scholarNo, studentName: r.studentName,
        studentClass: r.studentClass, year: r.year,
        totalFee: 0, totalPaid: 0, totalDue: 0, records: [],
      });
    }
    const g = map.get(key);
    g.totalFee += r.totalAmount;
    g.totalPaid += r.paidAmount;
    g.totalDue += r.dueAmount;
    g.records.push(r);
  });
  return [...map.values()].map((g) => ({
    ...g,
    status: g.totalDue > 0 ? "Pending" : "Paid",
    records: g.records.sort((a, b) => monthRank(a.month) - monthRank(b.month)),
  }));
};

const StatusBadge = ({ status }) => {
  const paid = status === "Paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        paid
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-amber-500"}`} />
      {status}
    </span>
  );
};

const KpiCard = ({ label, value, valueClass, icon, iconBg, iconColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${iconBg}`}>
      <i className={`${icon} text-xl ${iconColor}`} />
    </div>
  </div>
);

/* ----------------------------- component ----------------------------- */

const FeeSummaryTable = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // download dropdown
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadMenuRef = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // view state
  const [currentView, setCurrentView] = useState("summary"); // "summary" | "flat"
  const [expanded, setExpanded] = useState(() => new Set());

  // server-side filters
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedFeeType, setSelectedFeeType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // client-side instant search
  const [searchTerm, setSearchTerm] = useState("");

  // data
  const [flatRecords, setFlatRecords] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);

  // pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  /* ---------- initial dropdown data ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [years, levels] = await Promise.all([fetchSchoolYear(), fetchYearLevels()]);
        setSchoolYears(years || []);
        setYearLevels(levels || []);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    })();
  }, []);

  /* ---------- query string for server filters ---------- */
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    const y = schoolYears.find((s) => s.year_name === selectedSchoolYear);
    if (y) params.append("school_year_id", y.id);
    const c = yearLevels.find((l) => l.level_name === selectedClass);
    if (c) params.append("class_id", c.id);
    if (selectedMonth) params.append("month", selectedMonth);
    if (selectedFeeType) params.append("fee_type", selectedFeeType);
    if (fromDate) params.append("start_date", fromDate);
    if (toDate) params.append("end_date", toDate);
    params.append("limit", 1000); // page size per request; we follow `next` below
    params.append("offset", 0);
    return params.toString();
  }, [selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, schoolYears, yearLevels]);

  /* ---------- fetch ALL receipts (follow pagination) ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const receipts = [];
      let url = `/d/studentfees/search_receipts/?${buildParams()}`;
      while (url) {
        const res = await axiosInstance.get(url);
        const data = res.data;
        if (data && Array.isArray(data.results)) {
          receipts.push(...data.results);
          url = data.next || null;
        } else if (Array.isArray(data)) {
          receipts.push(...data);
          url = null;
        } else {
          url = null;
        }
      }
      setFlatRecords(normalizeReceipts(receipts));
    } catch (err) {
      console.error("Fetch error:", err);
      const status = err?.response?.status;
      if (status === 404 || status === 400) setFlatRecords([]);
      else if (status === 401) setError("Authentication failed. Please login again.");
      else if (status === 500) setError("Server error. Please try again later.");
      else if (err?.request) setError("Network error. Please check your connection.");
      else setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [buildParams, axiosInstance]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- derived data ---------- */
  const filteredFlat = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return flatRecords;
    return flatRecords.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.scholarNo.toLowerCase().includes(q) ||
        String(r.receiptNumber || "").toLowerCase().includes(q)
    );
  }, [flatRecords, searchTerm]);

  const groupedStudents = useMemo(() => getGroupedStudents(filteredFlat), [filteredFlat]);

  const kpis = useMemo(
    () => ({
      students: groupedStudents.length,
      collected: filteredFlat.reduce((s, r) => s + r.paidAmount, 0),
      due: filteredFlat.reduce((s, r) => s + r.dueAmount, 0),
    }),
    [groupedStudents, filteredFlat]
  );

  const activeList = currentView === "summary" ? groupedStudents : filteredFlat;
  const totalItems = activeList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems ? (safePage - 1) * pageSize : 0;
  const pageItems = activeList.slice(startIndex, startIndex + pageSize);

  const hasFilters = [selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, searchTerm].some(Boolean);

  /* ---------- handlers ---------- */
  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
    setExpanded(new Set());
  };

  const onDate = (setter, isFrom) => (e) => {
    const v = e.target.value;
    if (isFrom && toDate && v > toDate) return alert("⚠️ From date cannot be greater than To date");
    if (!isFrom && fromDate && v < fromDate) return alert("⚠️ To date cannot be less than From date");
    setter(v);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedSchoolYear(""); setSelectedClass(""); setSelectedMonth("");
    setSelectedFeeType(""); setFromDate(""); setToDate(""); setSearchTerm("");
    setCurrentPage(1); setExpanded(new Set());
  };

  const toggleExpand = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const switchView = (v) => {
    setCurrentView(v);
    setCurrentPage(1);
  };

  /* ---------- export ---------- */
  const getExport = () => {
    if (currentView === "summary") {
      const rows = groupedStudents.map((g, i) => ({
        "#": i + 1, "Scholar No": g.scholarNo, "Student Name": g.studentName,
        Class: g.studentClass, Year: g.year, "Total Fee": g.totalFee.toFixed(2),
        "Total Paid": g.totalPaid.toFixed(2), "Total Due": g.totalDue.toFixed(2), Status: g.status,
      }));
      rows.push({
        "#": "", "Scholar No": "", "Student Name": "", Class: "", Year: "TOTAL",
        "Total Fee": groupedStudents.reduce((s, g) => s + g.totalFee, 0).toFixed(2),
        "Total Paid": kpis.collected.toFixed(2), "Total Due": kpis.due.toFixed(2), Status: "",
      });
      return rows;
    }
    const rows = filteredFlat.map((r, i) => ({
      "#": i + 1, "Receipt No": r.receiptNumber || "—", "Scholar No": r.scholarNo,
      "Student Name": r.studentName, Class: r.studentClass, Year: r.year, Month: r.month,
      "Fee Type": r.feeType, "Payment Date": r.paymentDate || "—",
      "Total Amount": r.totalAmount.toFixed(2), "Paid Amount": r.paidAmount.toFixed(2),
      "Due Amount": r.dueAmount.toFixed(2), Status: r.dueAmount > 0 ? "Pending" : "Paid",
    }));
    return rows;
  };

  const fileName = () => {
    let f = currentView === "summary" ? "fee_summary" : "fee_records";
    if (selectedSchoolYear) f += `_${selectedSchoolYear}`;
    if (selectedClass) f += `_${selectedClass}`;
    if (selectedMonth) f += `_${selectedMonth}`;
    return `${f}_${new Date().toISOString().split("T")[0]}`;
  };

  const downloadExcel = () => {
    if (!totalItems) return alert("No data available to download!");
    setDownloading(true);
    try {
      const data = getExport();
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = Object.keys(data[0]).map((k) => ({ wch: Math.max(k.length, 15) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fee Records");
      XLSX.writeFile(wb, `${fileName()}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to download Excel file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadPDF = () => {
    if (!totalItems) return alert("No data available to download!");
    setDownloading(true);
    try {
      const data = getExport();
      const doc = new jsPDF("landscape", "mm", "a4");
      const w = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.text(currentView === "summary" ? "Fee Summary" : "Students Fee Records", w / 2, 15, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      autoTable(doc, {
        head: [Object.keys(data[0])],
        body: data.map((r) => Object.values(r)),
        startY: 26,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [107, 33, 168], textColor: 255 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`${fileName()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------- early returns ---------- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce" />
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]" />
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]" />
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold">Error Loading Data</h3>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchData} className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const selectCls =
    "select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600";
  const th = "px-4 py-4 text-left text-xs font-bold uppercase tracking-wider";

  /* ----------------------------- render ----------------------------- */
  return (
    <div className="min-h-screen px-4 py-8 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-[96%] max-w-[1700px] mx-auto space-y-6">
        {/* Header + view toggle */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Fee Summary & Records</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage student fee collections, review monthly breakdowns, and track dues.
            </p>
          </div>
          <div className="flex gap-1 p-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
            {[
              ["summary", "fa-solid fa-layer-group", "Summary View"],
              ["flat", "fa-solid fa-list", "Flat Monthly Records"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => switchView(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  currentView === key
                    ? "bg-[#6B21A8] text-white shadow"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <i className={icon} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard label="Total Students" value={kpis.students} valueClass="text-gray-900 dark:text-gray-100"
            icon="fa-solid fa-user-graduate" iconBg="bg-purple-100 dark:bg-purple-900/40" iconColor="text-purple-700 dark:text-purple-300" />
          <KpiCard label="Total Fee Collected" value={inr(kpis.collected)} valueClass="text-emerald-600"
            icon="fa-solid fa-indian-rupee-sign" iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-700 dark:text-emerald-300" />
          <KpiCard label="Total Pending / Due Amount" value={inr(kpis.due)} valueClass="text-amber-600"
            icon="fa-solid fa-clock" iconBg="bg-amber-100 dark:bg-amber-900/40" iconColor="text-amber-700 dark:text-amber-300" />
        </div>

        {/* Filters + search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">School Year</label>
              <select className={selectCls} value={selectedSchoolYear} onChange={onFilter(setSelectedSchoolYear)}>
                <option value="">All Years</option>
                {schoolYears.map((y) => <option key={y.id} value={y.year_name}>{y.year_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
              <select className={selectCls} value={selectedClass} onChange={onFilter(setSelectedClass)}>
                <option value="">All Classes</option>
                {yearLevels.map((l) => <option key={l.id} value={l.level_name}>{l.level_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <select className={selectCls} value={selectedMonth} onChange={onFilter(setSelectedMonth)}>
                <option value="">All Months</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Type</label>
              <select className={selectCls} value={selectedFeeType} onChange={onFilter(setSelectedFeeType)}>
                <option value="">All Types</option>
                {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={onDate(setFromDate, true)}
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
            </div>
            <div className="flex flex-col min-w-[150px] w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={onDate(setToDate, false)}
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-xl">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search by student name or scholar no..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
                {currentView === "summary" ? `Showing ${groupedStudents.length} students` : `Showing ${filteredFlat.length} records`}
              </span>
              <button onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-[#6B21A8] dark:text-purple-300 font-semibold hover:bg-purple-100 transition">
                <i className="fa-solid fa-rotate-right" /> Reset
              </button>
              <Link to={allRouterLink.feeDashboard}
                className="px-4 py-2 rounded-lg bg-[#6B21A8] text-white text-sm font-semibold hover:opacity-90 transition">
                Fee Dashboard
              </Link>
              {/* Download dropdown */}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setDownloadOpen((o) => !o)}
                  disabled={downloading || !totalItems}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                    downloading || !totalItems
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-purple-50 text-[#6B21A8] border-purple-300 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                  }`}
                >
                  <i className="fa-solid fa-file-arrow-down" />
                  {downloading ? "Preparing..." : "Download All Fee Info"}
                  <i className={`fa-solid fa-caret-down transition-transform ${downloadOpen ? "rotate-180" : ""}`} />
                </button>

                {downloadOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                    <button
                      type="button"
                      onClick={() => { setDownloadOpen(false); downloadPDF(); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 transition"
                    >
                      Download as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDownloadOpen(false); downloadExcel(); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 transition"
                    >
                      Download as Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto max-h-[70vh]">
            {currentView === "summary" ? (
              <table className="min-w-full">
                <thead className="bg-[#6B21A8] text-white sticky top-0 z-10">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Scholar No.</th>
                    <th className={th}>Student Name</th>
                    <th className={th}>Class</th>
                    <th className={th}>Year</th>
                    <th className={`${th} text-right`}>Total Fee</th>
                    <th className={`${th} text-right`}>Total Paid</th>
                    <th className={`${th} text-right`}>Total Due</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-center`}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pageItems.length === 0 ? (
                    <EmptyRow cols={10} hasFilters={hasFilters} onReset={resetFilters} />
                  ) : (
                    pageItems.map((g, i) => {
                      const open = expanded.has(g.key);
                      return (
                        <React.Fragment key={g.key}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{startIndex + i + 1}</td>
                            <td className="px-4 py-4 font-mono text-sm text-purple-800 dark:text-purple-300">{g.scholarNo || "—"}</td>
                            <td className="px-4 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{g.studentName}</td>
                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{g.studentClass}</td>
                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{g.year}</td>
                            <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{inr(g.totalFee)}</td>
                            <td className="px-4 py-4 text-right font-medium text-emerald-600 whitespace-nowrap">{inr(g.totalPaid)}</td>
                            <td className="px-4 py-4 text-right font-medium text-amber-600 whitespace-nowrap">{inr(g.totalDue)}</td>
                            <td className="px-4 py-4"><StatusBadge status={g.status} /></td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => toggleExpand(g.key)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-[#6B21A8] dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 transition whitespace-nowrap"
                              >
                                {open ? "Hide" : "View"} Breakdown ({g.records.length})
                                <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-xs`} />
                              </button>
                            </td>
                          </tr>

                          {open && (
                            <tr className="bg-purple-50/40 dark:bg-gray-900/40">
                              <td colSpan={10} className="px-4 sm:px-10 py-5">
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-gray-700 p-5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-[#6B21A8] dark:text-purple-300">
                                      {g.studentName} — Fee Breakdown ({g.year})
                                    </h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Scholar No: {g.scholarNo || "—"}</span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead>
                                        <tr className="bg-purple-100/70 dark:bg-purple-900/30 text-[#6B21A8] dark:text-purple-300">
                                          <th className="px-4 py-3 text-left text-xs font-bold uppercase rounded-l-lg">Month</th>
                                          <th className="px-4 py-3 text-left text-xs font-bold uppercase">Fee Type</th>
                                          <th className="px-4 py-3 text-right text-xs font-bold uppercase">Total Amount</th>
                                          <th className="px-4 py-3 text-right text-xs font-bold uppercase">Paid Amount</th>
                                          <th className="px-4 py-3 text-right text-xs font-bold uppercase">Due Amount</th>
                                          <th className="px-4 py-3 text-center text-xs font-bold uppercase">Status</th>
                                          <th className="px-4 py-3 text-center text-xs font-bold uppercase rounded-r-lg">Receipt</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {g.records.map((r) => (
                                          <tr key={r.id}>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.month}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.feeType}</td>
                                            <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100">{inr(r.totalAmount)}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600">{inr(r.paidAmount)}</td>
                                            <td className="px-4 py-3 text-right text-amber-600">{inr(r.dueAmount)}</td>
                                            <td className="px-4 py-3 text-center">
                                              <span className={`font-semibold ${r.dueAmount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                                {r.dueAmount > 0 ? "Pending" : "Paid"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              {r.receiptNumber && r.studentId ? (
                                                <Link
                                                  to={allRouterLink.viewFeesDetails
                                                    .replace(":id", r.studentId)
                                                    .replace(":receipt_number", r.receiptNumber)}
                                                  className="underline textTheme"
                                                >
                                                  View
                                                </Link>
                                              ) : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full">
                <thead className="bg-[#6B21A8] text-white sticky top-0 z-10">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Receipt No</th>
                    <th className={th}>Scholar No.</th>
                    <th className={th}>Student Name</th>
                    <th className={th}>Class</th>
                    <th className={th}>Year</th>
                    <th className={th}>Month</th>
                    <th className={th}>Fee Type</th>
                    <th className={th}>Payment Date</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Due</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pageItems.length === 0 ? (
                    <EmptyRow cols={13} hasFilters={hasFilters} onReset={resetFilters} />
                  ) : (
                    pageItems.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{startIndex + i + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-100">{r.receiptNumber || "—"}</td>
                        <td className="px-4 py-3 font-mono text-sm text-purple-800 dark:text-purple-300">{r.scholarNo || "—"}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100">{r.studentName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{r.studentClass}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{r.year}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{r.month}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{r.feeType}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{r.paymentDate || "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{inr(r.totalAmount)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-600">{inr(r.paidAmount)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-amber-600">{inr(r.dueAmount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.dueAmount > 0 ? "Pending" : "Paid"} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems}{" "}
                {currentView === "summary" ? "students" : "records"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage === 1}
                  className={`px-4 py-2 rounded border ${safePage === 1 ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-[#6B21A8] text-white hover:opacity-90"}`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">Page {safePage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className={`px-4 py-2 rounded border ${safePage >= totalPages ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-[#6B21A8] text-white hover:opacity-90"}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyRow = ({ cols, hasFilters, onReset }) => (
  <tr>
    <td colSpan={cols} className="text-center py-14">
      <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No Records Found</p>
      <p className="text-gray-400 text-sm mt-1">
        {hasFilters ? "Try adjusting your filters or search criteria" : "No data available to display"}
      </p>
      {hasFilters && (
        <button onClick={onReset} className="mt-4 text-[#6B21A8] text-sm font-medium underline">
          Clear all filters
        </button>
      )}
    </td>
  </tr>
);

export default FeeSummaryTable;