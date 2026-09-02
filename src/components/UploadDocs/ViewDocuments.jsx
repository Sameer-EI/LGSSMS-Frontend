import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { constants } from "../../global/constants";
import { AuthContext } from "../../context/AuthContext";
import { allRouterLink } from "../../router/AllRouterLinks";
import { useNavigate } from "react-router-dom";

export const ViewDocuments = () => {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedClass, setSelectedClass] = useState("All");
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [viewOption, setViewOption] = useState("my");
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // Logged‑in user info
  const studentId = localStorage.getItem("studentId");
  const guardianId = localStorage.getItem("guardianId");
  const teacherId = localStorage.getItem("teacherId");
  const officeStaffId = localStorage.getItem("officeStaffId");
  const userRole = localStorage.getItem("userRole");

  const fetchTeacherYearLevel = async () => {
    try {
      const response = await axiosInstance.get("/t/teacheryearlevel/");
      return response.data;
    } catch (error) {
      console.error("Error fetching teacher year level:", error);
      throw error;
    }
  };

  // Fetch documents with pagination
  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const offset = (page - 1) * pageSize;
      const response = await axiosInstance.get(
        `/d/Document/?limit=${pageSize}&offset=${offset}`
      );
      const data = response.data;

      if (data && data.results) {
        setDetails(data.results);
        setTotalCount(data.count);
        setNextUrl(data.next);
        setPrevUrl(data.previous);
      } else if (Array.isArray(data)) {
        // fallback for non‑paginated response (shouldn't happen)
        setDetails(data);
        setTotalCount(data.length);
        setNextUrl(null);
        setPrevUrl(null);
      } else {
        setDetails([]);
        setTotalCount(0);
      }

      if (userRole === "teacher") {
        const classes = await fetchTeacherYearLevel(teacherId);
        setTeacherClasses((classes || []).map((c) => c.year_level_name));
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and page changes
  useEffect(() => {
    fetchDocuments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchDocuments(newPage);
    }
  };

  const goToNextPage = () => {
    if (nextUrl) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchDocuments(newPage);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading documents...</p>
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

  if (details.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No documents available.
        </p>
      </div>
    );
  }

  const hasData = details.length > 0;

  const allDocTypes = [
    ...new Set(
      details.flatMap((d) =>
        (d?.document_types_read || []).map((dt) =>
          (dt?.name || "").toLowerCase()
        )
      )
    ),
  ].filter(Boolean);

  const getRole = (doc) => {
    if (doc.student_id) return "Student";
    if (doc.guardian_id) return "Guardian";
    if (doc.office_staff_id) return "Office Staff";
    if (doc.teacher_id) return "Teacher";
    return "Unknown";
  };

  // Group by person and accumulate docs by doc type
  const grouped = {};
  details.forEach((doc) => {
    const role = getRole(doc);
    const name =
      doc.student_name ||
      doc.guardian_name ||
      doc.office_staff_name ||
      doc.teacher_name;
    const yearLevel = doc.year_level || "N/A";
    const key = `${role}-${name}-${yearLevel}`;

    if (!grouped[key]) grouped[key] = { name, role, yearLevel, docs: {} };

    const fileUrls = (doc.files || []).map((file) =>
      (file?.file || "").replace(
        "http://localhost:8000",
        `${constants.baseUrl}`
      )
    );

    (doc?.document_types_read || []).forEach((dt) => {
      const type = (dt?.name || "").toLowerCase();
      if (!type) return;

      if (!grouped[key].docs[type]) grouped[key].docs[type] = [];
      grouped[key].docs[type] = Array.from(
        new Set([...grouped[key].docs[type], ...fileUrls])
      );
    });
  });

  const allClasses = [
    "All",
    ...new Set(
      details
        .filter((d) => d.student_id && d.year_level)
        .map((d) => d.year_level)
    ),
  ];

  // Filter data according to user role/view (client‑side)
  const filteredData = Object.values(grouped)
    .map((person) => {
      let match;

      if (userRole === "student") {
        match = details.find(
          (d) =>
            d.student_id &&
            d.student_id.toString() === studentId &&
            d.student_name === person.name
        );
        if (person.role === "Student" && match) {
          return { ...person, scholar_number: match.scholar_number };
        }
        return null;
      }

      if (userRole === "guardian") {
        match = details.find(
          (d) =>
            d.guardian_id &&
            d.guardian_id.toString() === guardianId &&
            d.guardian_name === person.name
        );
        if (person.role === "Guardian" && match) {
          return { ...person, scholar_number: match.scholar_number };
        }
        return null;
      }

      if (userRole === "teacher") {
        if (viewOption === "my") {
          match = details.find(
            (d) =>
              d.teacher_id &&
              d.teacher_id.toString() === teacherId &&
              d.teacher_name === person.name
          );
          if (person.role === "Teacher" && match) {
            return { ...person };
          }
          return null;
        } else if (viewOption === "assigned") {
          if (
            person.role === "Student" &&
            teacherClasses.includes(person.yearLevel)
          ) {
            match = details.find((d) => d.student_name === person.name);
            return { ...person, scholar_number: match?.scholar_number };
          }
          return null;
        }
      }

      if (userRole === "officestaff") {
        match = details.find(
          (d) =>
            d.office_staff_id &&
            d.office_staff_id.toString() === officeStaffId &&
            d.office_staff_name === person.name
        );
        if (person.role === "Office Staff" && match) {
          return { ...person };
        }
        return null;
      }

      // Director/Admin or other privileged roles
      const roleMatch = selectedRole === "All" || person.role === selectedRole;
      const classMatch =
        selectedRole === "Student"
          ? selectedClass === "All" || person.yearLevel === selectedClass
          : true;

      if (roleMatch && classMatch) {
        if (person.role === "Student") {
          match = details.find((d) => d.student_name === person.name);
          return { ...person, scholar_number: match?.scholar_number };
        }
        return { ...person };
      }

      return null;
    })
    .filter(Boolean);

  const filterBysearch = filteredData.filter((detail) =>
    (detail.name || "").toLowerCase().includes(searchInput.toLowerCase())
  );

  const showClassColumn = userRole !== "student" && selectedRole === "Student";
  const baseCols = 3; // Scholar No., Name, Role
  const colSpan = allDocTypes.length + baseCols + (showClassColumn ? 1 : 0);

  // Pagination info
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
            <i className="fa-solid fa-folder-open"></i> Uploaded Documents
          </h1>
        </div>

        {/* Teacher options */}
        {userRole === "teacher" && (
          <div className="mb-4 flex gap-4 items-center border-b dark:border-gray-700 pb-2">
            <div>
              <select
                value={viewOption}
                onChange={(e) => setViewOption(e.target.value)}
                className="border p-2 rounded bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value="my">My Documents</option>
                <option value="assigned">Assigned Class Documents</option>
              </select>
            </div>
          </div>
        )}

        {/* Admin filters */}
        {userRole !== "student" &&
          userRole !== "guardian" &&
          userRole !== "teacher" &&
          userRole !== "officestaff" && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b dark:border-gray-700 pb-4">
              {/* Role Selector */}
              <div className="flex flex-col w-full sm:w-1/4">
                <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setSelectedClass("All");
                  }}
                  className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
                >
                  <option value="All">Select Role</option>
                  <option value="Student">Student</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Office Staff">Office Staff</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>

              {/* Class Selector (only for Students) */}
              {selectedRole === "Student" && (
                <div className="flex flex-col w-full sm:w-1/4">
                  <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
                  >
                    {allClasses.map((cls, idx) => (
                      <option key={idx} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="w-full flex justify-start">
                <button
                  onClick={() => {
                    setSelectedRole("All");
                    setSelectedClass("All");
                    setSearchInput("");
                    setViewOption("my");
                  }}
                  className="btn bgTheme text-white"
                >
                  Reset Filters
                </button>
              </div>

              {/* Search Input */}
              <div className=" flex justify-end gap-2">
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Search Name
                  </label>
                  <input
                    type="text"
                    placeholder="Search Name..."
                    className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value.trimStart())}
                  />
                </div>
                {(userRole === constants.roles.director ||
                  userRole === constants.roles.officeStaff) && (
                  <div className="pt-6">
                    <button
                      className="btn bgTheme text-white text-nowrap"
                      onClick={() => navigate(allRouterLink.documentUpload)}
                    >
                      <i className="fa-solid fa-file-arrow-up w-5"></i> Upload
                      Documents
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Table */}
        <div className="w-full overflow-x-scroll rounded-lg max-h-[70vh]">
          <div className="inline-block min-w-full align-middle">
            <div className="shadow-sm rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bgTheme text-white sticky top-0 z-2">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Scholar No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Role
                    </th>
                    {showClassColumn && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Class
                      </th>
                    )}
                    {allDocTypes.map((type) => (
                      <th
                        key={type}
                        className="px-4 py-3 text-left text-sm font-semibold text-nowrap capitalize"
                      >
                        {type}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {hasData && filterBysearch.length > 0 ? (
                    [...filterBysearch]
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "")
                      )
                      .map((person) => (
                        <tr
                          key={`${person.role}-${person.name}-${person.yearLevel}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition text-nowrap"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                            {person.name}
                          </td>
                          <td className="px-4 py-3  text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                            {person.scholar_number || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                            {person.role}
                          </td>

                          {showClassColumn && (
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                              {person.yearLevel || "-"}
                            </td>
                          )}

                          {allDocTypes.map((type) => (
                            <td
                              key={type}
                              className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 text-center"
                            >
                              {person.docs[type] &&
                              person.docs[type].length > 0 ? (
                                person.docs[type].map((url, i) => (
                                  <div key={i}>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline textTheme hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                      View
                                    </a>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-200 text-nowrap">
                                  Not Available
                                </p>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td
                        colSpan={colSpan}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No results found
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {startIndex}–{endIndex} of {totalCount} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded border ${
                  currentPage === 1
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bgTheme text-white hover:bg-opacity-80"
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={goToNextPage}
                disabled={!nextUrl}
                className={`px-4 py-2 rounded border ${
                  !nextUrl
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bgTheme text-white hover:bg-opacity-80"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};