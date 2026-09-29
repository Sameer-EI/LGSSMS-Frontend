import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { fetchStudentHeatMap } from "../../services/api/StudentAttendanceApi";

// ---------- Helpers ----------
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
// Props: student = { student_id, student_name, roll_number }, onClose()
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
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose}></div>

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

export default StudentHeatmapPanel;