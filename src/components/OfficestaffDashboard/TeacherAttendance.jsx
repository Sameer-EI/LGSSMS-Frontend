import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const TeacherAttendance = () => {
  const [activeTab, setActiveTab] = useState("teachers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Teachers
  const [teachers, setTeachers] = useState([]);
  const [teacherAttendance, setTeacherAttendance] = useState({});
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [savingTeacher, setSavingTeacher] = useState({});
  const [savingAllTeachers, setSavingAllTeachers] = useState(false);

  // Office Staff
  const [staff, setStaff] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState({});
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [savingStaff, setSavingStaff] = useState({});
  const [savingAllStaff, setSavingAllStaff] = useState(false);

  // ------------ FETCH DATA (teachers + staff) ----------
  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const [
          teachersData,
          teacherAttendanceRecords,
          staffData,
          staffAttendanceRecords,
        ] = await Promise.all([
          fetchTeachers(),
          fetchTeacherAttendanceRecords(),
          fetchOfficeStaff(),
          fetchOfficeStaffAttendanceRecords(),
        ]);

        setTeachers(teachersData);
        setStaff(staffData);

        const today = new Date().toISOString().split("T")[0];

        // Initialize teacher attendance map
        const initialTeacher = {};
        teachersData.forEach((t) => {
          const record = teacherAttendanceRecords.find(
            (r) => r.teacher === t.id && r.date === today
          );
          if (record) {
            initialTeacher[t.id] = {
              date: record.date,
              status: record.status,
              marked: true,
            };
          } else {
            initialTeacher[t.id] = { date: today, status: "", marked: false };
          }
        });

        // Initialize staff attendance map
        const initialStaff = {};
        staffData.forEach((s) => {
          const record = staffAttendanceRecords.find(
            (r) => r.office_staff_id === s.id && r.date === today
          );
          if (record) {
            initialStaff[s.id] = {
              date: record.date,
              status: record.status,
              marked: true,
            };
          } else {
            initialStaff[s.id] = { date: today, status: "", marked: false };
          }
        });

        setTeacherAttendance(initialTeacher);
        setStaffAttendance(initialStaff);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    getData();
  }, []);

  // ------------ HELPERS ----------
  const extractMessage = (data) => {
    if (!data) return "No response from server.";

    if (typeof data === "string") return data;

    // Bulk response pattern (teacher / staff)
    if (data.success_count !== undefined && data.error_count !== undefined) {
      const msgs = [];

      if (data.details?.skipped?.length) {
        data.details.skipped.forEach((s) => {
          const msgText =
            s.message ||
            s.error ||
            `Skipped staff ID ${
              s.office_staff_id || s.teacher_id || "unknown"
            }`;
          msgs.push(msgText);
        });
      }

      if (data.details?.marked?.length) {
        data.details.marked.forEach((s) => {
          const msgText =
            s.message ||
            s.error ||
            `Marked successfully for ID ${
              s.office_staff_id || s.teacher_id || "unknown"
            }`;
          msgs.push(msgText);
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

  // ------------ TEACHER handlers ----------
  const handleTeacherChange = (id, field, value) => {
    setTeacherAttendance((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, marked: false },
    }));
  };

  const handleTeacherSave = async (teacher) => {
    if (!teacherAttendance[teacher.id]?.status) {
      setAlertMessage("Please select status before marking Attendance!");
      setShowAlert(true);
      return;
    }

    setSavingTeacher((prev) => ({ ...prev, [teacher.id]: true }));

    try {
      const response = await saveTeacherAttendance([teacher], teacherAttendance);
      const msg = extractMessage(response?.data);
      setAlertMessage(msg);
      setShowAlert(true);

      setTeacherAttendance((prev) => ({
        ...prev,
        [teacher.id]: { ...prev[teacher.id], marked: true },
      }));
    } catch (error) {
      console.error(error);
      const msg =
        extractMessage(error?.response?.data) || "Failed to mark attendance";
      setAlertMessage(msg);
      setShowAlert(true);
    } finally {
      setSavingTeacher((prev) => ({ ...prev, [teacher.id]: false }));
    }
  };

  const handleTeacherSaveAll = async () => {
    const unsavedTeachers = teachers.filter(
      (t) =>
        !teacherAttendance[t.id]?.marked && teacherAttendance[t.id]?.status
    );

    if (unsavedTeachers.length === 0) {
      setAlertMessage("Please select status before marking Attendance!");
      setShowAlert(true);
      return;
    }

    setSavingAllTeachers(true);

    try {
      const unsavedAttendanceMap = {};
      unsavedTeachers.forEach((t) => {
        unsavedAttendanceMap[t.id] = teacherAttendance[t.id];
      });

      const response = await saveTeacherAttendance(
        unsavedTeachers,
        unsavedAttendanceMap
      );
      const msg =
        extractMessage(response?.data) || "Attendance saved successfully!";
      setAlertMessage(msg);
      setShowAlert(true);

      const updated = { ...teacherAttendance };
      unsavedTeachers.forEach((t) => {
        updated[t.id] = { ...updated[t.id], marked: true };
      });
      setTeacherAttendance(updated);
    } catch (error) {
      console.error(error);
      const msg =
        extractMessage(error?.response?.data) || "Failed to mark attendance";
      setAlertMessage(msg);
      setShowAlert(true);
    } finally {
      setSavingAllTeachers(false);
    }
  };

  // ------------ STAFF handlers ----------
  const handleStaffChange = (id, field, value) => {
    setStaffAttendance((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, marked: false },
    }));
  };

  const handleStaffSave = async (staffMember) => {
    if (!staffAttendance[staffMember.id]?.status) {
      setAlertMessage("Please select status before marking Attendance!");
      setShowAlert(true);
      return;
    }

    setSavingStaff((prev) => ({ ...prev, [staffMember.id]: true }));

    try {
      const response = await saveOfficeStaffAttendance(
        [staffMember],
        staffAttendance
      );
      const msg = extractMessage(response?.data) || "Saved";
      setAlertMessage(msg);
      setShowAlert(true);

      setStaffAttendance((prev) => ({
        ...prev,
        [staffMember.id]: { ...prev[staffMember.id], marked: true },
      }));
    } catch (error) {
      console.error(error);
      const msg =
        extractMessage(error?.response?.data) || "Failed to mark attendance";
      setAlertMessage(msg);
      setShowAlert(true);
    } finally {
      setSavingStaff((prev) => ({ ...prev, [staffMember.id]: false }));
    }
  };

  const handleStaffSaveAll = async () => {
    const unsavedStaff = staff.filter(
      (s) => !staffAttendance[s.id]?.marked && staffAttendance[s.id]?.status
    );

    if (unsavedStaff.length === 0) {
      setAlertMessage("Please select status before marking Attendance!");
      setShowAlert(true);
      return;
    }

    setSavingAllStaff(true);

    try {
      const unsavedAttendanceMap = {};
      unsavedStaff.forEach((s) => {
        unsavedAttendanceMap[s.id] = staffAttendance[s.id];
      });

      const response = await saveAllOfficeStaffAttendance(
        unsavedAttendanceMap,
        unsavedStaff
      );
      const msg = extractMessage(response?.data) || "Saved";
      setAlertMessage(msg);
      setShowAlert(true);

      const updated = { ...staffAttendance };
      unsavedStaff.forEach((s) => {
        updated[s.id] = { ...updated[s.id], marked: true };
      });
      setStaffAttendance(updated);
    } catch (error) {
      console.error(error);
      const msg =
        extractMessage(error?.response?.data) || "Failed to mark attendance";
      setAlertMessage(msg);
      setShowAlert(true);
    } finally {
      setSavingAllStaff(false);
    }
  };

  // ------------ FILTERED LISTS ----------
  const filteredTeachers = teachers
    .filter((t) =>
      `${t.first_name} ${t.last_name}`
        .toLowerCase()
        .includes(teacherSearchTerm.toLowerCase())
    )
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      )
    );

  const filteredStaff = staff
    .filter((s) =>
      `${s.first_name} ${s.last_name}`
        .toLowerCase()
        .includes(staffSearchTerm.toLowerCase())
    )
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      )
    );

  // ------------ LOADING / ERROR ----------
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
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  // ------------ UI WITH TABS ----------
  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-10">
        {/* Tabs */}
        <div className="flex gap-4">
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

        {/* -------- TEACHER ATTENDANCE TAB -------- */}
        {activeTab === "teachers" && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">
              <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i>
              Teacher Attendance
            </h1>

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
              <input
                type="text"
                placeholder="Search by name..."
                value={teacherSearchTerm}
                onChange={(e) =>
                  setTeacherSearchTerm(e.target.value.trimStart())
                }
                className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <Link
                to={allRouterLink.teacherAttendanceRecord}
                className="btn bgTheme text-white"
              >
                <i className="fa-solid fa-clipboard-list w-5"></i> Attendance
                Record
              </Link>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg mb-10">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 text-xs sm:text-sm">
                <thead className="bgTheme text-white z-2 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      S.NO
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Teacher Name
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Email
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
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher, index) => (
                      <tr
                        key={teacher.id}
                        className="hover:bg-gray-50 text-nowrap dark:hover:bg-gray-700 text-center transition-colors"
                      >
                        <td className="px-4 py-3 text-nowrap text-gray-700 dark:text-gray-300">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-bold capitalize text-gray-700 dark:text-gray-300 text-nowrap">
                          {teacher.first_name} {teacher.last_name}
                        </td>
                        <td className="px-4 py-3 text-nowrap text-gray-700 dark:text-gray-300">
                          {teacher.email}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            disabled={teacherAttendance[teacher.id]?.marked}
                            value={teacherAttendance[teacher.id]?.date || ""}
                            onChange={(e) =>
                              handleTeacherChange(
                                teacher.id,
                                "date",
                                e.target.value
                              )
                            }
                            max={new Date().toISOString().split("T")[0]}
                            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={teacherAttendance[teacher.id]?.status || ""}
                            onChange={(e) =>
                              handleTeacherChange(
                                teacher.id,
                                "status",
                                e.target.value
                              )
                            }
                            disabled={teacherAttendance[teacher.id]?.marked}
                            className={`select select-bordered w-full focus:outline-none text-nowrap border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${
                              teacherAttendance[teacher.id]?.marked
                                ? "bg-gray-300 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <option value="">-- Select Status --</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="present">Present</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTeacherSave(teacher)}
                            disabled={
                              teacherAttendance[teacher.id]?.marked ||
                              savingTeacher[teacher.id]
                            }
                            className={`btn w-28 ${
                              teacherAttendance[teacher.id]?.marked
                                ? "bg-gray-400 textTheme cursor-not-allowed"
                                : "bgTheme text-white"
                            }`}
                          >
                            {savingTeacher[teacher.id] ? (
                              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                            ) : null}
                            {teacherAttendance[teacher.id]?.marked
                              ? "Marked"
                              : savingTeacher[teacher.id]
                              ? " "
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                      >
                        No teachers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Save All */}
              <br />
              {filteredTeachers.length > 0 && (
                <div className="flex w-full justify-center mt-4">
                  <button
                    onClick={handleTeacherSaveAll}
                    className="btn bgTheme text-white w-40"
                  >
                    {savingAllTeachers && (
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    )}
                    {savingAllTeachers ? " " : "Save All"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* -------- STAFF ATTENDANCE TAB -------- */}
        {activeTab === "staff" && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">
              <i className="fa-solid fa-clipboard-user mr-2 text-3xl"></i>
              Office Staff Attendance
            </h1>

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
              <input
                type="text"
                placeholder="Search by name..."
                value={staffSearchTerm}
                onChange={(e) =>
                  setStaffSearchTerm(e.target.value.trimStart())
                }
                className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <Link
                to={allRouterLink.teacherAttendanceRecord /* change if you have separate staff attendance record route */}
                className="btn bgTheme text-white"
              >
                <i className="fa-solid fa-clipboard-list w-5"></i> Attendance
                Record
              </Link>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg mb-10">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 text-xs sm:text-sm">
                <thead className="bgTheme text-white z-2 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      S.NO
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Staff Name
                    </th>
                    <th className="px-4 py-3 text-center text-nowrap text-sm font-semibold">
                      Email
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
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((s, index) => (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50 text-nowrap dark:hover:bg-gray-700 text-center transition-colors"
                      >
                        <td className="px-4 py-3 text-nowrap text-gray-700 dark:text-gray-300">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-bold capitalize text-gray-700 dark:text-gray-300 text-nowrap">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="px-4 py-3 text-nowrap text-gray-700 dark:text-gray-300">
                          {s.email}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            disabled={staffAttendance[s.id]?.marked}
                            value={staffAttendance[s.id]?.date || ""}
                            onChange={(e) =>
                              handleStaffChange(s.id, "date", e.target.value)
                            }
                            max={new Date().toISOString().split("T")[0]}
                            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 p-1 rounded text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={staffAttendance[s.id]?.status || ""}
                            onChange={(e) =>
                              handleStaffChange(s.id, "status", e.target.value)
                            }
                            disabled={staffAttendance[s.id]?.marked}
                            className={`select select-bordered w-full focus:outline-none text-nowrap border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${
                              staffAttendance[s.id]?.marked
                                ? "bg-gray-300 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <option value="">-- Select Status --</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="present">Present</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleStaffSave(s)}
                            disabled={
                              staffAttendance[s.id]?.marked ||
                              savingStaff[s.id]
                            }
                            className={`btn w-28 ${
                              staffAttendance[s.id]?.marked
                                ? "bg-gray-400 textTheme cursor-not-allowed"
                                : "bgTheme text-white"
                            }`}
                          >
                            {savingStaff[s.id] ? (
                              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                            ) : null}
                            {staffAttendance[s.id]?.marked
                              ? "Marked"
                              : savingStaff[s.id]
                              ? " "
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                      >
                        No staff found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Save All */}
              <br />
              {filteredStaff.length > 0 && (
                <div className="flex w-full justify-center mt-4">
                  <button
                    onClick={handleStaffSaveAll}
                    className="btn bgTheme text-white w-40"
                  >
                    {savingAllStaff && (
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    )}
                    {savingAllStaff ? " " : "Save All"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Alert Modal (shared for both tabs) */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            <h3 className="font-bold text-lg">Staff Attendance</h3>
            <p className="py-4 capitalize">
              {alertMessage.split("\n").map((line, idx) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
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

export default TeacherAttendance;