import { useState, useEffect, useContext } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  fetchYearLevels,
  fetchSchoolYear,
  fetchExamType,
  fetchSubjects,
} from "../../services/api/Api";
import { constants } from "../../global/constants";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";

const UpdateExamSchedule = () => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [examSchedule, setExamSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allSubjects, setAllSubjects] = useState([]); // Store all subjects
  const { axiosInstance } = useContext(AuthContext);
  const { id } = useParams();

  const BASE_URL = constants.baseUrl;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      class_name: "",
      term: "",
      exam_type: "",
      papers: [
        {
          subject_name: "",
          exam_date: "",
          start_time: "",
          end_time: "",
        },
      ],
    },
  });

  useEffect(() => {
    const tokenData = localStorage.getItem("authTokens");
    if (tokenData) {
      try {
        const tokens = JSON.parse(tokenData);
        if (tokens?.access && tokens.access !== accessToken) {
          setAccessToken(tokens.access);
        }
      } catch (error) {
        console.error("Error parsing auth tokens:", error);
      }
    }
  }, []);

  // Fetch all subjects
  const getSubjects = async () => {
    try {
      const subjects = await fetchSubjects();
      setAllSubjects(subjects);
    } catch (err) {
      console.log("Failed to load subjects. Please try again." + err);
    }
  };

  // Find subject ID by subject name
  const findSubjectIdByName = (subjectName) => {
    if (!subjectName) return "";
    const subject = allSubjects.find((sub) => sub.subject_name === subjectName);
    return subject ? subject.id : "";
  };

  // Get exam schedule by ID
  const getExamSchedule = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `d/Exam-Schedule/get_timetable/?id=${id}`
      );
      if (response.data && response.data.length > 0) {
        setExamSchedule(response.data[0]);
        prefillForm(response.data[0]);
      }
    } catch (err) {
      console.log("Failed to load exam schedule. Please try again." + err);
    } finally {
      setIsLoading(false);
    }
  };

  // Prefill form with exam schedule data
  const prefillForm = (examData) => {
    // Store the exam schedule data for reference
    setExamSchedule(examData);

    // Set class name (display only)
    setValue("class_name", examData.class || "");
    // Set term (display only) - extracted from the exam schedule response
    setValue("term", examData.term || "");

    // Set exam type (display only)
    setValue("exam_type", examData.exam_type || "");

    // Prefill papers
    if (examData.papers && examData.papers.length > 0) {
      const papersData = examData.papers.map((paper) => {
        return {
          subject_name: paper.subject_name || "", // Display subject name in form
          exam_date: paper.exam_date || "",
          start_time: paper.start_time ? paper.start_time.substring(0, 5) : "", // Format to HH:MM
          end_time: paper.end_time ? paper.end_time.substring(0, 5) : "", // Format to HH:MM
        };
      });

      // Set the papers array
      setValue("papers", papersData);
    }
  };

  useEffect(() => {
    if (accessToken) {
      getSubjects();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && id && allSubjects.length > 0) {
      getExamSchedule();
    }
  }, [accessToken, id, allSubjects]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "papers",
  });

const onSubmit = async (data) => {
  try {
    if (!accessToken) return;

    // Transform the data to match backend expectations
    const transformedPapers = data.papers
      .map((paper) => {
        return {
          subject_name: paper.subject_name, // Send subject name
          exam_date: paper.exam_date,
          start_time: paper.start_time ? `${paper.start_time}:00` : null, // Add seconds
          end_time: paper.end_time ? `${paper.end_time}:00` : null, // Add seconds
        };
      })
      .filter((paper) => paper.subject_name && paper.exam_date);

    // Create payload matching the expected structure
    const payload = {
      papers: transformedPapers,
    };

    const response = await axios.patch(
      `${BASE_URL}/d/Exam-Schedule/update_timetable/?id=${id}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201 || response.status === 207) {
      // Check if there are any errors in the response (status 207 is Multi-Status)
      if (response.status === 207 && response.data.errors && response.data.errors.length > 0) {
        // Format error messages for display
        const errorMessages = response.data.errors.map(error => {
          const subject = error.subject_name;
          const errorDetails = error.error;
          let errorText = `${subject}: `;
          
          // Extract all error messages from the error object
          if (typeof errorDetails === 'object') {
            const fieldErrors = Object.entries(errorDetails)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                }
                return `${field}: ${messages}`;
              })
              .join('; ');
            errorText += fieldErrors;
          } else {
            errorText += errorDetails;
          }
          
          return errorText;
        });
        
        // Create alert message with success and errors
        let alertMsg = "Exam schedule partially updated.\n\n";
        
        if (response.data.updated && response.data.updated.length > 0) {
          alertMsg += "Successfully updated:\n";
          alertMsg += response.data.updated.map(item => 
            `${item.subject_name} (${item.exam_date})`
          ).join('\n');
          alertMsg += "\n\n";
        }
        
        alertMsg += "Errors encountered:\n";
        alertMsg += errorMessages.join('\n');
        
        setAlertMessage(alertMsg);
        setShowAlert(true);
        setError(alertMsg);
        
        // Still refresh the data since some items were updated
        getExamSchedule();
      } else {
        // Complete success
        setAlertMessage("Exam schedule updated successfully!");
        setShowAlert(true);
        setSuccess("Exam schedule updated successfully!");
        getExamSchedule();
      }
    } else {
      throw new Error(
        response.data.message || "Failed to update exam schedule"
      );
    }
  } catch (err) {
    let errorMsg = "Failed to update exam schedule";

    if (err.response?.data) {
      const data = err.response.data;

      if (typeof data === "string") {
        errorMsg = data;
      } else if (Array.isArray(data)) {
        errorMsg = data.join("\n");
      } else if (typeof data === "object") {
        // Check for the specific error structure you showed
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(error => {
            const subject = error.subject_name;
            const errorDetails = error.error;
            let errorText = `${subject}: `;
            
            if (typeof errorDetails === 'object') {
              const fieldErrors = Object.entries(errorDetails)
                .map(([field, messages]) => {
                  if (Array.isArray(messages)) {
                    return `${field}: ${messages.join(', ')}`;
                  }
                  return `${field}: ${messages}`;
                })
                .join('; ');
              errorText += fieldErrors;
            } else {
              errorText += errorDetails;
            }
            
            return errorText;
          });
          
          errorMsg = "Errors encountered:\n" + errorMessages.join('\n');
          
          // Add info about successful updates if present
          if (data.updated && data.updated.length > 0) {
            const successMsg = "\n\nSuccessfully updated:\n" + 
              data.updated.map(item => `${item.subject_name} (${item.exam_date})`).join('\n');
            errorMsg = successMsg + "\n\n" + errorMsg;
          }
        } else {
          // Fallback to original error formatting
          errorMsg = Object.entries(data)
            .map(([key, val]) => {
              if (Array.isArray(val)) {
                return `${key}: ${val.join(", ")}`;
              } else if (typeof val === "object") {
                return `${key}: ${JSON.stringify(val)}`;
              } else {
                return `${key}: ${val}`;
              }
            })
            .join("\n");
        }
      }
    }

    setAlertMessage(errorMsg);
    setShowAlert(true);
    setError(errorMsg);
  }
};

  if (isLoading)
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

  return (
    <div className="p-6 bg-gray-100 min-h-screen dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-300 dark:border-gray-700 ">
            <h1 className="text-3xl font-bold text-center mb-8">
              <i className="fa-solid fa-pen-nib ml-2"></i> Update Exam Schedule
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Class Name - DISABLED INPUT FIELD */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Class <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                {...register("class_name", { required: "Class is required" })}
                disabled
              />
              {errors.class_name && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.class_name.message}
                  </span>
                </label>
              )}
            </div>

            {/* Term - DISABLED INPUT FIELD */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Term <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                {...register("term", { required: "Term is required" })}
                disabled
              />
              {errors.term && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.term.message}
                  </span>
                </label>
              )}
            </div>

            {/* Exam Type - DISABLED INPUT FIELD */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Exam Type <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                {...register("exam_type", {
                  required: "Exam type is required",
                })}
                disabled
              />
              {errors.exam_type && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.exam_type.message}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Papers Section */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Exam Papers</h2>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 bg-base-200 p-4 rounded-lg"
              >
                {/* Subject - DISABLED INPUT FIELD */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Subject <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    {...register(`papers.${index}.subject_name`, {
                      required: "Subject is required",
                    })}
                    disabled
                  />
                  {errors.papers?.[index]?.subject_name && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.papers[index].subject_name.message}
                      </span>
                    </label>
                  )}
                </div>

                {/* Exam Date */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Exam Date <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    className={`input input-bordered w-full ${
                      errors.papers?.[index]?.exam_date ? "input-error" : ""
                    }`}
                    {...register(`papers.${index}.exam_date`, {
                      required: "Exam date is required",
                    })}
                  />
                  {errors.papers?.[index]?.exam_date && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.papers[index].exam_date.message}
                      </span>
                    </label>
                  )}
                </div>

                {/* Start Time */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Start Time <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="time"
                    className={`input input-bordered w-full ${
                      errors.papers?.[index]?.start_time ? "input-error" : ""
                    }`}
                    {...register(`papers.${index}.start_time`, {
                      required: "Start time is required",
                    })}
                  />
                  {errors.papers?.[index]?.start_time && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.papers[index].start_time.message}
                      </span>
                    </label>
                  )}
                </div>

                {/* End Time */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      End Time <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="time"
                    className={`input input-bordered w-full ${
                      errors.papers?.[index]?.end_time ? "input-error" : ""
                    }`}
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
                  {errors.papers?.[index]?.end_time && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.papers[index].end_time.message}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn bgTheme text-white w-52"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                "Update Schedule"
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

export default UpdateExamSchedule;
