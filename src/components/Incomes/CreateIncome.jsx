import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { fetchSchoolYear } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";

const CreateIncome = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [schoolYears, setSchoolYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const months = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];

  const getSchoolYears = async () => {
    try {
      const res = await fetchSchoolYear();
      const today = new Date();

      // find current school year
      const current = res.find((year) => {
        const start = new Date(year.start_date);
        const end = new Date(year.end_date);
        return today >= start && today <= end;
      });

      setSchoolYears(current ? [current] : []);
    } catch (err) {
      console.error("Failed to load school years:", err);
      setModalMessage("Failed to load school years.");
      setShowModal(true);
    }
  };


  const getCategories = async () => {
    try {
      const res = await axiosInstance.get("/d/income-category/");
      const sortedCategories = (res.data || []).sort((a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );
      setCategories(sortedCategories);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setModalMessage("Failed to load income categories.");
      setShowModal(true);
    }
  };

  useEffect(() => {
    getSchoolYears();
    getCategories();
  }, []);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("month", data.month);
    formData.append("amount", data.amount);
    formData.append("income_date", data.income_date);
    formData.append("category", parseInt(data.category));
    formData.append("description", data.description || "");
    formData.append("school_year", parseInt(data.school_year));
    formData.append("payment_method", data.payment_method);
    formData.append("status", data.status);
    if (data.attachment?.[0]) formData.append("attachment", data.attachment[0]);

    try {
      const res = await axiosInstance.post("/d/school-income/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Income created:", res.data);
      setModalMessage("Income created successfully!");
      setShowModal(true);
      reset();
    } catch (error) {
      console.error("Error creating income:", error);
      if (error.response?.data?.non_field_errors) {
        setModalMessage(`${error.response.data.non_field_errors.join(", ")}`);
      } else if (error.response?.data) {
        setModalMessage(JSON.stringify(error.response.data));
      } else {
        setModalMessage("Failed to create income. Please try again.");
      }
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-box my-5 shadow-sm dark:shadow-gray-700">
        <form onSubmit={handleSubmit(onSubmit)}>
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Add School Income <i className="fa-solid fa-sack-dollar ml-2"></i>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Month <span className="text-error">*</span>
              </label>
              <select
                {...register("month", { required: "Month is required" })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select Month</option>
                {months.map((m, idx) => (
                  <option key={idx} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="text-red-500 text-sm mt-1">{errors.month.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-error">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                {...register("amount", {
                  required: "Amount is required",
                  min: { value: 1, message: "Amount must be greater than 0" },
                })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Income Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Income Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                {...register("income_date", { required: "Income date is required" })}
                max={new Date().toISOString().split("T")[0]} // restrict future dates
                className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
              />

              {errors.income_date && (
                <p className="text-red-500 text-sm mt-1">{errors.income_date.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-error">*</span>
              </label>
              <select
                {...register("category", { required: "Category is required" })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>
            {/* School Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                School Year *
              </label>
              <select
                {...register("school_year", { required: "School year is required" })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select School Year</option>
                {schoolYears?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <p className="text-red-500 text-sm mt-1">{errors.school_year.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method <span className="text-error">*</span>
              </label>
              <select
                {...register("payment_method", { required: "Payment method is required" })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select Payment Method</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
              {errors.payment_method && (
                <p className="text-red-500 text-sm mt-1">{errors.payment_method.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status <span className="text-error">*</span>
              </label>
              <select
                {...register("status", { required: "Status is required" })}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
              )}
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachment (optional)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                {...register("attachment")}
                className="file-input file-input-bordered w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                placeholder="Enter description"
                rows={3}
                maxLength={100}
                {...register("description", {
                  maxLength: {
                    value: 100,
                    message: "Description cannot exceed 50 characters",
                  },
                })}
                className="textarea textarea-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              ></textarea>

              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className="btn text-white bgTheme w-52 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2" />
              ) : (
                <i className="fa-solid fa-save mr-2" />
              )}
              {isSubmitting ? "" : "Save Income"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      {showModal && (
        <dialog className="modal modal-open bg-black bg-opacity-60">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <h3 className="font-bold text-lg">Income Submission</h3>
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

export default CreateIncome;
