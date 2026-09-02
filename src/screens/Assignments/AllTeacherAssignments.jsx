import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchSubAssignments } from "../../services/api/Api";

const yearLevelMap = {
  1: "Pre Nursery",
  2: "Nursery",
  3: "LKG",
  4: "UKG",
  5: "Class 1",
  6: "Class 2",
  7: "Class 3",
  8: "Class 4",
  9: "Class 5",
  10: "Class 6",
  11: "Class 7",
  12: "Class 8",
  13: "Class 9",
  14: "Class 10",
  15: "Class 11",
  16: "Class 12",
};

export const AllTeacherAssignments = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [teacherAssignments, setTeacherAssignment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const [subAssignments, setSubAssignments] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState(false);

  const [activeTab, setActiveTab] = useState("teachers");

  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [absentTeacherFilter, setAbsentTeacherFilter] = useState("");


  // Teacher assignments fetched inside component
  const getAllTeacherAssignment = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await axiosInstance.get("/t/teacher/all-teacher-assignments/");
      setTeacherAssignment(res.data);
    } catch (err) {
      console.error("Failed to fetch all teacher assignments:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  console.log(teacherAssignments);

  // Substitute assignments fetched from API file
  const getSubAssignments = async () => {
    try {
      setSubLoading(true);
      setSubError(false);
      const res = await fetchSubAssignments();
      setSubAssignments(res);
    } catch {
      setSubError(true);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    getAllTeacherAssignment();
    getSubAssignments();
  }, []);

  // Search filter
  const filteredData = teacherAssignments.filter((assignment) =>
    assignment.teacher_name.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Date & Absent Teacher Filter 
  const filteredSubs = subAssignments
    .filter((a) => (dateFilter ? a.date === dateFilter : true))
    .filter((a) =>
      absentTeacherFilter
        ? a.absent_teacher_name
          .toLowerCase()
          .includes(absentTeacherFilter.toLowerCase())
        : true
    );


  // Loader and ErrorMessage same as before
  const Loader = ({ text = "Loading data..." }) => (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
        <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
      </div>
      <p className="mt-2 text-gray-500 text-sm">{text}</p>
    </div>
  );

  const ErrorMessage = ({ text = "Failed to load data, Try Again" }) => (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
      <p className="text-lg text-red-400 font-medium">{text}</p>
    </div>
  );

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 max-w-7xl p-6 rounded-lg shadow-lg mx-auto">
        {/* Tabs styled like AllStaff */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${activeTab === "teachers"
              ? "border-[#5E35B1] textTheme"
              : "border-transparent text-gray-600 dark:text-gray-300 hover:text-[#5E35B1]"
              }`}
          >
            <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i>{" "}
            Teacher Assignments
          </button>
          <button
            onClick={() => setActiveTab("substitutes")}
            className={`px-6 py-2 font-semibold rounded-t-lg border-b-2 ${activeTab === "substitutes"
              ? "border-[#5E35B1] textTheme"
              : "border-transparent text-gray-600 dark:text-gray-300 hover:text-[#5E35B1]"
              }`}
          >
            <i className="fa-solid fa-user-clock mr-2 text-3xl"></i>{" "}
            Substitute Assignments
          </button>
        </div>

        {/* Teacher Assignments */}
        {activeTab === "teachers" && (
          <>
            <div className="">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-6">
                <i className="fa-solid fa-person-chalkboard mr-2 text-3xl"></i>{" "}
                Teacher Assignments
              </h2>

              <div className="mb-4 flex justify-end border-b border-gray-900 dark:border-gray-600 pb-4">
                <div className="flex flex-col w-full sm:w-64">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Search By Teacher:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter teacher name..."
                    className="border px-3 py-2 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value.trimStart())}
                  />
                </div>
              </div>

            </div>

            {loading ? (
              <Loader text="Loading teacher assignments..." />
            ) : error ? (
              <ErrorMessage text="Failed to load teacher assignments, Try Again" />
            ) : filteredData.length === 0 ? (
              <ErrorMessage text="No assignments found" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {filteredData.map((data) => (
                  <div
                    key={data.teacher_id}
                    className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl bg-white dark:bg-gray-700"
                  >
                    <div className="p-4 bgTheme text-white flex justify-between items-center">
                      <h2 className="text-xl font-bold truncate capitalize">
                        {data.teacher_name}
                      </h2>
                      {data.assignments.length > 0 &&
                        data.assignments[0].year_level_name &&
                        data.assignments[0].year_level_name.trim() !== "" &&
                        data.assignments[0].year_level_name !== "Unassigned class" && (
                          <span className="text-sm bg-white textTheme px-2 py-1 rounded font-semibold capitalize">
                            {data.assignments[0].year_level_name}
                          </span>
                        )}
                    </div>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2 text-gray-800 dark:text-gray-100">
                        <span className="font-medium">Periods Assigned:</span>
                        <span className="font-bold">
                          {data.total_assigned_periods} / {data.max_periods_allowed}
                        </span>
                      </div>
                      <progress
                        className="progress progress-primary w-full"
                        value={data.total_assigned_periods}
                        max={data.max_periods_allowed}
                      />
                    </div>

                    {data.assignments.length > 0 ? (
                      <div className="p-4">
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {data.assignments
                            .flatMap((assignment) =>
                              assignment.periods.map((period) => ({
                                ...period,
                                // Use period.year_level_name directly since it's already in the period object
                              }))
                            )
                            .map((period, idx2) => (
                              <li
                                className="bg-gray-100 dark:bg-gray-600 p-3 rounded-md border border-gray-200 dark:border-gray-500 flex justify-between"
                                key={idx2}
                              >
                                <div>
                                  <div className="font-medium text-gray-800 dark:text-gray-100">
                                    {period.subject_name}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {period.period_name}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                                    {period.year_level_name || 'Unknown Class'}
                                  </div>
                                </div>
                                <div className="text-right text-sm font-semibold text-purple-600">
                                  {period.start_time} - {period.end_time}
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : (
                      <ErrorMessage text="No current assignments" />
                    )}

                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Substitute Assignments */}
        {activeTab === "substitutes" && (
          <>
            <div className="">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-6">
                <i className="fa-solid fa-user-clock mr-2 text-3xl"></i>{" "}
                Substitute Assignments
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-gray-900 dark:border-gray-600 pb-4">
                <div className="flex flex-col w-full sm:w-64">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Search By Date:
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border px-3 py-2 rounded shadow-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
                <div className="flex flex-col w-full sm:w-64">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Search By Absent Teacher:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter teacher name..."
                    value={absentTeacherFilter}
                    onChange={(e) => setAbsentTeacherFilter(e.target.value.trimStart())}
                    className="border px-3 py-2 rounded shadow-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

            </div>
            <br />
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-200">
                <thead className="bgTheme text-white text-sm uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 w-[20%] text-nowrap">Date</th>
                    <th className="px-6 py-3 w-[20%] text-nowrap">Absent Teacher</th>
                    <th className="px-6 py-3 w-[20%] text-nowrap">Class</th>
                    <th className="px-6 py-3 w-[20%] text-nowrap">Period</th>
                    <th className="px-6 py-3 w-[20%] text-nowrap">Substitute Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {subLoading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <Loader text="Loading substitute assignments..." />
                      </td>
                    </tr>
                  ) : subError ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-red-500">
                        Failed to load substitute assignments, Try Again
                      </td>
                    </tr>
                  ) : filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No substitute assignments found for this date
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-gray-50  dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <td className="px-6 py-3 text-nowrap">{a.date}</td>
                        <td className="px-6 py-3 capitalize text-nowrap">{a.absent_teacher_name}</td>
                        <td className="px-6 py-3 text-nowrap">
                          {yearLevelMap[a.year_level] || `Class ${a.year_level}`}
                        </td>
                        <td className="px-6 py-3 text-nowrap capitalize">{a.period}</td>
                        <td className="px-6 py-3 capitalize text-nowrap">{a.substitute_teacher_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};