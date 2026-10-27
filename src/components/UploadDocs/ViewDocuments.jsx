import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { constants } from "../../global/constants";
import { AuthContext } from "../../context/AuthContext";
import { allRouterLink } from "../../router/AllRouterLinks";
import { fetchYearLevels } from "../../services/api/Api";

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                       */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

// value = what the backend expects for `role`
const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "student", label: "Student" },
  { value: "guardian", label: "Guardian" },
  { value: "teacher", label: "Teacher" },
  { value: "office_staff", label: "Office Staff" },
];

const EMPTY_FILTERS = { role: "", classId: "", name: "" };

const getYearLevelId = (item) =>
  item.id ?? item.year_level_id ?? item.value ?? "";

const getYearLevelLabel = (item) =>
  item.name ||
  item.year_level_name ||
  item.level_name ||
  item.year_name ||
  item.id;

const getDocRole = (doc) => {
  if (doc.student_id) return "Student";
  if (doc.guardian_id) return "Guardian";
  if (doc.office_staff_id) return "Office Staff";
  if (doc.teacher_id) return "Teacher";
  return "Unknown";
};

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

// The API can return file URLs pointing at the server's own idea of itself
// (e.g. http://localhost:7000/media/...). Re-point those at the API origin
// the app is actually talking to. Public URLs are left untouched.
const resolveFileUrl = (rawUrl, apiBase) => {
  if (!rawUrl) return "";
  try {
    const base = new URL(apiBase);
    const url = new URL(rawUrl, base.origin); // also resolves "/media/..." paths
    if (LOCAL_HOSTS.includes(url.hostname)) {
      url.protocol = base.protocol;
      url.host = base.host;
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
};

// 1 … 4 5 [6] 7 8 … 20
const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) {
    start = 2;
    end = 4;
  }
  if (current >= total - 2) {
    start = total - 3;
    end = total - 1;
  }

  const pages = [1];
  if (start > 2) pages.push("start-ellipsis");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push("end-ellipsis");
  pages.push(total);
  return pages;
};

/* -------------------------------------------------------------------------- */
/*  Pagination controls                                                       */
/* -------------------------------------------------------------------------- */

const Pagination = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  disabled,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalCount === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const baseBtn =
    "min-w-[2.25rem] px-3 py-1.5 rounded border text-sm transition disabled:cursor-not-allowed";
  const idleBtn =
    "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50";

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>
          Showing {startIndex}–{endIndex} of {totalCount} documents
        </span>
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="rounded border bg-white p-1 dark:bg-gray-700 dark:text-gray-200"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav
        className="flex flex-wrap items-center gap-1"
        aria-label="Pagination"
      >
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage === 1}
          className={`${baseBtn} ${idleBtn}`}
          aria-label="First page"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage === 1}
          className={`${baseBtn} ${idleBtn}`}
        >
          Previous
        </button>

        {getPageNumbers(currentPage, totalPages).map((p) =>
          typeof p === "string" ? (
            <span
              key={p}
              className="px-2 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={disabled}
              aria-current={p === currentPage ? "page" : undefined}
              className={`${baseBtn} ${
                p === currentPage
                  ? "bgTheme border-transparent text-white"
                  : idleBtn
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          className={`${baseBtn} ${idleBtn}`}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage >= totalPages}
          className={`${baseBtn} ${idleBtn}`}
          aria-label="Last page"
        >
          »
        </button>
      </nav>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export const ViewDocuments = () => {
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();

  // Origin the API (and its /media files) is served from.
  // constants.baseUrl is the single source of truth; axios baseURL is the fallback.
  const apiBase = constants.baseUrl || axiosInstance?.defaults?.baseURL;

  // Data
  const [details, setDetails] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [yearLevels, setYearLevels] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]); // [{ id, name }]
  const [teacherClassesLoaded, setTeacherClassesLoaded] = useState(false);

  // Request state
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters / pagination
  const [filters, setFilters] = useState(EMPTY_FILTERS); // applied (sent to API)
  const [searchInput, setSearchInput] = useState(""); // what the user is typing
  const [viewOption, setViewOption] = useState("my"); // teacher only
  const [assignedClassId, setAssignedClassId] = useState(""); // teacher only
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Logged-in user info
  const studentId = localStorage.getItem("studentId");
  const guardianId = localStorage.getItem("guardianId");
  const teacherId = localStorage.getItem("teacherId");
  const officeStaffId = localStorage.getItem("officeStaffId");
  const userRole = localStorage.getItem("userRole");

  const isPrivileged = !["student", "guardian", "teacher", "officestaff"].includes(
    userRole,
  );

  const isTeacher = userRole === "teacher";
  const isAssignedView = isTeacher && viewOption === "assigned";

  // Teachers must wait until their classes are known before the first fetch
  const classesReady = !isTeacher || teacherClassesLoaded;

  const canUpload =
    userRole === constants.roles.director ||
    userRole === constants.roles.officeStaff;

  // Role sent to the API. Admin picks it; everyone else is implied.
  const serverRole = useMemo(() => {
    switch (userRole) {
      case "student":
        return "student";
      case "guardian":
        return "guardian";
      case "officestaff":
        return "office_staff";
      case "teacher":
        return viewOption === "my" ? "teacher" : "student";
      default:
        return filters.role;
    }
  }, [userRole, viewOption, filters.role]);

  /* ---------------------------- one-time lookups ---------------------------- */

  // Class dropdown options (admin filter)
  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchYearLevels();
        const list = Array.isArray(res) ? res : res?.results || [];
        if (!cancelled) setYearLevels(list);
      } catch (err) {
        console.error("Failed to load year levels", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teacher's assigned classes (id + name) for the "assigned" view
  useEffect(() => {
    if (!isTeacher) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axiosInstance.get("/t/teacheryearlevel/");
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];

        // NOTE: confirm in the Network tab which field holds the class id.
        // Order of preference: year_level -> year_level_id -> id
        const mapped = list
          .map((c) => ({
            id: c.year_level ?? c.year_level_id ?? c.id,
            name: c.year_level_name,
          }))
          .filter((c) => c.id != null);

        if (!cancelled) {
          setTeacherClasses(mapped);
          setAssignedClassId((prev) => prev || String(mapped[0]?.id ?? ""));
        }
      } catch (err) {
        console.error("Failed to load teacher classes", err);
      } finally {
        if (!cancelled) setTeacherClassesLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ debounce search --------------------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setFilters((prev) => {
        if (prev.name === next) return prev;
        setCurrentPage(1);
        return { ...prev, name: next };
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ------------------------------- fetch data ------------------------------- */

  useEffect(() => {
    // Wait for the teacher's classes before the first request
    if (!classesReady) return;

    // Assigned view but the teacher has no classes -> nothing to fetch
    if (isAssignedView && !assignedClassId) {
      setDetails([]);
      setTotalCount(0);
      setError(false);
      setFetching(false);
      setInitialLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setFetching(true);
      setError(false);

      // Teacher "assigned" view uses the class dropdown; admin uses filters.classId
      const classParam = isAssignedView ? assignedClassId : filters.classId;

      // Only send params that have a value
      const params = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };
      if (serverRole) params.role = serverRole;
      if (classParam) params.class = classParam;
      if (filters.name) params.name = filters.name;

      try {
        const response = await axiosInstance.get("/d/Document/", {
          params,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const data = response.data;
        const results = Array.isArray(data) ? data : data?.results || [];
        const count = Array.isArray(data) ? data.length : data?.count ?? 0;

        // Page no longer exists (e.g. data shrank) -> jump to the last real page
        if (results.length === 0 && count > 0 && currentPage > 1) {
          setCurrentPage(Math.ceil(count / pageSize));
          return;
        }

        setDetails(results);
        setTotalCount(count);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to load documents", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setFetching(false);
          setInitialLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    pageSize,
    serverRole,
    filters.classId,
    filters.name,
    reloadKey,
    classesReady,
    isAssignedView,
    assignedClassId,
  ]);

  /* ------------------------------- handlers --------------------------------- */

  const handleRoleChange = (role) => {
    setFilters((prev) => ({
      ...prev,
      role,
      // class doesn't apply to office staff
      classId: role === "office_staff" ? "" : prev.classId,
    }));
    setCurrentPage(1);
  };

  const handleClassChange = (classId) => {
    setFilters((prev) => ({ ...prev, classId }));
    setCurrentPage(1);
  };

  const handleViewOptionChange = (value) => {
    setViewOption(value);
    setCurrentPage(1);
  };

  const handleAssignedClassChange = (value) => {
    setAssignedClassId(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setViewOption("my");
    setAssignedClassId(String(teacherClasses[0]?.id ?? ""));
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.role || filters.classId || searchInput || viewOption !== "my",
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  /* --------------------------- derive table content ------------------------- */

  // Document column headers for the current page
  const allDocTypes = useMemo(
    () =>
      [
        ...new Set(
          details.flatMap((d) =>
            (d?.document_types_read || []).map((dt) =>
              (dt?.name || "").toLowerCase(),
            ),
          ),
        ),
      ].filter(Boolean),
    [details],
  );

  // One row per person, with their documents grouped by type
  const people = useMemo(() => {
    const grouped = {};

    details.forEach((doc) => {
      const role = getDocRole(doc);
      const name =
        doc.student_name ||
        doc.guardian_name ||
        doc.office_staff_name ||
        doc.teacher_name;
      const personId =
        doc.student_id ??
        doc.guardian_id ??
        doc.office_staff_id ??
        doc.teacher_id ??
        name;
      const key = `${role}-${personId}`;

      if (!grouped[key]) {
        grouped[key] = {
          key,
          name,
          role,
          yearLevel: doc.year_level || "N/A",
          scholar_number: doc.scholar_number,
          studentId: doc.student_id,
          guardianId: doc.guardian_id,
          teacherId: doc.teacher_id,
          officeStaffId: doc.office_staff_id,
          docs: {},
        };
      }

      const fileUrls = (doc.files || [])
        .map((file) => resolveFileUrl(file?.file, apiBase))
        .filter(Boolean);

      (doc?.document_types_read || []).forEach((dt) => {
        const type = (dt?.name || "").toLowerCase();
        if (!type) return;
        grouped[key].docs[type] = Array.from(
          new Set([...(grouped[key].docs[type] || []), ...fileUrls]),
        );
      });
    });

    return Object.values(grouped);
  }, [details, apiBase]);

  // Safety net: non-admin users only see rows of the right role / identity.
  // Class filtering for teachers is done by the API via the `class` param,
  // NOT here, so the table always matches what the dropdown selected.
  const rows = useMemo(() => {
    const same = (a, b) => a != null && b != null && String(a) === String(b);

    return people.filter((p) => {
      switch (userRole) {
        case "student":
          return p.role === "Student" && same(p.studentId, studentId);
        case "guardian":
          return p.role === "Guardian" && same(p.guardianId, guardianId);
        case "officestaff":
          return p.role === "Office Staff" && same(p.officeStaffId, officeStaffId);
        case "teacher":
          return viewOption === "my"
            ? p.role === "Teacher" && same(p.teacherId, teacherId)
            : p.role === "Student";
        default:
          return true;
      }
    });
  }, [
    people,
    userRole,
    viewOption,
    studentId,
    guardianId,
    teacherId,
    officeStaffId,
  ]);

  const showClassColumn =
    (isPrivileged && filters.role === "student") || isAssignedView;
  const colSpan = allDocTypes.length + 3 + (showClassColumn ? 1 : 0);
  const showClassFilter = filters.role !== "office_staff";

  /* --------------------------------- render --------------------------------- */

  const renderTableBody = () => {
    if (initialLoading) {
      return (
        <tr>
          <td colSpan={colSpan} className="px-4 py-16">
            <div className="flex flex-col items-center justify-center">
              <div className="flex space-x-2">
                <div className="bgTheme h-3 w-3 animate-bounce rounded-full"></div>
                <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.2s]"></div>
                <div className="bgTheme h-3 w-3 animate-bounce rounded-full [animation-delay:-0.4s]"></div>
              </div>
              <p className="mt-2 text-sm text-gray-500">Loading documents...</p>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={colSpan} className="px-4 py-12 text-center">
            <i className="fa-solid fa-triangle-exclamation mb-3 text-4xl text-red-400"></i>
            <p className="font-medium text-red-400">
              Failed to load data, Try Again
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn bgTheme mt-4 text-white"
            >
              Retry
            </button>
          </td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td
            colSpan={colSpan}
            className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
          >
            {isAssignedView && teacherClasses.length === 0
              ? "No classes are assigned to you."
              : hasActiveFilters
                ? "No documents match your filters."
                : "No documents available."}
          </td>
        </tr>
      );
    }

    return rows.map((person) => (
      <tr
        key={person.key}
        className="text-nowrap transition hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          {person.name}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          {person.scholar_number || "-"}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          {person.role}
        </td>

        {showClassColumn && (
          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
            {person.yearLevel || "-"}
          </td>
        )}

        {allDocTypes.map((type) => (
          <td
            key={type}
            className="px-4 py-3 text-center text-sm text-blue-600 dark:text-blue-400"
          >
            {person.docs[type] && person.docs[type].length > 0 ? (
              person.docs[type].map((url, i) => (
                <div key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="textTheme underline hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    View
                  </a>
                </div>
              ))
            ) : (
              <p className="text-nowrap text-xs text-gray-400 dark:text-gray-200">
                Not Available
              </p>
            )}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="mb-24 min-h-screen bg-gray-100 p-6 dark:bg-gray-900 md:mb-10">
      <div className="mx-auto max-w-7xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <h1 className="flex-1 text-center text-2xl font-bold text-gray-800 dark:text-gray-100 md:text-3xl">
            <i className="fa-solid fa-folder-open"></i> Uploaded Documents
          </h1>

          {canUpload && (
            <button
              className="btn bgTheme text-nowrap text-white"
              onClick={() => navigate(allRouterLink.documentUpload)}
            >
              <i className="fa-solid fa-file-arrow-up w-5"></i> Upload Documents
            </button>
          )}
        </div>

        {/* Teacher view switch */}
        {isTeacher && (
          <div className="mb-4 flex flex-wrap items-center gap-4 border-b pb-2 dark:border-gray-700">
            <select
              value={viewOption}
              onChange={(e) => handleViewOptionChange(e.target.value)}
              className="rounded border bg-white p-2 focus:outline-none dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="my">My Documents</option>
              <option value="assigned">Assigned Class Documents</option>
            </select>

            {viewOption === "assigned" && (
              <select
                value={assignedClassId}
                onChange={(e) => handleAssignedClassChange(e.target.value)}
                disabled={teacherClasses.length === 0}
                className="rounded border bg-white p-2 focus:outline-none dark:bg-gray-700 dark:text-gray-200"
              >
                {teacherClasses.length === 0 && (
                  <option value="">No classes assigned</option>
                )}
                {teacherClasses.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Admin filters (server-side) */}
        {isPrivileged && (
          <div className="mb-4 grid gap-4 border-b pb-4 dark:border-gray-700 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="select select-bordered w-full bg-white focus:outline-none dark:bg-gray-700 dark:text-gray-200"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {showClassFilter && (
              <div className="flex flex-col">
                <label className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                  Class
                </label>
                <select
                  value={filters.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="select select-bordered w-full bg-white focus:outline-none dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="">All Classes</option>
                  {yearLevels.map((level) => {
                    const id = getYearLevelId(level);
                    if (id === "") return null;
                    return (
                      <option key={id} value={id}>
                        {getYearLevelLabel(level)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex flex-col">
              <label className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                Search Name
              </label>
              <input
                type="text"
                placeholder="First, middle or last name..."
                className="w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.trimStart())}
              />
            </div>

            <div className="flex">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className="btn bgTheme text-white disabled:opacity-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div
          className={`max-h-[70vh] w-full overflow-x-scroll rounded-lg transition-opacity ${
            fetching && !initialLoading ? "opacity-60" : "opacity-100"
          }`}
          aria-busy={fetching}
        >
          <div className="inline-block min-w-full align-middle">
            <div className="rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bgTheme sticky top-0 z-2 text-white">
                  <tr>
                    <th className="text-nowrap px-4 py-3 text-left text-sm font-semibold">
                      Name
                    </th>
                    <th className="text-nowrap px-4 py-3 text-left text-sm font-semibold">
                      Scholar No.
                    </th>
                    <th className="text-nowrap px-4 py-3 text-left text-sm font-semibold">
                      Role
                    </th>
                    {showClassColumn && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Class
                      </th>
                    )}
                    {allDocTypes.map((type) => (
                      <th
                        key={type}
                        className="text-nowrap px-4 py-3 text-left text-sm font-semibold capitalize"
                      >
                        {type}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {renderTableBody()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          disabled={fetching}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
};