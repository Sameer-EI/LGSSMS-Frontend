import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { fetchSchoolIncomeById, fetchSchoolYear, updateSchoolIncome } from "../../services/api/Api";

import { Loader } from "../../global/Loader";
import { useParams, useNavigate } from "react-router-dom";




const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


const UpdateIncome = ({ onClose, refreshData }) => {

  const { id } = useParams();
  const incomeId = id;
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [Income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  const selectedCategory = watch("category");

  // Load school years
  useEffect(() => {
    const getSchoolYears = async () => {
      try {
        const res = await fetchSchoolYear();
        setSchoolYears(res);
      } catch (err) {
        setError(true);
      }
    };
    getSchoolYears();
  }, []);



  useEffect(() => {
    const loadIncome = async () => {
      try {
        const res = await fetchSchoolIncomeById(incomeId);
        [
          "month", "amount", "income_date", "category", "description",
          "school_year", "payment_method", "status"
        ].forEach(f => setValue(f, res[f]));
        setIncome(res);
        console.log(res);
        
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (incomeId) loadIncome();
  }, [incomeId, setValue]);

  const onSubmit = async (data) => {
    const token = localStorage.getItem("access");
    if (!token) return;

    let payload;
    if (data.attachment && data.attachment[0]) {
      payload = new FormData();
      // payload.append("month", data.month);
      payload.append("income_date", data.income_date);
      // payload.append("category", parseInt(data.category));
      payload.append("description", data.description || "");
      // payload.append("school_year", parseInt(Income.school_year_value));
      payload.append("payment_method", data.payment_method);
      payload.append("status", data.status);
      // if (parseInt(data.category) !== 1) payload.append("amount", data.amount);
      payload.append("attachment", data.attachment[0]);
    } else {
      payload = {
        // month: data.month,
        income_date: data.income_date,
        // category: parseInt(data.category),
        description: data.description || "",
        // school_year: parseInt(Income.school_year_value),
        payment_method: data.payment_method,
        status: data.status,
      };
      // if (parseInt(data.category) !== 1) payload.amount = data.amount;
    }

    setSubmitLoading(true);
    try {
      await updateSchoolIncome(incomeId, payload, token);
      refreshData?.();
      setModalOpen(true);
    } catch (err) {
      console.error(err.response?.data || err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <Loader />;
  const closeModal = () => {
    setModalOpen(false);
    onClose?.();
    navigate(-1);
  };
  console.log(categories);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading income data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load income data. Try again.
        </p>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 dark:text-white rounded-box my-5 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          Update School Income <i className="fa-solid fa-sack-dollar ml-2"></i>
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Month */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Month <span className="text-error">*</span>
              </label>
              <select
                {...register("month", { required: "Month is required" })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={true}
              >
                <option value="">Select Month</option>
                {months.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount <span className="text-error">*</span>
              </label>
              <input
                type="number"
                {...register("amount", { required: "Amount is required", min: 1 })}
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                readOnly={parseInt(selectedCategory) === 1}
                disabled={true}
              />
            </div>

            {/* Income Date */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Income Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                {...register("income_date", { required: "Income Date is required" })}
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Category */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-error">*</span>
              </label>
              <select
                {...register("category", { required: "Category is required" })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={true}
              >
                <option value={Income.category}>{Income.category_name}</option>
              </select>
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                {...register("description")}
                placeholder="Enter description"
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* School Year */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Year <span className="text-error">*</span>
              </label>
              <select
                {...register("school_year", { required: "School Year is required" })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={true}
              >
                <option value={Income.school_year_value}>{Income.school_year}</option>
              
              </select>
            </div>

            {/* Payment Method */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method <span className="text-error">*</span>
              </label>
              <select
                {...register("payment_method", { required: "Payment Method is required" })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Status */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status <span className="text-error">*</span>
              </label>
              <select
                {...register("status", { required: "Status is required" })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Attachment */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <i className="fa-solid fa-paperclip text-sm"></i>
                  Attachment
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                {...register("attachment")}
                className="file-input file-input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="btn bgTheme text-white w-52"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk mr-2"></i>
                  Update Income
                </>
              )}
            </button>
          </div>
        </form>

        {modalOpen && (
          <dialog className="modal modal-open">
            <div className="modal-box bg-white text-black dark:bg-gray-800 dark:text-white">
              <h3 className="font-bold text-lg">Success</h3>
              <p className="py-4">Income record has been successfully updated.</p>
              <div className="modal-action">
                <button className="btn bgTheme text-white w-25" onClick={closeModal}>
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

export default UpdateIncome;
