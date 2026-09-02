import React, { useEffect, useState } from "react";
import { fetchAllTeacherClasses } from "../../services/api/Api";
import { useNavigate } from "react-router-dom";

export const Attendance = () => {
  const navigate = useNavigate();
  const [classList, setClassList] = useState([]);
  const [teacherID, setTeacherID] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("teacher_id");
    setTeacherID(token);
  }, []);

  const getAllTeacherStudents = async () => {
    if (!teacherID) return;
    setLoading(true);
    setError(false);

    try {
      const data = await fetchAllTeacherClasses(teacherID);
      setClassList(data);
    } catch (err) {
      console.log("failed to get all teacher students", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllTeacherStudents();
  }, [teacherID]);

  const handleNavigate = (className, yearLevelId) => {
    navigate(`/classStudents/${className}/${yearLevelId}`);
  };

  const handleShowAttendance = (className) => {
    navigate(`/fullAttendance/${className}`);
  };

  // Loader UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-300 text-sm">Loading data...</p>
      </div>
    );
  }

  // Error UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center p-6 transition-colors duration-300">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 dark:text-red-300 mb-4"></i>
        <p className="text-lg text-red-400 dark:text-red-300 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  // Main content
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300 mb-24 md:mb-10">
      <h2 className="text-4xl font-semibold mb-6 text-center text-gray-800 dark:text-white">
        Attendance <i className="fa-solid fa-clipboard-user ml-2"></i>
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classList.map((classItem) => (
          <div
            key={classItem.teacher_year_level_id}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 max-w-md mx-auto"
          >
            {/* Header gradient line */}
            <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#5E35B1] via-[#684d9e] to-[#5424b4]"></div>

            <div className="p-6">
              {/* Logo + class name */}
              <div className="flex items-start mb-5">
                <div className="p-3 rounded-xl bg-blue-100/50 dark:bg-blue-900/30 text-purple-700 dark:text-purple-300">
                  <i className="fa-solid fa-chalkboard-user text-xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white ml-4 mt-1">
                  {classItem.year_level_name}
                </h3>
              </div>

              {/* Info chips */}
              <div className="flex gap-4 mb-6 text-sm">
                <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center">
                  <i className="fa-solid fa-users mr-2"></i>
                  students
                </span>
                <span className="px-3 py-1.5 bg-blue-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center">
                  <i className="fa-solid fa-calendar-day mr-2"></i>
                  Mon/Wed/Fri
                </span>
              </div>

              {/* Buttons */}
              <div className="space-y-3 flex justify-around flex-wrap">
                <button
                  onClick={() =>
                    handleNavigate(classItem.year_level_name, classItem.year_level_id)
                  }
                  className="btn bgTheme text-white m-1 transition-colors duration-300"
                >
                  <i className="fa-solid fa-pen-clip mr-3"></i>
                  Take Attendance
                  <i className="fa-solid fa-arrow-right ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                </button>

                <button
                  onClick={() => handleShowAttendance(classItem.year_level_name)}
                  className="btn bgTheme text-white m-1 transition-colors duration-300"
                >
                  <i className="fa-solid fa-list-check mr-3"></i>
                  Show Attendance
                  <i className="fa-solid fa-arrow-right ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
