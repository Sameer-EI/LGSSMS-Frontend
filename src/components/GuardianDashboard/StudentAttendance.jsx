import React, { useEffect, useState } from 'react';
import { getAttendanceByGuardianId } from '../../services/api/Api';

const StudentAttendance = ({ guardianId }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const attendanceData = await getAttendanceByGuardianId(guardianId);
        setData(attendanceData);


        const keys = new Set();
        attendanceData.forEach(item => {
          Object.keys(item).forEach(key => keys.add(key));
        });
        setColumns(Array.from(keys));
      } catch (error) {
        console.error("Failed to load attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [guardianId]);

  return (
    <div className="p-5 bg-gray-50 min-h-screen mb-24 md:mb-10">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-screen">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          <i className="fa-solid fa-chalkboard-user mr-2 " />
          Attendance Report
        </h1>
        <div className='overflow-x-auto'>
          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <i className="fa-solid fa-spinner fa-spin mr-2 text-4xl" />
            </div>

          ) : (
            <table className="min-w-full table-auto rounded-lg overflow-hidden border border-gray-200">
              <thead className="bgTheme text-white">
                <tr>
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-nowrap text-left whitespace-nowrap font-semibold"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition">
                    {columns.map((col, i) => (
                      <td key={i} className="px-4 py-3 text-nowrap text-sm text-center text-gray-700">
                        {row[col] ?? '--'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
