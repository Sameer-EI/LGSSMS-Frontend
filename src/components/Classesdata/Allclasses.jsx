import React, { useEffect, useState } from "react";
import {
  fetchYearLevels,
  fetchStudentYearLevelByClass,
  fetchSchoolYear,
} from "../../services/api/Api";
import { Link } from "react-router-dom";

// Pick the session that contains today's date; fall back to the latest one.
const getDefaultSession = (schoolYears) => {
  if (!schoolYears.length) return "All";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current = schoolYears.find((y) => {
    const start = new Date(y.start_date);
    const end = new Date(y.end_date);
    return today >= start && today <= end;
  });
  if (current) return current.year_name;

  const latest = [...schoolYears].sort(
    (a, b) => new Date(b.start_date) - new Date(a.start_date)
  )[0];
  return latest.year_name;
};

const countOf = (data) => {
  if (Array.isArray(data)) return data.length;
  if (typeof data?.count === "number") return data.count;
  if (Array.isArray(data?.results)) return data.results.length;
  return 0;
};

const Allclasses = () => {
  const [yearLevels, setYearLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sessions now come from the API
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null); // null = sessions not loaded yet

  const sessionOptions = ["All", ...schoolYears.map((y) => y.year_name)];
  const selectedYear = schoolYears.find((y) => y.year_name === selectedSession);

  // 1) Load school years once
  useEffect(() => {
    let cancelled = false;

    const loadSchoolYears = async () => {
      try {
        const data = await fetchSchoolYear();
        const list = Array.isArray(data) ? data : data?.results || [];

        const sorted = [...list].sort(
          (a, b) => new Date(a.start_date) - new Date(b.start_date)
        );

        if (cancelled) return;
        setSchoolYears(sorted);
        setSelectedSession(getDefaultSession(sorted));
      } catch (err) {
        if (cancelled) return;
        setError("Failed to fetch sessions. Please try again later.");
        setLoading(false);
      }
    };

    loadSchoolYears();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load year levels + counts whenever the selected session changes
  useEffect(() => {
    if (selectedSession === null) return; // wait until sessions are ready

    let cancelled = false;

    const getYearLevels = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchYearLevels();

        const withCounts = await Promise.all(
          data.map(async (level) => {
            try {
              // Session filter goes to the API (no gender filter for counts)
              const students = await fetchStudentYearLevelByClass(
                level.id,
                selectedSession !== "All" ? selectedSession : null,
                null
              );

              return { ...level, student_count: countOf(students) };
            } catch (err) {
              console.error(
                `Error fetching students for level ${level.id}:`,
                err
              );
              return { ...level, student_count: 0 };
            }
          })
        );

        if (!cancelled) setYearLevels(withCounts);
      } catch (err) {
        console.error("Error fetching year levels:", err);
        if (!cancelled) {
          setError("Failed to fetch year levels. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getYearLevels();
    return () => {
      cancelled = true;
    };
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
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
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
            <label
              htmlFor="sessionFilter"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Session:
            </label>
            <select
              id="sessionFilter"
              value={selectedSession ?? "All"}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sessionOptions.map((session) => (
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
                <th scope="col" className="px-4 py-3 text-nowrap text-center">
                  S.NO
                </th>
                <th scope="col" className="px-4 py-3 text-nowrap text-center">
                  Year Level
                </th>
                <th scope="col" className="px-4 py-3 text-nowrap text-center">
                  Number Of Students
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {yearLevels.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
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
                      <Link
                        to={`/allStudentsPerClass/${record.id}`}
                        state={{
                          level_name: record.level_name,
                          year_level_name:
                            selectedSession !== "All" ? selectedSession : "",
                          level_id: record.id,
                          // use the level's own year_id if present, else the selected session's id
                          year_id: record.year_id ?? selectedYear?.id,
                        }}
                        className="textTheme hover:underline"
                      >
                        {record.level_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-nowrap">
                      {record.student_count}
                    </td>
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