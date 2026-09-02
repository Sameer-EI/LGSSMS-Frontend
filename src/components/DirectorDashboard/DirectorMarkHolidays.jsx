import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";

const DirectorMarkHolidays = () => {
  const { axiosInstance } = useContext(AuthContext);
  const BASE_URL = constants.baseUrl;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm();

  const [loading, setLoading] = useState(true);
  const [loder, setLoder] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  // watch dates for validation
  const startDate = watch("start_date");

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [BASE_URL]);

  const onSubmit = async (data) => {
    setLoder(true);
    try {
      const payload = {
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date || data.start_date,
      };

      const response = await axiosInstance.post("/a/holidays/", payload);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error("Failed to mark holiday");
      }

      setModalMessage("Holiday marked & notifications sent successfully!");
      setShowModal(true);
      reset();
    } catch (err) {
  const defaultMessage = "An error occurred";
  const responseData = err.response?.data;

  let message = defaultMessage;

  if (responseData?.non_field_errors?.length) {
    message = responseData.non_field_errors[0]; 
  } else if (responseData?.message) {
    message = responseData.message;
  } else if (err.message) {
    message = err.message;
  }

  setModalMessage(message);
  setShowModal(true);
}
finally {
      setLoder(false);
    }
  };

  // Full-page loader
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

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
            <i className="fa-solid fa-calendar-day ml-2"></i> Assign Holidays
          </h1>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 w-full md:w-1/2 gap-6 mt-6">
              {/* Holiday Title */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-gray-800 dark:text-gray-100">
                    Holiday Title <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="Enter holiday title"
                  {...register("title", {
                    required: "Holiday title is required",
                    validate: (value) => {
                      const words = value.trim().split(/\s+/);
                      return (
                        words.length <= 20 ||
                        "Holiday title must not exceed 20 words"
                      );
                    },
                  })}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Start Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-800 dark:text-gray-100">
                  Start Date <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                {...register("start_date", {
                  required: "Start date is required",
                  validate: (value) => {
                    const today = new Date().toISOString().split("T")[0];
                    return (
                      value >= today || "Start date cannot be in the past"
                    );
                  },
                })}
              />
              {errors.start_date && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.start_date.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-800 dark:text-gray-100">
                  End Date <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                {...register("end_date", {
                  validate: (value) => {
                    if (!value) return true;
                    if (startDate && value < startDate) {
                      return "End date cannot be before start date";
                    }
                    return true;
                  },
                })}
              />
              {errors.end_date && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn text-white bgTheme w-52"
              disabled={loder}
            >
              {loder ? (
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                <>
                  <i className="fa-solid fa-calendar-plus mr-2" />
                  Mark Holiday
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Mark Holidays</h3>
            <p className="py-4 whitespace-pre-line">{modalMessage}</p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-32"
                onClick={() => setShowModal(false)}
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

export default DirectorMarkHolidays;
