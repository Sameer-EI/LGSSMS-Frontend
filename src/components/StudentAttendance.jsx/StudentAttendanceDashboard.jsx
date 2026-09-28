import React, { useState, useEffect, useRef } from 'react';
import Chart from "react-apexcharts";
import { fetchAttendanceData } from '../../services/api/Api';
import { fetchAttendanceDefaulters } from '../../services/api/StudentAttendanceApi';
import { constants } from '../../global/constants';

const DEFAULTER_THRESHOLD = 75;
const PAGE_SIZE = 7;

const StudentAttendanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersLoading, setDefaultersLoading] = useState(true); // initial load only
  const [defaultersError, setDefaultersError] = useState(null);
  const [totalDefaulters, setTotalDefaulters] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false); // drives the spinner row only
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const isFetchingMoreRef = useRef(false);

  const tableScrollRef = useRef(null);

  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Dark Mode State & Observer
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
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
          setError('Failed to fetch dashboard data.');
          setData(null);
        } else {
          setData(result);
        }
      } catch (err) {
        setError('Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedDate]);

  // Term-wide defaulters — initial load (first page only)
  useEffect(() => {
    const loadDefaulters = async () => {
      try {
        setDefaultersLoading(true);
        setDefaultersError(null);

        const result = await fetchAttendanceDefaulters(DEFAULTER_THRESHOLD, "ALL", PAGE_SIZE, 0);
        const results = Array.isArray(result?.results) ? result.results : [];

        setDefaulters(results);
        offsetRef.current = results.length;
        setHasMore(Boolean(result?.next) && results.length > 0);
        setTotalDefaulters(result?.total_defaulters ?? result?.count ?? results.length);
      } catch (err) {
        setDefaultersError('Failed to fetch defaulters.');
        setDefaulters([]);
        setHasMore(false);
      } finally {
        setDefaultersLoading(false);
      }
    };

    loadDefaulters();
  }, []);

  // Load next page — guarded by a ref (synchronous), not state, so rapid-fire
  // scroll events during an in-flight request can't slip through and double-fetch.
  const loadMoreDefaulters = async () => {
    if (isFetchingMoreRef.current || defaultersLoading || !hasMore) return;

    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchAttendanceDefaulters(
        DEFAULTER_THRESHOLD,
        "ALL",
        PAGE_SIZE,
        offsetRef.current
      );
      const results = Array.isArray(result?.results) ? result.results : [];

      setDefaulters(prev => [...prev, ...results]);
      offsetRef.current += results.length;
      // Also stop if the API says there's a next page but returns nothing —
      // avoids an infinite retry loop against the same offset.
      setHasMore(Boolean(result?.next) && results.length > 0);
    } catch (err) {
      console.error('Failed to load more defaulters:', err);
      setHasMore(false); // stop retrying on scroll; existing rows stay intact
    } finally {
      setLoadingMore(false);
      isFetchingMoreRef.current = false;
    }
  };

  const handleTableScroll = (e) => {
    const el = e.target;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      loadMoreDefaulters();
    }
  };

  // --- Data Processing ---

  const overall = data?.overall_attendance || { present: 0, total: 0, percentage: '0.0%' };
  const totalRecords = overall.total || 0;
  const presentCount = overall.present || 0;
  const absentCount = totalRecords - presentCount;
  const presentPct = overall.percentage ? overall.percentage.replace('%', '') : '0.0';

  const classWise = data?.class_wise_attendance || [];

  const classStats = classWise
    .filter(cls => cls.total > 0)
    .map((cls, idx) => ({
      id: idx,
      label: cls.class_name,
      percentage: cls.percentage ? Math.round(parseFloat(cls.percentage)) : 0,
      present: cls.present,
      total: cls.total,
    }));

  // Sort accumulated (loaded-so-far) defaulters, worst-first
  const sortedDefaulters = [...defaulters].sort(
    (a, b) => a.term_percentage - b.term_percentage
  );

  // --- ApexCharts Configuration ---
  const chartSeries = [{
    name: 'Attendance',
    data: classStats.map(cls => cls.percentage)
  }];

  const chartOptions = {
    chart: {
      type: 'bar',
      height: 250,
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        columnWidth: '35%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        colors: {
          ranges: [
            { from: 0, to: 74.99, color: constants.canadaPink || '#d3a4a4' },
            { from: 75, to: 89.99, color: constants.saffronOrange || '#e5c07b' },
            { from: 90, to: 100, color: constants.italianGreen || '#5c8a7a' }
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: { fontSize: '12px', colors: [isDark ? '#9ca3af' : '#6b7280'] },
      formatter: function (val) { return val + "%"; }
    },
    xaxis: {
      categories: classStats.map(cls => cls.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280', fontSize: '12px' } }
    },
    yaxis: { max: 100, show: false },
    grid: { show: false },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: function (val) { return val + "% attendance"; } }
    },
    legend: { show: false }
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
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Daily Attendance Report</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">All classes, Grade 1-12</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
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
          No attendance records found for {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
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
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: constants.italianGreen || '#5c8a7a' }}></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">{presentCount}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Present</span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: constants.canadaPink || '#d3a4a4' }}></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">{absentCount}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Absent</span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  <span className="text-xl font-medium text-gray-800 dark:text-gray-200">{totalRecords}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
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
                <Chart options={chartOptions} series={chartSeries} type="bar" height="100%" />
              </div>
              <div className="flex gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: constants.italianGreen || '#5c8a7a' }}></span> 90%+
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: constants.saffronOrange || '#e5c07b' }}></span> 75-89%
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: constants.canadaPink || '#d3a4a4' }}></span> below 75%
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

      {/* Needs Attention Section — term-wide defaulters, independent of selectedDate, infinite-scroll paginated */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 bgTheme text-white text-center flex justify-between items-center">
          <h2 className="text-xl font-bold">Needs Attention</h2>
          <span className="text-sm text-white/80 font-normal">
            {totalDefaulters > 0 ? `${totalDefaulters} below ${DEFAULTER_THRESHOLD}% (term)` : `Below ${DEFAULTER_THRESHOLD}% (term)`}
          </span>
        </div>

        {/* Scrollable body: header stays pinned, rows scroll within a fixed max height, next page fetched near bottom */}
        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="max-h-[400px] overflow-y-auto overflow-x-auto"
        >
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Present / Working Days</th>
                <th className="px-6 py-4 font-medium">Term Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {defaultersLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading defaulters...
                  </td>
                </tr>
              ) : defaultersError ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-red-400">
                    {defaultersError}
                  </td>
                </tr>
              ) : sortedDefaulters.length > 0 ? (
                <>
                  {sortedDefaulters.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{student.student_name}</span>
                        <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">Roll {student.roll_number}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{student.class_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {student.days_present} / {student.total_working_days}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                          {student.term_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {loadingMore && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bgTheme rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                          <div className="w-2 h-2 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!hasMore && !loadingMore && (
                    <tr>
                      <td colSpan="4" className="px-6 py-3 text-center text-gray-300 dark:text-gray-600 text-xs">
                        — end of list —
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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