import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
  fetchStudentAttendanceRegister,
  markStudentAttendance,
  fetchStudentHeatMap,
} from "../../services/api/StudentAttendanceApi";
import { fetchYearLevels, fetchTeacherDashboard } from "../../services/api/Api";
import { SuccessModal } from "../Modals/SuccessModal";

// ---------- Helpers ----------
// Teacher id (used for saving attendance)
const getLoggedInTeacherId = () => {
  const raw =
    localStorage.getItem("teacherId") ?? localStorage.getItem("teacher_id");
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) {
    console.warn("teacherId not found in localStorage:", raw);
    return null;
  }
  return id;
};

// Office staff id (used for saving attendance when an office-staff user marks)
const getLoggedInOfficeStaffId = () => {
  const raw =
    localStorage.getItem("officeStaffId") ??
    localStorage.getItem("office_staff_id") ??
    localStorage.getItem("user_id") ??
    localStorage.getItem("userId");
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) {
    console.warn("officeStaffId not found in localStorage:", raw);
    return null;
  }
  return id;
};

// User id (used for the teacher dashboard API)
const getLoggedInUserId = () => {
  const raw = localStorage.getItem("user_id") ?? localStorage.getItem("userId");
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) return null;
  return id;
};

// Logged-in user's role, e.g. "office staff" or "teacher"
const getLoggedInRole = () => {
  const raw = localStorage.getItem("userRole") ?? localStorage.getItem("user_role");
  return raw ? String(raw).trim().toLowerCase() : null;
};

// Office staff can mark attendance for ANY class via the same API.
// Everyone else (teachers) is restricted to their single allocated class.
const isOfficeStaffRole = (role) =>
  role === "office staff" || role === "office_staff" || role === "staff" || role === "admin";

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

// Display name of a year level object
const getLevelName = (cls) =>
  cls?.name || cls?.year_name || cls?.level_name || `Class ${cls?.id}`;

const normalize = (str) => String(str ?? "").trim().toLowerCase();

// Local (not UTC) date as YYYY-MM-DD
const getTodayLocal = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

// Builds { student_id: status } from the register API response
const buildAttendanceMap = (data) => {
  const map = {};
  if (data?.students) {
    data.students.forEach((s) => {
      if (s.status) map[s.student_id] = s.status;
    });
  }
  return map;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getTermPillColor = (percentage) => {
  if (percentage >= 90)
    return "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  if (percentage >= 75)
    return "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
};

// ---------- Heatmap config ----------
const HEAT = {
  present: { label: "Present", cls: "bg-green-600" },
  absent: { label: "Absent", cls: "bg-red-600" },
  leave: { label: "Leave", cls: "bg-blue-800" },
  holiday: { label: "Holiday/Event", cls: "bg-sky-400" },
  sunday: { label: "Sunday", cls: "bg-purple-600" },
  notMarked: { label: "Not Marked", cls: "bg-gray-200 dark:bg-gray-600" },
};

// Handles full words from the API ("Present", "Holiday - Winter Holidays")
// as well as short codes (P, A, L, H, S).
const getHeatStatus = (rawStatus) => {
  const raw = String(rawStatus ?? "").trim();
  const s = raw.toLowerCase();

  if (s === "present" || s === "p") return HEAT.present;
  if (s === "absent" || s === "a") return HEAT.absent;
  if (s === "leave" || s === "l" || s === "lv") return HEAT.leave;
  if (s === "sunday" || s === "sun" || s === "s") return HEAT.sunday;
  if (
    s.startsWith("holiday") ||
    s.startsWith("event") ||
    s === "h" ||
    s === "e"
  ) {
    // keep the reason for the tooltip, e.g. "Holiday - Winter Holidays"
    return { ...HEAT.holiday, label: raw || HEAT.holiday.label };
  }
  return HEAT.notMarked;
};

const HEAT_LEGEND = [
  HEAT.present,
  HEAT.absent,
  HEAT.leave,
  HEAT.holiday,
  HEAT.sunday,
  HEAT.notMarked,
];

const percentTextColor = (p) => {
  if (p >= 90) return "text-green-600 dark:text-green-400";
  if (p >= 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

// ---------- Student heatmap side panel ----------
const StudentHeatmapPanel = ({ student, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch the heatmap whenever a different student is opened
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);

    fetchStudentHeatMap(student.student_id, 30)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [student.student_id]);

  // Close on Escape + lock page scroll while the panel is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const heatMap = data?.heat_map || [];
  const summary = data?.term_summary;
  const rangeText =
    heatMap.length > 0
      ? `${formatDate(heatMap[0].date)} – ${formatDate(
          heatMap[heatMap.length - 1].date,
        )}`
      : null;

  const name = data?.student_name || student.student_name;
  const roll = data?.roll_number ?? student.roll_number;
  const hasRoll = roll !== null && roll !== undefined && roll !== "";

  const stats = summary
    ? [
        {
          label: "Term attendance",
          value: `${summary.percentage}%`,
          cls: percentTextColor(summary.percentage),
        },
        { label: "Days present", value: summary.present_days },
        { label: "Days absent", value: summary.absent_days },
        { label: "Days on leave", value: summary.leave_days },
      ]
    : [];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
      ></div>

      {/* Panel: full screen on mobile, side drawer from sm up */}
      <aside
        role="dialog"
        aria-label={`Attendance history for ${name}`}
        className="relative z-[1000] h-full w-full sm:max-w-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xl overflow-y-auto"
      >
        <div className="p-5 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{name}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {data?.class_name || ""}
                {data?.class_name && hasRoll ? " · " : ""}
                {hasRoll ? `Roll no. ${roll}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
              </div>
              <p className="mt-2 text-sm text-gray-500">Loading history...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="py-16 text-center">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
              <p className="text-red-400 font-medium">
                Failed to load attendance history.
              </p>
              <button
                onClick={onClose}
                className="mt-4 text-sm underline text-gray-500 dark:text-gray-400"
              >
                Close
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && data && (
            <>
              {/* Summary row */}
              {summary && (
                <div className="mt-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-x-6 gap-y-4 sm:gap-x-8">
                    {stats.map((s) => (
                      <div key={s.label}>
                        <p
                          className={`text-2xl sm:text-3xl font-semibold ${s.cls || ""}`}
                        >
                          {s.value}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    Out of {summary.total_working_days} working days this term
                  </p>
                </div>
              )}

              {/* Heatmap */}
              <div className="mt-6">
                <h3 className="text-lg sm:text-xl font-semibold">
                  Last {heatMap.length || 30} Days Heatmap
                </h3>
                {rangeText && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Range: {rangeText}
                  </p>
                )}

                {heatMap.length > 0 ? (
                  <div className="mt-4 grid grid-cols-10 gap-1.5 sm:gap-2">
                    {heatMap.map((day) => {
                      const st = getHeatStatus(day.status);
                      return (
                        <div
                          key={day.date}
                          title={`${formatDate(day.date)}: ${st.label}`}
                          aria-label={`${formatDate(day.date)}: ${st.label}`}
                          className={`aspect-square rounded-md ${st.cls}`}
                        ></div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No attendance history available yet.
                  </p>
                )}

                {/* Legend */}
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {HEAT_LEGEND.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-sm ${item.cls}`}
                      ></span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

// ---------- Main component ----------
const StudentAttendanceRegister = () => {
  // Role: decides whether the user can browse/mark every class (office
  // staff) or is locked to their single allocated class (teacher).
  const [role] = useState(getLoggedInRole);
  const canMarkAnyClass = isOfficeStaffRole(role);

  // Data States
  const [yearLevels, setYearLevels] = useState([]);
  const [registerData, setRegisterData] = useState(null);

  // Filter States
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [heatmapStudent, setHeatmapStudent] = useState(null); // student whose heatmap is open

  // Local state to track attendance changes before saving
  const [attendanceMap, setAttendanceMap] = useState({});
  // Snapshot of what the server last returned for this class/date — used
  // to work out which students were actually *edited* vs. unchanged, so
  // we only ever send a diff to the API.
  const [originalAttendanceMap, setOriginalAttendanceMap] = useState({});

  // Success modal (opened only after attendance is saved)
  const successModalRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState("");

  const extractErrorMessage = (err) => {
    if (!err.response || !err.response.data) {
      return "An unexpected error occurred. Please try again.";
    }
    const data = err.response.data;

    if (typeof data === "string") return data;
    if (Array.isArray(data) && data.length > 0) return data[0];

    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors[0]
        : data.non_field_errors;
    }
    if (data.detail) return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const value = data[firstKey];
      return Array.isArray(value) ? value[0] : value;
    }

    return "Failed to save attendance. Please try again.";
  };

  // On mount: load year levels + teacher dashboard, then decide which
  // class(es) this user is allowed to see, based on their role.
  useEffect(() => {
    const loadInitialData = async () => {
      const userId = getLoggedInUserId();

      const [levelsRes, dashRes] = await Promise.allSettled([
        fetchYearLevels(),
        userId ? fetchTeacherDashboard(userId) : Promise.reject("no user id"),
      ]);

      if (levelsRes.status !== "fulfilled") {
        console.error("Failed to load year levels", levelsRes.reason);
        setError(true);
        setLoading(false);
        return;
      }

      const raw = levelsRes.value;
      const allLevels = Array.isArray(raw) ? raw : raw?.results || [];

      if (allLevels.length === 0) {
        setYearLevels([]);
        setLoading(false);
        return;
      }

      const dash = dashRes.status === "fulfilled" ? dashRes.value : null;
      if (!dash) {
        console.warn("Teacher dashboard unavailable:", dashRes.reason);
      }

      // Best-guess "home" class from the dashboard, falling back to a
      // year level id stashed in localStorage.
      const assignedName = dash?.class_summary?.[0]?.level_name;
      let match = assignedName
        ? allLevels.find(
            (l) => normalize(getLevelName(l)) === normalize(assignedName),
          )
        : null;
      if (!match) {
        const storedId = getTeacherYearLevelId();
        match = allLevels.find((l) => l.id === storedId);
      }

      if (canMarkAnyClass) {
        // Office staff: full class list, default to their "home" class
        // (if any) or just the first one — but they can switch freely.
        setYearLevels(allLevels);
        setSelectedClass(match ? match.id : allLevels[0].id);
      } else {
        // Teacher: locked to their own allocated class only.
        const assignedLevel = match ? [match] : allLevels.slice(0, 1);
        setYearLevels(assignedLevel);
        setSelectedClass(assignedLevel[0]?.id ?? null);
      }

      setLoading(false);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Register Data on filter changes
  useEffect(() => {
    const loadRegisterData = async () => {
      if (!selectedClass) return;

      try {
        setLoading(true);
        setError(false);
        const data = await fetchStudentAttendanceRegister(
          selectedClass,
          selectedDate,
          debouncedSearch,
        );
        setRegisterData(data);
        setSelectedStudentIds(new Set());
        const map = buildAttendanceMap(data);
        setAttendanceMap(map);
        setOriginalAttendanceMap(map);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadRegisterData();
  }, [selectedClass, selectedDate, debouncedSearch]);

  // ---------- Derived state ----------
  const students = registerData?.students || [];
  const isSchoolDay = registerData?.is_school_day ?? true;
  const holidayReason = registerData?.holiday_reason;

  const isAlreadyMarked = (student) => Boolean(student.status);

  // Attendance is never locked once marked — office staff and teachers can
  // both go back and edit a student's status later. The only thing that
  // blocks marking/editing entirely is the day itself not being a school day.
  const isStudentLocked = () => !isSchoolDay;

  const editableStudents = students.filter((s) => !isStudentLocked(s));
  const markedCount = students.filter(isAlreadyMarked).length;

  // Only students whose status actually changed vs. what the server had —
  // new marks AND edits to an already-marked student — are sent to the API.
  const pendingMap = {};
  editableStudents.forEach((s) => {
    const current = attendanceMap[s.student_id];
    const original = originalAttendanceMap[s.student_id];
    if (current && current !== original) {
      pendingMap[s.student_id] = current;
    }
  });
  const pendingCount = Object.keys(pendingMap).length;

  const allSelected =
    editableStudents.length > 0 &&
    editableStudents.every((s) => selectedStudentIds.has(s.student_id));

  // ---------- Handlers ----------
  const handleSelectAll = (e) => {
    if (e.target.checked && editableStudents.length > 0) {
      setSelectedStudentIds(new Set(editableStudents.map((s) => s.student_id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (student) => {
    if (isStudentLocked(student)) return;
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(student.student_id)) {
      newSelection.delete(student.student_id);
    } else {
      newSelection.add(student.student_id);
    }
    setSelectedStudentIds(newSelection);
  };

  const handleStatusChange = (student, status) => {
    if (isStudentLocked(student)) return;
    setAttendanceMap((prev) => ({ ...prev, [student.student_id]: status }));
  };

  const handleBulkAction = (status) => {
    const newMap = { ...attendanceMap };
    editableStudents.forEach((s) => {
      if (selectedStudentIds.has(s.student_id)) {
        newMap[s.student_id] = status;
      }
    });
    setAttendanceMap(newMap);
  };

  const handleSaveAttendance = async () => {
    if (!registerData?.students || !selectedClass || !isSchoolDay) return;

    if (pendingCount === 0) {
      setApiError("Please mark or edit attendance for at least one student.");
      return;
    }

    // Resolve the correct marker id for whoever is actually logged in.
    // Exactly one of these goes to the API; the other stays null.
    const teacherId = canMarkAnyClass ? null : getLoggedInTeacherId();
    const officeStaffId = canMarkAnyClass ? getLoggedInOfficeStaffId() : null;

    if (canMarkAnyClass && !officeStaffId) {
      setApiError(
        "Could not identify the logged-in office staff account. Please log out and log in again.",
      );
      return;
    }
    if (!canMarkAnyClass && !teacherId) {
      setApiError(
        "Could not identify the logged-in teacher. Please log out and log in again.",
      );
      return;
    }

    // Capture before the refetch changes these values
    const savedCount = pendingCount;
    const savedDate = formatDate(selectedDate);

    try {
      setSaving(true);
      setApiError(null);

      // Same endpoint/function handles both first-time marks and edits to
      // an already-marked student — it's a bulk update/create on the backend.
      await markStudentAttendance(
        selectedClass,
        { teacherId, officeStaffId },
        selectedDate,
        pendingMap,
      );

      const data = await fetchStudentAttendanceRegister(
        selectedClass,
        selectedDate,
        debouncedSearch,
      );
      setRegisterData(data);
      const map = buildAttendanceMap(data);
      setAttendanceMap(map);
      setOriginalAttendanceMap(map);
      setSelectedStudentIds(new Set());

      setSuccessMessage(
        `Attendance for ${savedCount} ${
          savedCount === 1 ? "student" : "students"
        } on ${savedDate} was saved successfully.`,
      );
      successModalRef.current?.show();
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!registerData?.students) return;

    const header = ["Roll No", "Student Name", "Term %", "Status"];
    const rows = registerData.students.map((s) => [
      s.roll_number,
      s.student_name,
      `${s.term_percentage}%`,
      attendanceMap[s.student_id] || "Unmarked",
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `attendance_register_class_${selectedClass}_${selectedDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------- Shared UI pieces ----------
  const renderStatusButtons = (student, fullWidth = false) => {
    const currentStatus = attendanceMap[student.student_id];
    const locked = isStudentLocked(student);
    const options = [
      { value: "P", label: "P", active: currentStatus === "P" },
      { value: "A", label: "A", active: currentStatus === "A" },
      {
        value: "Leave",
        label: "Leave",
        active:
          currentStatus === "Leave" ||
          currentStatus === "LV" ||
          currentStatus === "L",
      },
    ];

    return (
      <div
        title={
          locked ? "Attendance marking disabled (non-school day)" : undefined
        }
        className={`flex bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {options.map((opt, idx) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleStatusChange(student, opt.value)}
            disabled={locked}
            className={`py-2 md:py-1.5 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              fullWidth ? "flex-1" : "px-4"
            } ${idx > 0 ? "border-l border-gray-200 dark:border-gray-600" : ""} ${
              opt.active
                ? "bgTheme text-white"
                : `text-gray-600 dark:text-gray-300 ${
                    locked ? "" : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  };

  const renderStatusNote = (student) => {
    if (!isSchoolDay) {
      return (
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
          ({holidayReason || "Holiday"})
        </span>
      );
    }
    if (isAlreadyMarked(student)) {
      const changed =
        attendanceMap[student.student_id] !==
        originalAttendanceMap[student.student_id];
      return (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            changed
              ? "text-amber-600 dark:text-amber-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <i className="fa-solid fa-pen text-[10px]"></i>
          {changed ? "Edited (unsaved)" : "Marked · editable"}
        </span>
      );
    }
    return null;
  };

  const checkboxClass =
    "w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-800 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed";

  // Stops a click on a control from also opening the heatmap row click
  const stop = (e) => e.stopPropagation();

  // Sticky header cell style (solid background so rows never show through)
  const thClass =
    "sticky top-0 z-10 px-4 lg:px-6 py-4 font-medium bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600";

  // --- Loading & Error States ---
  if (loading && !registerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading register data...</p>
      </div>
    );
  }

  if (error && !registerData) {
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
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 mb-24 md:mb-10 mx-auto max-w-7xl">
      {/* --- STUDENT HEATMAP SIDE PANEL --- */}
      {heatmapStudent && (
        <StudentHeatmapPanel
          student={heatmapStudent}
          onClose={() => setHeatmapStudent(null)}
        />
      )}

      {/* --- SUCCESS MODAL (shown only after attendance is saved) --- */}
      <SuccessModal
        ref={successModalRef}
        title="Attendance Saved!"
        message={successMessage}
        buttonText="Done"
      />

      {/* --- ERROR MODAL --- */}
      {apiError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
              Action Required
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
              {apiError}
            </p>
            <button
              onClick={() => setApiError(null)}
              className="w-full bgTheme text-white rounded-md py-2 px-4 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <h3 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        Attendance Register
      </h3>

      {/* Header & Filter Card */}
      <div className="border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 bgTheme text-white flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Daily Register</h1>
            <p className="mt-1 text-sm text-white/80">
              Marking for {formatDate(selectedDate)}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white w-full sm:w-auto">
              <svg
                className="w-4 h-4 mr-2 opacity-80 shrink-0"
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
                className="outline-none bg-transparent dark:[color-scheme:dark] cursor-pointer w-full"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-white text-gray-800 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!isSchoolDay && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-md text-sm shadow-sm">
              Attendance marking is disabled: School was closed on{" "}
              {formatDate(selectedDate)}{" "}
              {holidayReason ? `(${holidayReason})` : ""}.
            </div>
          )}

          {isSchoolDay && markedCount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-md text-sm shadow-sm">
              {markedCount} of {students.length} students already have
              attendance marked for this date. You can still edit any of
              them below.
            </div>
          )}

          {/* Class Filter Pills — office staff can browse every class;
              teachers only ever have their one allocated class, so there's
              nothing to pick and the row is replaced with a plain label. */}
          {canMarkAnyClass ? (
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
              {yearLevels.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
                  className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedClass === cls.id
                      ? "bgTheme text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {getLevelName(cls)}
                </button>
              ))}
            </div>
          ) : (
            yearLevels.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400 dark:text-gray-500">Class:</span>
                <span className="px-4 py-1.5 rounded-full bgTheme text-white font-medium">
                  {getLevelName(yearLevels[0])}
                </span>
              </div>
            )
          )}

          {/* Search Bar & Bulk Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search student name or roll no."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md pl-9 pr-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[color:var(--theme-color)]"
              />
            </div>

            {selectedStudentIds.size > 0 && isSchoolDay && (
              <div className="flex items-center justify-between sm:justify-start gap-3 bg-gray-50 dark:bg-gray-700 px-3 py-2 sm:py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Bulk mark ({selectedStudentIds.size}):
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBulkAction("P")}
                    className="text-xs font-medium text-green-600 hover:text-green-700"
                  >
                    Present
                  </button>
                  <button
                    onClick={() => handleBulkAction("A")}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Absent
                  </button>
                  <button
                    onClick={() => handleBulkAction("Leave")}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Leave
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Students card.
          Flex column with a capped height: the list area in the middle
          scrolls on its own (with a sticky header), while the save bar
          below it stays fixed at the bottom of the card. */}
      <div className="flex flex-col max-h-[70vh] border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
        {/* ---------- Separate scroll area (table + mobile cards) ---------- */}
        <div className="flex-1 min-h-0 overflow-auto overscroll-contain [scrollbar-width:thin]">
          {/* Desktop / tablet table */}
          <div className="hidden md:block">
            <table className="w-full min-w-[640px] text-left text-sm border-separate border-spacing-0">
              <thead className="text-gray-600 dark:text-gray-300">
                <tr>
                  <th className={`${thClass} w-12`}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={allSelected}
                      disabled={editableStudents.length === 0}
                      className={checkboxClass}
                    />
                  </th>
                  <th className={thClass}>Student</th>
                  <th className={thClass}>Term %</th>
                  <th className={thClass}>Status for this date</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <tr
                      key={student.student_id}
                      onClick={() => setHeatmapStudent(student)}
                      title="View attendance history"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors [&>td]:border-b [&>td]:border-gray-100 dark:[&>td]:border-gray-700"
                    >
                      <td className="px-4 lg:px-6 py-4" onClick={stop}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.student_id)}
                          onChange={() => handleSelectStudent(student)}
                          disabled={isStudentLocked(student)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {student.student_name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                          Roll {student.roll_number}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getTermPillColor(student.term_percentage)}`}
                        >
                          {student.term_percentage}%
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4" onClick={stop}>
                        <div className="flex items-center gap-3">
                          {renderStatusButtons(student)}
                          {renderStatusNote(student)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      No students found for this class or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {students.length > 0 ? (
              <>
                <label className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={allSelected}
                    disabled={editableStudents.length === 0}
                    className={checkboxClass}
                  />
                  Select all ({editableStudents.length})
                </label>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {students.map((student) => (
                    <div key={student.student_id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.student_id)}
                          onChange={() => handleSelectStudent(student)}
                          disabled={isStudentLocked(student)}
                          className={`${checkboxClass} mt-1`}
                        />
                        {/* Tap the name area to open the heatmap */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setHeatmapStudent(student)}
                        >
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Roll {student.roll_number} · View history
                          </p>
                        </div>
                        <span
                          className={`shrink-0 inline-flex px-3 py-1 rounded-full text-xs font-medium ${getTermPillColor(student.term_percentage)}`}
                        >
                          {student.term_percentage}%
                        </span>
                      </div>

                      {renderStatusButtons(student, true)}
                      {renderStatusNote(student)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No students found for this class or search query.
              </p>
            )}
          </div>
        </div>

        {/* ---------- Fixed footer (save bar) ----------
            Sits outside the scroll area, so it never scrolls away and is
            always visible at the bottom of the students card. */}
        {isSchoolDay && students.length > 0 && (
          <div className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_8px_-6px_rgba(0,0,0,0.15)]">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} ready to save`
                : "Mark or edit students above, then save"}
            </span>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || pendingCount === 0}
              className="shrink-0 bgTheme text-white rounded-md px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Saving..."
                : pendingCount > 0
                  ? `Save Attendance (${pendingCount})`
                  : "Save Attendance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceRegister;