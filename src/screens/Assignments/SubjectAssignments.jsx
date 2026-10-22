import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDropdownTeachers,
  fetchPeriods,
  fetchYearLevels,
  fetchTerms,
  fetchSubjectsByYearLevel,
  fetchClassTimetable,
  fetchTeacherTimetable,
  toggleTeacherAbsence,
  fetchAvailableSubstitutes,
  assignSubstitute,
  removeSubstitute,
  saveTimetableSlot,
  clearTimetableSlot,
} from "../../services/api/Api";

/* ----------------------------- constants ----------------------------- */

const VIEW_MODES = [
  { value: "classwise", label: "Classwise Timetable" },
  { value: "teacher", label: "Teacher Workload" },
];

// status = attendance code sent to the API: "A" Absent, "L" Leave, "P" Present
const ABSENCE_REASONS = [
  { value: "casual_leave", label: "Casual Leave / Absent", status: "A" },
  { value: "medical_leave", label: "Medical Leave", status: "L" },
  { value: "official_duty", label: "Official Duty", status: "L" },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/* ------------------------------ helpers ------------------------------ */

// Local date as YYYY-MM-DD (toISOString() would give the UTC date, which can
// be "yesterday" in the morning in India)
const localDateISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayInfo = () => {
  const now = new Date();
  return {
    dayName: now.toLocaleDateString("en-US", { weekday: "long" }),
    label: now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
};

// "1st Period" -> 1<sup>st</sup> Period
const renderPeriodName = (name = "") => {
  const match = name.match(/^(\d+)(st|nd|rd|th)\s+(.*)$/i);
  if (!match) return name;
  return (
    <>
      {match[1]}
      <sup>{match[2]}</sup> {match[3]}
    </>
  );
};

// /t/dropdown-teachers/ -> { id, name, cadre, subject_name, display_name }
const teacherName = (t) => t.name || t.display_name || "";

// "Anita Sharma (PGT - Physics)" comes ready-made from the API
const teacherOptionLabel = (t) => t.display_name || teacherName(t);

// /d/subject/ -> subject name (adjust here if your field is named differently)
const subjectLabel = (s) => s.name || s.subject_name || "";

// case/space-insensitive string compare helper
const norm = (s) => String(s || "").trim().toLowerCase();

// find a subject in a list by its name
const findSubjectByName = (list, name) =>
  name ? list.find((s) => norm(subjectLabel(s)) === norm(name)) : undefined;

// find a teacher by id first, then by name
const findTeacher = (list, id, name) =>
  (id ? list.find((t) => String(t.id) === String(id)) : null) ||
  (name ? list.find((t) => norm(teacherName(t)) === norm(name)) : null) ||
  null;

// First human-readable string inside an API error body (string / array / object)
const firstText = (v) => {
  if (!v) return "";
  if (typeof v === "string") {
    // ignore HTML error pages and very long blobs
    return v.trim().startsWith("<") || v.length > 200 ? "" : v;
  }
  if (Array.isArray(v)) return firstText(v[0]);
  if (typeof v === "object") {
    for (const x of Object.values(v)) {
      const t = firstText(x);
      if (t) return t;
    }
  }
  return "";
};

// Message for the user. Uses the backend's own text when it sent one, otherwise
// the fallback. Never shows axios text like "Request failed with status code 400".
const apiError = (err, fallback) => {
  const d = err?.response?.data;
  return (
    firstText(d?.error) ||
    firstText(d?.detail) ||
    firstText(d?.message) ||
    firstText(d?.non_field_errors) ||
    firstText(d) ||
    fallback
  );
};

// "08:00:00" -> "8:00", "13:00:00" -> "1:00"
const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return t;
  return `${hour % 12 || 12}:${m ?? "00"}`;
};

// Year of the term that contains today, else the latest year
const pickCurrentYear = (terms) => {
  if (!terms.length) return "";
  const today = localDateISO();
  const current = terms.find((t) => t.start_date <= today && today <= t.end_date);
  return (current || terms[terms.length - 1]).year;
};

// Date sent to the timetable API for the selected school year:
// today if it falls inside that year, otherwise the year's first day
const dateForYear = (terms, year) => {
  const today = localDateISO();
  const ofYear = terms.filter((t) => t.year === year);
  if (!ofYear.length) return today;
  const start = ofYear.map((t) => t.start_date).sort()[0];
  const end = ofYear.map((t) => t.end_date).sort().slice(-1)[0];
  return today >= start && today <= end ? today : start;
};

// Real date of `dayName` in the Mon-Sat week that contains `baseISO`
const dateOfWeekday = (baseISO, dayName) => {
  const [y, m, d] = baseISO.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const target = new Date(base);
  target.setDate(
    base.getDate() - ((base.getDay() + 6) % 7) + Math.max(DAYS.indexOf(dayName), 0)
  );
  return localDateISO(target);
};

/**
 * Turns the API's nested schedule into:
 *  - map:     "monday|0" -> period object
 *  - periods: [{ id, name, time_range }] for the table header (from the API)
 */
const buildGrid = (timetable) => {
  const map = new Map();
  const periodMap = new Map();

  (timetable?.schedule || []).forEach((d) => {
    (d.periods || []).forEach((p) => {
      map.set(`${String(d.day).toLowerCase()}|${p.period_index}`, p);
      if (!periodMap.has(p.period_index)) {
        periodMap.set(p.period_index, {
          id: p.period_index,
          name: p.period_name,
          time_range: p.time_range,
        });
      }
    });
  });

  const periods = [...periodMap.values()].sort((a, b) => a.id - b.id);
  return { map, periods };
};

// Backend may send free slots as real entries named "Free"
const isFreeValue = (v) => String(v || "").trim().toLowerCase() === "free";

// Text colours per cell state: normal / absent (red) / arrangement (green) / free (muted)
const STATUS_TEXT = {
  normal: {
    primary: "textTheme font-bold",
    secondary: "text-gray-500 dark:text-gray-300",
    note: "text-gray-500 dark:text-gray-400",
  },
  absent: {
    primary: "text-red-700 dark:text-red-300 font-bold",
    secondary: "text-red-600 dark:text-red-300",
    note: "text-red-700 dark:text-red-300 font-semibold",
  },
  arrangement: {
    primary: "text-green-700 dark:text-green-300 font-bold",
    secondary: "text-green-700 dark:text-green-300",
    note: "text-green-700 dark:text-green-300 font-semibold",
  },
  free: {
    primary: "text-[#9aa3b8] italic font-normal",
    secondary: "text-[#9aa3b8]",
    note: "text-[#9aa3b8]",
  },
};

const STATUS_CLASSES = {
  normal: "",
  absent: "bg-red-100 dark:bg-red-900/30",
  arrangement: "bg-green-100 dark:bg-green-900/30",
  free: "bg-[#f8f9fc] dark:bg-gray-800/60",
};

/* --------------------------- small components --------------------------- */

const LegendItem = ({ boxClass, label }) => (
  <span className="flex items-center gap-1.5">
    <span className={`inline-block w-3.5 h-3.5 rounded-sm border ${boxClass}`} />
    {label}
  </span>
);

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
    <LegendItem boxClass="bg-red-100 border-red-300" label="Absent" />
    <LegendItem boxClass="bg-green-100 border-green-400" label="Arrangement" />
    <LegendItem boxClass="bg-gray-100 border-gray-300" label="Free" />
  </div>
);

/**
 * Presentational grid shared by both views.
 * getCell(day, periodIndex) -> { primary, secondary, note?, status } | null
 * onCellClick(day, periodIndex) is optional: only the classwise view passes it.
 */
const TimetableGrid = ({
  periods,
  getCell,
  todayDay,
  todayLabel,
  emptyText,
  onCellAction,
  onCellClick,
}) => (
  <div className="relative isolate overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
    <table className="w-full min-w-[820px] table-fixed border-collapse text-center">
      <thead className="bgTheme text-white">
        <tr>
          <th className="sticky left-0 z-20 bgTheme w-24 sm:w-32 px-2 py-3 text-xs sm:text-sm font-semibold border-r border-white/20">
            Day / Period
          </th>
          {periods.map((p) => (
            <th
              key={p.id}
              className="px-2 py-3 font-semibold border-r border-white/20 last:border-r-0"
            >
              <div className="text-xs sm:text-sm text-nowrap">
                {renderPeriodName(p.name)}
              </div>
              <div className="text-[10px] sm:text-xs font-normal opacity-90 text-nowrap">
                {p.time_range}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-800">
        {DAYS.map((day) => (
          <tr
            key={day}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <th
              scope="row"
              className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-3 border-r border-gray-200 dark:border-gray-600"
            >
              <div className="textTheme text-xs sm:text-sm font-bold">{day}</div>
              {day === todayDay && (
                <div className="text-[10px] sm:text-xs font-normal text-purple-600 dark:text-purple-300">
                  ({todayLabel})
                </div>
              )}
            </th>

            {periods.map((p) => {
              const cell = getCell(day, p.id);
              const status = cell?.status || "free";
              const tc = STATUS_TEXT[status] || STATUS_TEXT.normal;
              return (
                <td
                  key={p.id}
                  title={cell?.note || undefined}
                  onClick={onCellClick ? () => onCellClick(day, p.id) : undefined}
                  className={`px-2 py-3 border-r border-gray-200 dark:border-gray-700 last:border-r-0 align-middle ${STATUS_CLASSES[status]} ${
                    onCellClick ? "cursor-pointer hover:brightness-95" : ""
                  }`}
                >
                  {cell ? (
                    <>
                      <div
                        className={`text-xs sm:text-sm break-words ${tc.primary}`}
                      >
                        {cell.primary}
                      </div>
                      {cell.secondary && (
                        <div
                          className={`text-[11px] sm:text-xs break-words ${tc.secondary}`}
                        >
                          {cell.secondary}
                        </div>
                      )}
                      {cell.note && (
                        <div
                          className={`mt-0.5 text-[10px] sm:text-[11px] break-words ${tc.note}`}
                        >
                          {cell.note}
                        </div>
                      )}
                      {cell.action && onCellAction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            // don't also open the edit-period modal
                            e.stopPropagation();
                            onCellAction(cell.action);
                          }}
                          className={`mt-1.5 px-2 py-0.5 rounded border bg-white text-[10px] sm:text-[11px] font-semibold ${
                            cell.action.type === "assign"
                              ? "border-red-400 text-red-700 hover:bg-red-50"
                              : "border-green-500 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {cell.action.type === "assign" ? "Assign Sub" : "Remove"}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm italic font-normal text-[#9aa3b8]">
                      {emptyText}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ---------------------------- main component ---------------------------- */

export const SubjectAssignments = () => {
  const [viewMode, setViewMode] = useState("classwise");

  // master data
  const [yearLevels, setYearLevels] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [terms, setTerms] = useState([]);
  const [periods, setPeriods] = useState([]); // used for headers + period ids

  // filters
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");

  // absence panel
  const [absenceTeacherId, setAbsenceTeacherId] = useState("");
  const [absenceReason, setAbsenceReason] = useState(ABSENCE_REASONS[0].value);
  const [toggling, setToggling] = useState(false);
  // teacher ids currently marked absent/leave today (decides A/L vs P on toggle)
  const [absentIds, setAbsentIds] = useState(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  // timetable data
  const [timetable, setTimetable] = useState(null);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState("");

  // page state
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(false);

  // modal
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // assign-substitute modal (null = closed)
  const [subModal, setSubModal] = useState(null);

  // edit-period modal (null = closed)
  const [editModal, setEditModal] = useState(null);

  // confirm modal (null = closed): { title, message, confirmLabel, run, busy }
  const [confirmModal, setConfirmModal] = useState(null);

  const { dayName: todayDay, label: todayLabel } = useMemo(todayInfo, []);

  /* ---- derived from terms ---- */
  const schoolYears = useMemo(
    () => [...new Set(terms.map((t) => t.year))],
    [terms]
  );
  const targetDate = useMemo(
    () => dateForYear(terms, selectedSchoolYear),
    [terms, selectedSchoolYear]
  );
  const isToday = targetDate === localDateISO();

  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, teacherName(t)])),
    [teachers]
  );

  /* ---- initial load ---- */
  useEffect(() => {
    const init = async () => {
      try {
        const [levelsData, teachersRes, termsData, periodsData] =
          await Promise.all([
            fetchYearLevels(),
            fetchDropdownTeachers(),
            fetchTerms().catch(() => []),
            fetchPeriods().catch(() => []),
          ]);

        const teachersData = Array.isArray(teachersRes)
          ? teachersRes
          : teachersRes?.results || [];

        setYearLevels(levelsData);
        setTeachers(teachersData);
        setTerms(termsData);
        setPeriods(periodsData);

        if (levelsData.length) setSelectedClassId(String(levelsData[0].id));
        if (teachersData.length)
          setSelectedTeacherId(String(teachersData[0].id));
        setSelectedSchoolYear(pickCurrentYear(termsData));
      } catch (err) {
        console.error("Failed to load subject allocation data:", err);
        setPageError(true);
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, []);

  /* ---- keep absence teacher in sync with Teacher Workload selection ---- */
  useEffect(() => {
    if (viewMode === "teacher" && selectedTeacherId) {
      setAbsenceTeacherId(selectedTeacherId);
    }
  }, [viewMode, selectedTeacherId]);

  /* ---- load timetable for the active view ---- */
  const activeId = viewMode === "classwise" ? selectedClassId : selectedTeacherId;

  useEffect(() => {
    if (!activeId) {
      setTimetable(null);
      return;
    }

    let cancelled = false; // ignore stale responses

    const load = async () => {
      setTimetableLoading(true);
      setTimetableError("");
      try {
        const data =
          viewMode === "classwise"
            ? await fetchClassTimetable(activeId, targetDate)
            : await fetchTeacherTimetable(activeId, targetDate);
        if (!cancelled) setTimetable(data);
      } catch (err) {
        console.error("Failed to load timetable:", err);
        if (!cancelled) {
          setTimetable(null);
          setTimetableError("Failed to load timetable. Please try again.");
        }
      } finally {
        if (!cancelled) setTimetableLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [viewMode, activeId, targetDate, refreshKey]);

  /* ---- grid data built from the API response ---- */
  const grid = useMemo(() => buildGrid(timetable), [timetable]);

  // Periods of the selected school year, sorted by start time
  const sortedYearPeriods = useMemo(
    () =>
      (selectedSchoolYear
        ? periods.filter((p) => p.year === selectedSchoolYear)
        : periods
      )
        .slice()
        .sort((a, b) =>
          String(a.start_period_time).localeCompare(String(b.start_period_time))
        ),
    [periods, selectedSchoolYear]
  );

  // Class view: header comes from the class-timetable response.
  // Teacher view: the workload response has no period names/times, so the
  // header is built from /d/Period/ (period_index = position in that list).
  const headerPeriods = useMemo(() => {
    if (viewMode !== "teacher") return grid.periods;
    if (!sortedYearPeriods.length) return grid.periods;

    return sortedYearPeriods.map((p, i) => ({
      id: i,
      name: p.name,
      time_range: `${formatTime(p.start_period_time)} - ${formatTime(
        p.end_period_time
      )}`,
    }));
  }, [viewMode, grid.periods, sortedYearPeriods]);

  // Remember which teachers the class timetable reports as absent
  useEffect(() => {
    if (viewMode !== "classwise" || !timetable?.schedule) return;
    const found = [];
    timetable.schedule.forEach((d) =>
      (d.periods || []).forEach((p) => {
        if (p.is_absent && p.teacher_id) found.push(p.teacher_id);
      })
    );
    if (found.length) setAbsentIds((prev) => new Set([...prev, ...found]));
  }, [viewMode, timetable]);

  const getPeriod = (day, periodIndex) =>
    grid.map.get(`${day.toLowerCase()}|${periodIndex}`);

  // Classwise view cell: subject + teacher (or substitute)
  const getClasswiseCell = (day, periodIndex) => {
    const p = getPeriod(day, periodIndex);
    if (!p || !p.subject || isFreeValue(p.subject)) return null;

    if (p.is_arrangement && p.arrangement) {
      const a = p.arrangement;
      return {
        primary: p.subject,
        secondary: a.substitute_teacher_subject
          ? `${a.substitute_teacher_name} (${a.substitute_teacher_subject})`
          : a.substitute_teacher_name,
        note: a.reason ? `Arrangement · ${a.reason}` : "Arrangement",
        status: "arrangement",
        action: { type: "remove", day, periodIndex },
      };
    }

    if (p.is_absent) {
      const absentId =
        p.teacher_id ??
        p.teacher?.id ??
        p.absent_teacher_id ??
        p.absent_teacher?.id;
      const absentName =
        p.teacher_name ||
        p.teacher?.name ||
        p.absent_teacher_name ||
        p.absent_teacher?.name ||
        teacherMap.get(Number(absentId)) ||
        "";
      if (!absentId) console.warn("Absent period has no teacher id:", p);

      return {
        primary: p.subject,
        secondary: absentName,
        note: p.absence_reason ? `Absent · ${p.absence_reason}` : "Absent",
        status: "absent",
        action: {
          type: "assign",
          day,
          periodIndex,
          teacherId: absentId,
          teacherName: absentName,
          subject: p.subject,
          reason: p.absence_reason,
        },
      };
    }

    // Normal period: subject with the teacher shown below it
    const normalTeacher =
      p.teacher_name ||
      p.teacher?.name ||
      teacherMap.get(Number(p.teacher_id ?? p.teacher?.id)) ||
      "";
    return { primary: p.subject, secondary: normalTeacher, status: "normal" };
  };

  // Teacher workload cell: class + subject.
  // Substitute duty shows as an "arrangement" (green) cell.
  const getTeacherCell = (day, periodIndex) => {
    const p = getPeriod(day, periodIndex);
    if (
      !p ||
      (!p.class_name && !p.subject) ||
      isFreeValue(p.class_name) ||
      isFreeValue(p.subject)
    )
      return null; // free slot -> grey "Free" cell

    return {
      primary: p.class_name || p.subject,
      secondary: p.class_name ? p.subject : "",
      note: p.is_substitute_duty ? "Arrangement" : undefined,
      status: p.is_substitute_duty ? "arrangement" : "normal",
    };
  };

  /* ---- headings ---- */
  const selectedClassName =
    timetable?.year_level_name ||
    yearLevels.find((y) => String(y.id) === selectedClassId)?.level_name ||
    "";

  const selectedTeacherName =
    timetable?.teacher?.name || teacherMap.get(Number(selectedTeacherId)) || "";
  const teacherWeeklyPeriods = timetable?.teacher?.total_weekly_periods;

  /* ---- handlers ---- */
  const handleToggleStatus = async () => {
    if (!absenceTeacherId) {
      setAlertMessage("Please select a teacher first.");
      setShowAlert(true);
      return;
    }
    const id = Number(absenceTeacherId);
    const wasAbsent = absentIds.has(id);
    const reason =
      ABSENCE_REASONS.find((r) => r.value === absenceReason) ||
      ABSENCE_REASONS[0];

    setToggling(true);
    try {
      // Absent/Leave -> Present when toggled back, otherwise A/L from the reason
      const res = await toggleTeacherAbsence(
        id,
        wasAbsent ? "P" : reason.status,
        localDateISO()
      );

      setAbsentIds((prev) => {
        const next = new Set(prev);
        if (wasAbsent) next.delete(id);
        else next.add(id);
        return next;
      });
      setAlertMessage(
        res?.message ||
          (wasAbsent
            ? "Teacher marked present."
            : `Teacher marked ${reason.status === "A" ? "absent" : "on leave"}.`)
      );
      setRefreshKey((k) => k + 1); // re-fetch so cell colours update
    } catch (err) {
      setAlertMessage(apiError(err, "Could not update attendance. Please try again."));
    } finally {
      setToggling(false);
      setShowAlert(true);
    }
  };

  /* ---- substitution (classwise view) ---- */
  const openSubModal = async (action) => {
    const date = dateOfWeekday(targetDate, action.day);
    setSubModal({
      ...action,
      date,
      loading: true,
      list: [],
      selectedId: "",
      error: "",
      submitting: false,
    });
    try {
      const res = await fetchAvailableSubstitutes({
        date,
        day: action.day,
        periodIndex: action.periodIndex,
        absentTeacherId: action.teacherId,
      });
      const list = res?.available_teachers || [];
      setSubModal((prev) => prev && { ...prev, loading: false, list });
    } catch (err) {
      setSubModal(
        (prev) =>
          prev && {
            ...prev,
            loading: false,
            error: "Failed to load available teachers.",
          }
      );
    }
  };

  const confirmSubstitute = async () => {
    if (!subModal?.selectedId) {
      setSubModal((prev) => ({
        ...prev,
        error: "Please select a substitute teacher.",
      }));
      return;
    }
    if (!subModal.teacherId) {
      setSubModal((prev) => ({
        ...prev,
        error: "Could not identify the absent teacher. Refresh the page and try again.",
      }));
      return;
    }
    setSubModal((prev) => ({ ...prev, submitting: true, error: "" }));
    try {
      await assignSubstitute({
        absent_teacher: Number(subModal.teacherId),
        substitute_teacher: Number(subModal.selectedId),
        year_level: Number(selectedClassId),
        period: String(subModal.periodIndex),
        day_of_week: subModal.day,
        date: subModal.date,
        reason: subModal.reason || "Absent",
      });
      setSubModal(null);
      setAlertMessage("Substitute assigned successfully!");
      setShowAlert(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSubModal((prev) => ({
        ...prev,
        submitting: false,
        error: apiError(err, "Could not assign the substitute. Please try again."),
      }));
    }
  };

  const performRemoveSub = async (action) => {
    try {
      const res = await removeSubstitute({
        year_level_id: Number(selectedClassId),
        day_of_week: action.day,
        period: String(action.periodIndex),
        date: dateOfWeekday(targetDate, action.day),
      });
      setAlertMessage(res?.message || "Substitution removed.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setAlertMessage(apiError(err, "Could not remove the substitution. Please try again."));
    } finally {
      setShowAlert(true);
    }
  };

  const handleRemoveSub = (action) =>
    setConfirmModal({
      title: "Remove Substitute",
      message: "Remove this substitute arrangement?",
      confirmLabel: "Remove",
      run: () => performRemoveSub(action),
    });

  const runConfirm = async () => {
    const run = confirmModal?.run;
    if (!run) return;
    setConfirmModal((prev) => prev && { ...prev, busy: true });
    try {
      await run();
    } finally {
      setConfirmModal(null);
    }
  };

  const handleCellAction = (action) =>
    action.type === "assign" ? openSubModal(action) : handleRemoveSub(action);

  /* ---- edit period assignment (classwise view) ---- */

  const openEditModal = async (day, periodIndex) => {
    const p = getPeriod(day, periodIndex);
    const header = headerPeriods.find((h) => h.id === periodIndex);
    const hasAssignment = !!(p && p.subject && !isFreeValue(p.subject));

    // teacher currently assigned to this slot (by id, else by name)
    const teacher = hasAssignment
      ? findTeacher(
          teachers,
          p.teacher_id ?? p.teacher?.id,
          p.teacher_name || p.teacher?.name
        )
      : null;

    setEditModal({
      day,
      periodIndex,
      periodName: header?.name || "",
      currentSubjectName: hasAssignment ? p.subject : "",
      teacherSubjectName: teacher?.subject_name || "",
      subjectId: "",
      teacherId: teacher ? String(teacher.id) : "",
      subjects: [],
      subjectsLoading: true,
      hasAssignment,
      saving: false,
      removing: false,
      error: "",
    });

    // GET /d/subject/?year_level=<id> -> subjects available for this class
    try {
      const res = await fetchSubjectsByYearLevel(selectedClassId);
      const list = Array.isArray(res) ? res : res?.results || [];
      setEditModal((prev) => {
        if (!prev) return prev;
        // slot's current subject first, then the teacher's own subject
        const match =
          findSubjectByName(list, prev.currentSubjectName) ||
          findSubjectByName(list, prev.teacherSubjectName);
        return {
          ...prev,
          subjects: list,
          subjectsLoading: false,
          subjectId: match ? String(match.id) : "",
        };
      });
    } catch (err) {
      setEditModal(
        (prev) =>
          prev && {
            ...prev,
            subjectsLoading: false,
            error: "Failed to load subjects for this class.",
          }
      );
    }
  };

  const handleEditTeacherChange = (value) => {
    const t = teachers.find((x) => String(x.id) === value);
    setEditModal((prev) => {
      // switch to the new teacher's subject; the user can still change it afterwards
      const match = findSubjectByName(prev.subjects, t?.subject_name);
      return {
        ...prev,
        teacherId: value,
        teacherSubjectName: t?.subject_name || "",
        subjectId: match ? String(match.id) : prev.subjectId,
        error: "",
      };
    });
  };

  const saveSlot = async () => {
    const m = editModal;
    if (!m.subjectId) {
      setEditModal((prev) => ({ ...prev, error: "Please select a subject." }));
      return;
    }
    if (!m.teacherId) {
      setEditModal((prev) => ({ ...prev, error: "Please select a teacher." }));
      return;
    }

    setEditModal((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      // POST /t/save-timetable-slot/
      const res = await saveTimetableSlot({
        year_level_id: Number(selectedClassId),
        day_of_week: m.day,
        period_index: m.periodIndex,
        subject_id: Number(m.subjectId),
        teacher_id: Number(m.teacherId),
      });
      setEditModal(null);
      setAlertMessage(res?.message || "Period saved successfully!");
      setShowAlert(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      // 400 conflicts (teacher already has a class in this slot, etc.)
      setEditModal((prev) => ({
        ...prev,
        saving: false,
        error: apiError(err, "Could not save this period. Please try again."),
      }));
    }
  };

  const removeSlot = () => {
    const m = editModal;
    setConfirmModal({
      title: "Remove Assignment",
      message: "Remove this period assignment?",
      confirmLabel: "Remove",
      run: () => performRemoveSlot(m),
    });
  };

  const performRemoveSlot = async (m) => {
    setEditModal((prev) => prev && { ...prev, removing: true, error: "" });
    try {
      // POST /t/clear-timetable-slot/ (also removes substitute assignments)
      const res = await clearTimetableSlot({
        year_level_id: Number(selectedClassId),
        day_of_week: m.day,
        period_index: m.periodIndex,
      });
      setEditModal(null);
      setAlertMessage(res?.message || "Period assignment removed.");
      setShowAlert(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setEditModal((prev) => ({
        ...prev,
        removing: false,
        error: apiError(err, "Could not remove this assignment. Please try again."),
      }));
    }
  };

  /* ------------------------------ render ------------------------------ */

  if (pageLoading) {
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

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  const selectCls =
    "select select-bordered w-full sm:w-auto focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600";

  const editBusy = !!(editModal?.saving || editModal?.removing);

  return (
    <div className="min-h-screen p-3 sm:p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div
        id="timetable-card"
        className="w-full max-w-7xl mx-auto p-3 sm:p-6 bg-white dark:bg-gray-800 rounded-box shadow-sm"
      >
        {/* ---------- Filters row ---------- */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center flex-1">
            {/* View mode */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className={selectCls}
            >
              {VIEW_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Year level (classwise) OR teacher (workload) */}
            {viewMode === "classwise" ? (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className={selectCls}
              >
                {yearLevels.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.level_name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className={selectCls}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teacherOptionLabel(t)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* School year */}
          <select
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
            className={`${selectCls} sm:ml-auto`}
          >
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {/* ---------- Heading + legend ---------- */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-6 mb-3">
          <h2 className="text-lg sm:text-xl font-bold textTheme">
            {viewMode === "classwise" ? (
              `Schedule: ${selectedClassName}`
            ) : (
              <>
                {`Teacher Schedule: ${selectedTeacherName}`}
                {teacherWeeklyPeriods !== undefined && (
                  <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({teacherWeeklyPeriods} periods / week)
                  </span>
                )}
              </>
            )}
          </h2>
          <Legend />
        </div>

        {/* ---------- Body ---------- */}
        {timetableLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
              <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
            </div>
            <p className="mt-2 text-gray-500 text-sm">Loading timetable...</p>
          </div>
        ) : timetableError ? (
          <p className="text-center py-10 text-red-500">{timetableError}</p>
        ) : !activeId ? (
          <p className="text-center py-10 text-gray-500 dark:text-gray-400">
            {viewMode === "classwise"
              ? "Select a class to view its timetable."
              : "Select a teacher to view their workload."}
          </p>
        ) : headerPeriods.length === 0 ? (
          <p className="text-center py-10 text-gray-500 dark:text-gray-400">
            No timetable found.
          </p>
        ) : viewMode === "classwise" ? (
          <TimetableGrid
            periods={headerPeriods}
            getCell={getClasswiseCell}
            onCellAction={handleCellAction}
            onCellClick={openEditModal} // classwise only
            todayDay={isToday ? todayDay : null}
            todayLabel={todayLabel}
            emptyText="Free"
          />
        ) : (
          <TimetableGrid
            periods={headerPeriods}
            getCell={getTeacherCell}
            todayDay={isToday ? todayDay : null}
            todayLabel={todayLabel}
            emptyText="Free"
          />
        )}

        {/* Mobile hint */}
        <p className="mt-2 text-center text-xs text-gray-400 md:hidden">
          Swipe the table sideways to see all periods
        </p>
      </div>

      {/* ---------- Edit period assignment modal ---------- */}
      {editModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="flex items-center gap-2 font-bold text-lg textTheme">
                <i className="fa-solid fa-pen-to-square" />
                Edit Period Assignment
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-lg"
                onClick={() => setEditModal(null)}
                disabled={editBusy}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="mt-4 px-4 py-3 rounded-lg bg-purple-50 dark:bg-gray-700 text-sm textTheme">
              <b>Class:</b> {selectedClassName} | <b>Slot:</b> {editModal.day},{" "}
              {renderPeriodName(editModal.periodName)}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-200 mb-1">
                Subject
              </label>
              <select
                value={editModal.subjectId}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    subjectId: e.target.value,
                    error: "",
                  }))
                }
                disabled={editModal.subjectsLoading}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="">
                  {editModal.subjectsLoading
                    ? "Loading subjects..."
                    : "Select subject..."}
                </option>
                {editModal.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-200 mb-1">
                Teacher
              </label>
              <select
                value={editModal.teacherId}
                onChange={(e) => handleEditTeacherChange(e.target.value)}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="">Select teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teacherOptionLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            {editModal.error && (
              <p className="mt-3 text-sm text-red-500">{editModal.error}</p>
            )}

            <div className="modal-action mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 justify-between">
              {editModal.hasAssignment ? (
                <button
                  className="btn bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  onClick={removeSlot}
                  disabled={editBusy}
                >
                  {editModal.removing ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <>
                      <i className="fa-solid fa-trash-can" /> Remove Assignment
                    </>
                  )}
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  className="btn"
                  onClick={() => setEditModal(null)}
                  disabled={editBusy}
                >
                  Cancel
                </button>
                <button
                  className="btn bgTheme text-white"
                  onClick={saveSlot}
                  disabled={editBusy}
                >
                  {editModal.saving ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* ---------- Assign substitute modal ---------- */}
      {subModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
              Assign Substitute
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {subModal.day} ({subModal.date}) · {subModal.subject}
              <br />
              Absent: {subModal.teacherName || "Teacher not identified"}
            </p>

            <div className="mt-4">
              {subModal.loading ? (
                <p className="text-sm text-gray-500">
                  Loading available teachers...
                </p>
              ) : subModal.list.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No free teachers available for this period.
                </p>
              ) : (
                <select
                  value={subModal.selectedId}
                  onChange={(e) =>
                    setSubModal((prev) => ({
                      ...prev,
                      selectedId: e.target.value,
                      error: "",
                    }))
                  }
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">Select substitute teacher...</option>
                  {subModal.list.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name || t.name}
                    </option>
                  ))}
                </select>
              )}
              {subModal.error && (
                <p className="mt-2 text-sm text-red-500">{subModal.error}</p>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setSubModal(null)}
                disabled={subModal.submitting}
              >
                Cancel
              </button>
              <button
                className="btn bgTheme text-white"
                onClick={confirmSubstitute}
                disabled={
                  subModal.submitting ||
                  subModal.loading ||
                  subModal.list.length === 0
                }
              >
                {subModal.submitting ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* ---------- Confirm modal ---------- */}
      {confirmModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
              {confirmModal.title}
            </h3>
            <p className="py-4 text-gray-700 dark:text-gray-200">
              {confirmModal.message}
            </p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setConfirmModal(null)}
                disabled={confirmModal.busy}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={runConfirm}
                disabled={confirmModal.busy}
              >
                {confirmModal.busy ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  confirmModal.confirmLabel || "Confirm"
                )}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* ---------- Alert modal ---------- */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
              Absence &amp; Substitution
            </h3>
            <p className="py-4 text-gray-700 dark:text-gray-200">
              {alertMessage}
            </p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white"
                onClick={() => setShowAlert(false)}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

// Alias so both names work
export const SubjectAllocation = SubjectAssignments;

export default SubjectAssignments;