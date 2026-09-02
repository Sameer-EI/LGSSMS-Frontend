import { useState, useEffect, useContext } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  fetchYearLevels,
  fetchSchoolYear,
  fetchSubjects,
  fetchTerms,
} from "../../services/api/Api";
import { useNavigate } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";

const ExamSchedule = () => {
  const [className1, setClassName] = useState([]);
  const [schoolYear, setSchoolYear] = useState([]);
  const [examType, setExamType] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]); // Added terms state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [existingSchedules, setExistingSchedules] = useState([]);

  const navigate = useNavigate();
  const { axiosInstance } = useContext(AuthContext);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      class_name: "",
      school_year: "",
      term: "", // Added term field
      exam_type: "",
      papers: [
        {
          subject_id: "",
          exam_date: "",
          start_time: "",
          end_time: "",
        },
      ],
    },
  });

  const fetchExamType = async () => {
    try {
      const response = await axiosInstance.get("/d/Exam-Type/");
      return response.data;
    } catch (err) {
      console.error("Failed to fetch exam types:", err);
      throw err;
    }
  };

  const getClassName = async () => {
    try {
      const ClassName = await fetchYearLevels();
      setClassName(ClassName);
    } catch (err) {
      console.log("Failed to load classes. Please try again." + err);
    }
  };

  const getSchool_year = async () => {
    try {
      const obj = await fetchSchoolYear();
      setSchoolYear(obj);
    } catch (err) {
      console.log("Failed to load school year. Please try again." + err);
    }
  };

  const getExamType = async () => {
    try {
      const obj = await fetchExamType();
      if (obj) {
        setExamType(obj);
      }
    } catch (err) {
      console.error("Failed to load exam types:", err);
    }
  };

  const getSubjects = async () => {
    try {
      const obj = await fetchSubjects();
      setSubjects(obj);
    } catch (err) {
      console.log("Failed to load subjects. Please try again." + err);
    }
  };

  const getTerms = async () => {
    try {
      const obj = await fetchTerms();
      setTerms(obj);
    } catch (err) {
      console.log("Failed to load terms. Please try again." + err);
    }
  };

  useEffect(() => {
    getClassName();
    getSchool_year();
    getExamType();
    getSubjects();
    getTerms();
  }, []);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "papers",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleNavigate = () => {
    navigate(allRouterLink.UpdateExamSchedule);
  };

  // Watch for class, school year, and term changes to check existing schedules
  useEffect(() => {
    const classId = watch("class_name");
    const yearId = watch("school_year");
    const termId = watch("term");

    if (classId && yearId && termId) {
      axiosInstance
        .get(
          `/d/Exam-Schedule/get_by_class_year/?class_name=${classId}&school_year=${yearId}&term=${termId}`
        )
        .then((res) => setExistingSchedules(res.data))
        .catch((err) => setExistingSchedules([]));
    } else {
      setExistingSchedules([]);
    }
  }, [watch("class_name"), watch("school_year"), watch("term")]);

  const onSubmit = async (data) => {
    if (existingSchedules.length > 0) {
      setAlertMessage(
        "Exam schedule for this class, school year and term already exists!"
      );
      setShowAlert(true);
      return;
    }

    try {
      setError("");
      setSuccess("");

      const payload = {
        class_name: Number(data.class_name),
        // school_year: Number(data.school_year),
        term: Number(data.term), // Added term to payload
        exam_type: Number(data.exam_type),
        papers: data.papers.map((paper) => ({
          subject_id: Number(paper.subject_id),
          exam_date: paper.exam_date,
          start_time: paper.start_time,
          end_time: paper.end_time,
        })),
      };

      const response = await axiosInstance.post(
        "/d/Exam-Schedule/create_timetable/",
        payload
      );

      if (response.status === 200 || response.status === 201) {
        setAlertMessage("Exam schedule created successfully!");
        setShowAlert(true);
        reset();
      } else {
        throw new Error(
          response.data?.message || "Failed to create exam schedule"
        );
      }
    } catch (err) {
      console.error("Backend error:", err);
      let backendError = "Failed to create exam schedule";

      if (err.response) {
        const data = err.response.data;
        if (typeof data === "string") {
          backendError = data;
        } else if (Array.isArray(data)) {
          backendError = data.join("\n");
        } else if (data?.message) {
          backendError = data.message;
        } else {
          backendError = Object.entries(data)
            .map(
              ([field, messages]) =>
                `${field}: ${
                  Array.isArray(messages) ? messages.join(", ") : messages
                }`
            )
            .join("\n");
        }
      }

      setAlertMessage(backendError);
      setShowAlert(true);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen mb-24 md:mb-10  dark:bg-gray-900">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm mb-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-300 dark:border-gray-700 ">
            <h1 className="text-3xl font-bold text-center mb-8">
              Create Exam Schedule{" "}
              <i className="fa-solid fa-calendar-day ml-2"></i>
            </h1>
          </div>

          {error && (
            <div className="alert alert-error mb-6">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-6">
              <span>{success}</span>
            </div>
          )}

          {/* Warning if schedule exists */}
          {existingSchedules.length > 0 && (
            <p className="text-red-500 mb-4 font-medium">
              Exam schedule for this class, school year and term already exists!
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {" "}
            {/* Changed to 4 columns */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Class</span>
                <span className="text-error">*</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...register("class_name", { required: "Class is required" })}
              >
                <option value="">Select Class</option>
                {className1?.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.level_name}
                  </option>
                ))}
              </select>
              {errors.class_name && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.class_name.message}
                </span>
              )}
            </div>
            {/* <div className="form-control">
              <label className="label">
                <span className="label-text">School Year</span><span className="text-error">*</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...register("school_year", {
                  required: "School year is required",
                })}
              >
                <option value="">Select Year</option>
                {schoolYear?.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.school_year.message}
                </span>
              )}
            </div> */}
            {/* Added Term Dropdown */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Term</span>
                <span className="text-error">*</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...register("term", { required: "Term is required" })}
              >
                <option value="">Select Term</option>
                {terms?.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term_name || term.name || `Term ${term.id}`}
                  </option>
                ))}
              </select>
              {errors.term && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.term.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Exam Type</span>
                <span className="text-error">*</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...register("exam_type", {
                  required: "Exam type is required",
                })}
              >
                <option value="">Select Exam Type</option>
                {examType?.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              {errors.exam_type && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.exam_type.message}
                </span>
              )}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Exam Papers</h2>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 bg-base-200 p-4 rounded-lg"
              >
                <div className="form-control">
                  <label className="label">Subject</label>
                  <span className="text-error">*</span>
                  <select
                    className={`select select-bordered w-full ${
                      errors.papers?.[index]?.subject_id ? "select-error" : ""
                    }`}
                    {...register(`papers.${index}.subject_id`, {
                      required: "Subject is required",
                    })}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name}
                      </option>
                    ))}
                  </select>
                  {errors.papers?.[index]?.subject_id && (
                    <span className="text-red-500 text-sm mt-1">
                      {errors.papers[index].subject_id.message}
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">Exam Date</label>
                  <span className="text-error">*</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    {...register(`papers.${index}.exam_date`, {
                      required: "Exam date is required",
                    })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">Start Time</label>
                  <span className="text-error">*</span>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    {...register(`papers.${index}.start_time`, {
                      required: "Start time is required",
                    })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">End Time</label>
                  <span className="text-error">*</span>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    {...register(`papers.${index}.end_time`, {
                      required: "End time is required",
                      validate: (value) => {
                        const startTime = watch(`papers.${index}.start_time`);
                        return (
                          value > startTime ||
                          "End time must be after start time"
                        );
                      },
                    })}
                  />
                </div>

                <div className="form-control md:col-span-4 gap-2 flex justify-end">
                  <button
                    type="button"
                    className="btn bgTheme text-white"
                    onClick={() => {
                      if (fields.length < 5) {
                        append({
                          subject_id: "",
                          exam_date: "",
                          start_time: "",
                          end_time: "",
                        });
                      } else {
                        setAlertMessage(
                          "You can only add up to 4 more papers."
                        );
                        setShowAlert(true);
                      }
                    }}
                    disabled={fields.length >= 5}
                  >
                    <i className="fa-solid fa-plus mr-2"></i> Add Another Paper
                  </button>

                  <button
                    type="button"
                    className="btn btn-error "
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <i className="fa-solid fa-trash mr-1"></i> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn bgTheme text-white w-52"
              disabled={isSubmitting || existingSchedules.length > 0}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                "Create Schedule"
              )}
            </button>
          </div>
        </form>
      </div>
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            <h3 className="font-bold text-lg">Exam Schedule</h3>
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
  );
};

export default ExamSchedule;
