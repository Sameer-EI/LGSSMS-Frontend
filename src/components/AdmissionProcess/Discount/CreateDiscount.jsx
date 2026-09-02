import { useEffect, useState, useContext, useRef } from "react";
import { fetchStudents1, fetchYearLevels } from "../../../services/api/Api";
import { AuthContext } from "../../../context/AuthContext";

const CreateDiscount = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [feeStructures, setFeeStructures] = useState([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingFeeStructures, setLoadingFeeStructures] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    student_year_id: "",
    fee_structure_id: "",
    discount_name: "",
    discounted_amount_percent: "",
  });

  const [btnDisabled, setBtnDisabled] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    setTimeout(() => setPageLoading(false), 800);
  }, []);

  const loadClasses = async () => {
    if (classes.length > 0) return;
    setLoadingClasses(true);
    try {
      const data = await fetchYearLevels();
      setClasses(data);
      setError(false);
    } catch (err) {
      console.error("Failed to load classes:", err);
      setError(true);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadFeeStructures = async () => {
    if (!classId) return;
    setLoadingFeeStructures(true);
    try {
      const response = await axiosInstance.get(`/d/feestructures/?year_level_id=${classId}`);
      setFeeStructures(response.data);
      setError(false);
    } catch (err) {
      console.error("Failed to load fee structures:", err);
      setError(true);
      setFeeStructures([]);
    } finally {
      setLoadingFeeStructures(false);
    }
  };

  const loadStudents = async () => {
    if (!classId) return;
    setLoadingStudents(true);
    try {
      const data = await fetchStudents1(classId);
      const sortedData = (data || []).sort((a, b) =>
        a.student_name.localeCompare(b.student_name, "en", {
          sensitivity: "base",
        })
      );
      setStudents(sortedData);
      setError(false);
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(true);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadStudents();
      loadFeeStructures();
    }
    setSelectedStudentId("");
    setSelectedStudentName("");
    setSearchStudentInput("");
    setFormData(prev => ({
      ...prev,
      fee_structure_id: "",
      student_year_id: ""
    }));
  }, [classId]);

  // Sync selected student to formData
  useEffect(() => {
    setFormData((prev) => ({ ...prev, student_year_id: selectedStudentId }));
  }, [selectedStudentId]);

  useEffect(() => {
    const isValid =
      formData.student_year_id &&
      formData.fee_structure_id &&
      formData.discount_name &&
      formData.discounted_amount_percent > 0 &&
      formData.discounted_amount_percent <= 100;
    setBtnDisabled(!isValid);
  }, [formData]);

  const handleChange = (name, value) => {
    if (name === "discount_name" && value.length > 100) return;
    if (name === "discounted_amount_percent") {
      const numValue = parseFloat(value);
      if (numValue > 100) return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};

    if (!classId) errors.classId = "Class is required.";
    if (!selectedStudentId) errors.student_year_id = "Student is required.";
    if (!formData.fee_structure_id) errors.fee_structure_id = "Fee type is required.";
    if (!formData.discount_name) errors.discount_name = "Discount name is required.";

    const discountPercent = parseFloat(formData.discounted_amount_percent || 0);
    if (discountPercent <= 0 || discountPercent > 100) {
      errors.discounted_amount_percent = "Discount percent must be between 1 and 100";
    }

    if (formData.discount_name && formData.discount_name.length > 100) {
      errors.discount_name = "Discount name cannot exceed 100 characters.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const payload = {
        student_year_id: parseInt(formData.student_year_id),
        fee_structure_id: parseInt(formData.fee_structure_id),
        discount_name: formData.discount_name,
        discounted_amount_percent: parseFloat(formData.discounted_amount_percent)
      };

      await axiosInstance.post("/d/appliedfeediscounts/apply/", payload);

      setAlertTitle("Create Discount");
      setAlertMessage("Discount applied successfully!");
      setShowAlert(true);

      // Reset fields
      setFormData({
        student_year_id: "",
        fee_structure_id: "",
        discount_name: "",
        discounted_amount_percent: "",
      });
      setSelectedStudentId("");
      setSelectedStudentName("");
      setSearchStudentInput("");
      setClassId("");
      setStudents([]);
      setFeeStructures([]);
      setFormErrors({});
    } catch (err) {
      setAlertTitle("Create Discount");
      let message = "Failed to create discount.";
      if (err?.response?.data?.detail) {
        message = err.response.data.detail;
      }
      setShowAlert(true);
      setAlertMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredStudents = students.filter((studentObj) =>
    studentObj.student_name
      .toLowerCase()
      .includes(searchStudentInput.toLowerCase())
  );

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
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg my-5">
        <h1 className="text-3xl font-bold text-center mb-8">
          <i className="fa-solid fa-indian-rupee-sign ml-2"></i> Create Fee Discount
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Dropdown */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-school text-sm"></i>
                  Class <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={classId}
                onFocus={loadClasses}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">
                  {loadingClasses ? "Loading classes..." : "Select Class"}
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.level_name}
                  </option>
                ))}
              </select>
              {formErrors.classId && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.classId}
                </p>
              )}
            </div>

            {/* Student Dropdown/Search */}
            <div className="form-control relative" ref={dropdownRef}>
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-user-graduate text-sm"></i>
                  Student <span className="text-error">*</span>
                </span>
              </label>

              {/* Clickable input-style box to open dropdown */}
              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                {selectedStudentName || "Select Student"}
              <span className="arrow">&#9662;</span>
              </div>

              {/* Dropdown */}
              {showStudentDropdown && (
                <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  {/* Search input inside dropdown */}
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

                  {/* Student list */}
                  <div className="max-h-40 overflow-y-auto">
                    {!loadingStudents && filteredStudents.length > 0 ? (
                      filteredStudents.map((studentObj) => (
                        <p
                          key={studentObj.student_id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setSelectedStudentId(studentObj.id);
                            setSelectedStudentName(studentObj.student_name);
                            setSearchStudentInput("");
                            setShowStudentDropdown(false);
                          }}
                        >
                          {studentObj.student_name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        {loadingStudents
                          ? "Loading students..."
                          : "No students found."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error display (external validation) */}
              {formErrors.student_year_id && (
                <p className="text-error text-sm mt-1">
                  {formErrors.student_year_id}
                </p>
              )}
            </div>
          </div>

          {/* Fee Type and Discount Percent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-tag text-sm"></i>
                  Fee Type <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={formData.fee_structure_id}
                onChange={(e) => handleChange("fee_structure_id", e.target.value)}
                disabled={!classId}
              >
                <option value="">
                  {loadingFeeStructures ? "Loading fee types..." : "Select Fee Type"}
                </option>
                {feeStructures.map((fee) => (
                  <option key={fee.id} value={fee.id}>
                    {fee.fee_type} - ₹{fee.fee_amount}
                  </option>
                ))}
              </select>
              {formErrors.fee_structure_id && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.fee_structure_id}
                </p>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-percent text-sm"></i>
                  Discount Percentage <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="e.g. 25"
                value={formData.discounted_amount_percent}
                onChange={(e) =>
                  handleChange("discounted_amount_percent", e.target.value)
                }
              />
              {formErrors.discounted_amount_percent && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.discounted_amount_percent}
                </p>
              )}
            </div>
          </div>

          {/* Discount Name */}
          <div className="form-control mt-6">
            <label className="label">
              <span className="label-text flex items-center gap-1">
                <i className="fa-solid fa-comment-dots text-sm"></i>
                Discount Name <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="e.g. Scholarship Discount"
              value={formData.discount_name}
              onChange={(e) => handleChange("discount_name", e.target.value)}
            />
            {formErrors.discount_name && (
              <p className="text-sm text-red-500 mt-1">
                {formErrors.discount_name}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              // className={`btn btn-primary w-full md:w-52 bgTheme text-white`}
              className={`btn bgTheme text-white w-52 ${
                btnDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
              }`}
              disabled={btnDisabled}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                  Create Discount
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal */}
        {showAlert && (
          <dialog open className="modal modal-open">
            <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
              <h3 className="font-bold text-lg">{alertTitle}</h3>
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
    </div>
  );
};

export default CreateDiscount;