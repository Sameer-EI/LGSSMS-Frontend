import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { fetchOfficeStaff, fetchTeachers, fetchInactiveUsers, deactivateUsers, reactivateUsers } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";

const AllStaff = () => {
  const [officestaff, setofficestaff] = useState([]);
  const [teachers, setteachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [activeTab, setActiveTab] = useState("teachers");

  // Deactivation/Reactivation States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");

  // Result Modal
  const [resultModal, setResultModal] = useState(null);

  // Inactive Users States
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [userType, setUserType] = useState("");

  const { userRole } = useContext(AuthContext);

  // Helper function to get token from localStorage
  const getAccessToken = () => {
    try {
      const authTokens = localStorage.getItem("authTokens");
      if (authTokens) {
        const parsed = JSON.parse(authTokens);
        return parsed.access;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  // Helper function to get full name for sorting
  const getFullName = (record) => {
    return [record.first_name, record.middle_name, record.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  // Helper function to sort alphabetically by name
  const sortByName = (a, b) => {
    return getFullName(a).localeCompare(getFullName(b));
  };

  // Fetch inactive users
  // Fetch inactive users
  const getInactiveUsers = async () => {
    setInactiveLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        console.error("No token found");
        setInactiveLoading(false);
        return;
      }

      const response = await fetchInactiveUsers(token);
      console.log("Inactive users response:", response);

      // Handle different response formats
      let users = [];
      if (Array.isArray(response)) {
        users = response;
      } else if (response?.results && Array.isArray(response.results)) {
        users = response.results;
      } else if (response?.data && Array.isArray(response.data)) {
        users = response.data;
      } else if (typeof response === 'object' && response !== null) {
        users = [response];
      }

      // Map the response to include user_id (using id as user_id)
      const mappedUsers = users.map(user => ({
        ...user,
        user_id: user.id // Map id to user_id for consistency
      }));

      console.log("Mapped inactive users:", mappedUsers);
      setInactiveUsers(mappedUsers);
    } catch (err) {
      console.error("Failed to fetch inactive users:", err);
      setInactiveUsers([]);
    } finally {
      setInactiveLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teacherData, officeData] = await Promise.all([
          fetchTeachers(),
          fetchOfficeStaff(),
        ]);

        // Filter only active users
        const activeTeachers = teacherData.filter(teacher => teacher.is_active === true);
        const activeOfficeStaff = officeData.filter(staff => staff.is_active === true);

        const sortedTeachers = activeTeachers.sort(sortByName);
        const sortedOfficeStaff = activeOfficeStaff.sort(sortByName);

        setteachers(sortedTeachers);
        setofficestaff(sortedOfficeStaff);
      } catch (err) {
        setError("Failed to fetch staff data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --------------------------------------------------------------
  // DELETE / DEACTIVATE
  // --------------------------------------------------------------
  const handleDeleteClick = (user, type) => {
    // Store the user with both IDs - use user_id for API calls
    setUserToDelete({
      ...user,
      userId: user.user_id // This is the actual User model ID
    });
    setUserType(type);
    setDeactivationReason("");
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setUserType("");
    setDeactivationReason("");
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    if (!deactivationReason.trim()) {
      alert("Please enter a reason for deactivation.");
      return;
    }

    setDeleteLoading(true);
    try {
      // Use userToDelete.userId which is the actual user_id
      const userId = userToDelete.userId;
      const token = getAccessToken();

      if (!token) {
        alert("Session expired. Please login again.");
        return;
      }

      console.log("Deactivating user with user_id:", userId);
      console.log("Reason:", deactivationReason.trim());

      await deactivateUsers(token, [userId], deactivationReason.trim());

      // Update local state - remove from active list using user_id
      if (userType === "teacher") {
        setteachers(prev => prev.filter(user => user.user_id !== userId));
      } else {
        setofficestaff(prev => prev.filter(user => user.user_id !== userId));
      }

      // Refresh inactive users list
      await getInactiveUsers();

      setShowDeleteModal(false);
      setUserToDelete(null);
      setUserType("");
      setDeactivationReason("");

      setResultModal({
        type: "success",
        message: "User has been deactivated successfully.",
      });
    } catch (error) {
      console.error("Deactivation error:", error);
      setShowDeleteModal(false);
      setUserToDelete(null);
      setUserType("");
      setResultModal({
        type: "error",
        message: error.response?.data?.message || "Failed to deactivate user. Please try again.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --------------------------------------------------------------
  // INACTIVE & REACTIVATE
  // --------------------------------------------------------------
  const handleInactiveClick = () => {
    setShowInactiveModal(true);
    getInactiveUsers();
  };

  const handleReactivate = async (user) => {
    // Use user_id if available, otherwise fallback to id
    const userId = user.user_id || user.id;

    if (!userId) {
      console.error("No valid ID found for user:", user);
      setResultModal({
        type: "error",
        message: "Invalid user data. Cannot reactivate.",
      });
      return;
    }

    console.log("Reactivating user with ID:", userId);
    console.log("Full user object:", user);

    setReactivatingId(userId);
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Session expired. Please login again.");
        setReactivatingId(null);
        return;
      }

      console.log("Sending reactivation request for user_id:", userId);

      const response = await reactivateUsers(token, [userId]);
      console.log("Reactivation response:", response);

      // Remove from inactive list
      setInactiveUsers((prev) =>
        prev.filter((u) => {
          const uId = u.user_id || u.id;
          return uId !== userId;
        })
      );

      // Fetch the user details to add back to active list
      const [teacherData, officeData] = await Promise.all([
        fetchTeachers(),
        fetchOfficeStaff(),
      ]);

      // Filter only active users
      const activeTeachers = teacherData.filter(teacher => teacher.is_active === true);
      const activeOfficeStaff = officeData.filter(staff => staff.is_active === true);

      const sortedTeachers = activeTeachers.sort(sortByName);
      const sortedOfficeStaff = activeOfficeStaff.sort(sortByName);

      setteachers(sortedTeachers);
      setofficestaff(sortedOfficeStaff);

      setResultModal({
        type: "success",
        message: "User has been reactivated successfully.",
      });
    } catch (err) {
      console.error("Reactivation failed:", err);
      console.error("Error response:", err.response?.data);
      setResultModal({
        type: "error",
        message: err.response?.data?.message || err.response?.data?.error || "Failed to reactivate user. Please try again.",
      });
    } finally {
      setReactivatingId(null);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    getFullName(teacher).includes(teacherSearch.toLowerCase())
  );

  const filteredOfficeStaff = officestaff.filter((staff) =>
    getFullName(staff).includes(staffSearch.toLowerCase())
  );

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

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      {error && (
        <div className="text-red-600 text-center mb-4 font-medium dark:text-red-400">
          {error}
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-md">
            <h2 className="text-lg font-semibold mb-3 dark:text-gray-100">
              Deactivate User
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to deactivate this user?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for Deactivation *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                placeholder="Enter reason for deactivation (e.g., Contract Over, Resignation, etc.)"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                rows="3"
                required
              />
              {!deactivationReason.trim() && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter a reason
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading || !deactivationReason.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md bg-red-600 hover:bg-red-700 ${(deleteLoading || !deactivationReason.trim()) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {deleteLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL */}
      {resultModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-md">
            <div className="flex justify-center mb-4">
              {resultModal.type === "success" ? (
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <i className="fa-solid fa-circle-check text-green-500 text-3xl"></i>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <i className="fa-solid fa-circle-xmark text-red-500 text-3xl"></i>
                </div>
              )}
            </div>
            <h2
              className={`text-lg font-semibold text-center mb-2 ${resultModal.type === "success"
                ? "text-green-700"
                : "text-red-700"
                }`}
            >
              {resultModal.type === "success" ? "Success!" : "Failed!"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-5">
              {resultModal.message}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setResultModal(null)}
                className={`btn text-white px-8 ${resultModal.type === "success"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
                  }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INACTIVE USERS MODAL */}
      {showInactiveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <i className="fa-solid fa-user-slash text-red-500"></i>
                Inactive Users
              </h2>
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <i className="fa-solid fa-xmark text-gray-500 dark:text-gray-300"></i>
              </button>
            </div>

            {/* <div className="flex-1 overflow-y-auto p-4">
              {inactiveLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                  </div>
                  <p className="mt-2 text-gray-500 text-sm">Loading...</p>
                </div>
              ) : inactiveUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <i className="fa-solid fa-face-smile text-4xl text-green-400 mb-3"></i>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No inactive users found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveUsers.map((user) => {
                    // Use user_id if available, otherwise fallback to id
                    const userId = user.user_id || user.id;
                    const firstName = user.first_name || "";
                    const lastName = user.last_name || "";
                    const name = `${firstName} ${lastName}`.trim() || "Unknown";
                    const reason = user.deactivation_reason || "No reason specified";
                    const date = user.deactivation_date
                      ? new Date(user.deactivation_date).toLocaleDateString()
                      : "";

                    console.log(`Rendering inactive user:`, user);
                    console.log(`- Using userId: ${userId}`);

                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-user text-red-500 text-sm"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {reason}
                              </span>
                              {date && (
                                <span className="text-xs text-gray-400">
                                  {date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleReactivate(user)}
                          disabled={reactivatingId === userId}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition flex-shrink-0 ${reactivatingId === userId
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-green-50 text-green-700 border border-green-300 hover:bg-green-100"
                            }`}
                        >
                          {reactivatingId === userId ? (
                            <>
                              <i className="fa-solid fa-spinner animate-spin"></i>
                              Wait...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-rotate-left"></i>
                              Reactivate
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div> */}
            <div className="flex-1 overflow-y-auto p-4">
              {inactiveLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-2.5 h-2.5 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                  </div>
                  <p className="mt-2 text-gray-500 text-sm">Loading...</p>
                </div>
              ) : (() => {
                const filteredInactive = inactiveUsers.filter(user => {
                  const roleName = user.role?.name?.toLowerCase();
                  return roleName === 'teacher' || roleName === 'office staff';
                });

                return filteredInactive.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <i className="fa-solid fa-face-smile text-4xl text-green-400 mb-3"></i>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No inactive teachers or office staff found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInactive.map((user) => {
                      const userId = user.user_id || user.id;
                      const firstName = user.first_name || "";
                      const lastName = user.last_name || "";
                      const name = `${firstName} ${lastName}`.trim() || "Unknown";
                      const reason = user.deactivation_reason || "No reason specified";
                      const date = user.deactivation_date
                        ? new Date(user.deactivation_date).toLocaleDateString()
                        : "";

                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                              <i className="fa-solid fa-user text-red-500 text-sm"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                {name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  {reason}
                                </span>
                                {date && (
                                  <span className="text-xs text-gray-400">
                                    {date}
                                  </span>
                                )}
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {user.role?.name || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleReactivate(user)}
                            disabled={reactivatingId === userId}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition flex-shrink-0 ${reactivatingId === userId
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-green-50 text-green-700 border border-green-300 hover:bg-green-100"
                              }`}
                          >
                            {reactivatingId === userId ? (
                              <>
                                <i className="fa-solid fa-spinner animate-spin"></i>
                                Wait...
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-rotate-left"></i>
                                Reactivate
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                {inactiveUsers.length} inactive user(s)
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-10">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${activeTab === "teachers"
              ? "border-[#5E35B1] textTheme"
              : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
              }`}
          >
            <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i> Teachers
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${activeTab === "staff"
              ? "border-[#5E35B1] textTheme"
              : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
              }`}
          >
            <i className="fa-solid fa-clipboard-user mr-2 text-3xl"></i> Office Staff
          </button>
        </div>

        {/* Teachers Tab */}
        {activeTab === "teachers" && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
              <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i> Teachers
            </h1>
            <div className="flex justify-end mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              <input
                type="text"
                placeholder="Search Teacher Name"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value.trimStart())}
                className="border px-3 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray me-2"
              />
              <div className="flex gap-2">
                {userRole === constants.roles.director && (
                  <>
                    <Link to={allRouterLink.registerUser} className="btn bgTheme text-white">
                      <i className="fa-solid fa-user-plus"></i> Add Teacher
                    </Link>
                    <button
                      onClick={handleInactiveClick}
                      title="View Inactive Users"
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition flex-shrink-0"
                    >
                      <i className="fa-solid fa-user-slash text-sm"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="w-full overflow-x-auto max-h-[70vh] rounded-lg no-scrollbar">
              <table className="min-w-full table-auto rounded-lg">
                <thead className="bgTheme text-white text-center sticky top-0 z-2">
                  <tr>
                    <th className="px-4 py-3 text-nowrap">S.NO</th>
                    <th className="px-4 py-3 text-nowrap">Name</th>
                    <th className="px-4 py-3 text-nowrap">Joined Date</th>
                    <th className="px-4 py-3 text-nowrap">Status</th>
                    <th className="px-4 py-3 text-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-100 dark:hover:bg-gray-700 text-center">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 capitalize dark:text-gray-100 text-nowrap">
                          <Link
                            to={`/staffDetail/teacher/${record.id}`}
                            state={{ level_name: record.level_name }}
                            className="px-4 py-3 font-bold capitalize textTheme hover:underline text-nowrap"
                          >
                            {[record.first_name, record.middle_name, record.last_name].filter(Boolean).join(" ")}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">
                          {record.joining_date}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userRole === constants.roles.director && (
                            <button
                              onClick={() => handleDeleteClick(record, "teacher")}
                              className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Office Staff Tab */}
        {activeTab === "staff" && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
              <i className="fa-solid fa-clipboard-user mr-2 text-3xl"></i> Office Staff
            </h1>
            <div className="flex justify-end mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              <input
                type="text"
                placeholder="Search Staff Member Name"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value.trimStart())}
                className="border px-3 rounded w-full sm:w-70 dark:bg-gray-700 dark:text-white dark:border-gray-600 mr-2"
              />
              <div className="flex gap-2">
                {userRole === constants.roles.director && (
                  <>
                    <Link to={allRouterLink.registerUser} className="btn bgTheme text-white">
                      <i className="fa-solid fa-user-plus"></i> Add Office Staff
                    </Link>
                    <button
                      onClick={handleInactiveClick}
                      title="View Inactive Users"
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition flex-shrink-0"
                    >
                      <i className="fa-solid fa-user-slash text-sm"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="w-full overflow-x-auto max-h-[70vh] rounded-lg no-scrollbar">
              <table className="min-w-full table-auto rounded-lg">
                <thead className="bgTheme text-white text-center sticky top-0 z-2">
                  <tr>
                    <th className="px-4 py-3 text-nowrap">S.NO</th>
                    <th className="px-4 py-3 text-nowrap">Name</th>
                    <th className="px-4 py-3 text-nowrap">Joined Date</th>
                    <th className="px-4 py-3 text-nowrap">Status</th>
                    <th className="px-4 py-3 text-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredOfficeStaff.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    filteredOfficeStaff.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-100 dark:hover:bg-gray-700 text-center">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 capitalize dark:text-gray-100 text-nowrap">
                          <Link
                            to={`/staffDetail/office/${record.id}`}
                            state={{ level_name: record.level_name }}
                            className="px-4 py-3 font-bold capitalize textTheme hover:underline text-nowrap"
                          >
                            {[record.first_name, record.middle_name, record.last_name].filter(Boolean).join(" ")}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-nowrap">
                          {record.joining_date}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userRole === constants.roles.director && (
                            <button
                              onClick={() => handleDeleteClick(record, "staff")}
                              className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AllStaff;