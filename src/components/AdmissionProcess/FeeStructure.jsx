import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchSchoolYear, fetchYearLevels } from "../../services/api/Api";

/* -------------------------------------------------------------------------- */
/*  Constants & pure helpers                                                  */
/* -------------------------------------------------------------------------- */

const initialFormState = {
  school_year: "",
  master_fee: "",
  fee_type: "",
  tuition_sub_type: "",
  fee_amount: "",
  year_level: [],
};

const FEE_TYPES = [
  "Admission Fee",
  "Caution Fee",
  "Tuition Fee",
  "Exam Fee",
  "Maintenance",
  "Form Fee",
  "Annual Charges",
  "Others",
];

const TUITION_SUB_TYPES = [
  { value: "General", label: "General" },
  { value: "Comm/Arts", label: "Comm / Arts" },
  { value: "PCM/PCB", label: "PCM / PCB" },
];

const FIELD_CLASS =
  "w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80";

// Fields that cannot be changed once a fee structure exists
const LOCKED_EDIT_FIELDS = ["school_year", "fee_type"];

const normalizeYearLevels = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));
  }

  return [];
};

const formatAmount = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return "0";
  return String(Math.round(numericValue));
};

const getYearLevelId = (item) =>
  Number(item.id ?? item.year_level_id ?? item.value);

const getYearLevelLabel = (item) =>
  item.name ||
  item.year_level_name ||
  item.level_name ||
  item.year_name ||
  item.id;

const getSchoolYearLabel = (item) =>
  item.year_name || item.name || item.school_year_name || item.id;

// Local date as "YYYY-MM-DD" so it can be compared with the API's
// start_date / end_date strings (same format, so string comparison is safe).
const getTodayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

// Resolve the "current session" from /d/school-years/, e.g.
// [{ id: 1, year_name: "2026-2027", start_date: "2026-06-01", end_date: "2027-03-15" }]
//
// 1) Session whose start_date <= today <= end_date
// 2) Otherwise (between sessions): the latest session that has already started
// 3) Otherwise (all sessions are in the future): the earliest upcoming session
// Returns null if the list is empty.
const getCurrentSchoolYear = (years) => {
  if (!years.length) return null;

  const today = getTodayString();

  const active = years.find(
    (year) =>
      year.start_date &&
      year.end_date &&
      year.start_date <= today &&
      today <= year.end_date,
  );
  if (active) return active;

  const sortedByStart = [...years]
    .filter((year) => year.start_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const started = sortedByStart.filter((year) => year.start_date <= today);
  if (started.length) return started[started.length - 1];

  return sortedByStart[0] || years[0];
};

const validateForm = (data) => {
  if (!data.school_year) return "Please select a school year.";
  if (!data.master_fee) return "Please select a master fee.";
  if (!data.fee_type.trim()) return "Please enter the fee type.";
  if (!data.fee_amount) return "Please enter the fee amount.";
  if (!data.year_level.length) return "Please select at least one class level.";
  return "";
};

const buildPayload = (data) => {
  const payload = {
    school_year: Number(data.school_year),
    master_fee: Number(data.master_fee),
    fee_type: data.fee_type.trim(),
    fee_amount: formatAmount(data.fee_amount),
    year_level: data.year_level.map((item) => Number(item)),
  };

  if (data.fee_type === "Tuition Fee" && data.tuition_sub_type) {
    payload.tuition_sub_type = data.tuition_sub_type;
  }

  return payload;
};

const extractErrorMessage = (err) => {
  const data = err?.response?.data;
  const fallback = "The request could not be completed.";
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (data.error) return data.error;

  const fieldErrors = Object.entries(data)
    .map(
      ([field, errors]) =>
        `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`,
    )
    .join("\n");

  return fieldErrors || fallback;
};

/* -------------------------------------------------------------------------- */
/*  Reusable form fields (used by both the create form and the edit modal)    */
/*  Defined at module level so inputs never remount / lose focus on re-render */
/* -------------------------------------------------------------------------- */

const FeeFormFields = ({
  data,
  schoolYears,
  masterFees,
  yearLevels,
  onInputChange,
  onYearLevelToggle,
  onSelectAll,
  disabledFields = [],
}) => {
  const allSelected = useMemo(() => {
    const ids = yearLevels.map(getYearLevelId).filter((id) => !isNaN(id));
    return ids.length > 0 && ids.every((id) => data.year_level.includes(id));
  }, [yearLevels, data.year_level]);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>School year</span>
          <select
            name="school_year"
            value={data.school_year}
            onChange={onInputChange}
            disabled={disabledFields.includes("school_year")}
            className={FIELD_CLASS}
          >
            <option value="">Select school year</option>
            {schoolYears.map((item) => (
              <option
                key={item.id || item.year_name}
                value={item.id || item.year_name}
              >
                {getSchoolYearLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Master fee</span>
          <select
            name="master_fee"
            value={data.master_fee}
            onChange={onInputChange}
            className={FIELD_CLASS}
          >
            <option value="">Select master fee</option>
            {masterFees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.payment_structure || item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Fee type</span>
          <select
            name="fee_type"
            value={data.fee_type}
            onChange={onInputChange}
            disabled={disabledFields.includes("fee_type")}
            className={FIELD_CLASS}
          >
            <option value="">Select fee type</option>
            {FEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Fee amount</span>
          <input
            type="number"
            step="1"
            min="0"
            name="fee_amount"
            value={data.fee_amount}
            onChange={onInputChange}
            className={FIELD_CLASS}
            placeholder="2500"
          />
        </label>
      </div>

      {data.fee_type === "Tuition Fee" ? (
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Tuition sub-type</span>
          <select
            name="tuition_sub_type"
            value={data.tuition_sub_type}
            onChange={onInputChange}
            className={FIELD_CLASS}
          >
            <option value="">Select tuition sub-type</option>
            {TUITION_SUB_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Assign classes</p>
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm font-medium text-violet-600 transition hover:text-violet-700 hover:underline"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {yearLevels.map((item) => {
            const value = getYearLevelId(item);
            if (!value) return null;

            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <input
                  type="checkbox"
                  checked={data.year_level.includes(value)}
                  onChange={() => onYearLevelToggle(value)}
                  className="h-3 w-3 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-xs">{getYearLevelLabel(item)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Edit modal                                                                */
/* -------------------------------------------------------------------------- */

const EditFeeStructureModal = ({
  isOpen,
  data,
  submitting,
  onClose,
  onSubmit,
  ...fieldProps
}) => {
  // Close on Escape + lock background scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-fee-structure-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-fee-structure-title"
              className="text-xl font-semibold text-slate-900"
            >
              Update fee structure
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Make your changes and save to update this fee line.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <FeeFormFields
            data={data}
            disabledFields={LOCKED_EDIT_FIELDS}
            {...fieldProps}
          />

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Update fee structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

const FeeStructure = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [schoolYears, setSchoolYears] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [masterFees, setMasterFees] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // School year filter for the list.
  // null  = user hasn't touched it -> falls back to the current session
  // "all" = user explicitly chose "All years"
  // "<id>" = user picked a specific school year
  const [yearFilter, setYearFilter] = useState(null);

  // Create form
  const [formData, setFormData] = useState(initialFormState);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState(initialFormState);
  const [updating, setUpdating] = useState(false);

  // Message / confirm modal
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: "",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "",
    cancelText: "",
    isConfirmButtonDanger: false,
  });

  /* ------------------------------ message modal ----------------------------- */

  const showModalMessage = (
    type,
    title,
    message,
    onConfirm = null,
    confirmText = "OK",
    cancelText = "Cancel",
    isConfirmButtonDanger = false,
  ) => {
    setModalConfig({
      type,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      isConfirmButtonDanger,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig({
      type: "",
      title: "",
      message: "",
      onConfirm: null,
      confirmText: "",
      cancelText: "",
      isConfirmButtonDanger: false,
    });
  };

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm();
    }
    closeModal();
  };

  /* ------------------------------- data loading ----------------------------- */

  const loadFormOptions = async () => {
    try {
      const [schoolYearsResponse, yearLevelsResponse, masterFeesResponse] =
        await Promise.all([
          fetchSchoolYear(),
          fetchYearLevels(),
          axiosInstance.get("/d/masterfees/"),
        ]);

      const normalizedSchoolYears = Array.isArray(schoolYearsResponse)
        ? schoolYearsResponse
        : schoolYearsResponse?.results || [];
      const normalizedYearLevels = Array.isArray(yearLevelsResponse)
        ? yearLevelsResponse
        : yearLevelsResponse?.results || [];

      const masterFeesData = Array.isArray(masterFeesResponse?.data)
        ? masterFeesResponse.data
        : masterFeesResponse?.data?.results || [];

      const normalizedMasterFees = masterFeesData.map((item) => ({
        id: item.id,
        name: item.payment_structure || `Master Fee ${item.id}`,
        ...item,
      }));

      setSchoolYears(normalizedSchoolYears);
      setYearLevels(normalizedYearLevels);
      setMasterFees(normalizedMasterFees);
    } catch (err) {
      console.error("Failed to load fee structure options", err);
      showModalMessage(
        "error",
        "Error",
        "Unable to load school years, class levels, or master fees right now.",
      );
    }
  };

  const loadFeeStructures = async () => {
    try {
      const response = await axiosInstance.get("/d/feestructures/");
      const payload = response?.data;
      const list = Array.isArray(payload) ? payload : payload?.results || [];

      const normalizedList = list.map((item) => ({
        ...item,
        student_fee_count: item.student_fee_count ?? 0,
        can_delete: item.can_delete ?? true,
      }));

      setFeeStructures(normalizedList);
    } catch (err) {
      console.error("Failed to load fee structures", err);
      showModalMessage(
        "error",
        "Error",
        "Unable to load fee structures right now.",
      );
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadFormOptions(), loadFeeStructures()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- school year filter --------------------------- */

  const currentSchoolYear = useMemo(
    () => getCurrentSchoolYear(schoolYears),
    [schoolYears],
  );

  // If the user hasn't touched the filter, default to the current session.
  // If no current session can be resolved, show everything.
  const effectiveYearFilter =
    yearFilter ?? (currentSchoolYear ? String(currentSchoolYear.id) : "all");

  const filteredFeeStructures = useMemo(() => {
    if (effectiveYearFilter === "all") return feeStructures;
    return feeStructures.filter(
      (item) => String(item.school_year) === effectiveYearFilter,
    );
  }, [feeStructures, effectiveYearFilter]);

  const summaryCards = useMemo(() => {
    const totalFeeTypes = feeStructures.length;
    const uniqueYearLevels = new Set(
      feeStructures.flatMap((item) => normalizeYearLevels(item.year_level)),
    );

    return [
      {
        label: "Fee structures",
        value: totalFeeTypes,
        icon: "fa-solid fa-list-ul",
      },
      {
        label: "Classes covered",
        value: uniqueYearLevels.size,
        icon: "fa-solid fa-school",
      },
      {
        label: "School years",
        value: schoolYears.length,
        icon: "fa-solid fa-calendar-days",
      },
    ];
  }, [feeStructures, schoolYears.length]);

  /* ------------------------ form handlers (shared factory) ------------------ */

  const createFormHandlers = (setter) => ({
    onInputChange: (event) => {
      const { name, value } = event.target;
      setter((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "fee_type" && value !== "Tuition Fee"
          ? { tuition_sub_type: "" }
          : {}),
      }));
    },

    onYearLevelToggle: (yearLevelId) => {
      const value = Number(yearLevelId);
      setter((prev) => {
        const current = prev.year_level || [];
        return {
          ...prev,
          year_level: current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value],
        };
      });
    },

    onSelectAll: () => {
      const allIds = yearLevels.map(getYearLevelId).filter((id) => !isNaN(id));
      setter((prev) => {
        const allSelected =
          allIds.length > 0 && allIds.every((id) => prev.year_level.includes(id));
        return { ...prev, year_level: allSelected ? [] : allIds };
      });
    },
  });

  const createHandlers = createFormHandlers(setFormData);
  const editHandlers = createFormHandlers(setEditFormData);

  /* ------------------------------- create ----------------------------------- */

  const resetCreateForm = () => setFormData(initialFormState);

  const handleCreate = async (event) => {
    event.preventDefault();

    const validationError = validateForm(formData);
    if (validationError) {
      showModalMessage("error", "Validation Error", validationError);
      return;
    }

    setCreating(true);
    try {
      await axiosInstance.post("/d/feestructures/", buildPayload(formData));

      // Show the school year the fee was just created for, so the new row
      // is visible in the list instead of being hidden by the filter.
      setYearFilter(String(formData.school_year));

      showModalMessage(
        "success",
        "Success",
        "Fee structure created successfully.",
        null,
        "OK",
        "",
      );
      resetCreateForm();
      await refreshData();
    } catch (err) {
      console.error("Fee structure create failed", err);
      console.error("Error response:", err?.response?.data);
      showModalMessage("error", "Error", extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  /* -------------------------------- update ---------------------------------- */

  const handleEdit = (structure) => {
    setEditingId(structure.id);
    setEditFormData({
      school_year: structure.school_year?.toString() || "",
      master_fee: structure.master_fee?.toString() || "",
      fee_type: structure.fee_type || "",
      tuition_sub_type: structure.tuition_sub_type || "",
      fee_amount: structure.fee_amount?.toString() || "",
      year_level: normalizeYearLevels(structure.year_level),
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (updating) return;
    setShowEditModal(false);
    setEditingId(null);
    setEditFormData(initialFormState);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    const validationError = validateForm(editFormData);
    if (validationError) {
      showModalMessage("error", "Validation Error", validationError);
      return;
    }

    setUpdating(true);
    try {
      await axiosInstance.put(
        `/d/feestructures/${editingId}/`,
        buildPayload(editFormData),
      );

      setShowEditModal(false);
      setEditingId(null);
      setEditFormData(initialFormState);

      showModalMessage(
        "success",
        "Success",
        "Fee structure updated successfully.",
        null,
        "OK",
        "",
      );
      await refreshData();
    } catch (err) {
      // Keep the edit modal open so the user can correct and retry
      console.error("Fee structure update failed", err);
      console.error("Error response:", err?.response?.data);
      showModalMessage("error", "Error", extractErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  /* -------------------------------- delete ---------------------------------- */

  const confirmDelete = async (id) => {
    setDeletingId(id);
    try {
      await axiosInstance.delete(`/d/feestructures/${id}/`);
      showModalMessage(
        "success",
        "Success",
        "Fee structure deleted successfully.",
        null,
        "OK",
        "",
      );
      await refreshData();
    } catch (err) {
      console.error("Delete failed", err);
      showModalMessage(
        "error",
        "Error",
        "Unable to delete this fee structure right now.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (structure) => {
    if (structure.can_delete === false) {
      showModalMessage(
        "error",
        "Structure in Use",
        `This fee structure "${structure.fee_type || "Unnamed fee"}" cannot be deleted because it is currently in use. ${structure.student_fee_count || 0} student(s) have already been assigned this fee structure.`,
        null,
        "OK",
        "",
      );
      return;
    }

    showModalMessage(
      "delete",
      "Confirm Deletion",
      `Are you sure you want to delete the fee structure "${structure.fee_type || "Unnamed fee"}"? This action cannot be undone.`,
      () => confirmDelete(structure.id),
      "Delete",
      "Cancel",
      true,
    );
  };

  /* ------------------------- message / confirm modal ------------------------ */

  // Rendered via a function call (not <Modal />) so it isn't remounted on
  // every parent render.
  const renderMessageModal = () => {
    if (!showModal) return null;

    const isDelete = modalConfig.type === "delete";
    const isError = modalConfig.type === "error";
    const isSuccess = modalConfig.type === "success";

    let icon = "";
    let iconColor = "";

    if (isDelete) {
      icon = "fa-solid fa-triangle-exclamation";
      iconColor = "text-amber-600";
    } else if (isError) {
      icon = "fa-solid fa-circle-xmark";
      iconColor = "text-red-600";
    } else if (isSuccess) {
      icon = "fa-solid fa-circle-check";
      iconColor = "text-emerald-600";
    }

    return (
      // z-50 so feedback always appears above the edit modal (z-40)
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="animate-in fade-in zoom-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl duration-200">
          <div className="flex items-start gap-3">
            <div className={`mt-1 text-3xl ${iconColor}`}>
              <i className={icon} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900">
                {modalConfig.title}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {modalConfig.message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {modalConfig.onConfirm ? (
              <>
                <button
                  onClick={handleModalConfirm}
                  className={`flex-1 rounded-2xl px-4 py-3 font-semibold text-white transition ${
                    modalConfig.isConfirmButtonDanger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {modalConfig.confirmText}
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {modalConfig.cancelText}
                </button>
              </>
            ) : (
              <button
                onClick={closeModal}
                className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                {modalConfig.confirmText || "OK"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* --------------------------------- render --------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="text-center">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-violet-600" />
            <p className="mt-3 text-sm text-slate-600">
              Loading fee structures...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
        <div className="mx-auto mb-10 max-w-7xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600">
                  Fee management
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  Fee structure dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Create, edit, and manage fee structures for each school year
                  and class level.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {card.value}
                      </p>
                    </div>
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                      <i className={card.icon} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
            {/* Create form (create-only now; editing happens in a modal) */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Create new fee structure
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details for a new school fee line.
                </p>
              </div>

              <form onSubmit={handleCreate} className="mt-6 space-y-5">
                <FeeFormFields
                  data={formData}
                  schoolYears={schoolYears}
                  masterFees={masterFees}
                  yearLevels={yearLevels}
                  {...createHandlers}
                />

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? "Saving..." : "Create fee structure"}
                </button>
              </form>
            </section>

            {/* List */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Fee structures
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review, edit, or remove existing entries.
                  </p>
                </div>

                {/* School year filter (defaults to the current session) */}
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="whitespace-nowrap">School year</span>
                  <select
                    value={effectiveYearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:bg-white"
                  >
                    <option value="all">All years</option>
                    {schoolYears.map((year) => (
                      <option key={year.id} value={String(year.id)}>
                        {getSchoolYearLabel(year)}
                        {currentSchoolYear && year.id === currentSchoolYear.id
                          ? " (Current)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 space-y-3">
                {filteredFeeStructures.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    {feeStructures.length === 0
                      ? "No fee structures found yet. Create one from the form to get started."
                      : "No fee structures found for the selected school year."}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black">
                            Fee Type
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black">
                            Year
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black">
                            Master Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-black">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black">
                            Levels
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black">
                            In Use
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredFeeStructures.map((structure) => {
                          const isInUse = structure.can_delete === false;
                          const studentCount = structure.student_fee_count || 0;
                          const schoolYear = schoolYears.find(
                            (year) =>
                              Number(year.id) === Number(structure.school_year),
                          );
                          const schoolYearName = schoolYear
                            ? schoolYear.year_name
                            : structure.school_year || "—";
                          const masterFee = masterFees.find(
                            (fee) =>
                              Number(fee.id) === Number(structure.master_fee),
                          );
                          const masterFeeName = masterFee
                            ? masterFee.payment_structure || masterFee.name
                            : structure.master_fee || "—";

                          const linkedLevelIds = normalizeYearLevels(
                            structure.year_level,
                          );
                          const yearLevelLabels = linkedLevelIds.length
                            ? linkedLevelIds
                                .map((yearLevelId) => {
                                  const matchingLevel = yearLevels.find(
                                    (level) =>
                                      getYearLevelId(level) === yearLevelId,
                                  );
                                  return matchingLevel
                                    ? getYearLevelLabel(matchingLevel)
                                    : yearLevelId;
                                })
                                .join(", ")
                            : "No classes linked";

                          return (
                            <tr
                              key={structure.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {structure.fee_type || "Unnamed fee"}
                                {structure.tuition_sub_type && (
                                  <span className="ml-1 text-xs font-normal text-slate-500">
                                    ({structure.tuition_sub_type})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-slate-600">
                                {schoolYearName}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {masterFeeName}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                ₹{formatAmount(structure.fee_amount)}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-slate-600">
                                {yearLevelLabels}
                              </td>
                              <td className="px-4 py-3 text-center text-sm">
                                {isInUse ? (
                                  <span className="inline-flex items-center gap-1 text-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                    Yes ({studentCount})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                    <i className="fa-solid fa-check-circle text-[10px]" />
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(structure)}
                                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(structure)}
                                    disabled={
                                      deletingId === structure.id || isInUse
                                    }
                                    className={`rounded-xl px-3 py-1.5 text-sm font-medium text-white transition ${
                                      isInUse
                                        ? "cursor-not-allowed bg-slate-300 opacity-60"
                                        : "bg-red-600 hover:bg-red-700"
                                    }`}
                                    title={
                                      isInUse
                                        ? `Cannot delete - ${studentCount} student(s) assigned`
                                        : ""
                                    }
                                  >
                                    {deletingId === structure.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <EditFeeStructureModal
        isOpen={showEditModal}
        data={editFormData}
        submitting={updating}
        onClose={closeEditModal}
        onSubmit={handleUpdate}
        schoolYears={schoolYears}
        masterFees={masterFees}
        yearLevels={yearLevels}
        {...editHandlers}
      />

      {/* Message / confirm modal */}
      {renderMessageModal()}
    </>
  );
};

export default FeeStructure;