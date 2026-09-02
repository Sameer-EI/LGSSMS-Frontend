import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchAttendance } from "../../services/api/Api";

const MyAttendance = () => {
  const { studentID } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [2023, 2024, 2025];

  const GetAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetchAttendance(studentID, month, year);
      console.log("Fetched attendance:", res);
      setData(res);
    } catch (err) {
      console.error("Attendance fetch error:", err);
      setError("Failed to fetch attendance. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentID) {
      GetAttendance();
    }
  }, [studentID, month, year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <i className="fa-solid fa-spinner fa-spin mr-2 text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          <i className="fa-solid fa-calendar-check mr-2"></i> My Attendance
        </h1>

        {/* Filters */}
        <div className="flex gap-4 justify-center mb-6">
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-red-600 text-center mb-4 font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1400px] table-auto border border-gray-300 rounded-lg overflow-hidden">
            <thead className="bgTheme text-white">
              <tr>
                {data.length > 0 &&
                  Object.keys(data[0]).map((key, i) => (
                    <th key={i} className="px-4 py-3 text-left  text-nowrap">
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="100%" className="text-center py-6 text-gray-500">
                    No attendance data found.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="hover:bg-blue-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-3 text-nowrap">
                        {value}
                      </td>
                    ))}
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

export default MyAttendance;  