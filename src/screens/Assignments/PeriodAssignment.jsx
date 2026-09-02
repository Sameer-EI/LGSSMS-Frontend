import React, { useEffect, useState } from "react";
import { fetchPeriodsByYearLevel } from "../../services/api/Api";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const PeriodAssignment = () => {
  const { year_level_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const levelName = location.state?.level_name || "Selected Class";

  const [assignedPeriods, setAssignedPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getPeriods = async () => {
      if (!year_level_id) return;

      setLoading(true);
      setError("");
      try {
        const data = await fetchPeriodsByYearLevel(year_level_id);
        if (!data.assigned_periods || data.assigned_periods.length === 0) {
          setAssignedPeriods([]);
        } else {
          const sortedPeriods = [...data.assigned_periods].sort((a, b) =>
          a.subject.localeCompare(b.subject)
        );
          setAssignedPeriods(sortedPeriods);
        }
      } catch (err) {
        console.error("Failed to fetch periods:", err);
        setAssignedPeriods([]);
        setError("Failed to load data, Try Again");
      } finally {
        setLoading(false);
      }
    };

    getPeriods();
  }, [year_level_id]);

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

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 max-w-7xl p-6 rounded-lg shadow-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            <i className="fa-solid fa-table-list mr-2"></i>
            Assigned Periods - {levelName}
          </h1>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <thead className="bgTheme text-white text-left">
              <tr>
                <th className="px-4 py-3 text-nowrap">S.No</th>
                <th className="px-4 py-3 text-nowrap">Subject</th>
                <th className="px-4 py-3 text-nowrap">Teacher</th>
                <th className="px-4 py-3 text-nowrap">Start Time</th>
                <th className="px-4 py-3 text-nowrap">End Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {assignedPeriods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No Periods Assigned Yet.
                  </td>
                </tr>
              ) : (
                assignedPeriods.map((period, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <td className="px-4 py-3 text-nowrap">{index + 1}</td>
                    <td className="px-4 py-3 text-nowrap">{period.subject}</td>
                    <td className="px-4 py-3 text-nowrap">{period.teacher}</td>
                    <td className="px-4 py-3 text-nowrap">{period.start_time}</td>
                    <td className="px-4 py-3 text-nowrap">{period.end_time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PeriodAssignment;
