import React, { useContext, useEffect, useRef, useState } from "react";
import {
  fetchSchoolYear,
  fetchStudents1,
  fetchTerms,
  fetchYearLevels,
} from "../../services/api/Api";
import { useForm } from "react-hook-form";
import { AuthContext } from "../../context/AuthContext";

export const CreateMarksheet = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [className, setClassName] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksData, setmarksData] = useState([]);
  const [SocialQuality, setSocialQuality] = useState([]);
  const [nonScholasticSubjects, setNonScholasticSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [studentLevel, setstudentLevel] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedYearlvl, setselectedYearlvl] = useState(null);
  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // State for storing grades for all terms
  const [personalQualityGrades, setPersonalQualityGrades] = useState({});
  const [nonScholasticGrades, setNonScholasticGrades] = useState({});

  const studentDropdownRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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

  // Fetch all classes
  const getClassName = async () => {
    try {
      const ClassName = await fetchYearLevels();
      setClassName(ClassName);
    } catch (err) {
      console.log("Failed to load classes. Please try again." + err);
    }
  };

  // Get term
  const getTerms = async () => {
    try {
      const obj = await fetchTerms();
      setTerms(obj);
    } catch (err) {
      console.error("Failed to load terms:", err);
    }
  };

  // Fetch Students
  const getStudents = async (classId) => {
    setLoadingStudents(true);
    try {
      const Students = await fetchStudents1(classId);
      setStudents(Students);
    } catch (err) {
      console.log("Failed to load students. Please try again." + err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const getSchoolYears = async () => {
    try {
      const res = await fetchSchoolYear();
      setSchoolYears(res);
    } catch (err) {
      console.error("Failed to load school years:", err);
    }
  };

  const getSocialQuality = async () => {
    try {
      const res = await axiosInstance.get(`/d/personal-social-quality/`);
      setSocialQuality(res.data);
      // Initialize grades object for both terms
      const initialGrades = {};
      res.data.forEach((quality) => {
        initialGrades[quality.id] = {
          term1: "",
          term2: "",
        };
      });
      setPersonalQualityGrades(initialGrades);
    } catch (err) {
      console.error("Failed to load social quality:", err);
    }
  };

  const getScholasticGrades = async () => {
    try {
      const res = await axiosInstance.get(
        `/d/non-scholastic-grades/non_schl_subject/`
      );
      setNonScholasticSubjects(res.data);
      // Initialize grades object for both terms
      const initialGrades = {};
      res.data.forEach((subject) => {
        initialGrades[subject.id] = {
          term1: "",
          term2: "",
        };
      });
      setNonScholasticGrades(initialGrades);
    } catch (err) {
      console.error("Failed to load scholastic grades:", err);
    }
  };

  const getMarks = async () => {
    try {
      const studentMarks = await axiosInstance.get(
        `/d/Student-Marks/get_marks/?school_year=${selectedYearlvl}&student_id=${selectedStudentId}`
      );
      setmarksData(studentMarks.data);
    } catch (err) {
      console.log("Failed to load marks. Please try again." + err);
    }
  };

  useEffect(() => {
    getClassName();
    getSchoolYears();
    getSocialQuality();
    getScholasticGrades();
    getTerms();
  }, []);

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    setSelectedStudentId("");
    setSelectedStudentName("");
    setValue("student", "");
  };

  const handleSchoolYearChange = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    setselectedYearlvl(selectedOption.text);
  };

  useEffect(() => {
    if (selectedClassId) {
      getStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedStudentId && selectedYearlvl && selectedClassId) {
      getMarks();
    } else {
      setmarksData([]);
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
    setPersonalQualityGrades((prev) => ({
      ...prev,
      [qualityId]: {
        ...prev[qualityId],
        [term]: grade,
      },
    }));
  };

  // Handle grade changes for non-scholastic subjects
  const handleNonScholasticGradeChange = (subjectId, term, grade) => {
    setNonScholasticGrades((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [term]: grade,
      },
    }));
  };

  // Helper function to get term IDs
  const getTermId = (termNumber) => {
    const term = terms.find((t) => t.term_number === termNumber);
    return term ? term.id : null;
  };

  // Check if all required fields are filled
  const formReady =
    schoolYearValue &&
    yearLevelValue &&
    studentValue &&
    rankValue &&
    teacherRemarkValue &&
    schoolReopenDateValue &&
    !errors.rank &&
    !errors.teacher_remark &&
    !errors.school_reopen_date &&
    !errors.school_year &&
    !errors.year_level &&
    !errors.student;

  const filteredStudents = students
    .filter((studentObj) =>
      studentObj.student_name
        .toLowerCase()
        .includes(searchStudentInput.toLowerCase())
    )
    .sort((a, b) => a.student_name.localeCompare(b.student_name));

  const onSubmit = async (data) => {
    try {
      /* -------------------- 1️⃣ Create Report Card -------------------- */
      const reportCardPayload = {
        student_level: studentLevel,
        rank: data.rank,
        teacher_remark: data.teacher_remark,
        school_reopen_date: data.school_reopen_date,
      };

      const reportCardRes = await axiosInstance.post(
        "/d/report-cards/",
        reportCardPayload
      );

      const reportCardId = reportCardRes.data.id;

      /* -------------------- 2️⃣ Prepare Personal Quality Payload for Both Terms -------------------- */
      const personalQualityPayload = [];

      // Process Term 1 grades
      const term1Id = getTermId(1);
      if (term1Id) {
        Object.entries(personalQualityGrades).forEach(([qualityId, grades]) => {
          if (grades.term1 && grades.term1.trim() !== "") {
            personalQualityPayload.push({
              report_card: reportCardId,
              personal_quality: Number(qualityId),
              term: term1Id,
              grade: grades.term1.trim(),
            });
          }
        });
      }

      // Process Term 2 grades
      const term2Id = getTermId(2);
      if (term2Id) {
        Object.entries(personalQualityGrades).forEach(([qualityId, grades]) => {
          if (grades.term2 && grades.term2.trim() !== "") {
            personalQualityPayload.push({
              report_card: reportCardId,
              personal_quality: Number(qualityId),
              term: term2Id,
              grade: grades.term2.trim(),
            });
          }
        });
      }

      /* -------------------- 3️⃣ Prepare Non-Scholastic Payload for Both Terms -------------------- */
      const nonScholasticPayload = [];

      // Process Term 1 grades
      if (term1Id) {
        Object.entries(nonScholasticGrades).forEach(([subjectId, grades]) => {
          if (grades.term1 && grades.term1.trim() !== "") {
            nonScholasticPayload.push({
              report_card: reportCardId,
              non_scholastic_subject: Number(subjectId),
              term: term1Id,
              grade: grades.term1.trim(),
            });
          }
        });
      }

      // Process Term 2 grades
      if (term2Id) {
        Object.entries(nonScholasticGrades).forEach(([subjectId, grades]) => {
          if (grades.term2 && grades.term2.trim() !== "") {
            nonScholasticPayload.push({
              report_card: reportCardId,
              non_scholastic_subject: Number(subjectId),
              term: term2Id,
              grade: grades.term2.trim(),
            });
          }
        });
      }

      /* -------------------- 4️⃣ Fire ALL POSTS AT ONCE -------------------- */
      const apiCalls = [];

      if (personalQualityPayload.length > 0) {
        apiCalls.push(
          axiosInstance.post(
            "/d/personal-social-grades/",
            personalQualityPayload
          )
        );
      }

      if (nonScholasticPayload.length > 0) {
        apiCalls.push(
          axiosInstance.post("/d/non-scholastic-grades/", nonScholasticPayload)
        );
      }

      await Promise.all(apiCalls);

      /* -------------------- SUCCESS -------------------- */
      setSuccessMessage("Marksheet created successfully!");
      setShowSuccessModal(true);

      reset();
      setmarksData([]);

      // Reset grades for both terms
      const resetPersonalGrades = {};
      SocialQuality.forEach((quality) => {
        resetPersonalGrades[quality.id] = {
          term1: "",
          term2: "",
        };
      });
      setPersonalQualityGrades(resetPersonalGrades);

      const resetNonScholasticGrades = {};
      nonScholasticSubjects.forEach((subject) => {
        resetNonScholasticGrades[subject.id] = {
          term1: "",
          term2: "",
        };
      });
      setNonScholasticGrades(resetNonScholasticGrades);
    } catch (error) {
      console.error("Submission failed:", error);

      const apiMessage =
        error.response?.data?.error || error.response?.data?.message;

      if (
        apiMessage ===
        "Report card for this student and academic year already exists."
      ) {
        setErrorMessage(apiMessage);
      } else {
        setErrorMessage("Failed to create marksheet. Please try again.");
      }

      setShowErrorModal(true);
    }
  };

  // Helper function to get missing required fields
  const getMissingFields = () => {
    const missing = [];
    if (!schoolYearValue) missing.push("School Year");
    if (!yearLevelValue) missing.push("Year Level");
    if (!studentValue) missing.push("Student");
    if (!rankValue) missing.push("Rank");
    if (!teacherRemarkValue) missing.push("Teacher's Remark");
    if (!schoolReopenDateValue) missing.push("School Reopen Date");
    return missing;
  };

  const missingFields = getMissingFields();

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-box my-5 shadow-sm dark:shadow-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
          <i className="fa-solid fa-file-pen ml-2"></i> Create Marksheet
        </h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Main Grid Container for All Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Required Section Header */}
            <div className="col-span-full">
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                Required Information
              </h3>
            </div>

            {/* School Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                School Year <span className="text-red-500">*</span>
              </label>
              <select
                {...register("school_year", {
                  required: "School year is required",
                })}
                onChange={handleSchoolYearChange}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select School Year</option>
                {schoolYears?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.school_year.message}
                </p>
              )}
            </div>

            {/* Year Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year Level <span className="text-red-500">*</span>
              </label>
              <select
                {...register("year_level", {
                  required: "Year level is required",
                })}
                onChange={handleClassChange}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select Year Level</option>
                {className?.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.level_name}
                  </option>
                ))}
              </select>
              {errors.year_level && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.year_level.message}
                </p>
              )}
            </div>

            {/* Student */}
            <div className="relative" ref={studentDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student <span className="text-red-500">*</span>
              </label>
              <div
                className="select select-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                <span className={selectedStudentName ? "" : "text-gray-400"}>
                  {selectedStudentName || "Select Student"}
                </span>
              </div>

              <input
                type="hidden"
                {...register("student", { required: "Student is required" })}
                value={selectedStudentId || ""}
              />

              {showStudentDropdown && (
                <div className="absolute z-50 bg-white dark:bg-gray-700 rounded-lg w-full mt-1 shadow-xl border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      placeholder="Search Student..."
                      className="input input-sm input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                      value={searchStudentInput}
                      onChange={(e) => setSearchStudentInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoComplete="off"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {loadingStudents ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Loading students...
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      filteredStudents.map((studentObj) => (
                        <div
                          key={studentObj.student_id}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          onClick={() => {
                            console.log(studentObj);
                            setSelectedStudentId(studentObj.id);
                            setSelectedStudentName(
                              studentObj.student_name +
                                " " +
                                studentObj.scholar_number
                            );
                            setSearchStudentInput("");
                            setShowStudentDropdown(false);
                            setstudentLevel(studentObj.id);
                            setValue("student", studentObj.id, {
                              shouldValidate: true,
                            });
                          }}
                        >
                          {studentObj.student_name +
                            " " +
                            studentObj.scholar_number}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No students found
                      </div>
                    )}
                  </div>
                </div>
              )}
              {errors.student && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.student.message}
                </p>
              )}
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

            {/* Student Marks Preview Section */}
            {selectedStudentId &&
              selectedYearlvl &&
              selectedClassId &&
              marksData &&
              Object.keys(marksData).length > 0 && (
                <>
                  <div className="col-span-full mt-8">
                    <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                      Student Marks Preview
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

                            <div className="p-4 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">
                              <div className="flex justify-between mb-2">
                                <span className="font-medium">
                                  <i className="fa-solid fa-calendar-days mr-1 text-xs"></i>
                                  School Year:
                                </span>
                                <span className="font-semibold">
                                  {marksEntry.school_year}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  <i className="fa-solid fa-graduation-cap mr-1 text-xs"></i>
                                  Class:
                                </span>
                                <span className="font-semibold">
                                  {marksEntry.year_level}
                                </span>
                              </div>
                            </div>

                            <div className="p-4">
                              {marksEntry.data && marksEntry.data.length > 0 ? (
                                <ul className="space-y-2">
                                  {marksEntry.data.map((subjectItem, idx) => {
                                    const studentMark =
                                      subjectItem.student_marks?.[0];
                                    return (
                                      <li
                                        key={idx}
                                        className="bg-gray-50 dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                                      >
                                        <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                                          {subjectItem.subject}
                                        </span>
                                        <span className="px-3 py-1 rounded-full">
                                          {studentMark
                                            ? studentMark.marks
                                            : "N/A"}
                                        </span>
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
                            value={
                              personalQualityGrades[quality.id]?.term1 || ""
                            }
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
                            value={
                              personalQualityGrades[quality.id]?.term2 || ""
                            }
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

            {/* Non-Scholastic Grades Section */}
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
                            value={nonScholasticGrades[subject.id]?.term1 || ""}
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
                            value={nonScholasticGrades[subject.id]?.term2 || ""}
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

            {/* Submit Button with Status */}
            <div className="col-span-full mt-8">
              <div className="flex flex-col items-center gap-4">
                {/* Submit Button */}
                <button
                  type="submit"
                  className={`btn bgTheme text-white px-8 py-3 transition-all ${
                    formReady
                      ? " hover:bg-opacity-90"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  disabled={isSubmitting || !formReady}
                  title={
                    !formReady
                      ? `Please fill in: ${missingFields.join(", ")}`
                      : "Submit Marksheet"
                  }
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane mr-2"></i>
                      Submit Marksheet
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
                onClick={() => setShowSuccessModal(false)}
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
            <h3 className="font-bold text-lg py-1">CreateMarksheet</h3>
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
