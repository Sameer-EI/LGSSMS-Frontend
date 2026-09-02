import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import {
  fetchYearLevels,
  fetchSubjects,
  fetchTerms,
  fetchAllTeachers,
} from "../../services/api/Api";
import { useNavigate, useParams } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";

const UpdateExamPaper = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { axiosInstance } = useContext(AuthContext);

  const [examType, setExamType] = useState([]);
  const [className1, setClassName] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [currentPaper, setCurrentPaper] = useState(null);

  // Dropdown states
  const [showExamTypeDropdown, setShowExamTypeDropdown] = useState(false);
  const [searchExamType, setSearchExamType] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [searchSubject, setSearchSubject] = useState("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [searchTeacher, setSearchTeacher] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      exam_type: "",
      term: "",
      subject: "",
      year_level: "",
      total_marks: "",
      paper_code: "",
      teacher: "",
      uploaded_file: null,
    },
  });

  // Fetch Exam Types
  const getExamType = async () => {
    try {
      const response = await axiosInstance.get("/d/Exam-Type/");
      setExamType(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to load exam types:", err);
      return [];
    }
  };

  // Fetch Year Levels
  const getClassName = async () => {
    try {
      const data = await fetchYearLevels();
      setClassName(data);
      return data;
    } catch (err) {
      console.log("Failed to load classes:", err);
      return [];
    }
  };

  // Fetch Subjects
  const getSubjects = async () => {
    try {
      const data = await fetchSubjects();
      setSubjects(data);
      return data;
    } catch (err) {
      console.log("Failed to load subjects:", err);
      return [];
    }
  };

  // Fetch Terms
  const getTerms = async () => {
    try {
      const data = await fetchTerms();
      setTerms(data);
      return data;
    } catch (err) {
      console.log("Failed to load terms:", err);
      return [];
    }
  };

  // Fetch Teachers
  const getTeachers = async () => {
    try {
      const data = await fetchAllTeachers();
      setTeachers(data);
      return data;
    } catch (err) {
      console.log("Failed to load teachers:", err);
      return [];
    }
  };

  // Fetch All Exam Papers
  const fetchExamPaper = async () => {
    try {
      const response = await axiosInstance.get(`/d/Exam-Paper/get_exampaper/`);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch exam papers:", err);
      throw err;
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".form-control.relative")) {
        setShowExamTypeDropdown(false);
        setShowSubjectDropdown(false);
        setShowTeacherDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Main Loader Effect
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setAlertMessage("No exam paper ID provided.");
        setShowAlert(true);
        navigate(allRouterLink.UploadExamPaper);
        return;
      }

      setLoadingPaper(true);

      try {
        const examTypesData = await getExamType();
        const classesData = await getClassName();
        const subjectsData = await getSubjects();
        const termsData = await getTerms();
        const teachersData = await getTeachers();
        const allPapers = await fetchExamPaper();

        const foundPaper = allPapers.find(
          (paper) => String(paper.id) === String(id)
        );

        if (!foundPaper) {
          throw new Error("Exam paper not found.");
        }

        setCurrentPaper(foundPaper);

        const examTypeItem = examTypesData.find(
          (et) =>
            et.name?.trim().toLowerCase() ===
            foundPaper.exam_name?.trim().toLowerCase()
        );

        const classItem = classesData.find(
          (c) =>
            c.level_name?.trim().toLowerCase() ===
            foundPaper.year_level_name?.trim().toLowerCase()
        );

        const subjectItem = subjectsData.find(
          (s) =>
            s.subject_name?.trim().toLowerCase() ===
            foundPaper.subject_name?.trim().toLowerCase()
        );

        const termItem = termsData.find(
          (t) =>
            t.year?.trim().toLowerCase() === foundPaper.year?.trim().toLowerCase()
        );

        const teacherItem = teachersData.find(
          (t) =>
            `${t.first_name || ""} ${t.last_name || ""}`
              .trim()
              .toLowerCase() ===
            (foundPaper.teacher_name || "").trim().toLowerCase()
        );

        reset({
          exam_type: examTypeItem?.id || "",
          year_level: classItem?.id || "",
          subject: subjectItem?.id || "",
          term: termItem?.id || "",
          teacher: teacherItem?.id || "",
          total_marks: foundPaper.total_marks || "",
          paper_code: foundPaper.paper_code || "",
          uploaded_file: null,
        });
      } catch (err) {
        console.error("Error loading exam paper:", err);
        setAlertMessage(err.message || "Failed to load exam paper data.");
        setShowAlert(true);
        setTimeout(() => {
          navigate(allRouterLink.UploadExamPaper);
        }, 3000);
      } finally {
        setLoadingPaper(false);
      }
    };

    loadData();
  }, [id, reset, navigate]);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("exam_type", data.exam_type);
    formData.append("term", data.term);
    formData.append("subject", data.subject);
    formData.append("year_level", data.year_level);
    formData.append("total_marks", data.total_marks);
    formData.append("paper_code", data.paper_code);
    formData.append("teacher", data.teacher);
    if (data.uploaded_file && data.uploaded_file[0]) {
      formData.append("uploaded_file", data.uploaded_file[0]);
    }

    try {
       const response = await axiosInstance.put(
        "/d/Exam-Paper/update_exampaper/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );


      if ([200, 201].includes(response.status)) {
        setAlertMessage("Exam Paper updated successfully!");
        setShowAlert(true);
        reset();
      } else {
        throw new Error(response.data.message || "Update failed");
      }
    } catch (error) {
      console.error("Submission error:", error);
      setAlertMessage(
        `Error: ${error.response?.data?.detail || error.message}`
      );
      setShowAlert(true);
    }
  };

  // Helper functions
  const getTeacherFullName = (teacher) => {
    return `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();
  };

  const getExamTypeDisplay = (examType) => {
    return examType?.name || "Select Exam Type";
  };

  const getSubjectDisplay = (subject) => {
    return subject?.subject_name || "Select Subject";
  };

  // ➤ LOADING STATE
  if (loadingPaper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-3xl font-bold text-center mb-8 dark:text-white">
            Update Exam Paper <i className="fa-solid fa-pen-nib ml-2"></i>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* ===== CUSTOM DROPDOWN: EXAM TYPE ===== */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Exam Type <span className="text-error">*</span>
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowExamTypeDropdown(!showExamTypeDropdown)}
              >
                {watch("exam_type")
                  ? getExamTypeDisplay(
                      examType.find((et) => String(et.id) === String(watch("exam_type")))
                    )
                  : "Select Exam Type"}
                <i
                  className={`fa-solid fa-chevron-${
                    showExamTypeDropdown ? "up" : "down"
                  } ml-2`}
                ></i>
              </div>

              {showExamTypeDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Exam Type..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchExamType}
                      onChange={(e) => setSearchExamType(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {examType
                      .filter((et) =>
                        getExamTypeDisplay(et)
                          .toLowerCase()
                          .includes(searchExamType.toLowerCase())
                      )
                      .map((et) => (
                        <p
                          key={et.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("exam_type", et.id.toString(), {
                              shouldValidate: true,
                            });
                            setSearchExamType("");
                            setShowExamTypeDropdown(false);
                          }}
                        >
                          {getExamTypeDisplay(et)}
                        </p>
                      ))}
                  </div>
                </div>
              )}
              {errors.exam_type && (
                <p className="text-error text-sm mt-1">{errors.exam_type.message}</p>
              )}
            </div>

            {/* ===== CUSTOM DROPDOWN: SUBJECT ===== */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Subject <span className="text-error">*</span>
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              >
                {watch("subject")
                  ? getSubjectDisplay(
                      subjects.find((s) => String(s.id) === String(watch("subject")))
                    )
                  : "Select Subject"}
                <i
                  className={`fa-solid fa-chevron-${
                    showSubjectDropdown ? "up" : "down"
                  } ml-2`}
                ></i>
              </div>

              {showSubjectDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Subject..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchSubject}
                      onChange={(e) => setSearchSubject(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {subjects
                      .filter((s) =>
                        getSubjectDisplay(s)
                          .toLowerCase()
                          .includes(searchSubject.toLowerCase())
                      )
                      .map((s) => (
                        <p
                          key={s.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("subject", s.id.toString(), {
                              shouldValidate: true,
                            });
                            setSearchSubject("");
                            setShowSubjectDropdown(false);
                          }}
                        >
                          {getSubjectDisplay(s)}
                        </p>
                      ))}
                  </div>
                </div>
              )}
              {errors.subject && (
                <p className="text-error text-sm mt-1">{errors.subject.message}</p>
              )}
            </div>

            {/* ===== CUSTOM DROPDOWN: TEACHER ===== */}
            <div className="form-control relative">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Teacher <span className="text-error">*</span>
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
              >
                {watch("teacher")
                  ? getTeacherFullName(
                      teachers.find((t) => String(t.id) === String(watch("teacher")))
                    )
                  : "Select Teacher"}
                <i
                  className={`fa-solid fa-chevron-${
                    showTeacherDropdown ? "up" : "down"
                  } ml-2`}
                ></i>
              </div>

              {showTeacherDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Teacher..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {teachers
                      .filter((t) =>
                        getTeacherFullName(t)
                          .toLowerCase()
                          .includes(searchTeacher.toLowerCase())
                      )
                      .map((t) => (
                        <p
                          key={t.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue("teacher", t.id.toString(), {
                              shouldValidate: true,
                            });
                            setSearchTeacher("");
                            setShowTeacherDropdown(false);
                          }}
                        >
                          {getTeacherFullName(t)}
                        </p>
                      ))}
                  </div>
                </div>
              )}
              {errors.teacher && (
                <p className="text-error text-sm mt-1">{errors.teacher.message}</p>
              )}
            </div>

            {/* ===== STANDARD SELECTS: YEAR LEVEL & TERM ===== */}
            {[
              {
                label: "Year Level",
                name: "year_level",
                data: className1,
                key: "level_name",
                error: errors.year_level,
                requiredMsg: "Year Level is required",
              },
              {
                label: "Term",
                name: "term",
                data: terms,
                key: "year",
                error: errors.term,
                requiredMsg: "Term is required",
                renderValue: (item) => `${item.year} - Term ${item.term_number}`,
              },
            ].map(({ label, name, data, key, error, render, renderValue, requiredMsg }) => (
              <div className="form-control" key={name}>
                <label className="label">
                  <span className="label-text dark:text-gray-200">
                    {label} <span className="text-error">*</span>
                  </span>
                </label>
                <select
                  className="select select-bordered w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  {...register(name, { required: requiredMsg })}
                >
                  <option value="">Select {label}</option>
                  {data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {renderValue ? renderValue(item) : render ? render(item) : item[key]}
                    </option>
                  ))}
                </select>
                {error && <p className="text-error text-sm mt-1">{error.message}</p>}
              </div>
            ))}

            {/* Total Marks */}
            <div className="form-control">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Total Marks <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter total marks"
                {...register("total_marks", {
                  required: "Total marks is required",
                  min: { value: 1, message: "Marks must be positive" },
                })}
              />
              {errors.total_marks && (
                <p className="text-error text-sm mt-1">{errors.total_marks.message}</p>
              )}
            </div>

            {/* Paper Code */}
            <div className="form-control">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Paper Code <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter paper code"
                {...register("paper_code", {
                  required: "Paper code is required",
                  pattern: {
                    value: /^[a-zA-Z0-9-]+$/,
                    message: "Only letters, numbers and hyphens allowed",
                  },
                })}
              />
              {errors.paper_code && (
                <p className="text-error text-sm mt-1">{errors.paper_code.message}</p>
              )}
            </div>

            {/* File Upload */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Exam Paper File <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="file"
                className="file-input file-input-bordered w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                accept=".pdf,.doc,.docx"
                {...register("uploaded_file", {
                  required:
                    !currentPaper?.uploaded_file_url && "File is required",
                  validate: {
                    fileSize: (files) =>
                      !files?.[0] ||
                      files[0].size <= 5 * 1024 * 1024 ||
                      "File size must be less than 5MB",
                    fileType: (files) =>
                      !files?.[0] ||
                      [
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      ].includes(files[0].type) ||
                      "Only PDF and Word documents are allowed",
                  },
                })}
              />
              {!watch("uploaded_file") && currentPaper?.uploaded_file_url && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Current file:{" "}
                  <a
                    href={currentPaper.uploaded_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline hover:text-blue-700"
                  >
                    {currentPaper.paper_code || "Download Current File"}
                  </a>
                </div>
              )}
              {errors.uploaded_file && (
                <p className="text-error text-sm mt-1">
                  {errors.uploaded_file.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn bgTheme text-white w-52"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-upload mr-2" />
                  Update Paper
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">Update Exam Paper</h3>
            <p className="py-4">{alertMessage}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white"
                onClick={() => setShowAlert(false)}
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

export default UpdateExamPaper;