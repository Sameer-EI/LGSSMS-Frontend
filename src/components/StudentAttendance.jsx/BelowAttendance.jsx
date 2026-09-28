import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAttendanceDefaulters,
  notifyParentAboutAttendance,
} from "../../services/api/StudentAttendanceApi";
import { fetchYearLevels, fetchTeacherDashboard } from "../../services/api/Api";

const THRESHOLD = 75;
const PAGE_SIZE = 10;

// ---------- Role / identity helpers (same rules as the Attendance Register) ----------

// User id (used for the teacher dashboard API)
const getLoggedInUserId = () => {
  const raw = localStorage.getItem("user_id") ?? localStorage.getItem("userId");
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) return null;
  return id;
};

// Logged-in user's role, e.g. "office staff" or "teacher"
const getLoggedInRole = () => {
  const raw =
    localStorage.getItem("userRole") ?? localStorage.getItem("user_role");
  return raw ? String(raw).trim().toLowerCase() : null;
};

// Admin, office staff (and any other non-teacher role) can view ANY class.
// Only teachers are restricted to their single allocated class.
// If the role is missing/unknown we stay on the safe side and restrict.
const isOfficeStaffRole = (role) => {
  if (!role) return false;
  return !role.includes("teacher");
};

// Fallback: teacher's year level id from localStorage
const getTeacherYearLevelId = () => {
  const keys = [
    "yearLevelId",
    "year_level_id",
    "yearLevel",
    "year_level",
    "classId",
    "class_id",
  ];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    const id = Number(raw);
    if (raw && !Number.isNaN(id) && id > 0) return id;
  }
  return null;
};

const normalize = (str) => String(str ?? "").trim().toLowerCase();

const downloadCSV = (rows) => {
  const header = ["Student", "Roll No", "Class", "Term Attendance %", "Days Absent"];
  const lines = rows.map((r) => [
    r.student_name,
    r.roll_number,
    r.class_name,
    r.term_percentage,
    r.days_absent,
  ]);

  const csvContent = [header, ...lines]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `below-75-attendance-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const normalizeClasses = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list
    .filter((cls) => cls && cls.id != null)
    .map((cls) => ({
      id: cls.id,
      label:
        cls.name ||
        cls.year_name ||
        cls.level_name ||
        cls.class_name ||
        `Class ${cls.id}`,
    }));
};

const BelowAttendance = () => {
  // Role: office staff can browse every class, teachers only their own.
  const [role] = useState(getLoggedInRole);
  const canViewAnyClass = isOfficeStaffRole(role);

  // classes
  const [classOptions, setClassOptions] = useState([]);

  // table data
  // null = "not resolved yet" (teachers wait for their class to be found
  // before anything is fetched, so we never request "ALL" on their behalf).
  const [selectedClass, setSelectedClass] = useState(
    canViewAnyClass ? "ALL" : null
  );
  // Teacher whose allocated class could not be identified
  const [noClass, setNoClass] = useState(false);

  const [defaulters, setDefaulters] = useState([]);
  const [totalDefaulters, setTotalDefaulters] = useState(0);

  // Initial/class-change load vs. "load next page" load — kept as separate
  // loading flags, same split as StudentAttendanceDashboard's Needs Attention table.
  const [defaultersLoading, setDefaultersLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);

  const [notifiedIds, setNotifiedIds] = useState(new Set());
  const [notifyingId, setNotifyingId] = useState(null);

  // Refs, not state, for values read inside the scroll-triggered fetch guard.
  // State updates are async/batched, so rapid-fire scroll events can both read
  // a stale "not loading" / stale offset before the first setState commits,
  // causing duplicate requests for the same page. Refs update synchronously.
  const offsetRef = useRef(0);
  const isFetchingMoreRef = useRef(false);
  const selectedClassRef = useRef(selectedClass);

  const tableScrollRef = useRef(null);

  useEffect(() => {
    selectedClassRef.current = selectedClass;
  }, [selectedClass]);

  // Dark Mode State & Observer (Copied from DirectorDashboard)
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
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

  /* ---------------- Classes: fetched once on mount, independent of the table ----------------
     Office staff: full class list, default to "All classes".
     Teacher: resolved to their single allocated class (dashboard first,
     then localStorage fallback) and locked to it. */
  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      const userId = getLoggedInUserId();

      const [levelsRes, dashRes] = await Promise.allSettled([
        fetchYearLevels(),
        !canViewAnyClass && userId
          ? fetchTeacherDashboard(userId)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const allLevels =
        levelsRes.status === "fulfilled"
          ? normalizeClasses(levelsRes.value)
          : [];
      if (levelsRes.status !== "fulfilled") {
        console.error("Failed to load year levels:", levelsRes.reason);
      }

      // ----- Office staff / admin: everything -----
      if (canViewAnyClass) {
        setClassOptions(allLevels);
        return;
      }

      // ----- Teacher: only their own class -----
      const dash = dashRes.status === "fulfilled" ? dashRes.value : null;
      if (!dash) {
        console.warn("Teacher dashboard unavailable:", dashRes.reason);
      }

      const assignedName = dash?.class_summary?.[0]?.level_name;
      let match = assignedName
        ? allLevels.find((l) => normalize(l.label) === normalize(assignedName))
        : null;

      if (!match) {
        const storedId = getTeacherYearLevelId();
        if (storedId) {
          match =
            allLevels.find((l) => Number(l.id) === storedId) ||
            // year levels failed to load but we still know the id
            { id: storedId, label: assignedName || `Class ${storedId}` };
        }
      }

      if (match) {
        setClassOptions([match]);
        setSelectedClass(match.id);
      } else {
        // Never fall back to "all classes" for a teacher.
        setNoClass(true);
        setDefaultersLoading(false);
      }
    };

    loadClasses();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Defaulters: first page — on mount AND whenever the class filter changes ---------------- */
  useEffect(() => {
    // Teacher's class not resolved yet — don't fetch anything.
    if (selectedClass === null) return;

    let cancelled = false;

    const loadFirstPage = async () => {
      setDefaultersLoading(true);
      setError(false);

      try {
        const result = await fetchAttendanceDefaulters(
          THRESHOLD,
          selectedClass,
          PAGE_SIZE,
          0
        );
        if (cancelled) return;

        const results = Array.isArray(result?.results) ? result.results : [];

        setDefaulters(results);
        offsetRef.current = results.length;
        setHasMore(Boolean(result?.next) && results.length > 0);
        setTotalDefaulters(
          result?.total_defaulters ?? result?.count ?? results.length
        );
      } catch (err) {
        console.error("Failed to load attendance defaulters:", err);
        if (cancelled) return;
        setDefaulters([]);
        setHasMore(false);
        setError(true);
      } finally {
        if (!cancelled) setDefaultersLoading(false);
      }
    };

    loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  // Load next page — guarded by a ref (synchronous), not state, so rapid-fire
  // scroll events during an in-flight request can't slip through and double-fetch.
  const loadMoreDefaulters = async () => {
    if (
      isFetchingMoreRef.current ||
      defaultersLoading ||
      !hasMore ||
      selectedClassRef.current === null
    )
      return;

    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchAttendanceDefaulters(
        THRESHOLD,
        selectedClassRef.current,
        PAGE_SIZE,
        offsetRef.current
      );
      const results = Array.isArray(result?.results) ? result.results : [];

      setDefaulters((prev) => [...prev, ...results]);
      offsetRef.current += results.length;
      // Also stop if the API says there's a next page but returns nothing —
      // avoids an infinite retry loop against the same offset.
      setHasMore(Boolean(result?.next) && results.length > 0);
    } catch (err) {
      console.error("Failed to load more defaulters:", err);
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

  const handleClassChange = (clsId) => {
    // Teachers can't switch class; office staff can.
    if (!canViewAnyClass) return;
    if (clsId === selectedClass || defaultersLoading) return;
    setSelectedClass(clsId);
    // The [selectedClass] effect above handles resetting defaulters/offsetRef/hasMore
    // and fetching page one for the new class.
  };

  const handleNotify = async (studentId) => {
    try {
      setNotifyingId(studentId);
      await notifyParentAboutAttendance(studentId, "defaulter");
      setNotifiedIds((prev) => new Set(prev).add(studentId));
    } catch (err) {
      // failure is already logged inside the API function; keep the row quiet
    } finally {
      setNotifyingId(null);
    }
  };

  const sortedDefaulters = useMemo(
    () => [...defaulters].sort((a, b) => a.term_percentage - b.term_percentage),
    [defaulters]
  );

  const pillBase =
    "rounded-full px-4 py-1.5 text-xs font-medium transition sm:text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60";

  // --- Loading State (Matches DirectorDashboard) ---
  if (defaultersLoading && defaulters.length === 0) {
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

  // --- Teacher without an identifiable class ---
  if (noClass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-yellow-400 mb-4"></i>
        <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
          Could not identify your class.
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please log out and log in again, or contact the school office.
        </p>
      </div>
    );
  }

  // --- Error State (Matches DirectorDashboard) ---
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

  const isAllClasses = selectedClass === "ALL";

  return (
    <div className="p-4 space-y-6 mb-24 md:mb-10 mx-auto max-w-7xl">
      {/* Main Card Container */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        {/* Header Section */}
        <div className="p-4 bgTheme text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Below 75% attendance
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Students who may not meet exam eligibility this term
            </p>
          </div>

          <button
            onClick={() => downloadCSV(sortedDefaulters)}
            disabled={defaultersLoading || sortedDefaulters.length === 0}
            className="inline-flex items-center justify-center rounded-md bg-white text-gray-800 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {/* Class filter — office staff can browse every class; teachers only
            ever have their one allocated class, so there's nothing to pick
            and the pills are replaced with a plain label. */}
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {canViewAnyClass ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleClassChange("ALL")}
                disabled={defaultersLoading}
                className={`${pillBase} ${
                  selectedClass === "ALL"
                    ? "bgTheme text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All classes
              </button>

              {classOptions.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleClassChange(cls.id)}
                  disabled={defaultersLoading}
                  className={`${pillBase} ${
                    selectedClass === cls.id
                      ? "bgTheme text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {cls.label}
                </button>
              ))}
            </div>
          ) : (
            classOptions.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400 dark:text-gray-500">Class:</span>
                <span className="px-4 py-1.5 rounded-full bgTheme text-white font-medium">
                  {classOptions[0].label}
                </span>
              </div>
            )
          )}
        </div>

        {/* Table — scrollable body, header pinned, next page fetched near bottom */}
        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="max-h-[65vh] overflow-y-auto overflow-x-auto"
        >
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 shadow-sm">
              <tr>
                <th className="whitespace-nowrap px-4 py-4 font-medium sm:px-6">
                  Student
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium sm:px-6">
                  Class
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium sm:px-6">
                  Term attendance
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium sm:px-6">
                  Days absent
                </th>
                <th className="whitespace-nowrap px-4 py-4 text-right font-medium sm:px-6">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedDefaulters.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {`No students below 75% attendance ${
                      !isAllClasses ? "in this class" : ""
                    }.`}
                  </td>
                </tr>
              ) : (
                <>
                  {sortedDefaulters.map((student) => (
                    <tr
                      key={student.student_id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {student.student_name}
                        </span>{" "}
                        <span className="text-xs text-gray-400 dark:text-gray-500 sm:text-sm">
                          Roll {student.roll_number}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-700 sm:px-6 dark:text-gray-300">
                        {student.class_name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <span className="inline-flex rounded-full bg-red-50 dark:bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                          {student.term_percentage}%
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-700 sm:px-6 dark:text-gray-300">
                        {student.days_absent} days
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        {notifiedIds.has(student.student_id) ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                            Sent ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleNotify(student.student_id)}
                            disabled={notifyingId === student.student_id}
                            className="bgTheme text-white rounded-md px-4 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-60"
                          >
                            {notifyingId === student.student_id
                              ? "Notifying…"
                              : "Notify parent"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {loadingMore && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-gray-400 dark:text-gray-500 text-xs"
                      >
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
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-center text-gray-300 dark:text-gray-600 text-xs"
                      >
                        — end of list —
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
          {totalDefaulters} student{totalDefaulters !== 1 ? "s" : ""} below 75%
          {!isAllClasses ? " in this class" : " across all classes"}
          {defaulters.length > 0 && defaulters.length < totalDefaulters
            ? ` (${defaulters.length} loaded)`
            : ""}
          .
        </div>
      </div>
    </div>
  );
};

export default BelowAttendance;