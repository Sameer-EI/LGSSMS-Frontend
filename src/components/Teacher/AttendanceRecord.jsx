import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Chart from "react-apexcharts";
import {
  fetchAttendanceDataStudent,
  fetchTeacherAttendanceData,
  fetchTeacherDashboard, // replaces fetchYearLevels: returns the teacher's allocated classes
  fetchSchoolYear,
} from "../../services/api/Api";

/* ------------------------------------------------------------------ */
/*  SHARED HELPERS                                                     */
/* ------------------------------------------------------------------ */

// User id (same helper as the Attendance Register component).
// This is the id the teacher dashboard API expects: /d/teacher-dashboard/<user_id>/
const getLoggedInUserId = () => {
  const raw = localStorage.getItem("user_id") ?? localStorage.getItem("userId");
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) return null;
  return id;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS = {
  present: "#22c55e",
  absent: "#ef4444",
  leave: "#f59e0b",
  notMarked: "#9ca3af",
};

// Build counts from a summary { present, absent, leave, total_days }
const buildBreakdown = (summary = {}) => {
  const present = summary.present || 0;
  const absent = summary.absent || 0;
  const leave = summary.leave || 0;
  const total = summary.total_days || 0;
  const notMarked = Math.max(total - present - absent - leave, 0);
  return { present, absent, leave, notMarked, total };
};

const donutOptions = (breakdown, centerLabel) => ({
  chart: { type: "donut", toolbar: { show: false } },
  labels: ["Present", "Absent", "Leave", "Not marked"],
  colors: [
    STATUS_COLORS.present,
    STATUS_COLORS.absent,
    STATUS_COLORS.leave,
    STATUS_COLORS.notMarked,
  ],
  legend: { position: "bottom" },
  dataLabels: { enabled: false },
  stroke: { width: 2 },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, fontSize: "14px" },
          value: { show: true, fontSize: "22px", fontWeight: 700 },
          total: {
            show: true,
            label: centerLabel,
            formatter: () => `${breakdown.total} days`,
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (val) => `${val} day${val === 1 ? "" : "s"}` } },
});

const StatBox = ({ label, value, color }) => (
  <div className="flex-1 min-w-[80px] rounded-lg bg-gray-50 dark:bg-gray-700 p-3 text-center">
    <div className="text-2xl font-bold" style={{ color }}>
      {value}
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{label}</div>
  </div>
);

const SummaryCard = ({ title, subtitle, percentage, summary }) => {
  const b = buildBreakdown(summary);
  const pct = Number(percentage) || 0;

  return (
    <div className="bg-base-100 dark:bg-gray-800 rounded-box shadow-lg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {pct.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">attendance</div>
        </div>
      </div>

      {/* progress bar */}
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-600 mt-4 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: STATUS_COLORS.present,
          }}
        />
      </div>

      <div className="mt-4 flex justify-center w-full">
        {b.total > 0 ? (
          <Chart
            options={donutOptions(b, "Total")}
            series={[b.present, b.absent, b.leave, b.notMarked]}
            type="donut"
            width={320}
          />
        ) : (
          <p className="text-gray-500 dark:text-gray-400 py-10">No school days recorded</p>
        )}
      </div>
    </div>
  );
};

// "2026-06-01" -> { year: 2026, month: 6 } (parsed manually to avoid timezone shifts)
const parseYM = (str = "") => {
  const [y, m] = str.split("-").map(Number);
  return { year: y, month: m };
};

const toKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

// Every calendar month between a school year's start_date and end_date
const monthsInRange = (start, end) => {
  const s = parseYM(start);
  const e = parseYM(end);
  const out = [];
  let y = s.year;
  let m = s.month;
  while (y < e.year || (y === e.year && m <= e.month)) {
    out.push({ month: m, year: y, key: toKey(y, m), label: `${MONTHS[m - 1]} ${y}` });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
};

// Month to show inside a school year: today's month if it falls inside the
// range, otherwise the closest end of the range.
const pickMonthKey = (months) => {
  if (!months.length) return "";
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth() + 1);
  if (months.some((m) => m.key === todayKey)) return todayKey;
  return todayKey > months[months.length - 1].key
    ? months[months.length - 1].key
    : months[0].key;
};

// Default school year: the one containing today, else the most recent one
// that has already started, else the earliest upcoming one.
const pickSchoolYear = (schoolYears) => {
  if (!schoolYears.length) return null;
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth() + 1);
  const withRange = schoolYears.map((sy) => ({
    sy,
    start: toKey(parseYM(sy.start_date).year, parseYM(sy.start_date).month),
    end: toKey(parseYM(sy.end_date).year, parseYM(sy.end_date).month),
  }));
  const current = withRange.find((r) => r.start <= todayKey && todayKey <= r.end);
  if (current) return current.sy;
  const started = withRange
    .filter((r) => r.start <= todayKey)
    .sort((a, b) => b.start.localeCompare(a.start));
  if (started.length) return started[0].sy;
  return [...withRange].sort((a, b) => a.start.localeCompare(b.start))[0].sy;
};

/* ---------- file / chart export helpers ---------- */

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const exportChartSVG = (container, filename) => {
  const svg = container?.querySelector(".apexcharts-svg");
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  downloadBlob(new Blob([data], { type: "image/svg+xml" }), filename);
};

const exportChartPNG = (container, filename) => {
  const svg = container?.querySelector(".apexcharts-svg");
  if (!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = url;
};

const useOutsideClick = (ref, handler) => {
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, handler]);
};

const ExportMenu = ({ open, onToggle, onSVG, onPNG, onCSV }) => (
  <div className="dropdown dropdown-end">
    <button
      className="btn btn-ghost btn-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
      onClick={onToggle}
    >
      <i className="fa-solid fa-download mr-2"></i>
      Download
      <i className="fa-solid fa-chevron-down ml-2 text-xs"></i>
    </button>
    {open && (
      <ul className="dropdown-content menu p-2 shadow bg-base-100 dark:bg-gray-700 rounded-box w-52 border border-gray-200 dark:border-gray-600 mt-1 z-10">
        <li>
          <button
            onClick={onSVG}
            className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
          >
            <i className="fa-solid fa-file-image text-blue-500 mr-2"></i>
            Download as SVG
          </button>
        </li>
        <li>
          <button
            onClick={onPNG}
            className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
          >
            <i className="fa-solid fa-file-image text-green-500 mr-2"></i>
            Download as PNG
          </button>
        </li>
        <li>
          <button
            onClick={onCSV}
            className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
          >
            <i className="fa-solid fa-file-csv text-orange-500 mr-2"></i>
            Download as CSV
          </button>
        </li>
      </ul>
    )}
  </div>
);

/* ---------- shared UI states / layout ---------- */

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="flex space-x-2">
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
    </div>
    <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-20">
    <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
    <p className="text-lg text-red-400 font-medium">{message}</p>
    <button onClick={onRetry} className="mt-4 btn bgTheme text-white">
      Retry
    </button>
  </div>
);

const NoResultState = ({ message }) => (
  <div className="flex flex-col items-center justify-center text-center py-24">
    <i className="fa-solid fa-magnifying-glass text-5xl text-gray-400 mb-4"></i>
    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">No result found</p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
  </div>
);

const PageShell = ({ title, children }) => (
  <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
    <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-lg">
      <span className="font-bold text-2xl flex pt-5 justify-center gap-2 text-gray-900 dark:text-gray-100">
        <i className="fa-solid fa-square-poll-vertical flex pt-1" />
        {title}
      </span>
      {children}
    </div>
  </div>
);

/* ------------- shared school-year filter (student, teacher) ------------- */

const useSchoolYearFilter = () => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [initLoading, setInitLoading] = useState(true);
  const [filtersUnavailable, setFiltersUnavailable] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await fetchSchoolYear();
        const list = (Array.isArray(res) ? res : res?.results || []).filter(
          (sy) => sy?.start_date && sy?.end_date
        );
        if (cancelled) return;
        setSchoolYears(list);
        const sy = pickSchoolYear(list);
        if (sy) {
          setSelectedYearId(String(sy.id));
          setSelectedKey(pickMonthKey(monthsInRange(sy.start_date, sy.end_date)));
        }
      } catch (err) {
        // School years not readable for this role: hide filters and let the
        // server use its default period.
        console.error("Failed to load school years:", err);
        if (!cancelled) setFiltersUnavailable(true);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedYear = useMemo(
    () => schoolYears.find((sy) => String(sy.id) === String(selectedYearId)) || null,
    [schoolYears, selectedYearId]
  );

  const monthOptions = useMemo(
    () => (selectedYear ? monthsInRange(selectedYear.start_date, selectedYear.end_date) : []),
    [selectedYear]
  );

  const defaultSelection = useMemo(() => {
    const sy = pickSchoolYear(schoolYears);
    if (!sy) return null;
    return {
      yearId: String(sy.id),
      key: pickMonthKey(monthsInRange(sy.start_date, sy.end_date)),
    };
  }, [schoolYears]);

  const handleYearChange = (e) => {
    const id = e.target.value;
    const sy = schoolYears.find((s) => String(s.id) === id);
    setSelectedYearId(id);
    if (sy) setSelectedKey(pickMonthKey(monthsInRange(sy.start_date, sy.end_date)));
  };

  const handleReset = () => {
    if (!defaultSelection) return;
    setSelectedYearId(defaultSelection.yearId);
    setSelectedKey(defaultSelection.key);
  };

  const isDefaultFilter =
    !defaultSelection ||
    (selectedYearId === defaultSelection.yearId && selectedKey === defaultSelection.key);

  return {
    schoolYears,
    initLoading,
    filtersUnavailable,
    selectedYear,
    selectedYearId,
    selectedKey,
    setSelectedKey,
    monthOptions,
    handleYearChange,
    handleReset,
    isDefaultFilter,
  };
};

const SchoolYearFilters = ({ filter }) => {
  if (filter.filtersUnavailable || filter.schoolYears.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center items-center gap-3 p-4">
      <select
        value={filter.selectedYearId}
        onChange={filter.handleYearChange}
        className="select select-bordered focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        aria-label="School year"
      >
        {filter.schoolYears.map((sy) => (
          <option key={sy.id} value={sy.id}>
            {sy.year_name}
          </option>
        ))}
      </select>

      <select
        value={filter.selectedKey}
        onChange={(e) => filter.setSelectedKey(e.target.value)}
        className="select select-bordered focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        aria-label="Month"
      >
        {filter.monthOptions.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      <button
        onClick={filter.handleReset}
        disabled={filter.isDefaultFilter}
        className="btn bgTheme text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Reset
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  STUDENT VIEW                                                       */
/* ------------------------------------------------------------------ */

const StudentAttendance = () => {
  const studentId = localStorage.getItem("studentId");
  const filter = useSchoolYearFilter();
  const { initLoading, filtersUnavailable, selectedKey, schoolYears, selectedYear, monthOptions } =
    filter;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noResult, setNoResult] = useState(false);

  const loadData = useCallback(async () => {
    if (initLoading) return;
    if (!filtersUnavailable && !selectedKey) {
      setData(null);
      setNoResult(true);
      return;
    }
    try {
      setLoading(true);
      setError("");
      setNoResult(false);

      let res;
      if (filtersUnavailable) {
        res = await fetchAttendanceDataStudent("", studentId);
      } else {
        const { year, month } = parseYM(selectedKey);
        res = await fetchAttendanceDataStudent("", studentId, month, year);
      }

      if (!res) {
        setError("Failed to load data. Try again");
        setData(null);
      } else if (res.error) {
        setNoResult(true);
        setData(null);
      } else {
        setData(res);
      }
    } catch (err) {
      console.error("Error fetching student attendance:", err);
      setError("Failed to load data. Try again");
    } finally {
      setLoading(false);
    }
  }, [initLoading, filtersUnavailable, selectedKey, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMonthLabel = monthOptions.find((m) => m.key === selectedKey)?.label || "";
  const monthLabel =
    data?.filter_month && data?.filter_year
      ? `${MONTHS[data.filter_month - 1]} ${data.filter_year}`
      : selectedMonthLabel;
  const yearLabel = selectedYear?.year_name || "School year";

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-5xl mx-auto my-5">
        <div className="text-center mb-2">
          <span className="font-bold text-2xl flex justify-center gap-2 text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-square-poll-vertical flex pt-1" />
            Attendance Record
          </span>
          {data && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{data.student_name}</span>
              {data.year_level && <span> &middot; {data.year_level}</span>}
            </p>
          )}
        </div>

        <SchoolYearFilters filter={filter} />

        {initLoading || loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : noResult ? (
          <NoResultState
            message={
              schoolYears.length === 0 && !filtersUnavailable
                ? "No school year has been set up yet."
                : "No attendance record for this period. Try a different month."
            }
          />
        ) : data ? (
          <div className="grid gap-6 md:grid-cols-2">
            <SummaryCard
              title="This month"
              subtitle={monthLabel}
              percentage={data.monthly_percentage}
              summary={data.monthly_summary}
            />
            <SummaryCard
              title="Full year"
              subtitle={yearLabel}
              percentage={data.yearly_percentage}
              summary={data.yearly_summary}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  TEACHER'S ALLOCATED CLASSES                                        */
/*  API: /d/teacher-dashboard/<teacherId>/                             */
/*  -> { class_summary: [{ level_name: "Class 5", ... }] }             */
/* ------------------------------------------------------------------ */

const useAllocatedClasses = (teacherId) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!teacherId) {
      setClasses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetchTeacherDashboard(teacherId);
      const list = (res?.class_summary || [])
        .map((c) => c.level_name)
        .filter(Boolean);
      setClasses([...new Set(list)]);
    } catch (err) {
      console.error("Failed to load allocated classes:", err);
      setError("Failed to load your class. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  return { classes, loading, error, reload: load };
};

/* ------------------------------------------------------------------ */
/*  STUDENTS OF ONE CLASS (used by the teacher view)                   */
/*  API: /a/teacher-dashboard/?class_name=KG%201&month=12&year=2026    */
/* ------------------------------------------------------------------ */

const ClassStudentsView = ({ schoolClass, filter }) => {
  const { initLoading, filtersUnavailable, selectedKey, selectedYear, monthOptions, schoolYears } =
    filter;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noResult, setNoResult] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const chartRef = useRef(null);
  const requestId = useRef(0);
  useOutsideClick(chartRef, () => setExportOpen(false));

  const loadData = useCallback(async () => {
    if (initLoading || !schoolClass) return;
    if (!filtersUnavailable && !selectedKey) {
      setStudents([]);
      setNoResult(true);
      return;
    }

    const id = ++requestId.current; // ignore stale responses
    try {
      setLoading(true);
      setError("");
      setNoResult(false);

      let res;
      if (filtersUnavailable) {
        res = await fetchTeacherAttendanceData(schoolClass);
      } else {
        const { year, month } = parseYM(selectedKey);
        res = await fetchTeacherAttendanceData(schoolClass, month, year);
      }
      if (id !== requestId.current) return;

      if (!res) {
        setError("Failed to load data. Try again");
        setStudents([]);
      } else if (res.error || !Array.isArray(res) || res.length === 0) {
        setNoResult(true);
        setStudents([]);
      } else {
        setStudents(res);
      }
    } catch (err) {
      if (id !== requestId.current) return;
      console.error("Error fetching class attendance:", err);
      setError("Failed to load data. Try again");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [initLoading, schoolClass, filtersUnavailable, selectedKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- derived data ---- */
  const stats = useMemo(() => {
    const t = students.reduce(
      (acc, s) => {
        const m = buildBreakdown(s.monthly_summary);
        acc.present += m.present;
        acc.total += m.total;
        return acc;
      },
      { present: 0, total: 0 }
    );
    return {
      count: students.length,
      pct: t.total > 0 ? ((t.present / t.total) * 100).toFixed(1) : "0.0",
    };
  }, [students]);

  const categories = useMemo(() => students.map((s) => s.student_name), [students]);

  const series = useMemo(
    () => [
      { name: "Monthly %", data: students.map((s) => Number(s.monthly_percentage) || 0) },
      { name: "Yearly %", data: students.map((s) => Number(s.yearly_percentage) || 0) },
    ],
    [students]
  );

  const chartOptions = useMemo(
    () => ({
      chart: { type: "bar", toolbar: { show: false } },
      colors: [STATUS_COLORS.present, "#3b82f6"],
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
      dataLabels: { enabled: false },
      legend: { position: "top" },
      xaxis: { categories, labels: { rotate: -45, trim: true } },
      yaxis: {
        min: 0,
        max: 100,
        labels: { formatter: (v) => `${Math.round(v)}%` },
      },
      tooltip: { y: { formatter: (v) => `${v}%` } },
    }),
    [categories]
  );

  const monthLabel = useMemo(() => {
    const first = students[0];
    if (first?.filter_month && first?.filter_year) {
      return `${MONTHS[first.filter_month - 1]} ${first.filter_year}`;
    }
    return monthOptions.find((m) => m.key === selectedKey)?.label || "";
  }, [students, monthOptions, selectedKey]);

  const yearLabel = selectedYear?.year_name || "School year";
  const fileBase = `attendance-${schoolClass}-${selectedKey || "current"}`.replace(/\s+/g, "-");

  /* ---- exports ---- */
  const handleExportSVG = () => {
    exportChartSVG(chartRef.current, `${fileBase}.svg`);
    setExportOpen(false);
  };

  const handleExportPNG = () => {
    exportChartPNG(chartRef.current, `${fileBase}.png`);
    setExportOpen(false);
  };

  const handleExportCSV = () => {
    if (!students.length) {
      alert("No data available to export!");
      return;
    }
    const header = [
      "Student", "Class",
      "Month Present", "Month Absent", "Month Leave", "Month Not Marked", "Month Total Days", "Monthly %",
      "Year Present", "Year Absent", "Year Leave", "Year Not Marked", "Year Total Days", "Yearly %",
    ];
    const rows = students.map((s) => {
      const m = buildBreakdown(s.monthly_summary);
      const y = buildBreakdown(s.yearly_summary);
      return [
        s.student_name, s.class_name,
        m.present, m.absent, m.leave, m.notMarked, m.total, s.monthly_percentage ?? 0,
        y.present, y.absent, y.leave, y.notMarked, y.total, s.yearly_percentage ?? 0,
      ]
        .map(csvCell)
        .join(",");
    });
    const csv = [
      header.map(csvCell).join(","),
      ...rows,
      "",
      `${csvCell("Class")},${csvCell(schoolClass)}`,
      `${csvCell("Month")},${csvCell(monthLabel)}`,
      `${csvCell("School year")},${csvCell(yearLabel)}`,
      `${csvCell("Class average (month)")},${csvCell(stats.pct + "%")}`,
    ].join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${fileBase}.csv`);
    setExportOpen(false);
  };

  /* ---- render ---- */
  if (initLoading || loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (noResult || students.length === 0) {
    return (
      <NoResultState
        message={
          schoolYears.length === 0 && !filtersUnavailable
            ? "No school year has been set up yet."
            : "No attendance record for this class and period. Try a different month."
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <StatBox label="Students" value={stats.count} color="#3b82f6" />
        <StatBox
          label={`Class average · ${monthLabel}`}
          value={`${stats.pct}%`}
          color={STATUS_COLORS.present}
        />
      </div>

      {/* chart */}
      <div className="p-4" ref={chartRef}>
        <div className="flex justify-end mb-2">
          <ExportMenu
            open={exportOpen}
            onToggle={() => setExportOpen((o) => !o)}
            onSVG={handleExportSVG}
            onPNG={handleExportPNG}
            onCSV={handleExportCSV}
          />
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(600, students.length * 80) }}>
            <Chart options={chartOptions} series={series} type="bar" height={420} width="100%" />
          </div>
        </div>
      </div>

      {/* per-student table */}
      <div className="overflow-x-auto mt-6">
        <table className="table w-full text-gray-900 dark:text-gray-100">
          <thead>
            <tr>
              <th>Student</th>
              <th className="text-center">Present</th>
              <th className="text-center">Absent</th>
              <th className="text-center">Leave</th>
              <th className="text-center">Not marked</th>
              <th className="text-center">Monthly %</th>
              <th className="text-center">Yearly %</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const m = buildBreakdown(s.monthly_summary);
              return (
                <tr key={`${s.student_name}-${idx}`}>
                  <td className="font-medium">{s.student_name}</td>
                  <td className="text-center" style={{ color: STATUS_COLORS.present }}>{m.present}</td>
                  <td className="text-center" style={{ color: STATUS_COLORS.absent }}>{m.absent}</td>
                  <td className="text-center" style={{ color: STATUS_COLORS.leave }}>{m.leave}</td>
                  <td className="text-center" style={{ color: STATUS_COLORS.notMarked }}>{m.notMarked}</td>
                  <td className="text-center">{(Number(s.monthly_percentage) || 0).toFixed(1)}%</td>
                  <td className="text-center">{(Number(s.yearly_percentage) || 0).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  TEACHER VIEW: shows the teacher's allocated class(es)              */
/* ------------------------------------------------------------------ */

const TeacherAttendance = () => {
  // Same id source as the Attendance Register: the logged-in USER id
  // (not "teacherId"), used for /d/teacher-dashboard/<user_id>/
  const teacherId = getLoggedInUserId();

  const filter = useSchoolYearFilter();
  const { classes, loading, error, reload } = useAllocatedClasses(teacherId);
  const [selectedClass, setSelectedClass] = useState("");

  // pick the first allocated class once loaded
  useEffect(() => {
    if (classes.length && !classes.includes(selectedClass)) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  let body;
  if (loading) {
    body = <LoadingState />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={reload} />;
  } else if (!selectedClass) {
    body = (
      <NoResultState message="No class has been allocated to you yet. Please contact the administrator." />
    );
  } else {
    body = (
      <>
        {/* dropdown only appears if the teacher has more than one class */}
        {classes.length > 1 && (
          <div className="flex justify-center pt-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="select select-bordered focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              aria-label="Class"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        <SchoolYearFilters filter={filter} />
        <ClassStudentsView schoolClass={selectedClass} filter={filter} />
      </>
    );
  }

  return (
    <PageShell title={`Attendance Record${selectedClass ? ` - ${selectedClass}` : ""}`}>
      {body}
    </PageShell>
  );
};

/* ------------------------------------------------------------------ */
/*  ENTRY: pick view by role                                           */
/* ------------------------------------------------------------------ */

const AttendanceRecord = () => {
  const userRole = localStorage.getItem("userRole");
  if (userRole === "student") return <StudentAttendance />;
  if (userRole === "teacher") return <TeacherAttendance />;
  return (
    <PageShell title="Attendance Record">
      <NoResultState message="You don't have access to attendance records." />
    </PageShell>
  );
};

export default AttendanceRecord;