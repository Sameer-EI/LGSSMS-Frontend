import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";

import {
  fetchTeachers,
  saveTeacherAttendance,
  fetchTeacherAttendanceRecords,
  fetchOfficeStaff,
  saveOfficeStaffAttendance,
  saveAllOfficeStaffAttendance,
  fetchOfficeStaffAttendanceRecords,
} from "../../services/api/Api";

/* ============================================================
   CONSTANTS & HELPERS
   ============================================================ */

// API sends P / A / L, the dropdown uses present / absent / leave
const STATUS_MAP = { P: "present", A: "absent", L: "leave" };

const STATUS_TEXT_CLASS = {
  present: "text-green-600 dark:text-green-400",
  absent: "text-red-600 dark:text-red-400",
  leave: "text-amber-600 dark:text-amber-400",
};

const normalizeStatus = (s) => {
  if (!s) return "";
  const key = String(s).toUpperCase();
  return STATUS_MAP[key] || String(s).toLowerCase();
};

// Local date (YYYY-MM-DD). toISOString() uses UTC and can return the wrong day in IST
const getToday = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// API returns `marked_at`; fall back to `date`. Keep only YYYY-MM-DD.
const recordDate = (r) => {
  const raw = r?.marked_at || r?.date;
  return raw ? String(raw).slice(0, 10) : "";
};

// Id of the person a record belongs to
const teacherIdOfRecord = (r) => r.teacher ?? r.teacher_id;
const staffIdOfRecord = (r) => r.office_staff_id ?? r.office_staff ?? r.staff;

// Records can be a plain array or a paginated { results: [] } response
const toArray = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

// Lookup map:  "<personId>_<YYYY-MM-DD>"  ->  "present" | "absent" | "leave"
const recordKey = (id, date) => `${Number(id)}_${date}`;

const buildRecordsMap = (records, personIdOfRecord) => {
  const map = {};
  toArray(records).forEach((r) => {
    const id = personIdOfRecord(r);
    const date = recordDate(r);
    if (id === undefined || id === null || !date) return;
    map[recordKey(id, date)] = normalizeStatus(r.status);
  });
  return map;
};

const fullName = (p) => `${p.first_name || ""} ${p.last_name || ""}`.trim();

const extractMessage = (data) => {
  if (!data) return "No response from server.";

  if (typeof data === "string") return data;

  // Bulk response pattern (teacher / staff)
  if (data.success_count !== undefined && data.error_count !== undefined) {
    const msgs = [];

    if (data.details?.skipped?.length) {
      data.details.skipped.forEach((s) => {
        msgs.push(
          s.message ||
            s.error ||
            `Skipped ID ${s.office_staff_id || s.teacher_id || "unknown"}`
        );
      });
    }

    if (data.details?.marked?.length) {
      data.details.marked.forEach((s) => {
        msgs.push(
          s.message ||
            s.error ||
            `Marked successfully for ID ${
              s.office_staff_id || s.teacher_id || "unknown"
            }`
        );
      });
    }

    return msgs.length ? msgs.join("\n") : "Attendance processed successfully!";
  }

  if (typeof data === "object") {
    if (data.detail || data.message || data.msg)
      return data.detail || data.message || data.msg;

    return Object.values(data).join(", ") || JSON.stringify(data);
  }

  return String(data);
};

// Shared class strings so both tabs stay identical
const inputClass =
  "w-full h-12 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5E35B1]/40";
const selectClass =
  "select select-bordered w-full focus:outline-none border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";
const labelClass =
  "block mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400";
const thClass = "px-4 py-3 text-center text-nowrap text-sm font-semibold";
const tdClass = "px-4 py-3 text-gray-700 dark:text-gray-300";

/* ============================================================
   REUSABLE SECTION (used for both Teachers and Office Staff)
   ============================================================ */

const AttendanceSection = ({
  title,
  nameHeader,
  iconClass,
  emptyText,
  people,
  initialRecords,
  personIdOfRecord,
  fetchRecords,
  saveSingle, // (peopleArray, attendanceMap) => Promise
  saveBulk, // (peopleArray, attendanceMap) => Promise
  notify,
  recordLink,
}) => {
  const today = getToday();

  // All attendance already stored on the server, keyed by person + date
  const [records, setRecords] = useState(() =>
    buildRecordsMap(initialRecords, personIdOfRecord)
  );
  // Unsaved choices made by the user: { [personId]: { date, status } }
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState("");
  const [bulkDate, setBulkDate] = useState(today);
  const [savingIds, setSavingIds] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  /* ---------- derived row state ---------- */
  // A row is "marked" when a record exists for that person on the selected date
  const getRow = (id) => {
    const date = draft[id]?.date ?? today;
    const recorded = records[recordKey(id, date)];
    return {
      date,
      marked: Boolean(recorded),
      status: recorded || draft[id]?.status || "",
    };
  };

  const filteredPeople = useMemo(
    () =>
      people
        .filter((p) =>
          fullName(p).toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [people, search]
  );

  /* ---------- handlers ---------- */
  const handleDateChange = (id, value) => {
    // Changing the date clears the status so the user picks it for that day
    setDraft((prev) => ({ ...prev, [id]: { date: value, status: "" } }));
  };

  const handleStatusChange = (id, value) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { date: prev[id]?.date ?? today, status: value },
    }));
  };

  const handleBulkDateChange = (value) => {
    setBulkDate(value);
    if (!value) return;
    const next = {};
    people.forEach((p) => {
      next[p.id] = { date: value, status: "" };
    });
    setDraft(next);
  };

  // Re-read records from the server so the UI always shows the real state.
  // If that fails, fall back to what we just saved.
  const refreshRecords = async (fallback) => {
    try {
      const fresh = await fetchRecords();
      setRecords(buildRecordsMap(fresh, personIdOfRecord));
    } catch (err) {
      console.error(err);
      setRecords((prev) => ({ ...prev, ...fallback }));
    }
  };

  const handleMark = async (person) => {
    const { date, status, marked } = getRow(person.id);

    if (marked) return;
    if (!date) {
      notify("Please select a date before marking Attendance!");
      return;
    }
    if (!status) {
      notify("Please select status before marking Attendance!");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [person.id]: true }));

    try {
      const response = await saveSingle([person], {
        [person.id]: { date, status, marked: false },
      });
      notify(extractMessage(response?.data));
      await refreshRecords({ [recordKey(person.id, date)]: status });
    } catch (error) {
      console.error(error);
      notify(
        extractMessage(
          error?.response?.data ?? "Failed to mark attendance"
        )
      );
    } finally {
      setSavingIds((prev) => ({ ...prev, [person.id]: false }));
    }
  };

  const handleMarkAll = async () => {
    const pending = people.filter((p) => {
      const row = getRow(p.id);
      return !row.marked && row.status && row.date;
    });

    if (pending.length === 0) {
      notify("Please select status before marking Attendance!");
      return;
    }

    setSavingAll(true);

    try {
      // The server accepts one date per request, so send one request per date
      const groups = {};
      pending.forEach((p) => {
        const { date, status } = getRow(p.id);
        (groups[date] = groups[date] || []).push({ person: p, status });
      });

      const entries = Object.entries(groups);
      const results = await Promise.allSettled(
        entries.map(([date, items]) => {
          const map = {};
          items.forEach(({ person, status }) => {
            map[person.id] = { date, status, marked: false };
          });
          return saveBulk(
            items.map((i) => i.person),
            map
          );
        })
      );

      const messages = [];
      const fallback = {};
      results.forEach((r, i) => {
        const [date, items] = entries[i];
        if (r.status === "fulfilled") {
          messages.push(extractMessage(r.value?.data));
          items.forEach(({ person, status }) => {
            fallback[recordKey(person.id, date)] = status;
          });
        } else {
          console.error(r.reason);
          messages.push(
            extractMessage(
              r.reason?.response?.data ?? "Failed to mark attendance"
            )
          );
        }
      });

      notify(messages.join("\n") || "Attendance saved successfully!");
      await refreshRecords(fallback);
    } catch (error) {
      console.error(error);
      notify(
        extractMessage(
          error?.response?.data ?? "Failed to mark attendance"
        )
      );
    } finally {
      setSavingAll(false);
    }
  };

  /* ---------- small render helpers (shared by table + cards) ---------- */
  const renderDateInput = (person, row) => (
    <input
      type="date"
      value={row.date}
      max={today}
      onChange={(e) => handleDateChange(person.id, e.target.value)}
      className={inputClass}
    />
  );

  const renderStatusSelect = (person, row) => (
    <select
      value={row.status}
      onChange={(e) => handleStatusChange(person.id, e.target.value)}
      disabled={row.marked}
      className={`${selectClass} ${
        row.marked
          ? `bg-gray-100 dark:bg-gray-700 cursor-not-allowed font-semibold ${
              STATUS_TEXT_CLASS[row.status] || ""
            }`
          : ""
      }`}
    >
      <option value="">-- Select Status --</option>
      <option value="absent">Absent</option>
      <option value="leave">Leave</option>
      <option value="present">Present</option>
    </select>
  );

  // Marked  -> green "Marked" chip.   Not marked -> "Mark" button.
  const renderAction = (person, row) => {
    if (row.marked) {
      return (
        <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-green-100 px-4 font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300 sm:w-28">
          <i className="fa-solid fa-check"></i>
          Marked
        </span>
      );
    }

    const saving = savingIds[person.id];
    return (
      <button
        type="button"
        onClick={() => handleMark(person)}
        disabled={saving}
        className="btn bgTheme w-full text-white sm:w-28"
      >
        {saving ? (
          <i className="fa-solid fa-spinner fa-spin"></i>
        ) : (
          "Mark"
        )}
      </button>
    );
  };

  /* ---------- UI ---------- */
  return (
    <>
      <h1 className="mb-4 mt-6 text-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
        <i className={`${iconClass} mr-2 text-3xl`}></i>
        {title}
      </h1>

      {/* Top Bar */}
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-64">
          <label className={labelClass}>Search</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value.trimStart())}
            className={inputClass}
          />
        </div>

        <div className="w-full sm:w-52">
          <label className={labelClass}>Date for all</label>
          <input
            type="date"
            value={bulkDate}
            max={today}
            onChange={(e) => handleBulkDateChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <Link
          to={recordLink}
          className="btn bgTheme w-full text-white sm:ml-auto sm:w-auto"
        >
          <i className="fa-solid fa-clipboard-list w-5"></i> Attendance Record
        </Link>
      </div>

      {filteredPeople.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {emptyText}
        </div>
      ) : (
        <>
          {/* ---------- DESKTOP / TABLET: table ---------- */}
          <div className="no-scrollbar hidden max-h-[70vh] w-full overflow-auto rounded-lg md:block">
            <table className="w-full min-w-[760px] divide-y divide-gray-300 text-xs dark:divide-gray-700 sm:text-sm">
              <thead className="bgTheme sticky top-0 z-2 text-white">
                <tr>
                  <th className={thClass}>S.NO</th>
                  <th className={thClass}>{nameHeader}</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {filteredPeople.map((person, index) => {
                  const row = getRow(person.id);
                  return (
                    <tr
                      key={person.id}
                      className="text-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className={`${tdClass} text-nowrap`}>{index + 1}</td>
                      <td
                        className={`${tdClass} text-nowrap font-bold capitalize`}
                      >
                        {fullName(person)}
                      </td>
                      <td className={`${tdClass} text-nowrap`}>
                        {person.email}
                      </td>
                      <td className="min-w-[170px] px-4 py-3">
                        {renderDateInput(person, row)}
                      </td>
                      <td className="min-w-[190px] px-4 py-3">
                        {renderStatusSelect(person, row)}
                      </td>
                      <td className="min-w-[140px] px-4 py-3">
                        <div className="flex justify-center">
                          {renderAction(person, row)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ---------- MOBILE: cards ---------- */}
          <div className="space-y-3 md:hidden">
            {filteredPeople.map((person, index) => {
              const row = getRow(person.id);
              return (
                <div
                  key={person.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold capitalize text-gray-800 dark:text-gray-100">
                        {fullName(person)}
                      </p>
                      <p className="break-all text-sm text-gray-500 dark:text-gray-400">
                        {person.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gray-400">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Date</label>
                      {renderDateInput(person, row)}
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      {renderStatusSelect(person, row)}
                    </div>
                  </div>

                  <div className="mt-4">{renderAction(person, row)}</div>
                </div>
              );
            })}
          </div>

          {/* Mark All */}
          <div className="mt-6 flex w-full justify-center">
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={savingAll}
              className="btn bgTheme w-full text-white sm:w-40"
            >
              {savingAll ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                "Mark All"
              )}
            </button>
          </div>
        </>
      )}
    </>
  );
};

/* ============================================================
   PAGE
   ============================================================ */

const TeacherAttendance = () => {
  // Active tab is kept in the URL (?tab=teachers | ?tab=staff)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "staff" ? "staff" : "teachers";

  const setActiveTab = (tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [teachers, setTeachers] = useState([]);
  const [teacherRecords, setTeacherRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);

  const [alertState, setAlertState] = useState({ open: false, message: "" });
  const notify = useCallback(
    (message) => setAlertState({ open: true, message: String(message) }),
    []
  );

  // ------------ FETCH DATA (teachers + staff) ----------
  useEffect(() => {
    let cancelled = false;

    const getData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [teachersData, teacherRecs, staffData, staffRecs] =
          await Promise.all([
            fetchTeachers(),
            fetchTeacherAttendanceRecords(),
            fetchOfficeStaff(),
            fetchOfficeStaffAttendanceRecords(),
          ]);

        if (cancelled) return;
        setTeachers(teachersData);
        setTeacherRecords(teacherRecs);
        setStaff(staffData);
        setStaffRecords(staffRecs);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    getData();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // ------------ LOADING / ERROR ----------
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex space-x-2">
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full"></div>
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.2s]"></div>
          <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-sm text-gray-500">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <i className="fa-solid fa-triangle-exclamation mb-4 text-5xl text-red-400"></i>
        <p className="text-lg font-medium text-red-400">
          Failed to load data, Try Again
        </p>
        <button
          type="button"
          className="btn bgTheme mt-4 text-white"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          <i className="fa-solid fa-rotate-right mr-2"></i>
          Retry
        </button>
      </div>
    );
  }

  // Record page link — carries the currently active tab
  const recordLink = `${allRouterLink.teacherAttendanceRecord}?tab=${activeTab}`;

  const tabClass = (tab) =>
    `px-4 sm:px-6 py-2 font-semibold rounded-t-lg border-b-2 whitespace-nowrap ${
      activeTab === tab
        ? "border-[#5E35B1] textTheme"
        : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
    }`;

  // ------------ UI WITH TABS ----------
  return (
    <div className="mb-24 min-h-screen bg-gray-50 p-3 dark:bg-gray-900 sm:p-5 md:mb-10">
      <div className="mb-10 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800 sm:p-6">
        {/* Tabs */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("teachers")}
            className={tabClass("teachers")}
          >
            <i className="fa-solid fa-person-chalkboard mr-2 text-2xl sm:text-3xl"></i>
            Teachers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={tabClass("staff")}
          >
            <i className="fa-solid fa-clipboard-user mr-2 text-2xl sm:text-3xl"></i>
            Office Staff
          </button>
        </div>

        {/* Both sections stay mounted so unsaved selections survive tab switches */}
        <div className={activeTab === "teachers" ? "block" : "hidden"}>
          <AttendanceSection
            title="Teacher Attendance"
            nameHeader="Teacher Name"
            iconClass="fa-solid fa-person-chalkboard"
            emptyText="No teachers found"
            people={teachers}
            initialRecords={teacherRecords}
            personIdOfRecord={teacherIdOfRecord}
            fetchRecords={fetchTeacherAttendanceRecords}
            saveSingle={(list, map) => saveTeacherAttendance(list, map)}
            saveBulk={(list, map) => saveTeacherAttendance(list, map)}
            notify={notify}
            recordLink={recordLink}
          />
        </div>

        <div className={activeTab === "staff" ? "block" : "hidden"}>
          <AttendanceSection
            title="Office Staff Attendance"
            nameHeader="Staff Name"
            iconClass="fa-solid fa-clipboard-user"
            emptyText="No staff found"
            people={staff}
            initialRecords={staffRecords}
            personIdOfRecord={staffIdOfRecord}
            fetchRecords={fetchOfficeStaffAttendanceRecords}
            saveSingle={(list, map) => saveOfficeStaffAttendance(list, map)}
            saveBulk={(list, map) => saveAllOfficeStaffAttendance(map, list)}
            notify={notify}
            recordLink={recordLink}
          />
        </div>
      </div>

      {/* Alert Modal (shared for both tabs) */}
      {alertState.open && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <h3 className="text-lg font-bold">
              {activeTab === "staff" ? "Staff Attendance" : "Teacher Attendance"}
            </h3>
            <p className="py-4 capitalize">
              {alertState.message.split("\n").map((line, idx) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn bgTheme w-30 text-white"
                onClick={() => setAlertState({ open: false, message: "" })}
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

export default TeacherAttendance;