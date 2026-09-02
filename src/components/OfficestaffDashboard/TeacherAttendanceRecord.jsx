import React, { useEffect, useState } from "react";
import {
  fetchTeacherAttendanceRecords,
  updateTeacherAttendance,
  fetchOfficeStaffAttendanceRecords,
  updateOfficeStaffAttendance,
} from "../../services/api/Api";

const TeacherAttendanceRecord = () => {
  const [activeTab, setActiveTab] = useState("teachers");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("Attendance");

  const today = new Date().toISOString().split("T")[0];

  // ---------- Teacher states ----------
  const [teacherRecords, setTeacherRecords] = useState([]);
  const [teacherSearchDate, setTeacherSearchDate] = useState("");
  const [teacherSearchName, setTeacherSearchName] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("");
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [selectedTeacherRecord, setSelectedTeacherRecord] = useState(null);
  const [teacherUpdating, setTeacherUpdating] = useState(false);

  // ---------- Office Staff states ----------
  const [staffRecords, setStaffRecords] = useState([]);
  const [staffSearchDate, setStaffSearchDate] = useState("");
  const [staffSearchName, setStaffSearchName] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState("");
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedStaffRecord, setSelectedStaffRecord] = useState(null);
  const [staffUpdating, setStaffUpdating] = useState(false);

  // ---------- Fetch both (teacher + staff) ----------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tData, sData] = await Promise.all([
          fetchTeacherAttendanceRecords(),
          fetchOfficeStaffAttendanceRecords(),
        ]);

        setTeacherRecords(tData);
        setStaffRecords(sData);

        setTeacherSearchDate(today);
        setStaffSearchDate(today);
      } catch (err) {
        console.error(err);
        setError("Failed to load attendance records");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [today]);

  // ---------- Filters (Teacher) ----------
  const teacherFilteredRecords = teacherRecords.filter((r) => {
    const matchesDate = teacherSearchDate ? r.date === teacherSearchDate : true;
    const matchesName = teacherSearchName
      ? r.teacher_name.toLowerCase().includes(teacherSearchName.toLowerCase())
      : true;
    const matchesStatus = teacherStatusFilter
      ? r.status.toLowerCase() === teacherStatusFilter.toLowerCase()
      : true;

    return matchesDate && matchesName && matchesStatus;
  });

  // ---------- Filters (Staff) ----------
  const staffFilteredRecords = staffRecords.filter((r) => {
    const matchesDate = staffSearchDate ? r.date === staffSearchDate : true;
    const matchesName = staffSearchName
      ? r.office_staff_name
          .toLowerCase()
          .includes(staffSearchName.toLowerCase())
      : true;
    const matchesStatus = staffStatusFilter
      ? r.status.toLowerCase() === staffStatusFilter.toLowerCase()
      : true;

    return matchesDate && matchesName && matchesStatus;
  });

  // ---------- Teacher modal handlers ----------
  const openTeacherModal = (record) => {
    setSelectedTeacherRecord(record);
    setTeacherModalOpen(true);
  };

  const closeTeacherModal = () => {
    setTeacherModalOpen(false);
    setSelectedTeacherRecord(null);
  };

  const handleTeacherStatusChange = (e) => {
    setSelectedTeacherRecord({
      ...selectedTeacherRecord,
      status: e.target.value,
    });
  };

  const updateTeacherStatus = async () => {
    if (!selectedTeacherRecord) return;

    setTeacherUpdating(true);
    try {
      await updateTeacherAttendance(
        selectedTeacherRecord.id,
        selectedTeacherRecord
      );

      setTeacherRecords((prev) =>
        prev.map((r) =>
          r.id === selectedTeacherRecord.id
            ? { ...r, status: selectedTeacherRecord.status }
            : r
        )
      );

      setAlertTitle("Teacher Attendance");
      setAlertMessage("Attendance updated successfully!");
      setShowAlert(true);
      closeTeacherModal();
    } catch (err) {
      console.error(err);
      setAlertTitle("Teacher Attendance");
      setAlertMessage("Failed to update attendance");
      setShowAlert(true);
    } finally {
      setTeacherUpdating(false);
    }
  };

  // ---------- Staff modal handlers ----------
  const openStaffModal = (record) => {
    setSelectedStaffRecord(record);
    setStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    setStaffModalOpen(false);
    setSelectedStaffRecord(null);
  };

  const handleStaffStatusChange = (e) => {
    setSelectedStaffRecord({
      ...selectedStaffRecord,
      status: e.target.value,
    });
  };

  const updateStaffStatus = async () => {
    if (!selectedStaffRecord) return;

    setStaffUpdating(true);
    try {
      await updateOfficeStaffAttendance(
        selectedStaffRecord.id,
        selectedStaffRecord
      );

      setStaffRecords((prev) =>
        prev.map((r) =>
          r.id === selectedStaffRecord.id
            ? { ...r, status: selectedStaffRecord.status }
            : r
        )
      );

      setAlertTitle("Office Staff Attendance");
      setAlertMessage("Attendance updated successfully!");
      setShowAlert(true);
      closeStaffModal();
    } catch (err) {
      console.error(err);
      setAlertTitle("Office Staff Attendance");
      setAlertMessage("Failed to update attendance");
      setShowAlert(true);
    } finally {
      setStaffUpdating(false);
    }
  };

  // ---------- Loading / Error ----------
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
        <p className="text-lg text-red-400 font-medium">{error}</p>
      </div>
    );
  }

  // ---------- UI ----------
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${
              activeTab === "teachers"
                ? "border-[#5E35B1] textTheme"
                : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
            }`}
          >
            <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i>
            Teachers
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${
              activeTab === "staff"
                ? "border-[#5E35B1] textTheme"
                : "border-transparent text-gray-600 hover:text-[#5E35B1] dark:text-gray-300 dark:hover:text-[#9575cd]"
            }`}
          >
            <i className="fa-solid fa-clipboard-user mr-2 text-3xl"></i>
            Office Staff
          </button>
        </div>

        {/* ========== TEACHER TAB ========== */}
        {activeTab === "teachers" && (
          <>
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-2">
                <i className="fa-solid fa-clipboard-list w-5"></i> Teacher
                Attendance Record
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 w-full sm:w-auto">
                {/* Date Filter */}
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Filter by Date:
                  </label>
                  <input
                    type="date"
                    value={teacherSearchDate}
                    onChange={(e) => setTeacherSearchDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Filter by Status:
                  </label>
                  <select
                    className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={teacherStatusFilter}
                    onChange={(e) => setTeacherStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="present">Present</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setTeacherSearchDate("");
                    setTeacherSearchName("");
                    setTeacherStatusFilter("");
                  }}
                  className="btn bgTheme text-white"
                >
                  Reset Filters
                </button>
              </div>

              <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Search by Teacher Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter teacher name..."
                  value={teacherSearchName}
                  onChange={(e) =>
                    setTeacherSearchName(e.target.value.trimStart())
                  }
                  className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 text-xs sm:text-sm">
                <thead className="bgTheme text-white sticky top-0 z-2">
                  <tr>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Teacher Name
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {teacherFilteredRecords.length > 0 ? (
                    [...teacherFilteredRecords]
                      .sort((a, b) =>{
                         const nameA = a.teacher_name || "N/A";
                        const nameB = b.teacher_name || "N/A";
                        return nameA.localeCompare(nameB)
                        // a.teacher_name.localeCompare(b.teacher_name)
                      }
                      )
                      .map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                        >
                          <td className="px-4 py-3 text-nowrap capitalize text-gray-700 dark:text-white">
                            {record.teacher_name}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-nowrap dark:text-gray-300">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            <span
                              className={`inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize ${
                                record.status.toLowerCase() === "present"
                                  ? "bg-green-100 text-green-800"
                                  : record.status.toLowerCase() === "leave"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openTeacherModal(record)}
                              className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:border-yellow-400 dark:bg-yellow-100 dark:text-yellow-900 dark:hover:bg-yellow-200"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No records found{" "}
                        {teacherSearchDate ? `for ${teacherSearchDate}` : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ========== STAFF TAB ========== */}
        {activeTab === "staff" && (
          <>
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-2">
                <i className="fa-solid fa-clipboard-list w-5"></i> Office Staff
                Attendance Record
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 w-full sm:w-auto">
                {/* Date Filter */}
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Filter by Date:
                  </label>
                  <input
                    type="date"
                    value={staffSearchDate}
                    onChange={(e) => setStaffSearchDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Filter by Status:
                  </label>
                  <select
                    className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={staffStatusFilter}
                    onChange={(e) => setStaffStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="present">Present</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setStaffSearchDate("");
                    setStaffSearchName("");
                    setStaffStatusFilter("");
                  }}
                  className="btn bgTheme text-white"
                >
                  Reset Filters
                </button>
              </div>

              <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Search by Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter staff name..."
                  value={staffSearchName}
                  onChange={(e) =>
                    setStaffSearchName(e.target.value.trimStart())
                  }
                  className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 text-xs sm:text-sm">
                <thead className="bgTheme text-white sticky top-0 z-2">
                  <tr>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Staff Name
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {staffFilteredRecords.length > 0 ? (
                    [...staffFilteredRecords]
                      .sort((a, b) =>{
                        const nameA = a.office_staff_name || "N/A";
                        const nameB = b.office_staff_name || "N/A";
                        return nameA.localeCompare(nameB)
                        // a.office_staff_name.localeCompare(b.office_staff_name)
                      })
                      .map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                        >
                          <td className="px-4 py-3 text-nowrap capitalize text-gray-700 dark:text-white">
                            {record.office_staff_name}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-nowrap dark:text-gray-300">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            <span
                              className={`inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize ${
                                record.status.toLowerCase() === "present"
                                  ? "bg-green-100 text-green-800"
                                  : record.status.toLowerCase() === "leave"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openStaffModal(record)}
                              className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:border-yellow-400 dark:bg-yellow-100 dark:text-yellow-900 dark:hover:bg-yellow-200"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No records found{" "}
                        {staffSearchDate ? `for ${staffSearchDate}` : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Teacher Modal */}
      {teacherModalOpen && selectedTeacherRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeTeacherModal}
          />
          <div className="relative bg-white rounded-lg p-6 w-11/12 sm:w-96 z-10 dark:bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Edit Attendance</h3>
            <p className="mb-2 font-medium capitalize">
              {selectedTeacherRecord.teacher_name}
            </p>
            <p className="mb-4 text-gray-500">{selectedTeacherRecord.date}</p>
            <select
              value={selectedTeacherRecord.status}
              onChange={handleTeacherStatusChange}
              className="w-full border px-3 py-2 rounded mb-4"
            >
              <option value="absent" className="dark:text-black">
                Absent
              </option>
              <option value="leave" className="dark:text-black">
                Leave
              </option>
              <option value="present" className="dark:text-black">
                Present
              </option>
            </select>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={closeTeacherModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto dark:text-black"
              >
                Cancel
              </button>
              <button
                onClick={updateTeacherStatus}
                className="btn bgTheme text-white w-28"
              >
                {teacherUpdating ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : null}
                {teacherUpdating ? " " : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {staffModalOpen && selectedStaffRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeStaffModal}
          />
          <div className="relative bg-white rounded-lg p-6 w-11/12 sm:w-96 z-10 dark:bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Edit Attendance</h3>
            <p className="mb-2 font-medium capitalize">
              {selectedStaffRecord.office_staff_name}
            </p>
            <p className="mb-4 text-gray-500">{selectedStaffRecord.date}</p>
            <select
              value={selectedStaffRecord.status}
              onChange={handleStaffStatusChange}
              className="w-full border px-3 py-2 rounded mb-4"
            >
              <option value="Absent" className="dark:text-black">
                Absent
              </option>
              <option value="Leave" className="dark:text-black">
                Leave
              </option>
              <option value="Present" className="dark:text-black">
                Present
              </option>
            </select>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={closeStaffModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto dark:text-black"
              >
                Cancel
              </button>
              <button
                onClick={updateStaffStatus}
                className="btn bgTheme text-white w-28"
              >
                {staffUpdating ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : null}
                {staffUpdating ? " " : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Alert */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">{alertTitle}</h3>
            <p className="py-4 capitalize">{alertMessage}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
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

export default TeacherAttendanceRecord;