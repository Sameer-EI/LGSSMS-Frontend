import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const ViewAllocatedClass = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [allocatedClasses, setAllocatedClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch Allocated Classes
  const fetchAllocatedClasses = async () => {
    try {
      const response = await axiosInstance.get("/t/teacheryearlevel/");
      setAllocatedClasses(response.data);
    } catch (err) {
      console.error("Failed to fetch allocated classes:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocatedClasses();
  }, []);

  const filteredClasses = allocatedClasses.filter(
    (classItem) =>
      classItem.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.year_level_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="p-6 min-h-screen bg-gray-100 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-1">
            <i className="fa-solid fa-landmark"></i> Allocated Classes
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">

          <input
            type="text"
            className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"

            placeholder="Search by teacher or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.trimStart())}
          />
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bgTheme text-white text-center">
              <tr>
                <th scope="col" className="px-4 py-3 text-nowrap">Teacher</th>
                <th scope="col" className="px-4 py-3 text-nowrap">Class</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length > 0 ? (
                [...filteredClasses]
                  .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name))
                  .map((classItem, index) => (
                    <tr
                      key={classItem.id || index}
                      className="hover:bg-gray-50  dark:hover:bg-gray-700"
                    >
                      <td className="px-4 py-3 font-bold text-nowrap text-center text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {classItem.teacher_name}
                      </td>
                      <td className="px-4 py-3 text-nowrap text-center text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {classItem.year_level_name}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No matching classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

};

export default ViewAllocatedClass;


