import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchSchoolYear,
  fetchStudents1,
  fetchTerms,
  fetchYearLevels,
} from "../../services/api/Api";
import { useForm } from "react-hook-form";
import { AuthContext } from "../../context/AuthContext";

const EditMarksheet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { axiosInstance } = useContext(AuthContext);

  // State declarations
  const [className, setClassName] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [SocialQuality, setSocialQuality] = useState([]);
  const [nonScholasticSubjects, setNonScholasticSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [studentLevel, setStudentLevel] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedYearlvl, setSelectedYearlvl] = useState(null);
  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marksheetData, setMarksheetData] = useState(null);
  const [student_year_id, setStudent_year_id] = useState("");

  // State for storing grades
  const [personalQualityGrades, setPersonalQualityGrades] = useState({});
  const [nonScholasticGrades, setNonScholasticGrades] = useState({});
  const [editableMarks, setEditableMarks] = useState({});

  const studentDropdownRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  // Watch all required fields
  const watchedFields = watch([
    "school_year",
    "year_level",
    "student",
    "rank",
    "teacher_remark",
    "school_reopen_date",
  ]);
  const schoolYearValue = watch("school_year");
  const yearLevelValue = watch("year_level");
  const studentValue = watch("student");
  const rankValue = watch("rank");
  const teacherRemarkValue = watch("teacher_remark");
  const schoolReopenDateValue = watch("school_reopen_date");




  const getMarks = async () => {
    try {
      const studentMarks = await axiosInstance.get(
        `/d/Student-Marks/get_marks/?school_year=${selectedYearlvl}&student_id=${student_year_id}`
      );
      const marks = studentMarks.data;
      setMarksData(marks);

      // Initialize editable marks state
      const editableMarksObj = {};
      if (marks && Object.keys(marks).length > 0) {
        Object.keys(marks).forEach((key) => {
          const marksEntry = marks[key];
          if (marksEntry.data && marksEntry.data.length > 0) {
            marksEntry.data.forEach((subjectItem, idx) => {
              const studentMark = subjectItem.student_marks?.[0];
              if (studentMark) {
                const uniqueKey = `${marksEntry.exam_type}_${subjectItem.subject}`;
                editableMarksObj[uniqueKey] = {
                  marks: studentMark.marks || "",
                  subject: subjectItem.subject,
                  exam_type: marksEntry.exam_type,
                  originalMarks: studentMark.marks || "",
                };
              }
            });
          }
        });
      }
      setEditableMarks(editableMarksObj);
    } catch (err) {
      console.log("Failed to load marks. Please try again." + err);
    }
  };

  // Get marksheet data with parameters
  const getMarksheetData = async (socialQualityData, nonScholasticData) => {
    try {
      if (!id) throw new Error("No id available");

      const response = await axiosInstance.get(`/d/report-cards/${id}/`);
      const data = response.data;
      setMarksheetData(data);


      // Prefill basic form fields
      setValue("rank", data.rank || "");
      setValue("teacher_remark", data.teacher_remark || "");
      setValue(
        "school_reopen_date",
        data.school_reopen_date
          ? new Date(data.school_reopen_date).toISOString().split("T")[0]
          : ""
      );

      setSelectedStudentId(data.student);
      setSelectedStudentName(data.student_name || "");
      setValue("student", data.student);
      setStudentLevel(data.student_level || data.student_year_id);
      setSelectedYearlvl(data.academic_year);
      setSelectedClassId(data.student_year_id);
      setStudent_year_id(data.setStudent_year_id);

      // Use the passed data or fall back to state
      const socialQuality = socialQualityData || SocialQuality;
      const nonScholastic = nonScholasticData || nonScholasticSubjects;

      // Initialize grade state objects
      const personalGrades = {};
      const nonScholasticGradesData = {};

      // Map Personal Social Quality data from API
      if (data.personal_social && data.personal_social.length > 0) {
        // Group by quality name
        const groupedByQuality = {};
        data.personal_social.forEach((item) => {
          if (!groupedByQuality[item.quality]) {
            groupedByQuality[item.quality] = {};
          }
          groupedByQuality[item.quality][item.term] = item.grade;
        });

        // Find matching SocialQuality items and map their IDs
        socialQuality.forEach((quality) => {
          const qualityName = quality.quality_name;
          if (groupedByQuality[qualityName]) {
            personalGrades[quality.id] = {
              term1: groupedByQuality[qualityName]["Term 1"] || "",
              term2: groupedByQuality[qualityName]["Term 2"] || "",
            };
          } else {
            personalGrades[quality.id] = { term1: "", term2: "" };
          }
        });
      } else {
        // Initialize empty if no data
        socialQuality.forEach((quality) => {
          personalGrades[quality.id] = { term1: "", term2: "" };
        });
      }

      // Map Non-Scholastic Subjects data from API
      if (data.non_scholastic && data.non_scholastic.length > 0) {
        // Group by subject name
        const groupedBySubject = {};
        data.non_scholastic.forEach((item) => {
          if (!groupedBySubject[item.subject]) {
            groupedBySubject[item.subject] = {};
          }
          groupedBySubject[item.subject][item.term] = item.grade;
        });

        // Find matching nonScholasticSubjects items and map their IDs
        nonScholastic.forEach((subject) => {
          const subjectName = subject.subject_name;
          if (groupedBySubject[subjectName]) {
            nonScholasticGradesData[subject.id] = {
              term1: groupedBySubject[subjectName]["Term 1"] || "",
              term2: groupedBySubject[subjectName]["Term 2"] || "",
            };
          } else {
            nonScholasticGradesData[subject.id] = { term1: "", term2: "" };
          }
        });
      } else {
        // Initialize empty if no data
        nonScholastic.forEach((subject) => {
          nonScholasticGradesData[subject.id] = { term1: "", term2: "" };
        });
      }

      // Fallback: If arrays are empty, use direct mapping approach
      if (socialQuality.length === 0 || nonScholastic.length === 0) {
        // Create temporary maps for fallback
        const tempPersonalGrades = {};
        const tempNonScholasticGrades = {};

        // Map personal_social from API (fallback)
        if (data.personal_social && data.personal_social.length > 0) {
          data.personal_social.forEach((item) => {
            const key = `${item.quality}-${item.term}`;
            tempPersonalGrades[key] = item.grade;
          });
        }

        // Map non_scholastic from API (fallback)
        if (data.non_scholastic && data.non_scholastic.length > 0) {
          data.non_scholastic.forEach((item) => {
            const key = `${item.subject}-${item.term}`;
            tempNonScholasticGrades[key] = item.grade;
          });
        }

        setPersonalQualityGrades(tempPersonalGrades);
        setNonScholasticGrades(tempNonScholasticGrades);
      } else {
        setPersonalQualityGrades(personalGrades);
        setNonScholasticGrades(nonScholasticGradesData);
      }
    } catch (err) {
      console.error("Failed to load marksheet:", err);
      setError(err.message || "Failed to load marksheet data");
    }
  };

  // Load all initial data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load all data in parallel and pass it directly to getMarksheetData
        const [
          classesRes,
          schoolYearsRes,
          socialQualityRes,
          nonScholasticRes,
          termsRes,
        ] = await Promise.all([
          fetchYearLevels(),
          fetchSchoolYear(),
          axiosInstance.get(`/d/personal-social-quality/`),
          axiosInstance.get(`/d/non-scholastic-grades/non_schl_subject/`),
          fetchTerms(),
        ]);

        // Update state
        setClassName(classesRes);
        setSchoolYears(schoolYearsRes);
        setSocialQuality(socialQualityRes.data);
        setNonScholasticSubjects(nonScholasticRes.data);
        setTerms(termsRes);

        // Then load marksheet data with the already-loaded data
        await getMarksheetData(socialQualityRes.data, nonScholasticRes.data);
      } catch (err) {
        console.error("Failed to initialize data:", err);
        setError("Failed to load page data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Fetch marks when student, year and class are selected
  useEffect(() => {
    if (selectedStudentId && selectedYearlvl && selectedClassId) {
      getMarks();
    } else {
      setMarksData([]);
      setEditableMarks({});
    }
  }, [selectedStudentId, selectedYearlvl, selectedClassId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target)
      ) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle grade changes for personal qualities
  const handlePersonalQualityGradeChange = (qualityId, term, grade) => {
    setPersonalQualityGrades((prev) => {
      if (prev[qualityId] && typeof prev[qualityId] === "object") {
        return {
          ...prev,
          [qualityId]: {
            ...prev[qualityId],
            [term]: grade,
          },
        };
      } else {
        // Fallback: using key-based structure
        const qualityItem = SocialQuality.find((q) => q.id === qualityId);
        if (qualityItem) {
          const termText = term === "term1" ? "Term 1" : "Term 2";
          const key = `${qualityItem.quality_name}-${termText}`;
          return {
            ...prev,
            [key]: grade,
          };
        }
        return prev;
      }
    });
  };

  // Handle grade changes for non-scholastic subjects
  const handleNonScholasticGradeChange = (subjectId, term, grade) => {
    setNonScholasticGrades((prev) => {
      if (prev[subjectId] && typeof prev[subjectId] === "object") {
        return {
          ...prev,
          [subjectId]: {
            ...prev[subjectId],
            [term]: grade,
          },
        };
      } else {
        // Fallback: using key-based structure
        const subjectItem = nonScholasticSubjects.find(
          (s) => s.id === subjectId
        );
        if (subjectItem) {
          const termText = term === "term1" ? "Term 1" : "Term 2";
          const key = `${subjectItem.subject_name}-${termText}`;
          return {
            ...prev,
            [key]: grade,
          };
        }
        return prev;
      }
    });
  };

  // Handle mark changes for editable marks
  const handleMarkChange = (uniqueKey, newValue) => {
    setEditableMarks((prev) => ({
      ...prev,
      [uniqueKey]: {
        ...prev[uniqueKey],
        marks: newValue,
      },
    }));
  };

  // Helper function to get grade value for display
  const getPersonalGradeValue = (qualityId, term) => {
    const gradeData = personalQualityGrades[qualityId];
    if (gradeData && typeof gradeData === "object") {
      return gradeData[term] || "";
    }

    // Fallback: try to find by name
    const qualityItem = SocialQuality.find((q) => q.id === qualityId);
    if (qualityItem) {
      const termText = term === "term1" ? "Term 1" : "Term 2";
      const key = `${qualityItem.quality_name}-${termText}`;
      return personalQualityGrades[key] || "";
    }

    return "";
  };

  // Helper function to get non-scholastic grade value for display
  const getNonScholasticGradeValue = (subjectId, term) => {
    const gradeData = nonScholasticGrades[subjectId];
    if (gradeData && typeof gradeData === "object") {
      return gradeData[term] || "";
    }

    // Fallback: try to find by name
    const subjectItem = nonScholasticSubjects.find((s) => s.id === subjectId);
    if (subjectItem) {
      const termText = term === "term1" ? "Term 1" : "Term 2";
      const key = `${subjectItem.subject_name}-${termText}`;
      return nonScholasticGrades[key] || "";
    }

    return "";
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Prepare Complete Payload
      const completePayload = {
        rank: data.rank,
        teacher_remark: data.teacher_remark,
        school_reopen_date: data.school_reopen_date,
        subjects: [],
        non_scholastic: {},
        personal_social: [],
      };

      // Prepare Personal Quality Payload
      SocialQuality.forEach((quality) => {
        // Term 1 grades
        const term1Grade = getPersonalGradeValue(quality.id, "term1");
        if (term1Grade && String(term1Grade).trim() !== "") {
          completePayload.personal_social.push({
            quality: quality.quality_name,
            term: 1,
            grade: String(term1Grade).trim(),
          });
        }

        // Term 2 grades
        const term2Grade = getPersonalGradeValue(quality.id, "term2");
        if (term2Grade && String(term2Grade).trim() !== "") {
          completePayload.personal_social.push({
            quality: quality.quality_name,
            term: 2,
            grade: String(term2Grade).trim(),
          });
        }
      });

      // Prepare Non-Scholastic Payload
      nonScholasticSubjects.forEach((subject) => {
        // Term 1 grades
        const term1Grade = getNonScholasticGradeValue(subject.id, "term1");
        // Term 2 grades
        const term2Grade = getNonScholasticGradeValue(subject.id, "term2");

        // Only add subject if at least one grade exists
        if (
          (term1Grade && String(term1Grade).trim() !== "") ||
          (term2Grade && String(term2Grade).trim() !== "")
        ) {
          completePayload.non_scholastic[subject.subject_name] = {};

          if (term1Grade && String(term1Grade).trim() !== "") {
            completePayload.non_scholastic[subject.subject_name]["Term 1"] =
              String(term1Grade).trim();
          }

          if (term2Grade && String(term2Grade).trim() !== "") {
            completePayload.non_scholastic[subject.subject_name]["Term 2"] =
              String(term2Grade).trim();
          }
        }
      });

      // Prepare Subjects Payload from editable marks
      if (Object.keys(editableMarks).length > 0) {
        Object.values(editableMarks).forEach((markItem) => {
          const marksValue = markItem.marks;
          // Check if marks value exists and is not empty
          if (
            marksValue !== undefined &&
            marksValue !== null &&
            marksValue !== ""
          ) {
            // Convert to string, trim if it's a string, otherwise use the value as-is
            const marksStr = String(marksValue);
            if (marksStr.trim() !== "") {
              completePayload.subjects.push({
                subject: markItem.subject,
                exam_type: markItem.exam_type,
                marks: marksStr.trim(),
              });
            }
          }
        });
      }

      // Make Single API Call
      await axiosInstance.patch(`/d/report-cards/${id}/`, completePayload);

      setSuccessMessage("Marksheet updated successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Submission failed:", error);

      const apiMessage =
        error.response?.data?.error || error.response?.data?.message;

      setErrorMessage(
        apiMessage || "Failed to update marksheet. Please try again."
      );
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get display value for school year
  const getSchoolYearDisplayValue = () => {
    if (!marksheetData?.academic_year) return "";
    const schoolYear = schoolYears.find((sy) => sy.id === schoolYearValue);
    return schoolYear ? schoolYear.year_name : marksheetData.academic_year;
  };

  // Helper function to get display value for year level
  const getYearLevelDisplayValue = () => {
    if (!marksheetData?.standard) return "";
    const classItem = className.find((cls) => cls.id === yearLevelValue);
    return classItem ? classItem.level_name : marksheetData.standard;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full [animation-delay:-0.2s] animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full [animation-delay:-0.4s] animate-bounce"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
        <button
          className="mt-4 btn bgTheme text-white"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-box my-5 shadow-sm dark:shadow-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
          <i className="fa-solid fa-file-pen ml-2"></i> Edit Marksheet
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(watch());
          }}
        >
          {/* Main Grid Container for All Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Required Section Header */}
            <div className="col-span-full">
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                Required Information
              </h3>
            </div>

            {/* School Year - Disabled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                School Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={getSchoolYearDisplayValue()}
                className="input input-bordered w-full focus:outline-none bg-gray-100 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                readOnly
                disabled
              />
              <input
                type="hidden"
                {...register("school_year", {
                  required: "School year is required",
                })}
                value={schoolYearValue || ""}
              />
            </div>

            {/* Year Level - Disabled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year Level <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={getYearLevelDisplayValue()}
                className="input input-bordered w-full focus:outline-none bg-gray-100 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                readOnly
                disabled
              />
              <input
                type="hidden"
                {...register("year_level", {
                  required: "Year level is required",
                })}
                value={yearLevelValue || ""}
              />
            </div>

            {/* Student - Disabled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={selectedStudentName || marksheetData?.student_name || ""}
                className="input input-bordered w-full focus:outline-none bg-gray-100 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                readOnly
                disabled
              />
              <input
                type="hidden"
                {...register("student", { required: "Student is required" })}
                value={selectedStudentId || ""}
              />
            </div>

            {/* Rank */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rank <span className="text-red-500">*</span>
              </label>
               <input
                type="text"
                inputMode="numeric" 
                pattern="[0-9]*" 
                {...register("rank", {
                  required: "Rank is required",
                  validate: (value) =>
                    /^\d+$/.test(value) || "Only numbers are allowed",
                  min: {
                    value: 1,
                    message: "Rank must be at least 1",
                  },
                })}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
                className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                placeholder="Enter rank"
              />
              {errors.rank && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.rank.message}
                </p>
              )}
            </div>

            {/* Teacher's Remark */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher's Remark <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                {...register("teacher_remark", {
                  required: "Remark is required",
                })}
                className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                placeholder="Enter remark"
              />
              {errors.teacher_remark && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.teacher_remark.message}
                </p>
              )}
            </div>

            {/* School Reopen Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                School Reopen Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("school_reopen_date", {
                  required: "Date is required",
                })}
                className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.school_reopen_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.school_reopen_date.message}
                </p>
              )}
            </div>

            {/* Editable Student Marks Section - Debug Info Removed */}
            {selectedStudentId &&
              selectedYearlvl &&
              selectedClassId &&
              Object.keys(editableMarks).length > 0 && (
                <>
                  <div className="col-span-full mt-8">
                    <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                      Edit Student Marks
                    </h3>
                  </div>
                  <div className="col-span-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.keys(marksData).map((key) => {
                        const marksEntry = marksData[key];
                        return (
                          <div
                            key={key}
                            className="border rounded-xl shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-700"
                          >
                            {marksEntry.data && marksEntry.data.length > 0 && (
                              <div className="p-4 bgTheme text-white flex justify-between items-center rounded-t-xl">
                                <h2 className="text-lg font-semibold truncate">
                                  Exam Type:
                                </h2>
                                <span className="text-sm bg-white textTheme px-3 py-1 rounded-full font-bold capitalize">
                                  {marksEntry.exam_type}
                                </span>
                              </div>
                            )}

                            <div className="p-4">
                              {marksEntry.data && marksEntry.data.length > 0 ? (
                                <ul className="space-y-3">
                                  {marksEntry.data.map((subjectItem, idx) => {
                                    const uniqueKey = `${marksEntry.exam_type}_${subjectItem.subject}`;
                                    const markItem =
                                      editableMarks[uniqueKey] || {};

                                    return (
                                      <li
                                        key={idx}
                                        className="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                                            {subjectItem.subject}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            Marks:
                                          </label>
                                          <input
                                            type="number"
                                            value={markItem.marks || ""}
                                            onChange={(e) =>
                                              handleMarkChange(
                                                uniqueKey,
                                                e.target.value
                                              )
                                            }
                                            className="input input-bordered input-sm w-24 bg-white dark:bg-gray-700 dark:text-gray-100"
                                            placeholder="Enter marks"
                                            min="0"
                                          />
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                  No marks available
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

            {/* Personal Quality Grades Section */}
            {SocialQuality.length > 0 && (
              <div className="col-span-full mt-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                  Personal Quality Grades
                </h3>

                {/* Term 1 Personal Qualities */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">
                    Term 1
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SocialQuality.map((quality) => (
                      <div
                        key={`term1-${quality.id}`}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">
                              {quality.quality_name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {quality.description ||
                                "Personal quality assessment"}
                            </p>
                          </div>

                          <div className="mt-auto">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                              Grade (Term 1)
                            </label>
                            <input
                              type="text"
                              value={getPersonalGradeValue(quality.id, "term1")}
                              onChange={(e) =>
                                handlePersonalQualityGradeChange(
                                  quality.id,
                                  "term1",
                                  e.target.value
                                )
                              }
                              className="input input-bordered w-full bg-white dark:bg-gray-600 dark:text-gray-100"
                              placeholder="Enter grade (e.g. A, B, C)"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Term 2 Personal Qualities */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">
                    Term 2
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SocialQuality.map((quality) => (
                      <div
                        key={`term2-${quality.id}`}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">
                              {quality.quality_name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {quality.description ||
                                "Personal quality assessment"}
                            </p>
                          </div>

                          <div className="mt-auto">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                              Grade (Term 2)
                            </label>
                            <input
                              type="text"
                              value={getPersonalGradeValue(quality.id, "term2")}
                              onChange={(e) =>
                                handlePersonalQualityGradeChange(
                                  quality.id,
                                  "term2",
                                  e.target.value
                                )
                              }
                              className="input input-bordered w-full bg-white dark:bg-gray-600 dark:text-gray-100"
                              placeholder="Enter grade (e.g. A, B, C)"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Non-Scholastic Grades Section */}
            {nonScholasticSubjects.length > 0 && (
              <div className="col-span-full mt-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                  Non-Scholastic Grades
                </h3>

                {/* Term 1 Non-Scholastic Subjects */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">
                    Term 1
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nonScholasticSubjects.map((subject) => (
                      <div
                        key={`term1-non-${subject.id}`}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">
                              {subject.subject_name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Non-Scholastic Subject
                            </p>
                          </div>

                          <div className="mt-auto">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                              Grade (Term 1)
                            </label>
                            <input
                              type="text"
                              value={getNonScholasticGradeValue(
                                subject.id,
                                "term1"
                              )}
                              onChange={(e) =>
                                handleNonScholasticGradeChange(
                                  subject.id,
                                  "term1",
                                  e.target.value
                                )
                              }
                              className="input input-bordered w-full bg-white dark:bg-gray-600 dark:text-gray-100"
                              placeholder="Enter grade (e.g. A, B, C)"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Term 2 Non-Scholastic Subjects */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">
                    Term 2
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nonScholasticSubjects.map((subject) => (
                      <div
                        key={`term2-non-${subject.id}`}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">
                              {subject.subject_name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Non-Scholastic Subject
                            </p>
                          </div>

                          <div className="mt-auto">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                              Grade (Term 2)
                            </label>
                            <input
                              type="text"
                              value={getNonScholasticGradeValue(
                                subject.id,
                                "term2"
                              )}
                              onChange={(e) =>
                                handleNonScholasticGradeChange(
                                  subject.id,
                                  "term2",
                                  e.target.value
                                )
                              }
                              className="input input-bordered w-full bg-white dark:bg-gray-600 dark:text-gray-100"
                              placeholder="Enter grade (e.g. A, B, C)"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button with Status */}
            <div className="col-span-full mt-8">
              <div className="flex flex-col items-center gap-4">
                {/* Submit Button */}
                <button
                  type="submit"
                  className={`btn bgTheme text-white px-8 py-3 transition-all`}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-pen-to-square mr-2"></i>
                      Update Marksheet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800">
            <div className="text-center">
              <i className="fa-solid fa-circle-check text-5xl text-green-500 mb-4"></i>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                Success!
              </h3>
              <p className="py-1 text-gray-600 dark:text-gray-300">
                {successMessage}
              </p>
            </div>
            <div className="modal-action justify-center">
              <button
                className="btn w-32 bgTheme text-white"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(-1);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg py-1">Edit Marksheet</h3>
            <p className="py-6">{errorMessage}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
                onClick={() => setShowErrorModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default EditMarksheet;