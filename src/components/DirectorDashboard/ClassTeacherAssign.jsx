import React, { useContext, useState, useEffect } from "react";
import { fetchTeachers, fetchYearLevels } from "../../services/api/Api";
import axios from "axios";
import { constants } from "../../global/constants";
import { useNavigate } from "react-router-dom";
import { allRouterLink } from "../../router/AllRouterLinks";
import { AuthContext } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { useRef } from "react";

const ClassTeacherAssign = () => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue, // ✅ add this
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const { authTokens } = useContext(AuthContext);
  const teacherDropdownRef = useRef(null);
  const [teachers, setTeachers] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingYearLevels, setLoadingYearLevels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(false);

  // Teacher dropdown states
  const [selectedTeacherName, setSelectedTeacherName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [searchTeacherInput, setSearchTeacherInput] = useState("");

  // Alert modal
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const preloadData = async () => {
      try {
        await Promise.all([fetchTeachers(), fetchYearLevels()]);
      } catch (err) {
        setPageError(true);
      } finally {
        setPageLoading(false);
      }
    };
    preloadData();
  }, []);

  const loadTeachers = async () => {
    if (teachers.length > 0) return;
    setLoadingTeachers(true);
    try {
      const data = await fetchTeachers();
      setTeachers(data);
    } catch (error) {
      console.error("Failed to load teachers:", error);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadYearLevels = async () => {
    if (yearLevels.length > 0) return;
    setLoadingYearLevels(true);
    try {
      const data = await fetchYearLevels();
      setYearLevels(data);
    } catch (error) {
      console.error("Failed to load year levels:", error);
    } finally {
      setLoadingYearLevels(false);
    }
  };

  const filteredTeachers = teachers
    .filter((teacher) =>
      `${teacher.first_name} ${teacher.last_name}`
        .toLowerCase()
        .includes(searchTeacherInput.toLowerCase())
    )
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      )
    );

  const handleSubmitForm = async (data) => {
    const payload = {
      teacher: data.teacher_id, // ✅ use form value
      year_level: data.yearlevel_id,
    };

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${constants.baseUrl}/t/teacheryearlevel/`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokens.access}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setAlertMessage("Class teacher assigned successfully!");
        setShowAlert(true);
        window.location.reload();
      }
    } catch (error) {
      const res = error.response?.data;
      let errorMessage = "Failed to assign class teacher";
      if (typeof res === "string") errorMessage = res;
      else if (res?.error) errorMessage = res.error;
      else if (res?.detail) errorMessage = res.detail;
      else if (typeof res === "object") {
        errorMessage = Object.values(res).flat().join(" | ");
      }
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        teacherDropdownRef.current &&
        !teacherDropdownRef.current.contains(event.target)
      ) {
        setShowTeacherDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  // --- Loading State ---
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

  // --- Error State ---
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
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md my-8">
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white border-b border-gray-900 dark:border-gray-700 pb-4">
            Allocate Teachers{" "}
            <i className="fa-solid fa-square-poll-vertical w-5"></i>
            <div className="flex justify-end">
              <button
                className="btn bgTheme text-white"
                onClick={() => navigate(allRouterLink.ViewAllocatedClass)}
              >
                <i className="fa-solid fa-landmark"></i> View Allocated Class
              </button>
            </div>
          </h1>

          <div className="flex flex-col md:flex-row md:space-x-4 space-y-6 md:space-y-0">
            {/* Teacher Dropdown */}
            <div className="w-full md:w-1/2 relative" ref={teacherDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teacher <span className="text-error">*</span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => {
                  loadTeachers();
                  setShowTeacherDropdown(!showTeacherDropdown);
                }}
              >
                <span className="text-gray-900 dark:text-gray-100">
                  {selectedTeacherName || "Select Teacher"}
                </span>
                <div >
                  <span class="arrow">&#9662;</span>
                </div>
              </div>

              {showTeacherDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 bg-white dark:bg-gray-700">
                    <input
                      type="text"
                      placeholder="Search Teacher..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={searchTeacherInput}
                      onChange={(e) => setSearchTeacherInput(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {loadingTeachers ? (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        Loading teachers...
                      </p>
                    ) : filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher) => (
                        <p
                          key={teacher.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            const fullName = `${teacher.first_name} ${teacher.last_name}`;
                            setSelectedTeacherName(fullName);
                            setSelectedTeacherId(teacher.id);
                            setSearchTeacherInput("");
                            setShowTeacherDropdown(false);
                            setValue("teacher_id", teacher.id, {
                              shouldValidate: true, // ✅ updates form
                            });
                            clearErrors("teacher_id");
                          }}
                        >
                          {teacher.first_name} {teacher.last_name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No teachers found.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <input
                type="hidden"
                {...register("teacher_id", {
                  required: "Teacher is required",
                })}
              />
              {errors.teacher_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.teacher_id.message}
                </p>
              )}
            </div>

            {/* Year Level Dropdown */}
            <div className="w-full md:w-1/2 relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year Level <span className="text-error">*</span>
              </label>

              <div className="relative">
                <select
                  {...register("yearlevel_id", {
                    required: "Year level is required",
                  })}
                  className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                  onFocus={loadYearLevels}
                  onChange={() => clearErrors("yearlevel_id")}
                >
                  <option value="">
                    {loadingYearLevels
                      ? "Loading year levels..."
                      : "Select Year Level"}
                  </option>
                  {yearLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.level_name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="arrow text-gray-600 dark:text-gray-300">&#9662;</span>
                </div>
              </div>

              {errors.yearlevel_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.yearlevel_id.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn bgTheme text-white w-30"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                </span>
              ) : (
                "Assign"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <dialog open className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Allocated Teacher</h3>
            <p className="py-4">{alertMessage}</p>
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

export default ClassTeacherAssign;
