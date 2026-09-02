import React, { useEffect, useState } from "react";
import { fetchYearLevels, fetchStudentYearLevelByClass } from "../../services/api/Api";
import { Link } from "react-router-dom";

const SESSION_OPTIONS = ["All", "2025-2026", "2026-2027"];

const getCurrentAcademicSession = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const session = `${startYear}-${startYear + 1}`;
  return SESSION_OPTIONS.includes(session)
    ? session
    : SESSION_OPTIONS.find((option) => option !== "All") || "All";
};

const Allclasses = () => {
  const [yearLevels, setYearLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(getCurrentAcademicSession());

  const getYearLevels = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchYearLevels();

      const withCounts = await Promise.all(
        data.map(async (level) => {
          try {
            // Fetch students with session filter from API (no gender filter for counts)
            const filteredStudents = await fetchStudentYearLevelByClass(
              level.id, 
              selectedSession !== "All" ? selectedSession : null,
              null // No gender filter for counts
            );

            return {
              ...level,
              student_count: filteredStudents.length,
            };
          } catch (err) {
            console.error(`Error fetching students for level ${level.id}:`, err);
            return {
              ...level,
              student_count: 0,
            };
          }
        })
      );

      setYearLevels(withCounts);
    } catch (err) {
      console.error("Error fetching year levels:", err);
      setError("Failed to fetch year levels. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getYearLevels();
  }, [selectedSession]);

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

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 p-6 max-w-7xl mx-auto rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            <i className="fa-solid fa-graduation-cap mr-2" />
            All Year Levels
          </h1>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <label htmlFor="sessionFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Session:
            </label>
            <select
              id="sessionFilter"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SESSION_OPTIONS.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar rounded-lg max-h-[70vh]">
          <table className="min-w-full table-auto">
            <thead className="bgTheme text-white sticky top-0 z-10 text-sm">
              <tr>
                <th scope="col" className="px-4 py-3 text-nowrap text-center">S.NO</th>
                <th scope="col" className="px-4 py-3 text-nowrap text-center">Year Level</th>
                <th scope="col" className="px-4 py-3 text-nowrap text-center">Number Of Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {yearLevels.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No data found.
                  </td>
                </tr>
              ) : (
                yearLevels.map((record, index) => (
                  <tr
                    key={record.id || index}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-nowrap text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-nowrap text-center capitalize">
                      {/* <Link
                        to={`/allStudentsPerClass/${record.id}`}
                        state={{ 
                          level_name: record.level_name,
                          year_level_name: selectedSession !== "All" ? selectedSession : ""
                        }}
                        className="textTheme hover:underline"
                      >
                        {record.level_name}
                      </Link> */}
                      <Link
  to={`/allStudentsPerClass/${record.id}`}
  state={{ 
    level_name: record.level_name,
    year_level_name: selectedSession !== "All" ? selectedSession : "",
    level_id: record.id,
    year_id: record.year_id // Make sure this is available in your data
  }}
  className="textTheme hover:underline"
>
  {record.level_name}
</Link>
                    </td>
                    <td className="px-4 py-3 text-center text-nowrap">{record.student_count}</td>
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

export default Allclasses;