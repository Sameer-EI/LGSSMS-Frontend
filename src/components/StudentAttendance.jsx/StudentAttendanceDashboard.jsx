import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { fetchAttendanceData } from "../../services/api/Api";
import { fetchAttendanceDefaulters } from "../../services/api/StudentAttendanceApi";
import { constants } from "../../global/constants";
import { useNavigate } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";

const DEFAULTER_THRESHOLD = 75;
const PAGE_SIZE = 5; // only the 5 worst students are shown here; "View all" opens the full list

// Absolute path for the "below attendance" page (a missing leading "/" would
// make navigate() resolve it relative to the current route and break).
const rawBelowAttendancePath = allRouterLink?.belowAttendance ?? "belowAttendance";
const BELOW_ATTENDANCE_PATH = rawBelowAttendancePath.startsWith("/")
  ? rawBelowAttendancePath
  : `/${rawBelowAttendancePath}`;

// Logged-in user's role from localStorage, e.g. "director", "teacher"
const getLoggedInRole = () => {
  const raw =
    localStorage.getItem("userRole") ?? localStorage.getItem("user_role");
  return raw ? String(raw).trim().toLowerCase() : null;
};

// Roles that must stay on the dashboard when clicking a class bar
const isNoRegisterRole = (role) => role === "director" || role === "admin";

const StudentAttendanceDashboard = () => {
  const navigate = useNavigate();

  // Director / admin can view the chart but must not be sent to the register page
  const canOpenRegister = !isNoRegisterRole(getLoggedInRole());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersLoading, setDefaultersLoading] = useState(true);
  const [defaultersError, setDefaultersError] = useState(null);
  const [totalDefaulters, setTotalDefaulters] = useState(0);

  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Dark Mode State & Observer
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Daily attendance (date-driven)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchAttendanceData(selectedDate);

        if (!result) {
          setError("Failed to fetch dashboard data.");
          setData(null);
        } else {
          setData(result);
        }
      } catch (err) {
        setError("Failed to fetch dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedDate]);

  // Term-wide defaulters — first page only (PAGE_SIZE students)
  useEffect(() => {
    const loadDefaulters = async () => {
      try {
        setDefaultersLoading(true);
        setDefaultersError(null);

        const result = await fetchAttendanceDefaulters(
          DEFAULTER_THRESHOLD,
          "ALL",
          PAGE_SIZE,
          0,
        );
        const results = Array.isArray(result?.results) ? result.results : [];

        // Safety net in case the API ignores the page size
        setDefaulters(results.slice(0, PAGE_SIZE));
        setTotalDefaulters(
          result?.total_defaulters ?? result?.count ?? results.length,
        );
      } catch (err) {
        setDefaultersError("Failed to fetch defaulters.");
        setDefaulters([]);
      } finally {
        setDefaultersLoading(false);
      }
    };

    loadDefaulters();
  }, []);

  // --- Data Processing ---

  const overall = data?.overall_attendance || {
    present: 0,
    total: 0,
    percentage: "0.0%",
  };
  const totalRecords = overall.total || 0;
  const presentCount = overall.present || 0;
  const absentCount = totalRecords - presentCount;
  const presentPct = overall.percentage
    ? overall.percentage.replace("%", "")
    : "0.0";

  const classWise = data?.class_wise_attendance || [];

  const classStats = classWise
    .filter((cls) => cls.total > 0)
    .map((cls, idx) => ({
      id: idx,
      label: cls.class_name,
      percentage: cls.percentage ? Math.round(parseFloat(cls.percentage)) : 0,
      present: cls.present,
      total: cls.total,
    }));

  // Worst-first
  const sortedDefaulters = [...defaulters].sort(
    (a, b) => a.term_percentage - b.term_percentage,
  );

  // --- ApexCharts Configuration ---
  const chartSeries = [
    {
      name: "Attendance",
      data: classStats.map((cls) => cls.percentage),
    },
  ];

  const chartOptions = {
    chart: {
      type: "bar",
      height: 250,
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      events: {
        // Pointer cursor only when the bar is actually clickable
        dataPointMouseEnter: (event) => {
          if (canOpenRegister) event.target.style.cursor = "pointer";
        },
        dataPointMouseLeave: (event) => {
          event.target.style.cursor = "default";
        },
        // Click on a bar -> open the register for that class and the
        // selected date (not for director/admin, who stay on this page)
        dataPointSelection: (event, chartContext, config) => {
          if (!canOpenRegister) return;
          const clicked = classStats[config.dataPointIndex];
          if (!clicked) return;
          navigate("/studentAttendanceRegister", {
            state: { className: clicked.label, date: selectedDate },
          });
        },
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "35%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        dataLabels: { position: "center" }, // label sits inside the bar
        colors: {
          ranges: [
            { from: 0, to: 74.99, color: constants.canadaPink || "#d3a4a4" },
            {
              from: 75,
              to: 89.99,
              color: constants.saffronOrange || "#e5c07b",
            },
            { from: 90, to: 100, color: constants.italianGreen || "#5c8a7a" },
          ],
        },
      },
    },
    // Slightly darken the hovered bar (only when it is clickable);
    // don't keep it darkened after a click
    states: {
      hover: {
        filter: canOpenRegister
          ? { type: "darken", value: 0.9 }
          : { type: "none" },
      },
      active: { filter: { type: "none" } },
    },
    dataLabels: {
      enabled: true,
      offsetY: 0,
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: [
          // Text color per bar so it contrasts with the bar behind it
          ({ series, seriesIndex, dataPointIndex }) => {
            const val = series[seriesIndex][dataPointIndex];
            return val >= 90 ? "#ffffff" : "#1f2937";
          },
        ],
      },
      dropShadow: { enabled: false },
      formatter: function (val) {
        return val + "%";
      },
    },
    xaxis: {
      categories: classStats.map((cls) => cls.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: isDark ? "#9ca3af" : "#6b7280", fontSize: "12px" },
      },
    },
    yaxis: { max: 100, show: false },
    grid: { show: false },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: function (val) {
          return val + "% attendance";
        },
      },
    },
    legend: { show: false },
  };

  // --- Loading & Error States ---
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading attendance data...</p>
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
    <div className="p-4 space-y-6 mb-24 md:mb-10">
      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        Attendance Overview
      </h3>

      {/* Header & Filters Card */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                Daily Attendance Report
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                All classes, Grade 1-12
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                <svg
                  className="w-4 h-4 mr-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="outline-none bg-transparent dark:[color-scheme:dark]"
                />
              </div>
              <button className="bgTheme text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                Download report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner when no records */}
      {totalRecords === 0 && !loading && (
        <div className="px-4 py-3 rounded-md text-sm shadow-sm bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
          No attendance records found for{" "}
          {new Date(selectedDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .
        </div>
      )}

      {/* Overall Attendance Section */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 bgTheme text-white text-center">
          <h2 className="text-xl font-bold">Overall Attendance</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="text-6xl font-light text-gray-800 dark:text-gray-100">
              {presentPct}%
            </div>
            <div className="flex flex-wrap gap-6 mt-4 md:mt-0">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: constants.italianGreen || "#5c8a7a",
                    }}
                  ></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">
                    {presentCount}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Present
                </span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: constants.canadaPink || "#d3a4a4",
                    }}
                  ></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">
                    {absentCount}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Absent
                </span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">
                    {totalRecords}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance by Class Section */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 bgTheme text-white text-center flex justify-between items-center">
          <h2 className="text-xl font-bold">Attendance by Class</h2>
        </div>
        <div className="p-4">
          {classStats.length > 0 ? (
            <>
              <div className="h-[300px] w-full">
                <Chart
                  options={chartOptions}
                  series={chartSeries}
                  type="bar"
                  height="100%"
                />
              </div>
              <div className="flex gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: constants.italianGreen || "#5c8a7a",
                    }}
                  ></span>{" "}
                  90%+
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: constants.saffronOrange || "#e5c07b",
                    }}
                  ></span>{" "}
                  75-89%
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: constants.canadaPink || "#d3a4a4",
                    }}
                  ></span>{" "}
                  below 75%
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No class attendance data for this date.
            </p>
          )}
        </div>
      </div>

      {/* Needs Attention Section — term-wide defaulters, independent of
          selectedDate. Shows only the first PAGE_SIZE students; "View all"
          opens the full list. */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 bgTheme text-white flex flex-wrap justify-between items-center gap-3">
          <div className="text-left">
            <h2 className="text-xl font-bold">Needs Attention</h2>
            <span className="text-sm text-white/80 font-normal">
              {totalDefaulters > 0
                ? `${totalDefaulters} below ${DEFAULTER_THRESHOLD}% (term)`
                : `Below ${DEFAULTER_THRESHOLD}% (term)`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(BELOW_ATTENDANCE_PATH)}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            View all
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">
                  Present / Working Days
                </th>
                <th className="px-6 py-4 font-medium">Term Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {defaultersLoading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading defaulters...
                  </td>
                </tr>
              ) : defaultersError ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-red-400"
                  >
                    {defaultersError}
                  </td>
                </tr>
              ) : sortedDefaulters.length > 0 ? (
                sortedDefaulters.map((student) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {student.student_name}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">
                        Roll {student.roll_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {student.class_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {student.days_present} / {student.total_working_days}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                        {student.term_percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No students below {DEFAULTER_THRESHOLD}% this term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceDashboard;