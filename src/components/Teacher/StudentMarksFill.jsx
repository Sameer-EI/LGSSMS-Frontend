import { useState, useEffect, useContext, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  fetchSchoolYear,
  fetchYearLevels,
  // fetchSubjects,
  fetchAllTeachers,
} from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";

// A marks cell counts as "filled" when it has a number in it (0 is valid)
const isFilled = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  !Number.isNaN(Number(value));

const StudentMarksFill = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [schoolYear, setSchoolYear] = useState([]);
  const [examType1, setExamType] = useState([]);
  const [className, setClassName] = useState([]);
  const [subjects1, setSubjects] = useState([]);
  const [teachers1, setTeachers] = useState([]);
  const [Students, setStudents] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const studentDropdownRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      marks_data: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "marks_data",
  });

  // Live values of the subject rows, used to decide if a row is being filled
  const watchedRows = watch("marks_data");

  // --- Fetching Functions ---

  const getExamType = async () => {
    try {
      const response = await axiosInstance.get("/d/Exam-Type/");
      setExamType(response.data);
    } catch (err) {
      console.error("Failed to load exam types:", err);
    }
  };

  const getSchool_year = async () => {
    try {
      const obj = await fetchSchoolYear();
      setSchoolYear(obj);
    } catch (err) {
      console.log("Failed to load school years. Please try again." + err);
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

  // Fetch Subjects based on Year Level ID
  const getSubjects = async (year_level_id) => {
    if (!year_level_id) return;

    setLoadingSubjects(true);
    setSubjects([]);
    remove();

    try {
      const response = await axiosInstance.get(
        `/d/subject/?core_subject=true&year_level=${year_level_id}`
      );
      setSubjects(response.data);
    } catch (err) {
      console.error("Failed to load subjects:", err);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const getTeachers = async () => {
    try {
      const obj = await fetchAllTeachers();
      setTeachers(obj);
    } catch (err) {
      console.log("Failed to load teachers. Please try again." + err);
    }
  };

  const getStudents = async (classId) => {
    if (!classId) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    setLoadingStudents(true);
    setStudents([]);

    try {
      const response = await axiosInstance.get(
        `/s/studentyearlevels/?level__id=${classId}`
      );
      setStudents(response.data);
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // --- Initial Data Load ---

  useEffect(() => {
    getTeachers();
    getClassName();
    getSchool_year();
    getExamType();
  }, []);

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);

    setSelectedStudentId("");
    setSelectedStudentName("");
    setValue("student", "");
    remove();

    if (classId) {
      getStudents(classId);
      getSubjects(classId);
      setValue("year_level", classId, { shouldValidate: true });
    } else {
      setStudents([]);
      setSubjects([]);
      setLoadingStudents(false);
      setLoadingSubjects(false);
      setValue("year_level", "", { shouldValidate: true });
    }
  };

  useEffect(() => {
    remove();
    if (subjects1.length > 0) {
      subjects1.forEach((subject) => {
        append({
          subject_id: subject.id,
          subject_name: subject.subject_name,
          teacher_id: "",
          marks: "",
        });
      });
    }
  }, [subjects1, append, remove]);

  const examType = examType1;
  const className1 = className;
  const schoolYears = schoolYear;
  const teachers = teachers1;
  const students = Students;

  // --- Submission Logic ---

  const onSubmit = async (data) => {
    // Only subjects that have marks entered are sent; the rest are skipped
    const filledRows = (data.marks_data || []).filter((item) =>
      isFilled(item.marks)
    );

    if (filledRows.length === 0) {
      setAlertMessage("Please enter marks for at least one subject.");
      setShowAlert(true);
      return;
    }

    const payload = {
      school_year_id: parseInt(data.school_year),
      exam_type_id: parseInt(data.exam_type),
      year_level_id: parseInt(data.year_level),
      data: filledRows.map((item) => ({
        teacher_id: parseInt(item.teacher_id),
        subject_id: parseInt(item.subject_id),
        student_marks: [
          {
            student_id: parseInt(data.student),
            marks: parseInt(item.marks),
          },
        ],
      })),
    };

    try {
      const response = await axiosInstance.post(
        "/d/Student-Marks/create_marks/",
        payload
      );

      if (response.status === 200 || response.status === 201) {
        setAlertMessage("Student marks filled successfully!");
        setShowAlert(true);
        reset();
        setSelectedStudentId("");
        setSelectedStudentName("");
        remove();
        setSubjects([]);
      } else {
        throw new Error("Failed to create student marks");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const backendErrors = error.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        setAlertMessage(backendErrors.join("\n"));
      } else {
        setAlertMessage("An unexpected error occurred during submission.");
      }
      setShowAlert(true);
    }
  };

  // --- Dropdown Click Outside Logic ---

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Filtering Logic ---

  const filteredStudents = students
    .filter((studentObj) =>
      studentObj.student_name
        .toLowerCase()
        .includes(searchStudentInput.toLowerCase())
    )
    .sort((a, b) => a.student_name.localeCompare(b.student_name));

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-box my-5 shadow-sm dark:shadow-gray-700">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-3xl font-bold text-center mb-8">
            Fill Student Marks <i className="fa-solid fa-file-pen ml-2"></i>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* School Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                School Year <span className="text-error">*</span>
              </label>
              <select
                {...register("school_year", {
                  required: "School year is required",
                })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">Select School Year</option>
                {schoolYears?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.school_year.message}
                </p>
              )}
            </div>

            {/* Year Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year Level <span className="text-error">*</span>
              </label>
              <select
                {...register("year_level", {
                  required: "Year level is required",
                })}
                onChange={handleClassChange}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">Select Year Level</option>
                {className1?.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.level_name}
                  </option>
                ))}
              </select>
              {errors.year_level && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.year_level.message}
                </p>
              )}
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Type <span className="text-error">*</span>
              </label>
              <select
                {...register("exam_type", {
                  required: "Exam type is required",
                })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">Select Exam Type</option>
                {examType?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.exam_type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.exam_type.message}
                </p>
              )}
            </div>

            {/* Student */}
            <div className="form-control relative" ref={studentDropdownRef}>
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-user-graduate text-sm"></i>
                  Student <span className="text-error">*</span>
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                {loadingStudents ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading
                    Students...
                  </span>
                ) : (
                  selectedStudentName || "Select Student"
                )}
                <div>
                  <span className="arrow">&#9662;</span>
                </div>
              </div>

              <input
                type="hidden"
                {...register("student", { required: "Student is required" })}
                value={selectedStudentId || ""}
              />

              {showStudentDropdown && !loadingStudents && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Student..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchStudentInput}
                      onChange={(e) => {
                        setSearchStudentInput(e.target.value);
                        setSelectedStudentName("");
                      }}
                      autoComplete="off"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((studentObj) => (
                        <p
                          key={studentObj.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setSelectedStudentId(studentObj.id);
                            setSelectedStudentName(studentObj.student_name);
                            setSearchStudentInput("");
                            setShowStudentDropdown(false);
                            setValue("student", studentObj.id, {
                              shouldValidate: true,
                            });
                          }}
                        >
                          {studentObj.student_name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        {selectedClassId
                          ? "No students found in this class."
                          : "Please select a Year Level first."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errors.student && (
                <p className="text-error text-sm mt-1">
                  {errors.student.message}
                </p>
              )}
            </div>
          </div>

          {/* --- Dynamic Subject Marks Table --- */}
          <div className="md:col-span-2 mt-10">
            <h2 className="text-2xl font-semibold mb-1 text-gray-800 dark:text-gray-200 border-b pb-2">
              Subject Marks Entry
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Fill marks only for the subjects you want to record. Subjects left
              blank are skipped. A teacher is needed for every subject that has
              marks.
            </p>

            {loadingSubjects ? (
              <div className=" flex justify-center">
                <p className="mt-2 text-gray-500 text-sm">
                  Loading subjects...
                </p>
              </div>
            ) : fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table w-full dark:text-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left w-1/3">Subject</th>
                      <th className="text-left w-1/3">Teacher</th>
                      <th className="text-left w-1/3">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      // This row is "active" once marks have been typed in
                      const rowHasMarks = isFilled(
                        watchedRows?.[index]?.marks
                      );

                      return (
                        <tr
                          key={field.id}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-150"
                        >
                          {/* Subject Name (Read Only) */}
                          <td className="align-top py-4">
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {field.subject_name}
                            </p>
                            <input
                              type="hidden"
                              {...register(`marks_data.${index}.subject_id`)}
                              value={field.subject_id}
                            />
                          </td>

                          {/* Teacher Selection: required only if marks are entered */}
                          <td className="align-top py-4">
                            <select
                              {...register(`marks_data.${index}.teacher_id`, {
                                required: rowHasMarks
                                  ? `Select the teacher for ${field.subject_name}`
                                  : false,
                              })}
                              className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            >
                              <option value="">Select Teacher</option>
                              {teachers?.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.first_name} {teacher.last_name}
                                </option>
                              ))}
                            </select>
                            {errors.marks_data?.[index]?.teacher_id && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.marks_data[index].teacher_id.message}
                              </p>
                            )}
                          </td>

                          {/* Marks Input: optional, 0-100 when provided */}
                          <td className="align-top py-4">
                            <input
                              type="number"
                              placeholder="Enter marks"
                              {...register(`marks_data.${index}.marks`, {
                                validate: (value) => {
                                  if (!isFilled(value)) return true; // blank is fine
                                  const n = Number(value);
                                  if (n < 0) return "Min 0";
                                  if (n > 100) return "Max 100";
                                  return true;
                                },
                              })}
                              className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                            {errors.marks_data?.[index]?.marks && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.marks_data[index].marks.message}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-center text-gray-500 dark:text-gray-400 border rounded-lg">
                Please select a Year Level to load subjects.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn text-white bgTheme w-52"
              disabled={isSubmitting || fields.length === 0}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                <i className="fa-solid fa-save mr-2" />
              )}
              {isSubmitting ? "Saving..." : "Save Marks"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              Student Marks Submission Status
            </h3>
            <p className="py-4 whitespace-pre-line">{alertMessage}</p>

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

export default StudentMarksFill;