import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  fetchOfficeStaff,
  fetchTeachers,
  fetchInactiveUsers,
  deactivateUsers,
  reactivateUsers,
} from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const getAccessToken = () => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    return authTokens ? JSON.parse(authTokens).access : null;
  } catch (err) {
    console.error("Error getting token:", err);
    return null;
  }
};

const getDisplayName = (record) =>
  [record.first_name, record.middle_name, record.last_name].filter(Boolean).join(" ");

const getFullName = (record) => getDisplayName(record).toLowerCase();

// Active lists return `user_id` (User model id). The inactive endpoint returns the
// user's id as `id`, so fall back to it.
const getUserId = (record) => record.user_id ?? record.id;

const sortByName = (a, b) => getFullName(a).localeCompare(getFullName(b));

const onlyActiveSorted = (list) =>
  (Array.isArray(list) ? list : []).filter((u) => u.is_active === true).sort(sortByName);

/* ------------------------------------------------------------------ */
/* Small reusable UI pieces                                            */
/* ------------------------------------------------------------------ */
const Spinner = ({ size = "w-3 h-3" }) => (
  <div className="flex space-x-2">
    <div className={`${size} bgTheme rounded-full animate-bounce`}></div>
    <div className={`${size} bgTheme rounded-full animate-bounce [animation-delay:-0.2s]`}></div>
    <div className={`${size} bgTheme rounded-full animate-bounce [animation-delay:-0.4s]`}></div>
  </div>
);

// Shared modal wrapper: themed header, scrollable on small screens
const ModalShell = ({ title, icon, onClose, children, footer, maxWidth = "max-w-md" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 overflow-y-auto">
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}
    >
      <div className="bgTheme text-white px-4 sm:px-5 py-3 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0">
          {icon && <i className={`${icon} shrink-0`}></i>}
          <span className="truncate">{title}</span>
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-white/20 transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700">{footer}</div>
      )}
    </div>
  </div>
);

const StatusBadge = () => (
  <span className="inline-flex items-center justify-center px-3 py-1 min-w-[5rem] rounded-full text-xs font-medium bg-green-100 text-green-800">
    Active
  </span>
);

const DeactivateButton = ({ onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center px-3 py-1.5 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition ${className}`}
  >
    Deactivate
  </button>
);

/* ------------------------------------------------------------------ */
/* One section used by BOTH tabs (removes the duplicated markup)       */
/* ------------------------------------------------------------------ */
const StaffSection = ({
  title,
  icon,
  searchPlaceholder,
  search,
  onSearch,
  addLabel,
  records,
  detailPath, // "teacher" | "office"
  deactivateType, // "teacher" | "staff"
  isDirector,
  onShowInactive,
  onDeactivate,
}) => (
  <>
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center my-4">
      <i className={`${icon} mr-2`}></i> {title}
    </h1>

    {/* Toolbar */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4 border-b border-gray-300 dark:border-gray-700 pb-3">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearch(e.target.value.trimStart())}
        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded w-full sm:w-64 md:w-72 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5E35B1]"
      />
      {isDirector && (
        <div className="flex gap-2">
          <Link
            to={allRouterLink.registerUser}
            className="btn bgTheme text-white flex-1 sm:flex-none text-center whitespace-nowrap"
          >
            <i className="fa-solid fa-user-plus"></i> {addLabel}
          </Link>
          <button
            onClick={onShowInactive}
            title="View Inactive Users"
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition shrink-0"
          >
            <i className="fa-solid fa-user-slash text-sm"></i>
          </button>
        </div>
      )}
    </div>

    {records.length === 0 ? (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">No data found.</div>
    ) : (
      <>
        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {records.map((record, index) => (
            <div
              key={record.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">#{index + 1}</p>
                  <Link
                    to={`/staffDetail/${detailPath}/${record.id}`}
                    state={{ level_name: record.level_name }}
                    className="font-bold capitalize textTheme hover:underline break-words"
                  >
                    {getDisplayName(record)}
                  </Link>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Joined: {record.joining_date || "-"}
                  </p>
                </div>
                <StatusBadge />
              </div>
              {isDirector && (
                <DeactivateButton
                  onClick={() => onDeactivate(record, deactivateType)}
                  className="w-full mt-3"
                />
              )}
            </div>
          ))}
        </div>

        {/* Tablet/Desktop: table */}
        <div className="hidden md:block w-full overflow-x-auto max-h-[70vh] rounded-lg no-scrollbar">
          <table className="min-w-full table-auto rounded-lg">
            <thead className="bgTheme text-white text-center sticky top-0 z-[2]">
              <tr>
                <th className="px-4 py-3 text-nowrap">S.NO</th>
                <th className="px-4 py-3 text-nowrap">Name</th>
                <th className="px-4 py-3 text-nowrap">Joined Date</th>
                <th className="px-4 py-3 text-nowrap">Status</th>
                {isDirector && <th className="px-4 py-3 text-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {records.map((record, index) => (
                <tr key={record.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 text-center">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">{index + 1}</td>
                  <td className="px-4 py-3 text-nowrap">
                    <Link
                      to={`/staffDetail/${detailPath}/${record.id}`}
                      state={{ level_name: record.level_name }}
                      className="font-bold capitalize textTheme hover:underline"
                    >
                      {getDisplayName(record)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">
                    {record.joining_date}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge />
                  </td>
                  {isDirector && (
                    <td className="px-4 py-3">
                      <DeactivateButton onClick={() => onDeactivate(record, deactivateType)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </>
);

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
const AllStaff = () => {
  const [officestaff, setofficestaff] = useState([]);
  const [teachers, setteachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [activeTab, setActiveTab] = useState("teachers");

  // Deactivation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [userType, setUserType] = useState("");

  // Result modal
  const [resultModal, setResultModal] = useState(null);

  // Inactive users
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);

  const { userRole } = useContext(AuthContext);
  const isDirector = userRole === constants.roles.director;

  /* ---------------- data loading ---------------- */
  const loadActiveUsers = useCallback(async () => {
    const [teacherData, officeData] = await Promise.all([fetchTeachers(), fetchOfficeStaff()]);
    setteachers(onlyActiveSorted(teacherData));
    setofficestaff(onlyActiveSorted(officeData));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadActiveUsers();
      } catch (err) {
        setError("Failed to fetch staff data. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadActiveUsers]);

  const getInactiveUsers = async () => {
    setInactiveLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setInactiveUsers([]);
        return;
      }
      const response = await fetchInactiveUsers(token);

      let users = [];
      if (Array.isArray(response)) users = response;
      else if (Array.isArray(response?.results)) users = response.results;
      else if (Array.isArray(response?.data)) users = response.data;
      else if (response && typeof response === "object") users = [response];

      setInactiveUsers(users);
    } catch (err) {
      console.error("Failed to fetch inactive users:", err);
      setInactiveUsers([]);
    } finally {
      setInactiveLoading(false);
    }
  };

  /* ---------------- deactivate ---------------- */
  const resetDeleteState = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setUserType("");
    setDeactivationReason("");
  };

  const handleDeleteClick = (user, type) => {
    setUserToDelete(user); // user.id is the id we send to the API
    setUserType(type);
    setDeactivationReason("");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !deactivationReason.trim()) return;

    setDeleteLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        resetDeleteState();
        setResultModal({ type: "error", message: "Session expired. Please login again." });
        return;
      }

      // user_id is the actual User model id (record.id is the staff/teacher profile id)
      const userId = userToDelete.user_id;

      if (!userId) {
        resetDeleteState();
        setResultModal({ type: "error", message: "Invalid user data. Cannot deactivate." });
        return;
      }

      await deactivateUsers(token, [userId], deactivationReason.trim());

      if (userType === "teacher") {
        setteachers((prev) => prev.filter((u) => u.user_id !== userId));
      } else {
        setofficestaff((prev) => prev.filter((u) => u.user_id !== userId));
      }

      await getInactiveUsers();
      resetDeleteState();
      setResultModal({ type: "success", message: "User has been deactivated successfully." });
    } catch (err) {
      console.error("Deactivation error:", err);
      resetDeleteState();
      setResultModal({
        type: "error",
        message:
          err.response?.data?.message || err.response?.data?.error || "Failed to deactivate user. Please try again.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ---------------- reactivate ---------------- */
  const handleInactiveClick = () => {
    setShowInactiveModal(true);
    getInactiveUsers();
  };

  const handleReactivate = async (user) => {
    const userId = getUserId(user);
    if (!userId) {
      setResultModal({ type: "error", message: "Invalid user data. Cannot reactivate." });
      return;
    }

    setReactivatingId(userId);
    try {
      const token = getAccessToken();
      if (!token) {
        setResultModal({ type: "error", message: "Session expired. Please login again." });
        return;
      }

      await reactivateUsers(token, [userId]);

      setInactiveUsers((prev) => prev.filter((u) => getUserId(u) !== userId));
      await loadActiveUsers();

      setResultModal({ type: "success", message: "User has been reactivated successfully." });
    } catch (err) {
      console.error("Reactivation failed:", err);
      setResultModal({
        type: "error",
        message:
          err.response?.data?.message || err.response?.data?.error || "Failed to reactivate user. Please try again.",
      });
    } finally {
      setReactivatingId(null);
    }
  };

  /* ---------------- derived ---------------- */
  const filteredTeachers = useMemo(
    () => teachers.filter((t) => getFullName(t).includes(teacherSearch.toLowerCase())),
    [teachers, teacherSearch]
  );

  const filteredOfficeStaff = useMemo(
    () => officestaff.filter((s) => getFullName(s).includes(staffSearch.toLowerCase())),
    [officestaff, staffSearch]
  );

  const filteredInactive = useMemo(
    () =>
      inactiveUsers.filter((user) => {
        const roleName = user.role?.name?.toLowerCase();
        return roleName === "teacher" || roleName === "office staff";
      }),
    [inactiveUsers]
  );

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner />
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  const tabClass = (tab) =>
    `flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-6 py-2 font-semibold rounded-t-lg border-b-2 text-sm sm:text-base ${
      activeTab === tab
        ? "border-[#5E35B1] textTheme"
        : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
    }`;

  return (
    <div className="min-h-screen p-3 sm:p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      {error && (
        <div className="text-red-600 text-center mb-4 font-medium dark:text-red-400">{error}</div>
      )}

      {/* DEACTIVATE MODAL */}
      {showDeleteModal && (
        <ModalShell
          title="Deactivate User"
          icon="fa-solid fa-user-slash"
          onClose={deleteLoading ? undefined : resetDeleteState}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={resetDeleteState}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading || !deactivationReason.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md bgTheme hover:opacity-90 ${
                  deleteLoading || !deactivationReason.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {deleteLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          }
        >
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm sm:text-base">
            Are you sure you want to deactivate{" "}
            <span className="font-semibold textTheme capitalize">
              {userToDelete ? getDisplayName(userToDelete) : "this user"}
            </span>
            ?
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason for Deactivation *
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5E35B1] dark:bg-gray-700 dark:text-gray-100 resize-none"
            placeholder="Enter reason (e.g., Contract Over, Resignation, etc.)"
            value={deactivationReason}
            onChange={(e) => setDeactivationReason(e.target.value)}
            rows="3"
          />
          {!deactivationReason.trim() && (
            <p className="text-xs text-red-500 mt-1">Please enter a reason</p>
          )}
        </ModalShell>
      )}

      {/* RESULT MODAL */}
      {resultModal && (
        <ModalShell
          title={resultModal.type === "success" ? "Success" : "Failed"}
          icon={
            resultModal.type === "success"
              ? "fa-solid fa-circle-check"
              : "fa-solid fa-circle-xmark"
          }
          onClose={() => setResultModal(null)}
          maxWidth="max-w-sm"
          footer={
            <div className="flex justify-center">
              <button
                onClick={() => setResultModal(null)}
                className="btn bgTheme text-white px-8 hover:opacity-90"
              >
                OK
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                resultModal.type === "success" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <i
                className={`text-3xl ${
                  resultModal.type === "success"
                    ? "fa-solid fa-circle-check text-green-500"
                    : "fa-solid fa-circle-xmark text-red-500"
                }`}
              ></i>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{resultModal.message}</p>
          </div>
        </ModalShell>
      )}

      {/* INACTIVE USERS MODAL */}
      {showInactiveModal && (
        <ModalShell
          title="Inactive Users"
          icon="fa-solid fa-user-slash"
          onClose={() => setShowInactiveModal(false)}
          maxWidth="max-w-lg"
          footer={
            <p className="text-xs text-gray-400 text-center">
              {filteredInactive.length} inactive user(s)
            </p>
          }
        >
          {inactiveLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Spinner size="w-2.5 h-2.5" />
              <p className="mt-2 text-gray-500 text-sm">Loading...</p>
            </div>
          ) : filteredInactive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <i className="fa-solid fa-face-smile text-4xl textTheme mb-3"></i>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No inactive teachers or office staff found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInactive.map((user) => {
                const name = getDisplayName(user) || "Unknown";
                const reason = user.deactivation_reason || "No reason specified";
                const date = user.deactivation_date
                  ? new Date(user.deactivation_date).toLocaleDateString()
                  : "";
                const busy = reactivatingId === getUserId(user);

                return (
                  <div
                    key={getUserId(user)}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 sm:px-4 py-3 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-user textTheme text-sm"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate capitalize">
                          {name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {reason}
                          </span>
                          {date && <span className="text-xs text-gray-400">{date}</span>}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {user.role?.name || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleReactivate(user)}
                      disabled={busy}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0 ${
                        busy
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bgTheme text-white hover:opacity-90"
                      }`}
                    >
                      {busy ? (
                        <>
                          <i className="fa-solid fa-spinner animate-spin"></i> Wait...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-rotate-left"></i> Reactivate
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ModalShell>
      )}

      {/* MAIN CARD */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-lg shadow-lg mb-10">
        <div className="flex gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setActiveTab("teachers")} className={tabClass("teachers")}>
            <i className="fa-solid fa-person-chalkboard mr-2 text-xl sm:text-3xl"></i> Teachers
          </button>
          <button onClick={() => setActiveTab("staff")} className={tabClass("staff")}>
            <i className="fa-solid fa-clipboard-user mr-2 text-xl sm:text-3xl"></i> Office Staff
          </button>
        </div>

        {activeTab === "teachers" && (
          <StaffSection
            title="Teachers"
            icon="fa-solid fa-person-chalkboard"
            searchPlaceholder="Search Teacher Name"
            search={teacherSearch}
            onSearch={setTeacherSearch}
            addLabel="Add Teacher"
            records={filteredTeachers}
            detailPath="teacher"
            deactivateType="teacher"
            isDirector={isDirector}
            onShowInactive={handleInactiveClick}
            onDeactivate={handleDeleteClick}
          />
        )}

        {activeTab === "staff" && (
          <StaffSection
            title="Office Staff"
            icon="fa-solid fa-clipboard-user"
            searchPlaceholder="Search Staff Member Name"
            search={staffSearch}
            onSearch={setStaffSearch}
            addLabel="Add Office Staff"
            records={filteredOfficeStaff}
            detailPath="office"
            deactivateType="staff"
            isDirector={isDirector}
            onShowInactive={handleInactiveClick}
            onDeactivate={handleDeleteClick}
          />
        )}
      </div>
    </div>
  );
};

export default AllStaff;