import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchYearLevels } from "../../services/api/Api";
import { Link } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";

const TimeTable = () => {
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchSubject, setSearchSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const { axiosInstance } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const [classData, timetableData] = await Promise.all([
          fetchYearLevels(),
          axiosInstance
            .get("/d/Exam-Schedule/get_timetable/")
            .then((res) => res.data),
        ]);
        setClasses(classData);
        setTimetable(timetableData);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [axiosInstance]);

  const formatTime = (time) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const calculateDuration = (start, end) => {
    const durationMs =
      new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`);
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    return `${hours ? `${hours} hr ` : ""}${
      minutes ? `${minutes} min` : ""
    }`.trim();
  };

  if (loading)
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

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );

  const filteredTimetable = timetable.filter(
    (cls) => !selectedClass || cls.class === selectedClass
  );

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-4 flex items-center justify-center gap-2">
          <i className="fa-solid fa-table-list text-4xl text-gray-800 dark:text-gray-100"></i>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Examination Schedule
          </h1>
        </div>

        {/* Filters - KEPT EXACTLY THE SAME */}
        <div className="flex flex-wrap justify-between items-end mb-4 border-b border-gray-300 dark:border-gray-700 pb-4 gap-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Class Filter */}
            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-sm font-medium mb-1">
                Filter by Class
              </label>
              <select
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.level_name}>
                    {cls.level_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-sm font-medium mb-1">
                Filter by Date:
              </label>
              <input
                type="date"
                className="input input-bordered w-full sm:w-48 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Reset Button */}
            <div className="mt-1 w-full sm:w-auto">
              <button
                className="btn bgTheme text-white"
                onClick={() => {
                  setSelectedDate("");
                  setSearchSubject("");
                  setSelectedClass("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Subject Search */}
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-sm font-medium mb-1">
              Search by Subject:
            </label>
            <input
              type="text"
              placeholder="Enter subject name"
              className="input input-bordered w-full sm:w-64 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value.trimStart())}
            />
          </div>
        </div>

        {/* Timetable - IMPROVED EDITION */}
        {filteredTimetable.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            No timetable available.
          </div>
        ) : (
          filteredTimetable.map((cls) => {
            const papers = cls.papers.filter(
              (paper) =>
                (!searchSubject ||
                  paper.subject_name
                    .toLowerCase()
                    .includes(searchSubject.toLowerCase())) &&
                (!selectedDate || paper.exam_date === selectedDate)
            );

            return (
              <div key={cls.id} className="mb-10">
                {/* Class Header with Better Edit Button Alignment */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                      {cls.class}
                    </h3>
                    <Link
                      className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                      to={allRouterLink.UpdateExamSchedule.replace(
                        ":id",
                        cls.id
                      )}
                    >
                      Edit
                    </Link>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Academic Year:</span>{" "}
                    {cls.term} |
                    <span className="font-medium ml-2">Exam Type:</span>{" "}
                    {cls.exam_type}
                  </div>
                </div>

                <div className="w-full overflow-x-auto rounded-lg no-scrollbar">
                  <div className="inline-block min-w-full align-middle">
                    <div className="shadow-sm rounded-lg overflow-hidden">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="bgTheme text-white">
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              Subject
                            </th>
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              Date
                            </th>
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              Day
                            </th>
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              Start Time
                            </th>
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              End Time
                            </th>
                            <th className="px-6 py-4 text-left text-nowrap text-sm font-semibold border-b-0">
                              Duration
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800">
                          {papers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center text-nowrap px-6 py-8 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700"
                              >
                                No papers found.
                              </td>
                            </tr>
                          ) : (
                            papers.map((p, idx) => {
                              const duration = calculateDuration(
                                p.start_time,
                                p.end_time
                              );
                              return (
                                <tr
                                  key={idx}
                                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    idx !== papers.length - 1
                                      ? "border-b border-gray-200 dark:border-gray-700"
                                      : ""
                                  }`}
                                >
                                  <td className="px-6 py-4 text-sm text-nowrap font-medium text-gray-900 dark:text-gray-100 capitalize">
                                    {p.subject_name}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nowrap text-gray-700 dark:text-gray-300">
                                    {new Date(p.exam_date).toLocaleDateString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                      {p.day}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nowrap text-gray-700 dark:text-gray-300">
                                    {formatTime(p.start_time)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nowrap text-gray-700 dark:text-gray-300">
                                    {formatTime(p.end_time)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                      {duration}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TimeTable;
