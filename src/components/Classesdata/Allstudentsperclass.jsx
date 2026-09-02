import React, { useContext, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchStudentYearLevelByClass, fetchYearLevels, fetchSchoolYear } from "../../services/api/Api";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

// Year mapping constants
const YEAR_MAPPING = {
  "2024-2025": 1,
  "2025-2026": 2,
  "2026-2027": 3,
  "2027-2028": 4,
  "2028-2029": 5,
  "2029-2030": 6,
};

const parseYearStart = (yearName) => {
  if (!yearName) return null;
  const match = yearName.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
};

const sortYearLevelsAsc = (levels) => {
  return [...levels].sort((a, b) => Number(a.id) - Number(b.id));
};

const sortSchoolYearsAsc = (years) => {
  return [...years].sort((a, b) => parseYearStart(a.year_name) - parseYearStart(b.year_name));
};

// Helper functions for year operations
const getYearIdFromName = (yearName) => {
  return YEAR_MAPPING[yearName] || null;
};

const getNextYearName = (currentYearName) => {
  if (!currentYearName) return null;
  const startYear = parseInt(currentYearName.split('-')[0]);
  const nextStartYear = startYear + 1;
  return `${nextStartYear}-${nextStartYear + 1}`;
};

const getPrevYearName = (currentYearName) => {
  if (!currentYearName) return null;
  const startYear = parseInt(currentYearName.split('-')[0]);
  const prevStartYear = startYear - 1;
  return `${prevStartYear}-${prevStartYear + 1}`;
};

const AllStudentsPerClass = () => {
  const { id } = useParams();
  const location = useLocation();

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userRole, axiosInstance } = useContext(AuthContext);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedPromotionClass, setSelectedPromotionClass] = useState("");
  const [selectedPromotionYear, setSelectedPromotionYear] = useState("");
  const [selectedDemotionClass, setSelectedDemotionClass] = useState("");
  const [selectedDemotionYear, setSelectedDemotionYear] = useState("");
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showDemotionModal, setShowDemotionModal] = useState(false);
  const levelName = location.state?.level_name || "Unknown";
  const yearLevelName = location.state?.year_level_name || "";
  const currentLevelId = location.state?.level_id || id;
  const currentYearId = location.state?.year_id || null;
  const currentYearStart = parseYearStart(yearLevelName);

  const availablePromotionClasses = yearLevels.filter((level) => Number(level.id) > Number(currentLevelId));
  const availableDemotionClasses = yearLevels.filter((level) => Number(level.id) < Number(currentLevelId));
  const availablePromotionYears = schoolYears.filter((year) => parseYearStart(year.year_name) > currentYearStart);
  const availableDemotionYears = schoolYears.filter((year) => parseYearStart(year.year_name) < currentYearStart);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  const getStudents = async () => {
    try {
      setLoading(true);
      const data = await fetchStudentYearLevelByClass(
        id,
        yearLevelName || null,
        genderFilter || null
      );

      const sortedData = [...data].sort((a, b) =>
        (a.student_name || "").localeCompare(b.student_name || "", "en", { sensitivity: "base" })
      );

      setStudents(sortedData);
      setSelectedStudents([]);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students.");
    } finally {
      setLoading(false);
    }
  };

  const loadMetaData = async () => {
    try {
      const [levels, years] = await Promise.all([fetchYearLevels(), fetchSchoolYear()]);
      setYearLevels(sortYearLevelsAsc(Array.isArray(levels) ? levels : levels.results || []));
      setSchoolYears(sortSchoolYearsAsc(Array.isArray(years) ? years : years.results || []));
    } catch (err) {
      console.error("Error fetching promotion metadata:", err);
    }
  };

  useEffect(() => {
    loadMetaData();
  }, []);

  useEffect(() => {
    if (yearLevels.length && schoolYears.length) {
      const nextClass = yearLevels.find((level) => Number(level.id) > Number(currentLevelId));
      const prevClass = [...yearLevels].reverse().find((level) => Number(level.id) < Number(currentLevelId));
      const nextYear = schoolYears.find((year) => parseYearStart(year.year_name) > currentYearStart);
      const prevYear = [...schoolYears].reverse().find((year) => parseYearStart(year.year_name) < currentYearStart);

      if (nextClass && !selectedPromotionClass) {
        setSelectedPromotionClass(String(nextClass.id));
      }
      if (nextYear && !selectedPromotionYear) {
        setSelectedPromotionYear(String(nextYear.id));
      }
      if (prevClass && !selectedDemotionClass) {
        setSelectedDemotionClass(String(prevClass.id));
      }
      if (prevYear && !selectedDemotionYear) {
        setSelectedDemotionYear(String(prevYear.id));
      }
    }
  }, [yearLevels, schoolYears, currentLevelId, currentYearStart]);

  const openPromotionModal = () => {
    if (selectedStudents.length === 0) {
      setAlertTitle("Info");
      setAlertMessage("Please select at least one student.");
      setShowAlert(true);
      return;
    }
    setShowPromotionModal(true);
  };

  const openDemotionModal = () => {
    if (selectedStudents.length === 0) {
      setAlertTitle("Info");
      setAlertMessage("Please select at least one student.");
      setShowAlert(true);
      return;
    }
    setShowDemotionModal(true);
  };

  const handlePromotionConfirm = async () => {
    const targetClassId = selectedPromotionClass
      ? parseInt(selectedPromotionClass)
      : parseInt(currentLevelId) + 1;
    const targetYearId = selectedPromotionYear
      ? parseInt(selectedPromotionYear)
      : getYearIdFromName(getNextYearName(yearLevelName));

    if (!targetClassId || !targetYearId) {
      setAlertTitle("Error");
      setAlertMessage(`Please choose a valid promotion target. Current year: ${yearLevelName}`);
      setShowAlert(true);
      return;
    }

    if (targetClassId <= Number(currentLevelId)) {
      setAlertTitle("Error");
      setAlertMessage("Please select a promotion target class above the current class.");
      setShowAlert(true);
      return;
    }

    const targetYearName = selectedPromotionYear
      ? schoolYears.find((year) => String(year.id) === String(selectedPromotionYear))?.year_name
      : getNextYearName(yearLevelName);

    const payload = {
      student_ids: selectedStudents,
      level_id: targetClassId,
      year_id: targetYearId,
    };

    console.log("Promotion Payload:", payload);
    console.log("Promotion Details:", {
      fromClass: currentLevelId,
      toClass: targetClassId,
      fromYear: yearLevelName,
      toYear: targetYearName,
      students: selectedStudents,
    });

    try {
      const response = await axiosInstance.post(
        `/d/student-promotion/promote/`,
        payload,
      );

      const data = response.data;
      console.log("Promotion Response:", data);

      let message = ``;
      message += `Moving from ${levelName} to Class ${targetClassId}\n`;
      message += `Academic Year: ${yearLevelName} → ${targetYearName || "selected year"}\n\n`;

      if (data.result && Array.isArray(data.result)) {
        let promotedCount = 0;
        let failedCount = 0;

        data.result.forEach((item) => {
          if (item.status === "success") {
            promotedCount++;
            message += `✅ Student: ${item.student_name}\n`;
            message += `   From: ${item.from_level} (${item.from_year})\n`;
            message += `   To: ${item.to_level} (${item.to_year})\n`;
            message += `   Status: Success\n`;
            message += `   Reason: ${item.reason || 'N/A'}\n\n`;
          } else if (item.status === "failed") {
            failedCount++;
            message += `❌ Student: ${item.student_name}\n`;
            message += `   Status: Failed\n`;
            message += `   Reason: ${item.reason || 'Unknown error'}\n\n`;
          }
        });

        message += `📊 Summary:\n`;
        message += `Total: ${data.Summary?.total || data.result.length}\n`;
        message += `Promoted: ${data.Summary?.promoted || promotedCount}\n`;
        message += `Failed: ${data.Summary?.failed || failedCount}\n`;
      } else if (data.result && !Array.isArray(data.result)) {
        const item = data.result;
        message += `Student: ${item.student_name}\n`;
        message += `From: ${item.from_level} (${item.from_year})\n`;
        message += `To: ${item.to_level} (${item.to_year})\n`;
        message += `Status: ${item.status}\n`;
        message += `Reason: ${item.reason || 'N/A'}\n`;

        if (data.Summary) {
          message += `\n📊 Summary:\n`;
          message += `Total: ${data.Summary.total}\n`;
          message += `Promoted: ${data.Summary.promoted}\n`;
          message += `Failed: ${data.Summary.failed}\n`;
        }
      } else {
        message += `Total students processed: ${selectedStudents.length}\n`;
        message += `Message: ${data.message || "Promotion completed successfully"}`;
      }

      setShowPromotionModal(false);
      setAlertTitle("🎓 Promotion Successful");
      setAlertMessage(message);
      setShowAlert(true);

      await getStudents();
      setSelectedStudents([]);

    } catch (error) {
      console.error("Promotion Error:", error);
      let errorMessage = "❌ Promotion Failed!\n\n";

      if (error.response) {
        console.error("Error Response:", error.response.data);
        const errorData = error.response.data;
        
        if (errorData.detail) {
          errorMessage += `Error: ${errorData.detail}\n`;
        } else if (errorData.error) {
          errorMessage += `Error: ${errorData.error}\n`;
        } else if (errorData.message) {
          errorMessage += `Error: ${errorData.message}\n`;
        } else {
          errorMessage += `Error: ${JSON.stringify(errorData)}\n`;
        }

        if (errorData.result && Array.isArray(errorData.result)) {
          errorMessage += `\nDetails:\n`;
          errorData.result.forEach((item) => {
            if (item.status === "failed") {
              errorMessage += `❌ ${item.student_name || 'Unknown'}: ${item.reason || 'Unknown error'}\n`;
            }
          });
        }
        setAlertMessage(errorMessage);
      } else {
        errorMessage += "Failed to promote students. Please check your connection and try again.";
        setAlertMessage(errorMessage);
      }

      setShowPromotionModal(false);
      setAlertTitle("❌ Promotion Failed");
      setShowAlert(true);
    }
  };

  const handleDemotionConfirm = async () => {
    const targetClassId = selectedDemotionClass
      ? parseInt(selectedDemotionClass)
      : Math.max(parseInt(currentLevelId) - 1, 1);
    const targetYearId = selectedDemotionYear
      ? parseInt(selectedDemotionYear)
      : getYearIdFromName(getPrevYearName(yearLevelName));

    if (!targetClassId || !targetYearId) {
      setAlertTitle("Error");
      setAlertMessage(`Please choose a valid demotion target. Current year: ${yearLevelName}`);
      setShowAlert(true);
      return;
    }

    if (targetClassId >= Number(currentLevelId)) {
      setAlertTitle("Error");
      setAlertMessage("Please select a demotion target class before the current class.");
      setShowAlert(true);
      return;
    }

    const prevYearName = selectedDemotionYear
      ? schoolYears.find((year) => String(year.id) === String(selectedDemotionYear))?.year_name
      : getPrevYearName(yearLevelName);

    const payload = {
      student_ids: selectedStudents,
      level_id: targetClassId,
      year_id: targetYearId,
    };

    console.log("Demotion Payload:", payload);
    console.log("Demotion Details:", {
      fromClass: currentLevelId,
      toClass: targetClassId,
      fromYear: yearLevelName,
      toYear: prevYearName,
      students: selectedStudents,
    });

    try {
      const response = await axiosInstance.post(
        `/d/student-promotion/promote/`,
        payload,
      );

      const data = response.data;
      console.log("Demotion Response:", data);

      let message = ``;
      message += `Moving from ${levelName} to Class ${targetClassId}\n`;
      message += `Academic Year: ${yearLevelName} → ${prevYearName || "selected year"}\n\n`;

      if (data.result && Array.isArray(data.result)) {
        let demotedCount = 0;
        let failedCount = 0;

        data.result.forEach((item) => {
          if (item.status === "success") {
            demotedCount++;
            message += `✅ Student: ${item.student_name}\n`;
            message += `   From: ${item.from_level} (${item.from_year})\n`;
            message += `   To: ${item.to_level} (${item.to_year})\n`;
            message += `   Status: Success\n`;
            message += `   Reason: ${item.reason || 'N/A'}\n\n`;
          } else if (item.status === "failed") {
            failedCount++;
            message += `❌ Student: ${item.student_name}\n`;
            message += `   Status: Failed\n`;
            message += `   Reason: ${item.reason || 'Unknown error'}\n\n`;
          }
        });

        message += `📊 Summary:\n`;
        message += `Total: ${data.Summary?.total || data.result.length}\n`;
        message += `Demoted: ${data.Summary?.promoted || demotedCount}\n`;
        message += `Failed: ${data.Summary?.failed || failedCount}\n`;
      } else if (data.result && !Array.isArray(data.result)) {
        const item = data.result;
        message += `Student: ${item.student_name}\n`;
        message += `From: ${item.from_level} (${item.from_year})\n`;
        message += `To: ${item.to_level} (${item.to_year})\n`;
        message += `Status: ${item.status}\n`;
        message += `Reason: ${item.reason || 'N/A'}\n`;

        if (data.Summary) {
          message += `\n📊 Summary:\n`;
          message += `Total: ${data.Summary.total}\n`;
          message += `Demoted: ${data.Summary.promoted}\n`;
          message += `Failed: ${data.Summary.failed}\n`;
        }
      } else {
        message += `Total students processed: ${selectedStudents.length}\n`;
        message += `Message: ${data.message || "Demotion completed successfully"}`;
      }

      setShowDemotionModal(false);
      setAlertTitle("📉 Demotion Successful");
      setAlertMessage(message);
      setShowAlert(true);

      // Refresh the student list
      await getStudents();
      setSelectedStudents([]);

    } catch (error) {
      console.error("Demotion Error:", error);
      let errorMessage = "❌ Demotion Failed!\n\n";

      if (error.response) {
        console.error("Error Response:", error.response.data);
        const errorData = error.response.data;
        
        if (errorData.detail) {
          errorMessage += `Error: ${errorData.detail}\n`;
        } else if (errorData.error) {
          errorMessage += `Error: ${errorData.error}\n`;
        } else if (errorData.message) {
          errorMessage += `Error: ${errorData.message}\n`;
        } else {
          errorMessage += `Error: ${JSON.stringify(errorData)}\n`;
        }

        if (errorData.result && Array.isArray(errorData.result)) {
          errorMessage += `\nDetails:\n`;
          errorData.result.forEach((item) => {
            if (item.status === "failed") {
              errorMessage += `❌ ${item.student_name || 'Unknown'}: ${item.reason || 'Unknown error'}\n`;
            }
          });
        }
        setAlertMessage(errorMessage);
      } else {
        errorMessage += "Failed to demote students. Please check your connection and try again.";
        setAlertMessage(errorMessage);
      }

      setAlertTitle("❌ Demotion Failed");
      setShowAlert(true);
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.student_id));
    }
  };

  const handleGenderFilterChange = (e) => {
    const value = e.target.value;
    setGenderFilter(value);
  };

  useEffect(() => {
    getStudents();
  }, [id, genderFilter]);

  const filteredStudents = students.filter((student) =>
    student.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 max-w-7xl p-6 rounded-lg shadow-lg mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            <i className="fa-solid fa-graduation-cap mr-2" />
            Students in {levelName}
          </h1>
          {yearLevelName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Academic Year: {yearLevelName}
            </p>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search Student Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.trimStart())}
                className="border px-3 py-2 rounded w-full dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={handleGenderFilterChange}
              className="border px-3 py-2 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Student Count */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-users mr-1"></i>
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full text-sm text-left">
              {/* Header */}
              <thead className="bgTheme text-white sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer accent-indigo-700"
                        checked={
                          selectedStudents.length === filteredStudents.length &&
                          filteredStudents.length > 0
                        }
                        onChange={handleSelectAll}
                      />
                      <span className="font-semibold">Select All</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold">S.No</th>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {genderFilter ? (
                        <span>
                          No {genderFilter} students found in {levelName} for {yearLevelName || "this session"}.
                        </span>
                      ) : (
                        `No students found in ${levelName} for ${yearLevelName || "this session"}.`
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((record, index) => (
                    <tr
                      key={record.id || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4">
                        <input
                          id={`promote-${record.student_id}`}
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer accent-indigo-700"
                          checked={selectedStudents.includes(record.student_id)}
                          onChange={() =>
                            handleSelectStudent(record.student_id)
                          }
                        />
                      </td>

                      {/* Serial Number */}
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {index + 1}
                      </td>

                      {/* Student Name */}
                      <td className="px-6 py-4 font-medium capitalize">
                        <Link
                          to={`/Studentdetails/${record.student_id}`}
                          className="textTheme hover:underline"
                        >
                          {record.student_name || "Unnamed"}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {(userRole === "director" || userRole === "teacher") && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedStudents.length} student(s) selected
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openPromotionModal}
                  disabled={selectedStudents.length === 0}
                  className={`bg-green-600 hover:bg-green-700 text-white btn px-6 py-2 rounded-lg transition
                    ${selectedStudents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  <i className="fa-solid fa-arrow-up mr-2"></i>
                  Promote
                </button>

                <button
                  onClick={openDemotionModal}
                  disabled={selectedStudents.length === 0}
                  className={`bg-red-600 hover:bg-red-700 text-white btn px-6 py-2 rounded-lg transition
                    ${selectedStudents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  <i className="fa-solid fa-arrow-down mr-2"></i>
                  Demote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPromotionModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 max-w-2xl">
            <h3 className="font-bold text-lg">Promote Selected Student(s)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {selectedStudents.length} student(s) will be moved to a future class and year.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Class</label>
                <select
                  value={selectedPromotionClass}
                  onChange={(e) => setSelectedPromotionClass(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Select target class</option>
                  {availablePromotionClasses.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name || level.year_level_name || `Class ${level.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Academic Year</label>
                <select
                  value={selectedPromotionYear}
                  onChange={(e) => setSelectedPromotionYear(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Select target year</option>
                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white"
                onClick={() => setShowPromotionModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePromotionConfirm}
              >
                Confirm Promote
              </button>
            </div>
          </div>
        </dialog>
      )}

      {showDemotionModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 max-w-2xl">
            <h3 className="font-bold text-lg">Demote Selected Student(s)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {selectedStudents.length} student(s) will be moved to a previous class and year.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Class</label>
                <select
                  value={selectedDemotionClass}
                  onChange={(e) => setSelectedDemotionClass(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Select target class</option>
                  {availableDemotionClasses.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name || level.year_level_name || `Class ${level.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Academic Year</label>
                <select
                  value={selectedDemotionYear}
                  onChange={(e) => setSelectedDemotionYear(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Select target year</option>
                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white"
                onClick={() => setShowDemotionModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDemotionConfirm}
              >
                Confirm Demote
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Alert Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 max-w-2xl">
            <h3 className="font-bold text-lg">{alertTitle}</h3>

            <div className="py-4 max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
              {alertMessage}
            </div>

            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
                onClick={() => setShowAlert(false)}
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AllStudentsPerClass;