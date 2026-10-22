import React, { useEffect, useState } from "react";
import {
  fetchYearLevels,
  fetchSchoolYear,
  fetchSubjectMatrix,
} from "../../services/api/Api";

const PeriodsByClass = () => {
  const [yearLevels, setYearLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");

  const [matrixData, setMatrixData] = useState(null);

  const [loading, setLoading] = useState(true); // initial page load
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matrixError, setMatrixError] = useState(null);

  // 1. Initial load: year levels + school years
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [levels, years] = await Promise.all([
          fetchYearLevels(),
          fetchSchoolYear().catch(() => []),
        ]);

        setYearLevels(levels);
        setSchoolYears(years);
        if (levels.length > 0) setSelectedClassId(String(levels[0].id));
        if (years.length > 0) {
          setSelectedSchoolYear(
            String(years[years.length - 1].year_name ?? ""),
          );
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError("Failed to fetch year levels. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Fetch matrix whenever class (or school year) changes
  useEffect(() => {
    if (!selectedClassId) return;

    let cancelled = false; // ignore stale responses if user switches quickly

    const loadMatrix = async () => {
      setMatrixLoading(true);
      setMatrixError(null);
      try {
        const data = await fetchSubjectMatrix(
          selectedClassId,
          selectedSchoolYear,
        );
        if (!cancelled) setMatrixData(data);
      } catch (err) {
        if (!cancelled) {
          setMatrixData(null);
          setMatrixError("Failed to load subject matrix.");
        }
      } finally {
        if (!cancelled) setMatrixLoading(false);
      }
    };

    loadMatrix();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, selectedSchoolYear]);

  const selectedClassName =
    matrixData?.year_level_name ||
    yearLevels.find((y) => String(y.id) === String(selectedClassId))
      ?.level_name ||
    "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading year levels...</p>
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
      <div
        id="allocation-card"
        className="bg-white dark:bg-gray-800 p-6 max-w-7xl rounded-lg shadow-lg mx-auto"
      >
        {/* Top filters: class (left) and school year (right) */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="select select-bordered dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none"
          >
            {yearLevels.map((y) => (
              <option key={y.id} value={y.id}>
                {y.level_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
            className="select select-bordered dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none"
          >
            {schoolYears.map((sy) => (
              <option key={sy.id} value={sy.year_name}>
                {sy.year_name}
              </option>
            ))}
          </select>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold textTheme">
            Subject Matrix: {selectedClassName}
          </h2>
          {matrixData?.total_allocated_periods !== undefined && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {matrixData.total_allocated_periods} periods / week
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full table-auto border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <thead className="bgTheme text-white text-left">
              <tr>
                <th className="px-4 py-3 text-xs uppercase text-nowrap">
                  Subject Name
                </th>
                <th className="px-4 py-3 text-xs uppercase text-nowrap">
                  Assigned Teacher
                </th>
                <th className="px-4 py-3 text-xs uppercase text-nowrap text-center">
                  Weekly Allocation (This Class)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {matrixLoading ? (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : matrixError ? (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-red-500">
                    {matrixError}
                  </td>
                </tr>
              ) : !matrixData?.matrix?.length ? (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    No data found.
                  </td>
                </tr>
              ) : (
                matrixData.matrix.map((row) => (
                  <tr
                    key={`${row.subject_id}-${row.teacher_id}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 font-bold textTheme text-nowrap">
                      {row.subject_name}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                      {row.teacher_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-md border border-purple-200 bg-purple-50 textTheme text-sm text-nowrap dark:bg-gray-700 dark:border-gray-600">
                        {row.weekly_periods_count} Periods / Week in{" "}
                        {matrixData.year_level_name}
                      </span>
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

export default PeriodsByClass;
