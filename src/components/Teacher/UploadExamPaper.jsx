import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  fetchYearLevels,
  fetchSubjects,
  fetchTerms,
  fetchAllTeachers,
} from "../../services/api/Api";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { allRouterLink } from "../../router/AllRouterLinks";
import { constants } from "../../global/constants";
import { useRef } from "react";

//  Axios instance with interceptor
const axiosInstance = axios.create({
  baseURL: constants.baseUrl,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const tokenData = localStorage.getItem("authTokens");
    if (tokenData) {
      try {
        const tokens = JSON.parse(tokenData);
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access.trim()}`;
        }
      } catch (err) {
        console.error("Error parsing token:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const UploadExamPaper = () => {
  const navigate = useNavigate();

  const [examType, setExamType] = useState([]);
  const [className1, setClassName] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [searchSubjectInput, setSearchSubjectInput] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const examTypeRef = useRef(null);
  const teacherRef = useRef(null);
  const subjectRef = useRef(null);



  const [searchTeacherInput, setSearchTeacherInput] = useState("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [selectedTeacherName, setSelectedTeacherName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const [selectedExamType, setSelectedExamType] = useState("");
  const [selectedExamTypeId, setSelectedExamTypeId] = useState("");
  const [searchExamTypeInput, setSearchExamTypeInput] = useState("");
  const [showExamTypeDropdown, setShowExamTypeDropdown] = useState(false);
  console.log(terms);

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
  const selectedYearLevelId = watch("year_level");

  // fetch ExamType 
  const fetchExamType = async () => {
    try {
      const response = await axiosInstance.get(`/d/Exam-Type/`);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch exam type:", err);
      throw err;
    }
  };

  const getExamType = async () => {
    const obj = await fetchExamType();
    if (obj) setExamType(obj);
  };

  const getClassName = async () => {
    const ClassName = await fetchYearLevels();
    setClassName(ClassName);
  };

  const getSubjects = async () => {
    const obj = await fetchSubjects();
    setSubjects(obj);
  };

  const getTerms = async () => {
    const obj = await fetchTerms();
    setTerms(obj);
  };

  const getTeachers = async () => {
    const obj = await fetchAllTeachers();
    setTeachers(obj);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await getExamType();
        await getClassName();
        await getSubjects();
        await getTerms();
        await getTeachers();
        setError(false);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
  setSelectedSubjectId("");
  setSelectedSubjectName("");
  setValue("subject", "");
}, [selectedYearLevelId]);


  const handleNavigate = () => {
    navigate(allRouterLink.UpdateExamPaper);
  };

  const filteredSubjects = subjects
  .filter((subjectObj) => {
    const matchesSearch = subjectObj.subject_name
      .toLowerCase()
      .includes(searchSubjectInput.toLowerCase());

    if (!selectedYearLevelId) {
      return matchesSearch;
    }

    const yearLevelId = parseInt(selectedYearLevelId);
    return matchesSearch && subjectObj.year_levels.includes(yearLevelId);
  })
  .sort((a, b) => a.subject_name.localeCompare(b.subject_name));


  const filteredTeachers = teachers
    .filter((teacherObj) =>
      `${teacherObj.first_name} ${teacherObj.last_name}`
        .toLowerCase()
        .includes(searchTeacherInput.toLowerCase())
    )
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );


  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("exam_type", data.exam_type);
    formData.append("term", data.term);
    formData.append("subject", data.subject);
    formData.append("year_level", data.year_level);
    formData.append("total_marks", data.total_marks);
    formData.append("paper_code", data.paper_code);
    formData.append("teacher", data.teacher);
    formData.append("uploaded_file", data.uploaded_file[0]);

    try {
      const response = await axiosInstance.post(
        `/d/Exam-Paper/create_exampaper/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setAlertMessage("Exam Paper submitted successfully!");
        setShowAlert(true);
        reset();
      } else {
        throw new Error(
          response.data.message || "Failed to create exam paper"
        );
      }
    } catch (error) {
      let backendMsg = "Something went wrong";

      if (error.response?.data) {
        const errData = error.response.data;
        if (typeof errData === "object") {
          backendMsg = Object.values(errData)
            .map((val) => (Array.isArray(val) ? val.join(", ") : val))
            .join("\n");
        } else if (typeof errData === "string") {
          backendMsg = errData;
        }
      } else if (error.message) {
        backendMsg = error.message;
      }

      setAlertMessage(backendMsg);
      setShowAlert(true);
    }
  };

  const filteredExamTypes = examType.filter((examTypeObj) =>
    examTypeObj.name.toLowerCase().includes(searchExamTypeInput.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (examTypeRef.current && !examTypeRef.current.contains(event.target)) {
        setShowExamTypeDropdown(false);
      }
      if (teacherRef.current && !teacherRef.current.contains(event.target)) {
        setShowTeacherDropdown(false);
      }
      if (subjectRef.current && !subjectRef.current.contains(event.target)) {
        setShowSubjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);




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
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-3xl font-bold text-center mb-8 dark:text-white">
            Upload Exam Paper <i className="fa-solid fa-file-upload ml-2"></i>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-clipboard-list text-sm"></i>
                  Exam Type <span className="text-error">*</span>
                </span>
              </label>

              {/* Display box that toggles dropdown */}
              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowExamTypeDropdown(!showExamTypeDropdown)}
              >
                {selectedExamType || "Select Exam Type"}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="arrow">&#9662;</span>
                </div>
              </div>

              {/* Hidden input for react-hook-form */}
              <input
                type="hidden"
                {...register("exam_type", { required: "Exam type is required" })}
                value={selectedExamTypeId || ""}
              />

              {/* Dropdown */}
              {showExamTypeDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600" ref={examTypeRef}>
                  {/* Search input inside dropdown */}
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Exam Type..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchExamTypeInput}
                      onChange={(e) => {
                        setSearchExamTypeInput(e.target.value);
                        setSelectedExamType("");
                      }}
                      autoComplete="off"
                    />
                  </div>

                  {/* Exam type list */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredExamTypes?.length > 0 ? (
                      filteredExamTypes.map((examTypeObj) => (
                        <p
                          key={examTypeObj.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setSelectedExamType(examTypeObj.name);
                            setSelectedExamTypeId(examTypeObj.id);
                            setSearchExamTypeInput("");
                            setShowExamTypeDropdown(false);
                            setValue("exam_type", examTypeObj.id, { shouldValidate: true });
                          }}
                        >
                          {examTypeObj.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No exam types found.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.exam_type && (
                <p className="text-error text-sm mt-1">{errors.exam_type.message}</p>
              )}
            </div>


            {/* Reusable field block */}
            {[
              {
                label: "Year Level",
                name: "year_level",
                data: className1,
                key: "level_name",
                error: errors.year_level,
                requiredMsg: "Year level is required",
              },
              {
                label: "Term",
                name: "term",
                data: terms,
                key: "year",
                error: errors.term,
                requiredMsg: "Term is required",
                renderValue: (item) => `${item.year} - Term ${item.term_number}`
              },

            ].map(({ label, name, data, key, error, requiredMsg, renderValue = null }) => (
              <div className="form-control" key={name}>
                <label className="label">
                  <span className="label-text dark:text-gray-200">
                    {label} <span className="text-error">*</span>
                  </span>
                </label>
                <select
                  className="select select-bordered w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  {...register(name, { required: requiredMsg })}
                >
                  <option value="">Select {label}</option>
                  {data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {renderValue ? renderValue(item) : item[key]}
                    </option>
                  ))}
                </select>
                {error && <p className="text-error text-sm mt-1">{error.message}</p>}
              </div>
            ))}



            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">

                  Teacher <span className="text-error">*</span>
                </span>
              </label>

              {/* Display box that toggles dropdown */}
              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
              >
                {selectedTeacherName || "Select Teacher"}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="arrow">&#9662;</span>
                </div>
              </div>

              {/* Hidden input for react-hook-form */}
              <input
                type="hidden"
                {...register("teacher", { required: "Teacher is required" })}
                value={selectedTeacherId || ""}
              />

              {/* Dropdown */}
              {showTeacherDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600" ref={teacherRef}>
                  {/* Search input inside dropdown */}
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Teacher..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchTeacherInput}
                      onChange={(e) => {
                        setSearchTeacherInput(e.target.value);
                        setSelectedTeacherName("");
                      }}
                      autoComplete="off"
                    />
                  </div>

                  {/* Teacher list */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredTeachers?.length > 0 ? (
                      filteredTeachers.map((teacherObj) => {
                        const teacherFullName = `${teacherObj.first_name} ${teacherObj.last_name}`;
                        return (
                          <p
                            key={teacherObj.id}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                            onClick={() => {
                              setSelectedTeacherId(teacherObj.id);
                              setSelectedTeacherName(teacherFullName);
                              setSearchTeacherInput("");
                              setShowTeacherDropdown(false);
                              setValue("teacher", teacherObj.id, { shouldValidate: true });
                            }}
                          >
                            {teacherFullName}
                          </p>
                        );
                      })
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">No teachers found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.teacher && (
                <p className="text-error text-sm mt-1">{errors.teacher.message}</p>
              )}
            </div>


            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-book-open text-sm"></i>
                  Subject <span className="text-error">*</span>
                </span>
              </label>

              {/* Display box that toggles dropdown */}
              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 capitalize"
                onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              >
                {selectedSubjectName || "Select Subject"}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="arrow">&#9662;</span>
                </div>
              </div>

              {/* Hidden input for react-hook-form */}
              <input
                type="hidden"
                {...register("subject", { required: "Subject is required" })}
                value={selectedSubjectId || ""}
              />

              {/* Dropdown */}
              {showSubjectDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600" ref={subjectRef}>
                  {/* Search input inside dropdown */}
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Subject..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 capitalize"
                      value={searchSubjectInput}
                      onChange={(e) => {
                        setSearchSubjectInput(e.target.value);
                        setSelectedSubjectName("");
                      }}
                      autoComplete="off"
                    />
                  </div>

                  {/* Subject list */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredSubjects?.length > 0 ? (
                      filteredSubjects.map((subjectObj) => (
                        <p
                          key={subjectObj.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setSelectedSubjectId(subjectObj.id);
                            setSelectedSubjectName(subjectObj.subject_name);
                            setSearchSubjectInput("");
                            setShowSubjectDropdown(false);
                            setValue("subject", subjectObj.id, { shouldValidate: true });
                          }}
                        >
                          {subjectObj.subject_name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">No subjects found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.subject && (
                <p className="text-error text-sm mt-1">{errors.subject.message}</p>
              )}
            </div>


            {/* Total Marks */}
            <div className="form-control">
              <label className="label">
                <span className="label-text dark:text-gray-200">
                  Total Marks <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="float"
                className="input input-bordered w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
                className="input input-bordered w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
                className="file-input file-input-bordered w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                {...register("uploaded_file", {
                  required: "File is required",
                  validate: {
                    fileSize: (files) =>
                      files[0]?.size <= 5 * 1024 * 1024 || "File size must be less than 5MB",
                    fileType: (files) =>
                      [
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "image/png",
                        "image/jpg",
                        "image/jpeg",
                      ].includes(files[0]?.type) || "Only PDF, Word, or Image files (PNG/JPG/JPEG) are allowed",
                  },
                })}
              />
              {errors.uploaded_file && (
                <p className="text-error text-sm mt-1">{errors.uploaded_file.message}</p>
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
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                <i className="fa-solid fa-upload mr-2" />
              )}
              {isSubmitting ? " " : "Upload Paper"}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">Upload Exam Paper</h3>
            <p className="py-4">
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
  );

};

export default UploadExamPaper;

