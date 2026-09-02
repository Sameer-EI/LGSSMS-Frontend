import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStudentYearLevelByClass } from "../../services/api/Api";
import axios from "axios";
import { constants } from "../../global/constants";

export const ClassStudent = () => {
  const { classLevel, Year_level_id } = useParams();
  const [classStudent, setClassStudent] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("present");
  const [individualDates, setIndividualDates] = useState({});
  const [individualStatuses, setIndividualStatuses] = useState({});
  const [teacherID, setTeacherID] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);


  // Alert modal states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const year_level_id = Year_level_id;
  const BASE_URL = constants.baseUrl;

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("teacher_id");
    setTeacherID(token);
  }, []);

  const getClassStudents = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchStudentYearLevelByClass(year_level_id);
      setClassStudent(data);
      const initialDates = {};
      const initialStatuses = {};
      data.forEach((student) => {
        initialDates[student.student_id] = "";
        initialStatuses[student.student_id] = "present";
      });
      setIndividualDates(initialDates);
      setIndividualStatuses(initialStatuses);
    } catch (err) {
      console.error("Failed to fetch students", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getClassStudents();
  }, [classLevel]);

  const handleStudentSelect = (studentId, isChecked) => {
    if (isChecked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(
        selectedStudents.filter((student_id) => student_id !== studentId)
      );
    }
  };

  const handleBulkAttendance = () => {
    if (selectedStudents.length >= 2) {
      setShowModal(true);
    }
  };

  const handleIndividualDateChange = (studentId, date) => {
    setIndividualDates((prev) => ({
      ...prev,
      [studentId]: date,
    }));
  };

  const handleIndividualStatusChange = (studentId, status) => {
    setIndividualStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const submitBulkAttendance = async () => {
    if (!attendanceDate) {
      setAlertMessage("Please select a date");
      setShowAlert(true);
      return;
    }
    if (!teacherID || !year_level_id) return;

    setLoadingSubmit(true); // start loader
    try {
      const payload = { teacher_id: teacherID, marked_at: attendanceDate, year_level_id };

      if (attendanceStatus === "present") payload.P = selectedStudents;
      else if (attendanceStatus === "absent") payload.A = selectedStudents;
      else if (attendanceStatus === "leave") payload.L = selectedStudents;

      await axios.post(`${BASE_URL}/a/multiple-attendance/`, payload);

      setSelectedStudents([]);
      setShowModal(false);
      setAttendanceDate("");
      setAttendanceStatus("present");

      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
      });

      setAlertMessage("Attendance marked successfully!");
      setShowAlert(true);
    } catch (err) {
      console.error("Error submitting bulk attendance:", err);
      setAlertMessage(err.response?.data?.error || "An error occurred");
      setShowAlert(true);
    } finally {
      setLoadingSubmit(false); // stop loader
    }
  };



  // Individual attendance submission
  const submitIndividualAttendance = async (studentId) => {
    try {
      if (!individualDates[studentId]) {
        setAlertMessage("Please select a date");
        setShowAlert(true);
        return;
      }
      if (!teacherID) return;

      const payload = { teacher_id: teacherID, marked_at: individualDates[studentId], year_level_id };
      const status = individualStatuses[studentId];
      if (status === "present") payload.P = [studentId];
      else if (status === "absent") payload.A = [studentId];
      else if (status === "leave") payload.L = [studentId];

      await axios.post(`${BASE_URL}/a/multiple-attendance/`, payload);

      setAlertMessage("Attendance marked successfully!");
      setShowAlert(true);
    } catch (err) {
      console.error("Error submitting individual attendance:", err);
      setAlertMessage(err.response?.data?.error || "An error occurred");
      setShowAlert(true);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Loader UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full [animation-delay:-0.2s] animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full [animation-delay:-0.4s] animate-bounce"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-300 text-sm">Loading data...</p>
      </div>
    );
  }

  // Error UI
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

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-4 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 text-center mb-1">
            <i className="fa-solid fa-clipboard-user ml-2"></i> Students in {classLevel}{" "}
          </h1>
        </div>

        {selectedStudents.length >= 2 && (
          <button
            onClick={handleBulkAttendance}
            className="mb-4 bgTheme text-white font-medium py-2 px-4 rounded-md transition duration-300"
          >
            Mark Attendance for Selected ({selectedStudents.length})
          </button>
        )}

        {classStudent.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bgTheme text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-nowrap">Select</th>
                  <th className="px-4 py-3 text-left text-nowrap">Student Name</th>
                  <th className="px-4 py-3 text-left text-nowrap">Level</th>
                  <th className="px-4 py-3 text-left text-nowrap">Academic Year</th>
                  <th className="px-4 py-3 text-left text-nowrap">Date</th>
                  <th className="px-4 py-3 text-left text-nowrap">Attendance</th>
                  <th className="px-4 py-3 text-left text-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {classStudent.map((student) => (
                  <tr key={student.id} className="even:bg-gray-50 dark:even:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        onChange={(e) =>
                          handleStudentSelect(student.student_id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-nowrap text-gray-800 dark:text-gray-200">{student.student_name}</td>
                    <td className="px-4 py-3 text-nowrap text-gray-800 dark:text-gray-200">{student.level_name}</td>
                    <td className="px-4 py-3 text-nowrap text-gray-800 dark:text-gray-200">{student.year_name}</td>
                    <td className="px-4 py-3 text-nowrap">
                      <input
                        type="date"
                        value={individualDates[student.student_id] || ""}
                        onChange={(e) =>
                          handleIndividualDateChange(student.student_id, e.target.value)
                        }
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        max={getTodayDate()}
                      />
                    </td>
                    <td className="px-4 py-3 text-nowrap">
                      <select
                        value={individualStatuses[student.student_id] || "present"}
                        onChange={(e) =>
                          handleIndividualStatusChange(student.student_id, e.target.value)
                        }
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => submitIndividualAttendance(student.student_id)}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800"
                        disabled={!individualDates[student.student_id]}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk attendance modal */}
      {showModal && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Mark Attendance for {selectedStudents.length} Students
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                required
                max={getTodayDate()}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkAttendance}
                className="btn bgTheme text-white flex items-center justify-center w-40"
                disabled={!attendanceDate || loadingSubmit}
              >
                {loadingSubmit && <i className="fa-solid fa-spinner fa-spin mr-2"></i>}
                <span>{loadingSubmit ? "" : "Mark Attendance"}</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Alert modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            <h3 className="font-bold text-lg">Teacher Attendance</h3>
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
