import React from 'react';

const SingleTeacher = () => {
  const teacher = {
    id: 1,
    first_name: "ibrahim",
    last_name: "khan",
    email: "ibrahim@gmail.com",
    phone_no: "985321533",
    year_levels: [
      {
        id: 10,
        level_name: "Class 7",
        periods: []
      },
      {
        id: 15,
        level_name: "Class 12",
        periods: [
          {
            id: 26,
            name: "Period 1",
            subject: "Mathematics"
          }
        ]
      }
    ],
    attendance: {
      date: "2025-08-14",
      status: "not marked"
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-7 mb-24 md:mb-10">
      {/* Teacher Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {teacher.first_name} {teacher.last_name}
          </h1>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              {teacher.email}
            </div>
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {teacher.phone_no}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-500">Attendance for {teacher.attendance.date}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(teacher.attendance.status)}`}>
            {teacher.attendance.status}
          </span>
        </div>
      </div>

      {/* Classes and Periods Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Classes & Periods</h2>
        <div className="space-y-4">
          {teacher.year_levels.map((yearLevel) => (
            <div key={yearLevel.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-800">{yearLevel.level_name}</h3>
              </div>
              {yearLevel.periods.length > 0 ? (
                <ul className="divide-y">
                  {yearLevel.periods.map((period) => (
                    <li key={period.id} className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{period.name}</span>
                        <span className="text-gray-600 ml-2">- {period.subject}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No periods assigned for this class
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
          Edit Profile
        </button>
        <button className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700">
          Mark Attendance
        </button>
      </div>
    </div>
  );
};

export default SingleTeacher;