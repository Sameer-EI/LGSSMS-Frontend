import React, { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  editSalary,
  fetchSalaryExpense,
  fetchSalaryExpenseById,
} from "../../../services/api/Api";
import { useParams, useNavigate } from "react-router-dom";
import { Loader } from "../../../global/Loader";
import { Error } from "../../../global/Error";
import { SuccessModal } from "../../Modals/SuccessModal";
import { AuthContext } from "../../../context/AuthContext";


export const EditSalaryExpense = () => {
  const { id } = useParams();
  const [apiError, setApiError] = useState("");
  const [schoolExpense, setSchoolExpense] = useState([]);
  const { authTokens } = useContext(AuthContext);
  const access = authTokens.access;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const getSchoolExpense = async () => {
    setLoading(true);
    try {
      const response = await fetchSalaryExpenseById(access, id);
      setSchoolExpense(response);
    } catch (error) {
      console.log("Cannot get the school salary expense", error.message);
      setApiError("Failed to load salary data");
      setError("Failed to load school years. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleNavigation = (id) => {
    navigate(`/viewSalaryExpense`);
  };


  useEffect(() => {
    getSchoolExpense();
  }, [id]);

  useEffect(() => {
    if (schoolExpense) {
      setValue("joiningDate", schoolExpense.joining_date);
      setValue("baseSalary", schoolExpense.base_salary);
      setValue("user", schoolExpense.user?.id);
      setValue("name", schoolExpense.name);
    }
  }, [schoolExpense, setValue]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
  }

  // Form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setApiError("");
      const payload = {
        joining_date: data.joiningDate,
        base_salary: data.baseSalary,
      };
      editSalary(access, payload, id);
      modalRef.current.show();
    } catch (err) {
      if (err.response.data) {
        setApiError(err.response.data.error);
      } else {
        setApiError("Something Went Wrong. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 mb-24 md:mb-10 shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">
        Edit Salary
        <i className="fa-solid fa-percentage ml-2"></i>
      </h1>

      {/* Display API error message */}
      {apiError && (
        <div className="border border-error/50 rounded-lg p-4 mb-6 bg-white">
          <div className="flex items-center text-error">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            <span className="font-medium">{apiError}</span>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Selection */}
          <div className="form-control relative">
            <label className="label">
              <span className="label-text flex items-center gap-1">
                <i className="fa-solid fa-user text-sm"></i>
                Employee <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full focus:outline-none"
              disabled={true}
              {...register("name")}
            />
            {errors.employee && (
              <p className="text-error text-sm mt-1">
                {errors.employee.message}
              </p>
            )}
          </div>

          {/* Joining Date */}
          {/* <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-1">
                <i className="fa-solid fa-calendar-days text-sm"></i>
                Joining Date <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full focus:outline-none"
              {...register("joiningDate", {
                required: "Joining date is required",
              })}
            />
            {errors.joiningDate && (
              <p className="text-error text-sm mt-1">
                {errors.joiningDate.message}
              </p>
            )}
          </div> */}

          {/* Base Salary */}
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-1">
                <i className="fa-solid fa-sack-dollar text-sm"></i>
                Base Salary <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="number"
              min={0}
              placeholder="Enter Base Salary e.g: 15000"
              className="input input-bordered w-full focus:outline-none"
              {...register("baseSalary", {
                required: "Base salary is required",
                min: { value: 0, message: "Salary must be positive" },
              })}
            />
            {errors.baseSalary && (
              <p className="text-error text-sm mt-1">
                {errors.baseSalary.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-center pt-6 gap-4">
          <button
            type="submit"
            className="btn bgTheme text-white w-full md:w-40"
          >
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
            )}
            {loading ? "" : "Confirm"}
          </button>
        </div>
      </form>

      <SuccessModal
        ref={modalRef}
        navigateTo={() => handleNavigation(id)}
        buttonText="Continue"
        message="Successfully Edit!" />
    </div>
  );
};
