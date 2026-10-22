import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";

const API_URL = "/t/teacheryearlevel/";
const YEAR_LEVELS_URL = "/d/year-levels/";
const TEACHERS_URL = "/t/dropdown-teachers/";

// Order classes: Play/Pre -> Nursery -> LKG -> UKG -> KG 1/2 -> 1 ... 12
const classRank = (name = "") => {
  const n = name.toLowerCase();
  const num = parseInt((n.match(/\d+/) || [])[0], 10);
  if (n.includes("play") || n.includes("pre")) return 0;
  if (n.includes("nursery")) return 1;
  if (n.includes("lkg")) return 2;
  if (n.includes("ukg")) return 3;
  if (/\bkg\b/.test(n)) return Number.isNaN(num) ? 2 : 2 + num * 0.1;
  if (!Number.isNaN(num)) return 10 + num;
  return 1000;
};

// Pull a readable message out of a DRF error response, e.g.
// { teacher: ["Teacher X is already assigned to 'Nursery'..."] }
const extractError = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) {
    return err?.request
      ? "No response from the server. Please check your connection and try again."
      : fallback;
  }
  if (typeof data === "string") return data.length < 300 ? data : fallback;

  const messages = [];
  const collect = (value) => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
    else if (value) messages.push(String(value));
  };
  collect(data.detail ?? data.message ?? data.error ?? data);

  return messages.length ? messages.join(" ") : fallback;
};

// DRF can return a plain array or a paginated { results: [] }
const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

const levelName = (l) =>
  l?.name ?? l?.level_name ?? l?.year_level_name ?? l?.title ?? `Class ${l?.id}`;

const ViewAllocatedClass = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [allocations, setAllocations] = useState([]); // /t/teacheryearlevel/
  const [yearLevels, setYearLevels] = useState([]); // every class
  const [teachers, setTeachers] = useState([]); // every teacher (dropdown)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | allotted | not-allotted
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // modal state
  // editItem: { id (null when creating), teacher, year_level, year_level_name }
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // auto-hide the success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ---------- Fetch ----------
  const fetchAllocations = async () => {
    const res = await axiosInstance.get(API_URL);
    setAllocations(toArray(res.data));
  };

  const loadAll = async () => {
    try {
      const [allocRes, levelRes, teacherRes] = await Promise.all([
        axiosInstance.get(API_URL),
        axiosInstance.get(YEAR_LEVELS_URL),
        axiosInstance.get(TEACHERS_URL).catch(() => ({ data: [] })), // optional
      ]);
      setAllocations(toArray(allocRes.data));
      setYearLevels(toArray(levelRes.data));
      setTeachers(toArray(teacherRes.data));
    } catch (err) {
      console.error("Failed to load allocation data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Dropdown options ----------
  const teacherOptions = useMemo(() => {
    const map = new Map();
    teachers.forEach((t) => map.set(t.id, t.display_name ?? t.name));
    // also include anyone already allocated (in case dropdown API misses them)
    allocations.forEach((a) => a.teacher && !map.has(a.teacher) && map.set(a.teacher, a.teacher_name));
    return [...map].map(([id, name]) => ({ id, name }));
  }, [teachers, allocations]);

  const classOptions = useMemo(
    () => yearLevels.map((l) => ({ id: l.id, name: levelName(l) })),
    [yearLevels]
  );

  // ---------- One row per class (including classes with no teacher) ----------
  const rows = useMemo(() => {
    const byLevel = new Map();
    allocations.forEach((a) => {
      if (!byLevel.has(a.year_level)) byLevel.set(a.year_level, []);
      byLevel.get(a.year_level).push(a);
    });

    return yearLevels
      .map((l) => ({
        id: l.id,
        name: levelName(l),
        allocations: byLevel.get(l.id) ?? [],
      }))
      .sort(
        (a, b) =>
          classRank(a.name) - classRank(b.name) ||
          a.name.localeCompare(b.name, undefined, { numeric: true })
      );
  }, [yearLevels, allocations]);

  const filteredRows = rows.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.allocations.some((a) => a.teacher_name?.toLowerCase().includes(q)) ||
      ("not allotted".includes(q) && r.allocations.length === 0);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "allotted" && r.allocations.length > 0) ||
      (statusFilter === "not-allotted" && r.allocations.length === 0);

    return matchesSearch && matchesStatus;
  });

  const allottedCount = rows.filter((r) => r.allocations.length > 0).length;

  // ---------- Handlers ----------
  const closeModals = () => {
    setEditItem(null);
    setDeleteItem(null);
    setActionError("");
  };

  const openAssign = (row) =>
    setEditItem({ id: null, teacher: "", year_level: row.id, year_level_name: row.name });

  const openEdit = (a) => setEditItem({ ...a });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError("");
    try {
      const payload = { teacher: editItem.teacher, year_level: editItem.year_level };
      if (editItem.id) {
        await axiosInstance.patch(`${API_URL}${editItem.id}/`, payload);
      } else {
        await axiosInstance.post(API_URL, payload);
      }
      await fetchAllocations();
      closeModals();
      setSuccessMsg("Teacher allocated successfully.");
    } catch (err) {
      console.error("Failed to save allocation:", err);
      setActionError(extractError(err, "Could not save changes. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setActionError("");
    try {
      await axiosInstance.delete(`${API_URL}${deleteItem.id}/`);
      setAllocations((prev) => prev.filter((a) => a.id !== deleteItem.id));
      closeModals();
      setSuccessMsg("Allocation deleted successfully.");
    } catch (err) {
      console.error("Failed to delete:", err);
      setActionError(extractError(err, "Could not delete this allocation. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // ---------- States ----------
  if (loading) {
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
      </div>
    );
  }

  const selectCls =
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400";

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-100 dark:bg-gray-900 mb-24 md:mb-10">
      {/* Success toast */}
      {successMsg && (
        <div
          role="status"
          className="fixed top-20 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg border border-green-300 bg-green-50 text-green-800 shadow-lg dark:bg-green-900/40 dark:text-green-200 dark:border-green-700"
        >
          <i className="fa-solid fa-circle-check"></i>
          <span className="font-medium">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            aria-label="Dismiss"
            className="ml-2 text-green-700 dark:text-green-200 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 md:p-6">
        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-1">
          <i className="fa-solid fa-landmark"></i> Allocated Classes
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
          {allottedCount} of {rows.length} classes have a teacher allotted
        </p>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All classes</option>
            <option value="allotted">Allotted only</option>
            <option value="not-allotted">Not allotted only</option>
          </select>
          <input
            type="text"
            className="border border-gray-300 px-3 py-2 rounded-lg w-full sm:w-72 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Search by class or teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.trimStart())}
          />
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full table-auto">
            <thead className="bgTheme text-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left font-semibold text-nowrap">
                  Class
                </th>
                <th scope="col" className="px-6 py-4 text-left font-semibold text-nowrap">
                  Teacher(s)
                </th>
                <th scope="col" className="px-6 py-4 text-center font-semibold text-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const allotted = row.allocations.length > 0;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors align-top"
                    >
                      <td className="px-6 py-4 text-nowrap text-left font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {row.name}
                      </td>

                      <td className="px-6 py-4 text-left">
                        {allotted ? (
                          <div className="flex flex-col gap-2">
                            {row.allocations.map((a) => (
                              <span
                                key={a.id}
                                className="text-gray-800 dark:text-gray-200 capitalize"
                              >
                                {a.teacher_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            Not allotted
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-2">
                          {allotted ? (
                            row.allocations.map((a) => (
                              <div key={a.id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(a)}
                                  className="px-4 py-1.5 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-700 font-medium shadow-sm hover:bg-yellow-100 transition"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteItem(a)}
                                  className="px-4 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600 font-medium shadow-sm hover:bg-red-100 transition"
                                >
                                  Delete
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2">
                              {/* Edit on an unallotted class opens the assign form */}
                              <button
                                type="button"
                                onClick={() => openAssign(row)}
                                className="px-4 py-1.5 rounded-lg border border-yellow-400 bg-yellow-50 text-yellow-700 font-medium shadow-sm hover:bg-yellow-100 transition"
                              >
                                Edit
                              </button>
                              {/* Nothing to delete yet */}
                              <button
                                type="button"
                                disabled
                                className="px-4 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600 font-medium shadow-sm opacity-40 cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No matching classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign / Edit modal */}
      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModals}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Edit allocation
            </h2>

            <div>
              <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Teacher</label>
              <select
                className={selectCls}
                value={editItem.teacher ?? ""}
                onChange={(e) => setEditItem({ ...editItem, teacher: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select a teacher
                </option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Class</label>
              <select
                className={selectCls}
                value={editItem.year_level ?? ""}
                onChange={(e) => setEditItem({ ...editItem, year_level: e.target.value })}
                required
              >
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {actionError && <p className="text-sm text-red-500">{actionError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bgTheme text-white font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModals}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4 text-center"
          >
            <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400"></i>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Delete this allocation?
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold capitalize">{deleteItem.teacher_name}</span> will no
              longer be assigned to{" "}
              <span className="font-semibold capitalize">{deleteItem.year_level_name}</span>.
            </p>

            {actionError && <p className="text-sm text-red-500">{actionError}</p>}

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModals}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-60"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAllocatedClass;