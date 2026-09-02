import React, { useState, useEffect } from "react";
import { fetchAbsentTeachers, assignSubstitute } from "../../services/api/Api";

const YEAR_LEVEL_MAP = {
  "Pre Nursery": 1,
  "Nursery": 2,
  "LKG": 3,
  "UKG": 4,
  "Class 1": 5,
  "Class 2": 6,
  "Class 3": 7,
  "Class 4": 8,
  "Class 5": 9,
  "Class 6": 10,
  "Class 7": 11,
  "Class 8": 12,
  "Class 9": 13,
  "Class 10": 14,
  "Class 11": 15,
  "Class 12": 16,
};


const TeacherSubstitute = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(false); // page loader
  const [submitLoading, setSubmitLoading] = useState(false); // modal submit loader
  const [error, setError] = useState(false); // fetch error
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const formatTeachers = (absentTeachers, date) => {
    return absentTeachers.map((item) => ({
      id: item.absent_teacher.id,
      first_name: item.absent_teacher.name.split(" ")[0],
      last_name: item.absent_teacher.name.split(" ")[1] || "",
      email: item.absent_teacher.email,
      phone_no: item.absent_teacher.phone_no || null,
      year_levels: item.periods.map((p) => {
        const normalized = p.year_level?.trim().toLowerCase();
        const yearLevelId = YEAR_LEVEL_MAP[normalized.charAt(0).toUpperCase() + normalized.slice(1)]
          || YEAR_LEVEL_MAP[p.year_level]
          || null;

        return {
          id: yearLevelId,
          level_name: p.year_level,
          periods: [
            {
              id: p.period_id,
              name: p.period_name,
              subject: p.subject,
              year_level_id: yearLevelId,
              same_class_free_teachers: p.same_class_free_teachers.map((ft) => ({
                ...ft,
                selected: false,
              })),
              other_class_free_teachers: p.other_class_free_teachers.map((ft) => ({
                ...ft,
                selected: false,
              })),
              showSameClass: true,
            },
          ],
        };
      }),
      attendance: {
        date,
        status: "absent",
      },
    }));
  };


  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        setError(false);
        const absentTeachers = await fetchAbsentTeachers(selectedDate);
        setTeachers(formatTeachers(absentTeachers, selectedDate));
      } catch (err) {
        console.error(err);
        setError(true);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [selectedDate]);

  const handleAssign = async (teacherId, period, substitute, closeModal = true) => {
    const payload = {
      absent_teacher: teacherId,
      substitute_teacher: substitute.id,
      period: period.name,
      date: selectedDate,
      year_level: Number(period.year_level_id),
    };

    try {
      await assignSubstitute(payload);
      if (closeModal) {
        setAlertMessage(
          `${substitute.first_name} ${substitute.last_name} assigned for ${period.name}`
        );
        setShowAlert(true);
        setSelectedTeacher(null);
      }
      const updatedTeachers = await fetchAbsentTeachers(selectedDate);
      setTeachers(formatTeachers(updatedTeachers, selectedDate));
    } catch (err) {
      console.error(err.response?.data || err);
      if (closeModal) {
        setAlertMessage(
          `Failed to assign substitute. ${err.response?.data?.detail || ""}`
        );
        setShowAlert(true);
      }
    }
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      `${teacher.first_name} ${teacher.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.year_levels.some((level) =>
        level.level_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );


  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-1">
            <i className="fa-solid fa-chalkboard-user"></i> Teacher Substitute
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col justify-between sm:flex-row items-start sm:items-center gap-4 mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
            />
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-gray-200 placeholder-gray-500 text-sm"
                placeholder="Search by teacher, email or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full max-h-[70vh] overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 text-xs sm:text-sm">
            <thead className="bgTheme text-white sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-nowrap text-sm font-semibold">Teacher</th>
                <th className="px-4 py-3 text-left text-nowrap text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-nowrap text-sm font-semibold">Classes</th>
                <th className="px-4 py-3 text-left text-nowrap text-sm font-semibold">Attendance Status</th>
                <th className="px-4 py-3 text-left text-nowrap text-sm font-semibold pl-12">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                        <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                      </div>
                      <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                        Loading data...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-bold capitalize text-nowrap">
                      {teacher.first_name} {teacher.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {teacher.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {teacher.year_levels.map((level) =>
                        level.periods.map((period) => (
                          <div key={period.id} className="ml-2 text-nowrap">
                            {level.level_name}: {period.name} ({period.subject})
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 text-nowrap">
                        {teacher.attendance.status} ({teacher.attendance.date})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setSelectedTeacher(teacher)}
                        className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 text-nowrap"
                      >
                        Assign Substitute
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    No matching teachers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal for Assign Substitute */}
        {selectedTeacher && (
          <dialog id="subModal" className="modal modal-open">
            <div className="modal-box w-full sm:max-w-3xl relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <button
                className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-bold text-xl"
                onClick={() => setSelectedTeacher(null)}
              >
                ×
              </button>

              <h3 className="font-bold text-lg mb-4">
                Assign Substitute for{" "}
                <span className="capitalize">
                  {selectedTeacher.first_name} {selectedTeacher.last_name}
                </span>
              </h3>

              {selectedTeacher.year_levels.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {selectedTeacher.year_levels.map((level) =>
                    level.periods.map((period) => (
                      <div
                        key={period.id}
                        className="border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {level.level_name} - {period.name} ({period.subject})
                          </p>
                          <label className="text-sm flex items-center gap-2">
                            Show Same Class Teachers
                            <input
                              type="checkbox"
                              checked={period.showSameClass}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updatedLevels = selectedTeacher.year_levels.map((lvl) => ({
                                  ...lvl,
                                  periods: lvl.periods.map((p) =>
                                    p.id === period.id ? { ...p, showSameClass: checked } : p
                                  ),
                                }));
                                setSelectedTeacher({
                                  ...selectedTeacher,
                                  year_levels: updatedLevels,
                                });
                              }}
                            />
                          </label>
                        </div>

                        {(period.showSameClass
                          ? period.same_class_free_teachers
                          : period.other_class_free_teachers
                        )?.length > 0 ? (
                          <ul className="mt-2 text-sm space-y-2">
                            {(period.showSameClass
                              ? period.same_class_free_teachers
                              : period.other_class_free_teachers
                            ).map((ft) => (
                              <li
                                key={ft.id}
                                className="flex items-center justify-between pb-1"
                              >
                                <div>
                                  <span className="capitalize">
                                    {ft.first_name} {ft.last_name}
                                  </span>{" "}
                                  ({ft.email})
                                </div>
                                <input
                                  type="checkbox"
                                  checked={ft.selected || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const updatedLevels = selectedTeacher.year_levels.map((lvl) => ({
                                      ...lvl,
                                      periods: lvl.periods.map((p) =>
                                        p.id === period.id
                                          ? {
                                            ...p,
                                            [period.showSameClass
                                              ? "same_class_free_teachers"
                                              : "other_class_free_teachers"]: p[
                                                period.showSameClass
                                                  ? "same_class_free_teachers"
                                                  : "other_class_free_teachers"
                                              ].map((t) =>
                                                t.id === ft.id ? { ...t, selected: checked } : t
                                              ),
                                          }
                                          : p
                                      ),
                                    }));

                                    setSelectedTeacher({
                                      ...selectedTeacher,
                                      year_levels: updatedLevels,
                                    });
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No free teachers available
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No periods assigned</p>
              )}

              <div className="modal-action">
                <button className="btn" onClick={() => setSelectedTeacher(null)}>
                  Close
                </button>

                <button
                  className="btn bgTheme text-white w-30"
                  onClick={async () => {
                    const assignments = [];

                    selectedTeacher.year_levels.forEach((level) => {
                      level.periods.forEach((period) => {
                        const source = period.showSameClass
                          ? period.same_class_free_teachers
                          : period.other_class_free_teachers;

                        source.forEach((ft) => {
                          if (ft.selected) {
                            assignments.push({ period, ft });
                          }
                        });
                      });
                    });

                    if (assignments.length === 0) {
                      setAlertMessage("No substitute teacher selected.");
                      setShowAlert(true);
                      return;
                    }

                    setSubmitLoading(true);
                    const results = [];
                    for (const item of assignments) {
                      try {
                        await handleAssign(selectedTeacher.id, item.period, item.ft, false);
                        results.push(
                          `${item.ft.first_name} ${item.ft.last_name} assigned for ${item.period.name}`
                        );
                      } catch (err) {
                        results.push(
                          `Failed to assign ${item.ft.first_name} ${item.ft.last_name} for ${item.period.name}`
                        );
                      }
                    }

                    setAlertMessage(results.join("\n"));
                    setShowAlert(true);
                    setSelectedTeacher(null);
                    setSubmitLoading(false);
                  }}
                >
                  {submitLoading && (
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  )}
                  {!submitLoading && "Submit"}
                </button>
              </div>
            </div>
          </dialog>
        )}

        {/* Alert Modal */}
        {showAlert && (
          <dialog className="modal modal-open">
            <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <h3 className="font-bold text-lg">Assign Substitute</h3>
              <p className="py-4 capitalize">
                {alertMessage.split("\n").map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
              <div className="modal-action">
                <button
                  className="btn bgTheme text-white w-30"
                  onClick={() => setShowAlert(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </dialog>
        )}
      </div>
    </div>
  );

};

export default TeacherSubstitute;
