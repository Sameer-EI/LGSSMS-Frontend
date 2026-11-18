import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchSchoolYear,
  fetchTerms,
  createSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
  createTerm,
  updateTerm,
  deleteTerm,
} from "../services/api/Api";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
// Session (school year): { id, year_name, start_date, end_date }
// Term:                  { id, year, term_number, start_date, end_date }
const MAX_TERMS_PER_SESSION = 3;
const TERM_NUMBERS = [1, 2, 3];

const EMPTY_SESSION = { year_name: "", start_date: "", end_date: "" };
const EMPTY_TERM = { term_number: "", start_date: "", end_date: "" };

/* ------------------------------ helpers ---------------------------- */
const toList = (data) =>
  Array.isArray(data) ? data : data?.results || data?.data || [];

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
    return value.slice(0, 10);
  const d = new Date(value);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const formatDate = (value) => {
  const v = toInputDate(value);
  if (!v) return "—";
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// "YYYY-MM-DD" + n days -> "YYYY-MM-DD"
const addDays = (str, n) => {
  if (!str) return "";
  const [y, m, d] = str.split("-").map(Number);
  return toInputDate(new Date(y, m - 1, d + n));
};

// API returns term.year as the session NAME ("2026-2027"); also handle id / nested object
const termSessionId = (t, sessions) => {
  const y = t.year;
  if (y !== null && typeof y === "object") return y.id;
  const match = sessions.find(
    (s) => s.id === y || String(s.year_name).trim() === String(y).trim(),
  );
  return match ? match.id : y;
};


const termLabel = (t) => `Term ${t.term_number}`;

// Suggested dates for a new term: it starts the day after the previous term
// (or on the session start for Term 1) and ends the day before the next term
// (or on the session end for the last term)
const suggestTermDates = (termNumber, session, existingTerms) => {
  if (!session || !termNumber) return { start_date: "", end_date: "" };
  const n = Number(termNumber);
  const sStart = toInputDate(session.start_date);
  const sEnd = toInputDate(session.end_date);

  const before = existingTerms
    .filter((t) => Number(t.term_number) < n)
    .sort((a, b) => Number(b.term_number) - Number(a.term_number))[0];
  const after = existingTerms
    .filter((t) => Number(t.term_number) > n)
    .sort((a, b) => Number(a.term_number) - Number(b.term_number))[0];

  let start = before ? addDays(toInputDate(before.end_date), 1) : sStart;
  let end = after
    ? addDays(toInputDate(after.start_date), -1)
    : n === TERM_NUMBERS[TERM_NUMBERS.length - 1]
      ? sEnd
      : "";

  // never suggest something outside the session or an inverted range
  if (start && sEnd && start > sEnd) start = "";
  if (start && end && end < start) end = "";
  return { start_date: start, end_date: end };
};

const inputClass =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-60";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const btnGhost =
  "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60";

const Spinner = () => <i className="fa-solid fa-spinner fa-spin"></i>;

const Icon = ({ d, className = "w-4 h-4", sw = 2 }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
  </svg>
);

const ICONS = {
  plus: "M12 6v6m0 0v6m0-6h6m-6 0H6",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  close: "M6 18L18 6M6 6l12 12",
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  warn: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  chevron: "M9 5l7 7-7 7",
};

/* Reusable modal shell */
const Modal = ({ title, onClose, children, disabled }) => (
  <div
    className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && !disabled) onClose();
    }}
  >
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <button
          onClick={onClose}
          disabled={disabled}
          aria-label="Close"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Icon d={ICONS.close} className="w-6 h-6" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ================================================================== */
function SessionTermsManager({ embedded = false }) {
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // session dialog
  const [sessionDialog, setSessionDialog] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);

  // term dialog
  const [termDialog, setTermDialog] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);
  const [termForm, setTermForm] = useState(EMPTY_TERM);

  // delete confirmation: { type: "session" | "term", item }
  const [toDelete, setToDelete] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const notify = (msg) => {
    setMessage(msg);
    setShowModal(true);
  };

  /* ----------------------------- data ------------------------------ */
  const loadData = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(false);
      const [sRes, tRes] = await Promise.all([fetchSchoolYear(), fetchTerms()]);
      const sList = toList(sRes);
      setSessions(sList);
      setTerms(toList(tRes));
      setSelectedId((prev) =>
        prev && sList.some((s) => s.id === prev) ? prev : sList[0]?.id ?? null,
      );
    } catch (err) {
      console.log("Failed to load sessions/terms", err);
      setError(true);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

const termsBySession = useMemo(() => {
  const map = {};
  terms.forEach((t) => {
    const sid = termSessionId(t, sessions);
    (map[sid] = map[sid] || []).push(t);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => Number(a.term_number) - Number(b.term_number)),
  );
  return map;
}, [terms, sessions]);

  const selectedSession = sessions.find((s) => s.id === selectedId) || null;
  const selectedTerms = termsBySession[selectedId] || [];
  const canAddTerm = selectedTerms.length < MAX_TERMS_PER_SESSION;

  // Term numbers not yet used in the selected session (plus the one being edited)
  const availableTermNumbers = TERM_NUMBERS.filter(
    (n) =>
      !selectedTerms.some(
        (t) => Number(t.term_number) === n && t.id !== editingTermId,
      ),
  );

  /* ------------------------- session CRUD -------------------------- */
  const openCreateSession = () => {
    setEditingSessionId(null);
    setSessionForm(EMPTY_SESSION);
    setSessionDialog(true);
  };

  const openEditSession = (s) => {
    setEditingSessionId(s.id);
    setSessionForm({
      year_name: s.year_name || "",
      start_date: toInputDate(s.start_date),
      end_date: toInputDate(s.end_date),
    });
    setSessionDialog(true);
  };

  const closeSessionDialog = () => {
    if (saving) return;
    setSessionDialog(false);
    setEditingSessionId(null);
    setSessionForm(EMPTY_SESSION);
  };

  const handleSaveSession = async () => {
    const name = sessionForm.year_name.trim();
    if (!name) return notify("Session name is required (e.g. 2026-27).");
    if (!sessionForm.start_date || !sessionForm.end_date)
      return notify("Session start and end dates are required.");
    if (sessionForm.end_date <= sessionForm.start_date)
      return notify("Session end date must be after the start date.");

    const duplicate = sessions.some(
      (s) =>
        s.id !== editingSessionId &&
        (s.year_name || "").trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return notify(`Session "${name}" already exists.`);

    // existing terms must stay inside the edited session dates
    if (editingSessionId) {
      const own = termsBySession[editingSessionId] || [];
      const outside = own.find(
        (t) =>
          toInputDate(t.start_date) < sessionForm.start_date ||
          toInputDate(t.end_date) > sessionForm.end_date,
      );
      if (outside)
        return notify(
          `${termLabel(outside)} (${formatDate(outside.start_date)} – ${formatDate(
            outside.end_date,
          )}) falls outside the new session dates. Update the term first.`,
        );
    }

    const payload = { ...sessionForm, year_name: name };
    setSaving(true);
    try {
      if (editingSessionId) {
        await updateSchoolYear(editingSessionId, payload);
        notify("Session updated successfully!");
      } else {
        const created = await createSchoolYear(payload);
        if (created?.id) setSelectedId(created.id);
        notify("Session created successfully!");
      }
      setSessionDialog(false);
      setEditingSessionId(null);
      setSessionForm(EMPTY_SESSION);
      loadData();
    } catch (err) {
      notify(err.message || "Failed to save session");
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- term CRUD --------------------------- */
  const openCreateTerm = () => {
    if (!selectedSession || !canAddTerm) return;

    // Term 1 is offered first, then Term 2
    const nextNumber =
      TERM_NUMBERS.find(
        (n) => !selectedTerms.some((t) => Number(t.term_number) === n),
      ) || "";

    setEditingTermId(null);
    setTermForm({
      term_number: nextNumber,
      ...suggestTermDates(nextNumber, selectedSession, selectedTerms),
    });
    setTermDialog(true);
  };

  const openEditTerm = (t) => {
    setEditingTermId(t.id);
    setTermForm({
      term_number: t.term_number ?? "",
      start_date: toInputDate(t.start_date),
      end_date: toInputDate(t.end_date),
    });
    setTermDialog(true);
  };

  const closeTermDialog = () => {
    if (saving) return;
    setTermDialog(false);
    setEditingTermId(null);
    setTermForm(EMPTY_TERM);
  };

  // When creating, picking a term pre-fills sensible dates
  const handleTermNumberChange = (value) => {
    if (editingTermId) {
      setTermForm({ ...termForm, term_number: value });
      return;
    }
    setTermForm({
      term_number: value,
      ...suggestTermDates(value, selectedSession, selectedTerms),
    });
  };

  const handleSaveTerm = async () => {
    if (!selectedSession) return;
    if (!termForm.term_number) return notify("Please select a term.");
    if (!termForm.start_date || !termForm.end_date)
      return notify("Term start and end dates are required.");
    if (termForm.end_date < termForm.start_date)
      return notify("Term end date cannot be before the start date.");

    const sStart = toInputDate(selectedSession.start_date);
    const sEnd = toInputDate(selectedSession.end_date);
    if (
      (sStart && termForm.start_date < sStart) ||
      (sEnd && termForm.end_date > sEnd)
    )
      return notify(
        `Term dates must fall within the session (${formatDate(sStart)} – ${formatDate(sEnd)}).`,
      );

    // max 2 terms per session (only enforced on create)
    if (!editingTermId && selectedTerms.length >= MAX_TERMS_PER_SESSION)
      return notify(`A session can have only ${MAX_TERMS_PER_SESSION} terms.`);

    // Terms must run in order: Term 1, then Term 2, then Term 3
    const termNo = Number(termForm.term_number);
    for (const t of selectedTerms) {
      if (t.id === editingTermId) continue;
      const no = Number(t.term_number);
      if (no < termNo && termForm.start_date <= toInputDate(t.end_date))
        return notify(`Term ${termNo} must start after Term ${no} ends.`);
      if (no > termNo && termForm.end_date >= toInputDate(t.start_date))
        return notify(`Term ${termNo} must end before Term ${no} starts.`);
    }

    // terms of one session must not overlap
    const overlaps = selectedTerms.find(
      (t) =>
        t.id !== editingTermId &&
        termForm.start_date <= toInputDate(t.end_date) &&
        termForm.end_date >= toInputDate(t.start_date),
    );
    if (overlaps) return notify(`Dates overlap with ${termLabel(overlaps)}.`);

    const payload = {
      year: selectedSession.id,
      term_number: termNo,
      start_date: termForm.start_date,
      end_date: termForm.end_date,
    };
    setSaving(true);
    try {
      if (editingTermId) {
        await updateTerm(editingTermId, payload);
        notify("Term updated successfully!");
      } else {
        await createTerm(payload);
        notify("Term created successfully!");
      }
      setTermDialog(false);
      setEditingTermId(null);
      setTermForm(EMPTY_TERM);
      loadData();
    } catch (err) {
      notify(err.message || "Failed to save term");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- delete ---------------------------- */
  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      if (toDelete.type === "session") {
        await deleteSchoolYear(toDelete.item.id);
        notify("Session deleted successfully!");
      } else {
        await deleteTerm(toDelete.item.id);
        notify("Term deleted successfully!");
      }
      setToDelete(null);
      loadData();
    } catch (err) {
      setToDelete(null);
      notify(err.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ UI states ------------------------ */
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-white dark:bg-gray-900 ${
          embedded ? "py-24" : "min-h-screen"
        }`}
      >
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
          Loading data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-900 ${
          embedded ? "py-24" : "min-h-screen"
        }`}
      >
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium mb-4">
          Failed to load data, Try Again
        </p>
        <button
          onClick={() => loadData(true)}
          className="bgTheme text-white px-5 py-2 rounded-md text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ------------------------------ render --------------------------- */
  return (
    <div
      className={
        embedded
          ? ""
          : "min-h-screen mb-24 md:mb-10 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 transition-colors duration-200"
      }
    >
      <div className={embedded ? "" : "max-w-7xl mx-auto"}>
        <div
          className={
            embedded
              ? "bg-white dark:bg-gray-800"
              : "bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
          }
        >
          {/* Header */}
          <div
            className={
              embedded
                ? "px-4 sm:px-8 pt-5 sm:pt-6 text-gray-900 dark:text-gray-100"
                : "bgTheme px-4 sm:px-8 py-5 sm:py-6 text-white"
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-lg ${
                    embedded
                      ? "bgTheme text-white"
                      : "bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  <Icon d={ICONS.calendar} className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Sessions &amp; Terms
                  </h1>
                  <p
                    className={`text-sm font-medium ${
                      embedded
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-white/90"
                    }`}
                  >
                    Manage academic sessions and their three terms
                  </p>
                </div>
              </div>
              <button
                onClick={openCreateSession}
                className={`px-4 py-2.5 rounded-md text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors ${
                  embedded
                    ? "bgTheme text-white"
                    : "bg-white text-gray-800 hover:bg-gray-100"
                }`}
              >
                <Icon d={ICONS.plus} className="w-5 h-5" />
                <span>Create Session</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* ---------------- Sessions list ---------------- */}
              <div className="lg:w-5/12 min-w-0">
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Sessions
                    </h2>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
                      {sessions.length} total
                    </span>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto bg-gray-100 dark:bg-gray-700 p-4 rounded-full inline-block mb-4 text-gray-400">
                        <Icon d={ICONS.calendar} className="w-6 h-6" sw={1.5} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        No sessions yet
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create your first academic session
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {sessions.map((s) => {
                        const active = s.id === selectedId;
                        const count = (termsBySession[s.id] || []).length;
                        return (
                          <li
                            key={s.id}
                            onClick={() => setSelectedId(s.id)}
                            className={`cursor-pointer rounded-lg border-l-4 p-4 transition-all ${
                              active
                                ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-600 shadow-md"
                                : "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 break-words">
                                  {s.year_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formatDate(s.start_date)} –{" "}
                                  {formatDate(s.end_date)}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-xs px-2 py-1 rounded ${
                                  count === MAX_TERMS_PER_SESSION
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                    : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                                }`}
                              >
                                {count}/{MAX_TERMS_PER_SESSION} terms
                              </span>
                            </div>
                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditSession(s);
                                }}
                                aria-label={`Edit session ${s.year_name}`}
                                className="textTheme border border-[#5E35B1] hover:bg-[#5E35B1]/10 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                              >
                                <Icon d={ICONS.edit} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setToDelete({ type: "session", item: s });
                                }}
                                aria-label={`Delete session ${s.year_name}`}
                                className="text-red-600 dark:text-red-400 border border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                              >
                                <Icon d={ICONS.trash} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* ---------------- Terms panel ---------------- */}
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                  {!selectedSession ? (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        No session selected
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create or select a session to manage its terms
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Sessions</span>
                            <Icon d={ICONS.chevron} className="w-3 h-3" />
                            <span className="truncate">
                              {selectedSession.year_name}
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                            Terms of {selectedSession.year_name}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(selectedSession.start_date)} –{" "}
                            {formatDate(selectedSession.end_date)}
                          </p>
                        </div>
                        <button
                          onClick={openCreateTerm}
                          disabled={!canAddTerm}
                          title={
                            canAddTerm
                              ? "Add term"
                              : `A session can have only ${MAX_TERMS_PER_SESSION} terms`
                          }
                          className="bgTheme text-white px-4 py-2.5 rounded-sm text-sm font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon d={ICONS.plus} className="w-5 h-5" />
                          <span>Add Term</span>
                        </button>
                      </div>

                      {!canAddTerm && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          Maximum of {MAX_TERMS_PER_SESSION} terms reached for
                          this session. Delete a term to add a different one.
                        </p>
                      )}

                      {selectedTerms.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="mx-auto bg-gray-100 dark:bg-gray-700 p-4 rounded-full inline-block mb-4 text-gray-400">
                            <Icon d={ICONS.calendar} className="w-6 h-6" sw={1.5} />
                          </div>
                          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            No terms added
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Add Term 1, Term 2 and Term 3 for this session
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTerms.map((t) => (
                            <div
                              key={t.id}
                              className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border-l-4 border-indigo-600 dark:border-indigo-500 hover:shadow-md transition-shadow flex flex-col"
                            >
                              <p className="font-semibold text-gray-800 dark:text-gray-100 break-words">
                                {termLabel(t)}
                              </p>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Starts
                                  </p>
                                  <p className="text-gray-800 dark:text-gray-200">
                                    {formatDate(t.start_date)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ends
                                  </p>
                                  <p className="text-gray-800 dark:text-gray-200">
                                    {formatDate(t.end_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <button
                                  type="button"
                                  onClick={() => openEditTerm(t)}
                                  aria-label={`Edit ${termLabel(t)}`}
                                  className="textTheme border border-[#5E35B1] hover:bg-[#5E35B1]/10 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Icon d={ICONS.edit} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setToDelete({ type: "term", item: t })
                                  }
                                  aria-label={`Delete ${termLabel(t)}`}
                                  className="text-red-600 dark:text-red-400 border border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                                >
                                  <Icon d={ICONS.trash} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Session dialog ---------------- */}
      {sessionDialog && (
        <Modal
          title={editingSessionId ? "Edit Session" : "Create New Session"}
          onClose={closeSessionDialog}
          disabled={saving}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="year-name" className={labelClass}>
                Session Name
              </label>
              <input
                id="year-name"
                type="text"
                value={sessionForm.year_name}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, year_name: e.target.value })
                }
                placeholder="e.g. 2026-27"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="s-start" className={labelClass}>
                  Start Date
                </label>
                <input
                  id="s-start"
                  type="date"
                  value={sessionForm.start_date}
                  onChange={(e) => {
                    const start = e.target.value;
                    setSessionForm({
                      ...sessionForm,
                      start_date: start,
                      end_date:
                        sessionForm.end_date && sessionForm.end_date <= start
                          ? ""
                          : sessionForm.end_date,
                    });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="s-end" className={labelClass}>
                  End Date
                </label>
                <input
                  id="s-end"
                  type="date"
                  min={sessionForm.start_date || undefined}
                  value={sessionForm.end_date}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, end_date: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeSessionDialog}
                disabled={saving}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="bgTheme px-4 py-2 rounded-md text-sm font-medium text-white min-w-[130px] disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Spinner />
                ) : editingSessionId ? (
                  "Update Session"
                ) : (
                  "Create Session"
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- Term dialog ---------------- */}
      {termDialog && selectedSession && (
        <Modal
          title={editingTermId ? "Edit Term" : "Add Term"}
          onClose={closeTermDialog}
          disabled={saving}
        >
          <div className="space-y-4">
            <div className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-2 rounded-md">
              Session:{" "}
              <span className="font-semibold">{selectedSession.year_name}</span>{" "}
              ({formatDate(selectedSession.start_date)} –{" "}
              {formatDate(selectedSession.end_date)})
            </div>
            <div>
              <label htmlFor="term-name" className={labelClass}>
                Term
              </label>
              <select
                id="term-name"
                value={termForm.term_number}
                onChange={(e) => handleTermNumberChange(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select term
                </option>
                {availableTermNumbers.map((n) => (
                  <option key={n} value={n}>
                    Term {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="t-start" className={labelClass}>
                  Start Date
                </label>
                <input
                  id="t-start"
                  type="date"
                  min={toInputDate(selectedSession.start_date) || undefined}
                  max={toInputDate(selectedSession.end_date) || undefined}
                  value={termForm.start_date}
                  onChange={(e) => {
                    const start = e.target.value;
                    setTermForm({
                      ...termForm,
                      start_date: start,
                      end_date:
                        termForm.end_date && termForm.end_date < start
                          ? start
                          : termForm.end_date,
                    });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="t-end" className={labelClass}>
                  End Date
                </label>
                <input
                  id="t-end"
                  type="date"
                  min={
                    termForm.start_date ||
                    toInputDate(selectedSession.start_date) ||
                    undefined
                  }
                  max={toInputDate(selectedSession.end_date) || undefined}
                  value={termForm.end_date}
                  onChange={(e) =>
                    setTermForm({ ...termForm, end_date: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeTermDialog}
                disabled={saving}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTerm}
                disabled={saving}
                className="bgTheme px-4 py-2 rounded-md text-sm font-medium text-white min-w-[120px] disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Spinner />
                ) : editingTermId ? (
                  "Update Term"
                ) : (
                  "Add Term"
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- Delete confirmation ---------------- */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full shrink-0 text-red-600 dark:text-red-300">
                <Icon d={ICONS.warn} className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Delete {toDelete.type === "session" ? "Session" : "Term"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 break-words">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">
                    {toDelete.type === "session"
                      ? toDelete.item.year_name
                      : termLabel(toDelete.item)}
                  </span>
                  ?
                  {toDelete.type === "session" &&
                    " Its terms may also be removed."}{" "}
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setToDelete(null)}
                disabled={saving}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white min-w-[110px] ${
                  saving
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving ? <Spinner /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Message modal ---------------- */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-lg">Sessions &amp; Terms</h3>
            <p className="py-4 whitespace-pre-line break-words">{message}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-32"
                onClick={() => setShowModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default SessionTermsManager;