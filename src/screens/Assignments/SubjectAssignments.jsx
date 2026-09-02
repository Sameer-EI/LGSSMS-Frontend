import React, { useContext, useEffect, useRef, useState } from "react";
import {
  fetchPeriods,
  fetchSubjects,
  fetchTeachers,
  fetchYearLevels,
} from "../../services/api/Api";
import { constants } from "../../global/constants";
import { useNavigate } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";
import { useForm } from "react-hook-form";

export const SubjectAssignments = () => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const { axiosInstance } = useContext(AuthContext);
  const [teachers, setTeachers] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [subject_ids, setSubjectIds] = useState([]);
  const [period_ids, setPeriodIds] = useState([]);

  const [subjectSearch, setSubjectSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [yearLevelSearch, setYearLevelSearch] = useState("");
  const [periodSearch, setPeriodSearch] = useState("");
  const [termSearch, setTermSearch] = useState("");
  const [classroomSearch, setClassroomSearch] = useState("");

  // States for filtered data
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [filteredYearLevels, setFilteredYearLevels] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [filteredPeriods, setFilteredPeriods] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);

  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const [isYearLevelOpen, setIsYearLevelOpen] = useState(false);
  const [isTermOpen, setIsTermOpen] = useState(false);
  const [isClassroomOpen, setIsClassroomOpen] = useState(false);

  const subjectRef = useRef(null);
  const periodRef = useRef(null);
  const teacherRef = useRef(null);
  const yearLevelRef = useRef(null);
  const termRef = useRef(null);
  const classroomRef = useRef(null);

  // Loader states
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingYearLevels, setLoadingYearLevels] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Watch form values to display selected options
  const selectedTeacherId = watch("teacher_id");
  const selectedYearLevelId = watch("yearlevel_id");
  const selectedTermId = watch("term_id");
  const selectedClassroomId = watch("classroom_id");

  // Get selected teacher name
  const getSelectedTeacherName = () => {
    if (!selectedTeacherId) return "Select Teacher";
    const teacher = teachers.find((t) => t.id === parseInt(selectedTeacherId));
    return teacher
      ? `${teacher.first_name} ${teacher.middle_name || ""} ${teacher.last_name
      }`.trim()
      : "Select Teacher";
  };

  // Get selected year level name
  const getSelectedYearLevelName = () => {
    if (!selectedYearLevelId) return "Select Year Level";
    const yearLevel = yearLevels.find(
      (y) => y.id === parseInt(selectedYearLevelId)
    );
    return yearLevel ? yearLevel.level_name : "Select Year Level";
  };

  // Get selected term name - FIXED: using term_number instead of name
  const getSelectedTermName = () => {
    if (!selectedTermId) return "Select Term";
    const term = terms.find((t) => t.id === parseInt(selectedTermId));
    return term ? `Term ${term.term_number} (${term.year})` : "Select Term";
  };

  // Get selected classroom name - FIXED: using room_name instead of name
  const getSelectedClassroomName = () => {
    if (!selectedClassroomId) return "Select Classroom";
    const classroom = classrooms.find((c) => c.id === parseInt(selectedClassroomId));
    return classroom ? classroom.room_name : "Select Classroom";
  };

  // Filtering functions with sorting
  const filterTeachersData = (teachersData, searchTerm) => {
    const filtered = teachersData.filter((t) =>
      `${t.first_name} ${t.middle_name || ""} ${t.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    // Sort teachers alphabetically by first name + last name
    return filtered.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const filterYearLevelsData = (yearLevelsData, searchTerm) => {
    const filtered = yearLevelsData.filter((y) =>
      y.level_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered
  };

  const filterSubjectsData = (subjectsData, searchTerm) => {
    const filtered = subjectsData.filter((s) =>
      s.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort subjects by name
    return filtered.sort((a, b) =>
      a.subject_name.localeCompare(b.subject_name)
    );
  };

  const filterPeriodsData = (periodsData, searchTerm) => {
    return periodsData.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // FIXED: Use term_number for filtering terms
  const filterTermsData = (termsData, searchTerm) => {
    const filtered = termsData.filter((t) => {
      // Check if term exists and has term_number property
      if (!t || typeof t !== 'object') return false;
      
      // Search in both term_number and year
      const searchTermLower = searchTerm.toLowerCase();
      const termNumberStr = t.term_number ? t.term_number.toString() : '';
      const yearStr = t.year ? t.year.toLowerCase() : '';
      
      return termNumberStr.includes(searchTermLower) || 
             yearStr.includes(searchTermLower);
    });
    return filtered;
  };

  // FIXED: Use room_name for filtering classrooms
  const filterClassroomsData = (classroomsData, searchTerm) => {
    const filtered = classroomsData.filter((c) => {
      // Check if classroom exists and has room_name property
      if (!c || typeof c !== 'object') return false;
      
      const searchTermLower = searchTerm.toLowerCase();
      const roomNameStr = c.room_name ? c.room_name.toLowerCase() : '';
      
      return roomNameStr.includes(searchTermLower);
    });
    return filtered;
  };

  // Update filtered data when search terms or original data change
  useEffect(() => {
    setFilteredTeachers(filterTeachersData(teachers, teacherSearch));
  }, [teachers, teacherSearch]);

  useEffect(() => {
    setFilteredYearLevels(filterYearLevelsData(yearLevels, yearLevelSearch));
  }, [yearLevels, yearLevelSearch]);

  useEffect(() => {
    if (!selectedYearLevelId) {
      setFilteredSubjects(filterSubjectsData(subjects, subjectSearch));
    } else {
      const classId = parseInt(selectedYearLevelId);
      const filtered = subjects.filter((subject) =>
        subject.year_levels.includes(classId)
      );
      const searched = filterSubjectsData(filtered, subjectSearch);
      setFilteredSubjects(searched);
    }
  }, [selectedYearLevelId, subjects, subjectSearch]);


  useEffect(() => {
    setFilteredPeriods(filterPeriodsData(periods, periodSearch));
  }, [periods, periodSearch]);

  useEffect(() => {
    setFilteredTerms(filterTermsData(terms, termSearch));
  }, [terms, termSearch]);

  useEffect(() => {
    setFilteredClassrooms(filterClassroomsData(classrooms, classroomSearch));
  }, [classrooms, classroomSearch]);

  useEffect(() => {
    const preloadData = async () => {
      try {
        setLoadingTeachers(true);
        setLoadingYearLevels(true);
        setLoadingSubjects(true);
        setLoadingPeriods(true);
        setLoadingTerms(true);
        setLoadingClassrooms(true);

        const [teachersData, yearLevelsData, subjectsData, periodsData] =
          await Promise.all([
            fetchTeachers(),
            fetchYearLevels(),
            fetchSubjects(),
            fetchPeriods(),
          ]);

        setTeachers(teachersData);
        setYearLevels(yearLevelsData);
        setSubjects(subjectsData);
        setPeriods(periodsData);

        // Initialize filtered data with sorted data
        setFilteredTeachers(filterTeachersData(teachersData, ""));
        setFilteredYearLevels(filterYearLevelsData(yearLevelsData, ""));
        setFilteredSubjects(filterSubjectsData(subjectsData, ""));
        setFilteredPeriods(filterPeriodsData(periodsData, ""));

        // Fetch terms and classrooms
        try {
          const termsResponse = await axiosInstance.get("/d/terms/");
          setTerms(termsResponse.data);
          setFilteredTerms(filterTermsData(termsResponse.data, ""));
        } catch (error) {
          console.error("Failed to fetch terms:", error);
        }

        try {
          const classroomsResponse = await axiosInstance.get("/d/classrooms/");
          setClassrooms(classroomsResponse.data);
          setFilteredClassrooms(filterClassroomsData(classroomsResponse.data, ""));
        } catch (error) {
          console.error("Failed to fetch classrooms:", error);
        }

      } catch (err) {
        setPageError(true);
      } finally {
        setLoadingTeachers(false);
        setLoadingYearLevels(false);
        setLoadingSubjects(false);
        setLoadingPeriods(false);
        setLoadingTerms(false);
        setLoadingClassrooms(false);
        setPageLoading(false);
      }
    };
    preloadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (subjectRef.current && !subjectRef.current.contains(event.target)) {
        setIsSubjectOpen(false);
      }
      if (periodRef.current && !periodRef.current.contains(event.target)) {
        setIsPeriodOpen(false);
      }
      if (teacherRef.current && !teacherRef.current.contains(event.target)) {
        setIsTeacherOpen(false);
      }
      if (
        yearLevelRef.current &&
        !yearLevelRef.current.contains(event.target)
      ) {
        setIsYearLevelOpen(false);
      }
      if (termRef.current && !termRef.current.contains(event.target)) {
        setIsTermOpen(false);
      }
      if (classroomRef.current && !classroomRef.current.contains(event.target)) {
        setIsClassroomOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMultiSelect = (name, id) => {
    const setState = name === "subject_ids" ? setSubjectIds : setPeriodIds;
    const current = name === "subject_ids" ? [...subject_ids] : [...period_ids];

    const numericId = Number(id);
    const index = current.indexOf(numericId);
    if (index > -1) current.splice(index, 1);
    else current.push(numericId);

    setState(current);
    clearErrors(name);
    clearErrors("api");
  };

  const handleTeacherSelect = (teacherId, teacherName) => {
    setValue("teacher_id", teacherId);
    clearErrors("teacher_id");
    setIsTeacherOpen(false);
    setTeacherSearch(""); // Clear search when teacher is selected
  };

  const handleYearLevelSelect = (yearLevelId, yearLevelName) => {
    setValue("yearlevel_id", yearLevelId);
    clearErrors("yearlevel_id");
    setIsYearLevelOpen(false);
    setYearLevelSearch(""); // Clear search when year level is selected
    setSubjectIds([]);
  };

  const handleTermSelect = (termId) => {
    setValue("term_id", termId);
    clearErrors("term_id");
    setIsTermOpen(false);
    setTermSearch("");
  };

  const handleClassroomSelect = (classroomId) => {
    setValue("classroom_id", classroomId);
    clearErrors("classroom_id");
    setIsClassroomOpen(false);
    setClassroomSearch("");
  };

  const handleSubmitForm = async (data) => {
    // Validate required fields
    if (!data.teacher_id) {
      setError("teacher_id", { message: "Teacher is required" });
      return;
    }

    if (!data.yearlevel_id) {
      setError("yearlevel_id", { message: "Year level is required" });
      return;
    }

    if (!data.term_id) {
      setError("term_id", { message: "Term is required" });
      return;
    }

    if (!data.classroom_id) {
      setError("classroom_id", { message: "Classroom is required" });
      return;
    }

    if (subject_ids.length === 0) {
      setError("subject_ids", { message: "Please select at least one subject." });
      return;
    }

    if (period_ids.length === 0) {
      setError("period_ids", { message: "Please select at least one period." });
      return;
    }

    const finalPayload = {
      ...data,
      subject_ids,
      period_ids,
    };

    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post(
        `/t/teacher/assign-teacher-details/`,
        finalPayload
      );

      if (response.status === 200 || response.status === 201) {
        setAlertMessage("Subjects assigned successfully!");
        setShowAlert(true);
      }
    } catch (error) {
      let errMsg = "Something went wrong. Try again.";

      // If response exists
      const res = error.response?.data;

      if (res) {
        if (res.error) {
          // Customize known error messages
          if (res.error.includes("already assigned")) {
            errMsg = "Teacher is already assigned in this period.";
          } else {
            errMsg = res.error;
          }
        } else if (res.detail) {
          // Shorten the detail message by removing parentheses
          errMsg = res.detail.replace(/\(.*?\)/g, "");
        } else if (typeof res === "object") {
          // Loop through object errors
          Object.keys(res).forEach((key) => {
            const val = res[key];
            if (Array.isArray(val)) errMsg = val[0].replace(/\(.*?\)/g, "");
            else if (typeof val === "string") errMsg = val.replace(/\(.*?\)/g, "");
          });
        }
      } else if (error.message) {
        errMsg = error.message;
      }

      setAlertMessage(errMsg);
      setShowAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleNavigate = () => {
    navigate(allRouterLink.allTeacherAssignment);
  };

  const capitalizeWords = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .filter(Boolean) // remove extra spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (pageLoading) {
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

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-sm">
        <br></br>

        <form onSubmit={handleSubmit(handleSubmitForm)}>
          <div className="w-full border-b border-gray-300 dark:border-gray-700 pb-4">

            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
              Assign Subjects <i className="fa-solid fa-book ml-2" />
            </h1>
            <div className=" flex justify-end">
              <button
                className="btn text-white bgTheme"
                onClick={handleNavigate}
              >
                Teacher Assignments <span>&rarr;</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Teacher Dropdown with Search */}
            <div className="form-control relative" ref={teacherRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Teacher <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsTeacherOpen(!isTeacherOpen)}
                >
                  <span>
                    {loadingTeachers
                      ? "Loading teachers..."
                      : getSelectedTeacherName()}
                  </span>
                </div>
                {isTeacherOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar for Teachers */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="Search teachers..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Teachers */}
                    <div className="">
                      {filteredTeachers.map((t) => {
                        const fullName = `${t.first_name} ${t.middle_name || ""
                          } ${t.last_name}`.trim();
                        return (
                          <div
                            key={t.id}
                            className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center ${selectedTeacherId === t.id.toString()
                              ? "bg-blue-50 dark:bg-blue-900"
                              : ""
                              }`}
                            onClick={() => handleTeacherSelect(t.id, fullName)}
                          >
                            <input
                              type="radio"
                              {...register("teacher_id", {
                                required: "Teacher is required",
                              })}
                              value={t.id}
                              className="hidden"
                              id={`teacher-${t.id}`}
                            />
                            <label
                              htmlFor={`teacher-${t.id}`}
                              className="flex items-center cursor-pointer w-full"
                            >
                              <span>{capitalizeWords(fullName)}</span>
                            </label>
                          </div>
                        );
                      })}

                      {/* No results */}
                      {filteredTeachers.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No teachers found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.teacher_id && (
                <p className="text-red-500 mt-1">{errors.teacher_id.message}</p>
              )}
            </div>

            {/* Year Level Dropdown with Search */}
            <div className="form-control relative" ref={yearLevelRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Year Level <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsYearLevelOpen(!isYearLevelOpen)}
                >
                  <span>
                    {loadingYearLevels
                      ? "Loading year levels..."
                      : getSelectedYearLevelName()}
                  </span>
                </div>
                {isYearLevelOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar for Year Levels */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={yearLevelSearch}
                        onChange={(e) => setYearLevelSearch(e.target.value)}
                        placeholder="Search year levels..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Year Levels */}
                    <div className="">
                      {filteredYearLevels.map((y) => (
                        <div
                          key={y.id}
                          className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center ${selectedYearLevelId === y.id.toString()
                            ? "bg-blue-50 dark:bg-blue-900"
                            : ""
                            }`}
                          onClick={() =>
                            handleYearLevelSelect(y.id, y.level_name)
                          }
                        >
                          <input
                            type="text"
                            {...register("yearlevel_id", {
                              required: "Year level is required",
                            })}
                            value={y.id}
                            className="hidden"
                            id={`yearlevel-${y.id}`}
                          />
                          <label
                            htmlFor={`yearlevel-${y.id}`}
                            className="flex items-center cursor-pointer w-full"
                          >
                            <span>{y.level_name}</span>
                          </label>
                        </div>
                      ))}

                      {/* No results */}
                      {filteredYearLevels.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No year levels found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.yearlevel_id && (
                <p className="text-red-500">{errors.yearlevel_id.message}</p>
              )}
            </div>
          </div>

          {/* New Row for Terms and Classrooms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Terms Dropdown */}
            <div className="form-control relative" ref={termRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Term <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsTermOpen(!isTermOpen)}
                >
                  <span>
                    {loadingTerms
                      ? "Loading terms..."
                      : getSelectedTermName()}
                  </span>
                </div>
                {isTermOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar for Terms */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={termSearch}
                        onChange={(e) => setTermSearch(e.target.value)}
                        placeholder="Search terms by number or year..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Terms */}
                    <div className="">
                      {filteredTerms.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center ${selectedTermId === t.id.toString()
                            ? "bg-blue-50 dark:bg-blue-900"
                            : ""
                            }`}
                          onClick={() => handleTermSelect(t.id)}
                        >
                          <input
                            type="text"
                            {...register("term_id", {
                              required: "Term is required",
                            })}
                            value={t.id}
                            className="hidden"
                            id={`term-${t.id}`}
                          />
                          <label
                            htmlFor={`term-${t.id}`}
                            className="flex items-center cursor-pointer w-full"
                          >
                            <span>Term {t.term_number} ({t.year})</span>
                          </label>
                        </div>
                      ))}

                      {/* No results */}
                      {filteredTerms.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No terms found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.term_id && (
                <p className="text-red-500 mt-1">{errors.term_id.message}</p>
              )}
            </div>

            {/* Classroom Dropdown */}
            <div className="form-control relative" ref={classroomRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Classroom <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsClassroomOpen(!isClassroomOpen)}
                >
                  <span>
                    {loadingClassrooms
                      ? "Loading classrooms..."
                      : getSelectedClassroomName()}
                  </span>
                </div>
                {isClassroomOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar for Classrooms */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={classroomSearch}
                        onChange={(e) => setClassroomSearch(e.target.value)}
                        placeholder="Search classrooms..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Classrooms */}
                    <div className="">
                      {filteredClassrooms.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center ${selectedClassroomId === c.id.toString()
                            ? "bg-blue-50 dark:bg-blue-900"
                            : ""
                            }`}
                          onClick={() => handleClassroomSelect(c.id)}
                        >
                          <input
                            type="text"
                            {...register("classroom_id", {
                              required: "Classroom is required",
                            })}
                            value={c.id}
                            className="hidden"
                            id={`classroom-${c.id}`}
                          />
                          <label
                            htmlFor={`classroom-${c.id}`}
                            className="flex items-center cursor-pointer w-full"
                          >
                            <span>{c.room_name}</span>
                            {c.capacity && (
                              <span className="ml-2 text-xs text-gray-500">
                                (Capacity: {c.capacity})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}

                      {/* No results */}
                      {filteredClassrooms.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No classrooms found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.classroom_id && (
                <p className="text-red-500 mt-1">{errors.classroom_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Subjects Dropdown */}
            <div className="form-control relative" ref={subjectRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Subjects <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsSubjectOpen(!isSubjectOpen)}
                >
                  <span>
                    {subject_ids.length > 0
                      ? `${subject_ids.length} selected`
                      : loadingSubjects
                        ? "Loading subjects..."
                        : "Select Subjects"}
                  </span>
                </div>
                {isSubjectOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar (separate container, sticky) */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        placeholder="Search subjects..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Subjects */}
                    <div className="">
                      {filteredSubjects.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary mr-2"
                            checked={subject_ids.includes(s.id)}
                            onChange={() =>
                              handleMultiSelect("subject_ids", s.id)
                            }
                          />
                          {s.subject_name} ({s.department})
                        </label>
                      ))}

                      {/* No results */}
                      {filteredSubjects.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No subjects found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.subject_ids && (
                <p className="text-red-500 mt-1">
                  {errors.subject_ids.message}
                </p>
              )}
            </div>

            {/* Periods Dropdown */}
            <div className="form-control relative" ref={periodRef}>
              <label className="label">
                <span className="label-text text-gray-700 dark:text-gray-200">
                  Periods <span className="text-error">*</span>
                </span>
              </label>
              <div>
                <div
                  className="select select-bordered w-full cursor-pointer focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex items-center justify-between"
                  onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                >
                  <span>
                    {period_ids.length > 0
                      ? `${period_ids.length} selected`
                      : loadingPeriods
                        ? "Loading periods..."
                        : "Select Periods"}
                  </span>
                </div>
                {isPeriodOpen && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-700  rounded-md shadow max-h-60 overflow-y-auto">
                    {/* Search Bar for Periods */}
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={periodSearch}
                        onChange={(e) => setPeriodSearch(e.target.value)}
                        placeholder="Search periods..."
                        className="input input-bordered w-full focus:outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                      />
                    </div>

                    {/* Filtered Periods */}
                    <div className="">
                      {filteredPeriods.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary mr-2"
                            checked={period_ids.includes(p.id)}
                            onChange={() =>
                              handleMultiSelect("period_ids", p.id)
                            }
                          />
                          {p.name} | {p.start_period_time} - {p.end_period_time}
                        </label>
                      ))}

                      {/* No results */}
                      {filteredPeriods.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          No periods found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.period_ids && (
                <p className="text-red-500 mt-1">{errors.period_ids.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn text-white bgTheme w-52"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                <i className="fa-solid fa-book ml-2" />
              )}
              {isSubmitting ? "" : "Assign"}
            </button>
          </div>
        </form>

        {showAlert && (
          <dialog className="modal modal-open">
            <div className="modal-box bg-white dark:bg-gray-800">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                Subject Assignment
              </h3>
              <p className="py-4 text-gray-700 dark:text-gray-200">
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