import { useNavigate } from 'react-router-dom'
import React, { useContext, useEffect, useState } from "react";
import { fetchTeacherDashboard } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";
import LoginSuccessHandler from '../Modals/LoginSucces';

// "arsalan ahmed" -> "Arsalan Ahmed"
const toTitleCase = (str = "") =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

const InfoRow = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <span className="w-36 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 textTheme rounded-full text-center">
      {label}
    </span>
    <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 textTheme rounded-full">
      {value}
    </span>
  </div>
);

export const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { userID } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userID) return;

    const getTeacherDashboardData = async () => {
      try {
        setLoading(true);
        setError(false);
        const data = await fetchTeacherDashboard(userID);
        setDashboardData(data);
      } catch (err) {
        console.log("Failed to fetch teacher dashboard data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    getTeacherDashboardData();
  }, [userID]);

  const handleShowAttendance = (className) => {
    navigate(`/studentAttendanceRegister`);
  };

  // Loader
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

  // Error UI
  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  const {
    teacher_name,
    total_assigned_classes,
    class_summary = [],
  } = dashboardData;

  return (
    <div className="p-4 space-y-6 mb-24 md:mb-10">
      <LoginSuccessHandler />

      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        {toTitleCase(teacher_name)}'s Dashboard
      </h3>

      <div className="text-center mb-6">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Total Assigned Classes: {total_assigned_classes ?? 0}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {class_summary.length > 0 ? (
          class_summary.map((detail) => (
            <div
              key={detail.level_name}
              className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700"
            >
              {/* Header */}
              <div className="p-4 bgTheme text-white">
                <h2 className="text-xl font-bold truncate">{detail.level_name}</h2>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <InfoRow label="Classroom" value={detail.room_name || "Not assigned"} />
                <InfoRow label="Student Count" value={detail.total_students ?? 0} />

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    className="btn bgTheme text-white m-1 transition-colors duration-300"
                    onClick={() => handleShowAttendance(detail.level_name)}
                  >
                    <i className="fa-solid fa-chalkboard-user mr-2" />
                    Full Attendance for {detail.level_name}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center col-span-full text-gray-500">
            No class details available.
          </div>
        )}
      </div>
    </div>
  );
};