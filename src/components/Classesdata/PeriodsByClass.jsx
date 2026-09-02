import React, { useEffect, useState } from "react";
import { fetchYearLevels } from "../../services/api/Api";
import { Link } from "react-router-dom";

const PeriodsByClass = () => {
  const [yearLevels, setYearLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getYearLevels = async () => {
    setLoading(true);
    try {
      const data = await fetchYearLevels();
      console.log("Fetched year levels:", data);
      setYearLevels(data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
      setError("Failed to fetch year levels. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getYearLevels();
  }, []);

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
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 p-6 max-w-7xl rounded-lg shadow-lg mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-gray-100 border-b pb-4">
          <i className="fa-solid fa-graduation-cap mr-2"></i> Periods By Class
        </h1>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-center mb-4 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto text-center">
          <table className="min-w-full table-auto border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <thead className="bgTheme text-white text-center">
              <tr>
                <th scope="col" className="px-4 py-3 text-nowrap">S.NO</th>
                <th scope="col" className="px-4 py-3 text-nowrap">Year Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {yearLevels.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center text-nowrap py-6 text-gray-500 dark:text-gray-400">
                    No data found.
                  </td>
                </tr>
              ) : (
                yearLevels.map((record, index) => (
                  <tr
                    key={record.id || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                  >
                    <td className="px-4 py-3 text-nowrap text-gray-800 dark:text-gray-100">{index + 1}</td>
                    <td className="px-4 py-3 text-nowrap font-bold">
                      <Link
                        to={`/periodAssignment/${record.id}`}
                        state={{ level_name: record.level_name }}
                        className="textTheme hover:underline"
                      >
                        {record.level_name}
                      </Link>
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
