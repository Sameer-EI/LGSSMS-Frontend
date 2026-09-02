import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  fetchStudentDashboard,
  fetchPeriodsByYearLevel,
} from "../../services/api/Api";
import LoginSuccessHandler from "../Modals/LoginSucces";

export const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [assignedPeriods, setAssignedPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { userID } = useContext(AuthContext);

  useEffect(() => {
    const getStudentDashboardData = async () => {
      try {
        const data = await fetchStudentDashboard(userID);
        setDashboardData(data);
        const yearLevelId = data?.children?.[0]?.year_level_id;

        if (yearLevelId) {
          const periodData = await fetchPeriodsByYearLevel(yearLevelId);
          setAssignedPeriods(periodData.assigned_periods || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    getStudentDashboardData();
  }, [userID]);

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

  const student = dashboardData?.children?.[0];

  if (!student) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        No student data available.
      </div>
    );
  }

 return (
  <div className="p-6 space-y-6 max-w-7xl mx-auto mb-24 md:mb-10">
    <LoginSuccessHandler />
    <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
      Student Dashboard
    </h2>

    <div className="rounded-lg shadow-md border dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="rounded-t-lg overflow-hidden">
        <div className="p-5 bgTheme text-white dark:bg-gray-900 flex items-center justify-between">
          <h3 className="text-2xl font-semibold uppercase dark:border-gray-600">
            {student.student_name}
          </h3>
          <p className="text-2xl font-semibold dark:border-gray-600">
            {student.class}
          </p>
        </div>

        {/* Daily Class Schedule Heading */}
        <div className="bg-white dark:bg-gray-800 textTheme dark:text-gray-300 px-5 py-2 border-t border-white dark:border-gray-700 flex justify-center">
          <h4 className="text-xl font-semibold tracking-wide uppercase">
            Daily Class Schedule
          </h4>
        </div>
      </div>

      {/* Assigned Periods Table */}
      {assignedPeriods.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left">
              <tr>
                <th className="px-5 py-3 border-b dark:border-gray-600">Subject</th>
                <th className="px-5 py-3 border-b dark:border-gray-600">Teacher</th>
                <th className="px-5 py-3 border-b dark:border-gray-600">Start Time</th>
                <th className="px-5 py-3 border-b dark:border-gray-600">End Time</th>
              </tr>
            </thead>
            <tbody>
              {assignedPeriods.map((period, index) => (
                <tr
                  key={index}
                  className=" text-gray-800 dark:text-gray-100 last:border-b-0"
                >
                  <td className="px-5 py-3">{period.subject}</td>
                  <td className="px-5 py-3">{period.teacher}</td>
                  <td className="px-5 py-3">{period.start_time}</td>
                  <td className="px-5 py-3">{period.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 text-center text-gray-500 dark:text-gray-400">
          No periods assigned for this class.
        </div>
      )}
    </div>
  </div>
);

};
