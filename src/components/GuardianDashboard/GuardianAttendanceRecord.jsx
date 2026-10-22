import React, { useEffect, useState, useMemo, useCallback } from "react";
import Chart from "react-apexcharts";
import { fetchGuardianAttendance, fetchSchoolYear } from "../../services/api/Api";

/* ------------------------------------------------------------------ */
/*  SETTINGS                                                           */
/* ------------------------------------------------------------------ */

// "bar" (guardian view) or "donut" (student view style)
const CHART_TYPE = "bar";

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


// Build chart data from { present, absent, leave, total_days }
const buildBreakdown = (summary = {}) => {
  const present = summary?.present || 0;
  const absent = summary?.absent || 0;
  const leave = summary?.leave || 0;
  const total = summary?.total_days || 0;
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

const barOptions = () => ({
  chart: { type: "bar", toolbar: { show: false } },
  colors: [
    STATUS_COLORS.present,
    STATUS_COLORS.absent,
    STATUS_COLORS.leave,
    STATUS_COLORS.notMarked,
  ],
  plotOptions: { bar: { distributed: true, columnWidth: "50%", borderRadius: 4 } },
  dataLabels: { enabled: true },
  legend: { show: false },
  xaxis: {
    categories: ["Present", "Absent", "Leave", "Not marked"],
    labels: {
      rotate: 0,          // never tilt the labels
      rotateAlways: false,
      hideOverlappingLabels: false,
      trim: false,
      style: { fontSize: "12px" },
    },
  },
  yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => Math.round(v) } },
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

const SummaryCard = ({ title, subtitle, percentage, summary, chartType = "donut" }) => {
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

      <div className="flex flex-wrap gap-3 mt-5">
        <StatBox label="Present" value={b.present} color={STATUS_COLORS.present} />
        <StatBox label="Absent" value={b.absent} color={STATUS_COLORS.absent} />
        <StatBox label="Leave" value={b.leave} color={STATUS_COLORS.leave} />
        <StatBox label="Not marked" value={b.notMarked} color={STATUS_COLORS.notMarked} />
      </div>

      <div className="mt-4 flex justify-center w-full">
        {b.total > 0 && chartType === "bar" ? (
          <Chart
            options={barOptions()}
            series={[{ name: "Days", data: [b.present, b.absent, b.leave, b.notMarked] }]}
            type="bar"
            height={260}
            width="100%"
          />
        ) : b.total > 0 ? (
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

/* ------------------------------------------------------------------ */
/*  SCHOOL YEAR / MONTH FILTER                                         */
/* ------------------------------------------------------------------ */

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

// Month to show inside a school year: today's month if inside the range,
// otherwise the closest end of the range.
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
        // School years not readable for this role: hide the filters and use
        // the current month/year instead.
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
/*  STATES                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  GUARDIAN ATTENDANCE                                                */
/* ------------------------------------------------------------------ */

// API sends percentages as strings like "3.8%"
const parsePct = (value) => parseFloat(String(value ?? "0").replace("%", "")) || 0;

const GuardianAttendanceRecord = () => {
  const guardianId =
    localStorage.getItem("guardian_id") || localStorage.getItem("guardianId");

  const filter = useSchoolYearFilter();
  const { initLoading, filtersUnavailable, selectedKey, schoolYears, selectedYear, monthOptions } =
    filter;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noResult, setNoResult] = useState(false);

  const loadData = useCallback(async () => {
    if (initLoading || !guardianId) return;
    if (!filtersUnavailable && !selectedKey) {
      setData(null);
      setNoResult(true);
      return;
    }
    try {
      setLoading(true);
      setError("");
      setNoResult(false);

      let month;
      let year;
      if (filtersUnavailable) {
        const now = new Date();
        month = now.getMonth() + 1;
        year = now.getFullYear();
      } else {
        ({ year, month } = parseYM(selectedKey));
      }

      const res = await fetchGuardianAttendance(guardianId, month, year);

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
      console.error("Failed to get guardian attendance", err);
      setError("Failed to load data. Try again");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [initLoading, filtersUnavailable, selectedKey, guardianId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // API: { guardian_id, filter_month, filter_year, total_children, children: [...] }
  const children = data?.children || [];
  const totalChildren = data?.total_children ?? children.length;
  const singleChild = children.length === 1 ? children[0] : null;

  const selectedMonthLabel = monthOptions.find((m) => m.key === selectedKey)?.label || "";
  const monthLabel =
    data?.filter_month && data?.filter_year
      ? `${MONTHS[data.filter_month - 1]} ${data.filter_year}`
      : selectedMonthLabel;
  const yearLabel = selectedYear?.year_name || (data?.filter_year ? `${data.filter_year}` : "School year");

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-5xl mx-auto my-5">
        <div className="text-center mb-2">
          <span className="font-bold text-2xl flex justify-center gap-2 text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-square-poll-vertical flex pt-1" />
            Attendance Record
          </span>
          {data && singleChild && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{singleChild.student_name}</span>
              {singleChild.class_name && <span> &middot; {singleChild.class_name}</span>}
            </p>
          )}
          {data && totalChildren > 1 && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">{totalChildren} children</p>
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
        ) : data && children.length === 0 ? (
          <NoResultState message="No children are linked to this account yet." />
        ) : data ? (
          <div className="space-y-10">
            {children.map((child, idx) => (
              <section key={child.student_id ?? `${child.student_name}-${idx}`}>
                {children.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bgTheme text-white flex items-center justify-center font-bold">
                      {(child.student_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                        {child.student_name}
                      </h2>
                      {child.class_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {child.class_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <SummaryCard
                    title="This month"
                    subtitle={monthLabel}
                    percentage={parsePct(child.monthly_summary?.percentage)}
                    summary={child.monthly_summary}
                    chartType={CHART_TYPE}
                  />
                  <SummaryCard
                    title="Full year"
                    subtitle={yearLabel}
                    percentage={parsePct(child.yearly_summary?.percentage)}
                    summary={child.yearly_summary}
                    chartType={CHART_TYPE}
                  />
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GuardianAttendanceRecord;