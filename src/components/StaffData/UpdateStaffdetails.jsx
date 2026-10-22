import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  fetchTeachers,
  fetchOfficeStaff,
  editOfficeStaffdetails,
  editTeachersdetails,
  fetchCountry,
  fetchState,
  fetchCity,
  fetchSubjects,
} from "../../services/api/Api";
import { constants } from "../../global/constants";
import UpdateSuccessful from "../Modals/UpdateModal";

/* -------------------------------------------------------------------------- */
/* Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const CADRE_CHOICES = [
  { value: "PRT", hint: "Primary Teacher" },
  { value: "TGT", hint: "Trained Graduate Teacher" },
  { value: "PGT", hint: "Post Graduate Teacher" },
];

const MAX_IMAGE_MB = 2;

const RULES = {
  first_name: { pattern: /^[A-Za-z]{2,30}$/, message: "First name must be 2-30 letters" },
  middle_name: { pattern: /^[A-Za-z]{0,30}$/, message: "Middle name must be letters only" },
  last_name: { pattern: /^[A-Za-z]{2,30}$/, message: "Last name must be 2-30 letters" },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
  phone_no: { pattern: /^[6-9][0-9]{9}$/, message: "Must be 10 digits starting with 6-9" },
  adhaar_no: { pattern: /^[2-9][0-9]{11}$/, message: "Must be 12 digits starting with 2-9" },
  pan_no: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN format (e.g. ABCDE1234F)" },
  qualification: { pattern: /^[A-Za-z0-9\s\-,.]{2,50}$/, message: "Invalid qualification" },
  account_no: { pattern: /^[0-9]{9,18}$/, message: "Account number must be 9-18 digits" },
  ifsc_code: { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC code (e.g. SBIN0001234)" },
  holder_name: { pattern: /^[A-Za-z ]{2,50}$/, message: "Holder name must be letters only" },
  house_no: { pattern: /^[A-Za-z0-9\-/ ]{1,10}$/, message: "Invalid house number" },
  habitation: { pattern: /^[A-Za-z0-9 ]{1,50}$/, message: "Invalid habitation" },
  ward_no: { pattern: /^[0-9]{1,5}$/, message: "Invalid ward number" },
  zone_no: { pattern: /^[0-9]{1,5}$/, message: "Invalid zone number" },
  block: { pattern: /^[A-Za-z0-9 ]{0,50}$/, message: "Invalid block" },
  district: { pattern: /^[A-Za-z ]{1,50}$/, message: "Invalid district" },
  division: { pattern: /^[A-Za-z ]{0,50}$/, message: "Invalid division" },
  area_code: { pattern: /^[0-9]{3,10}$/, message: "Invalid area code" },
  address_line: { pattern: /^[A-Za-z0-9,.\-/ ]{0,100}$/, message: "Invalid address line" },
};

const digitsOnly = (max) => (v) => v.replace(/\D/g, "").slice(0, max);
const upper = (max) => (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);

const getError = (errors, name) => name.split(".").reduce((o, k) => o?.[k], errors);

const resolveImageUrl = (path) => {
  if (!path) return null;
  return /^(https?:|blob:|data:)/.test(path) ? path : `${constants.baseUrl}${path}`;
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const subjectLabel = (s) => s?.name || s?.subject_name || s?.title || `Subject ${s?.id}`;
const subjectId = (subject) => (subject && typeof subject === "object" ? subject.id : subject);

// Cascading dropdown support: only filters when the API actually exposes the parent key
const refId = (v) => (v && typeof v === "object" ? v.id : v);
const supportsParent = (list, key) => list.some((i) => refId(i?.[key]) != null);
const filterByParent = (list, key, parentId) => {
  if (!parentId || !supportsParent(list, key)) return list;
  return list.filter((i) => String(refId(i[key])) === String(parentId));
};
const byName = (a, b) => a.name.localeCompare(b.name);

const collectErrors = (obj) => {
  if (!obj) return [];
  if (typeof obj === "string") return [obj];
  if (obj instanceof Error) return [obj.message];
  if (Array.isArray(obj)) return obj.flatMap(collectErrors);
  if (typeof obj === "object") return Object.values(obj).flatMap(collectErrors);
  return [];
};

/* -------------------------------------------------------------------------- */
/* Reusable form pieces                                                       */
/* -------------------------------------------------------------------------- */

const Section = ({ title, description, children }) => (
  <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
    <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">{children}</div>
  </section>
);

const Field = ({ id, label, required, error, hint, full, children }) => (
  <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
    <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    {error && (
      <p role="alert" className="text-xs text-red-500">
        {error}
      </p>
    )}
  </div>
);

const TextField = ({
  name,
  label,
  register,
  errors,
  required,
  rules,
  hint,
  type = "text",
  transform,
  readOnly,
  inputMode,
  full,
}) => {
  const error = getError(errors, name)?.message;
  const reg = register(name, {
    required: required ? `${label} is required` : false,
    ...(rules ? { pattern: { value: rules.pattern, message: rules.message } } : {}),
  });
  return (
    <Field id={name} label={label} required={required} error={error} hint={hint} full={full}>
      <input
        id={name}
        type={type}
        inputMode={inputMode}
        readOnly={readOnly}
        {...reg}
        onChange={(e) => {
          if (transform) e.target.value = transform(e.target.value);
          reg.onChange(e);
        }}
        className={`input input-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200 ${
          error ? "input-error" : "dark:border-gray-600"
        } ${readOnly ? "bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed" : ""}`}
      />
    </Field>
  );
};

const SelectField = ({ name, label, register, errors, required, options, placeholder, onChange, disabled, hint }) => {
  const error = getError(errors, name)?.message;
  const reg = register(name, { required: required ? `${label} is required` : false });
  return (
    <Field id={name} label={label} required={required} error={error} hint={hint}>
      <select
        id={name}
        disabled={disabled}
        {...reg}
        onChange={(e) => {
          reg.onChange(e);
          onChange?.(e);
        }}
        className={`select select-bordered w-full text-sm dark:bg-gray-700 dark:text-gray-200 ${
          error ? "select-error" : "dark:border-gray-600"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
};

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <div className="flex space-x-2">
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
    </div>
    <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

const UpdateStaffDetails = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const isTeacher = type?.toLowerCase() === "teacher";

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsError, setSubjectsError] = useState(false);

  const [existingPhoto, setExistingPhoto] = useState(null);
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [photoError, setPhotoError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ mode: "onChange", reValidateMode: "onChange" });

  const selectedCadre = watch("cadre");
  const countryVal = watch("address_data.country");
  const stateVal = watch("address_data.state");
  const photoFile = watch("user_profile")?.[0];

  /* ------------------------------- Data load ------------------------------- */

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [c, s, ci, subj] = await Promise.all([
        fetchCountry(),
        fetchState(),
        fetchCity(),
        isTeacher
          ? fetchSubjects().catch(() => {
              setSubjectsError(true);
              return [];
            })
          : Promise.resolve([]),
      ]);
      const countryList = normalizeList(c);
      const stateList = normalizeList(s);
      const cityList = normalizeList(ci);
      setCountries(countryList);
      setStates(stateList);
      setCities(cityList);
      setSubjects(normalizeList(subj));

      const data = isTeacher ? await fetchTeachers(id) : await fetchOfficeStaff(id);
      const addr = data.address_data || {};
      const bank = data.banking_data || {};

      const match = (list, idVal, nameVal) =>
        idVal ?? list.find((x) => x.name === nameVal)?.id ?? "";

      setExistingPhoto(resolveImageUrl(data.user_profile));
      setFullName([data.first_name, data.middle_name, data.last_name].filter(Boolean).join(" "));

      reset({
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone_no: data.phone_no || "",
        gender: data.gender || "",
        adhaar_no: data.adhaar_no || "",
        pan_no: data.pan_no || "",
        qualification: data.qualification || "",
        joining_date: data.joining_date || "",
        cadre: data.cadre || "",
        subject: subjectId(data.subject) ?? "",
        banking_data: {
          account_no: bank.account_no || "",
          ifsc_code: bank.ifsc_code || "",
          holder_name: bank.holder_name || "",
        },
        address_data: {
          house_no: addr.house_no || "",
          habitation: addr.habitation || "",
          ward_no: addr.ward_no || "",
          zone_no: addr.zone_no || "",
          block: addr.block || "",
          district: addr.district || "",
          division: addr.division || "",
          area_code: addr.area_code || "",
          address_line: addr.address_line || "",
          country: match(countryList, refId(addr.country), addr.country_name),
          state: match(stateList, refId(addr.state), addr.state_name),
          city: match(cityList, refId(addr.city), addr.city_name),
        },
      });
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to fetch staff details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  /* ------------------------------ Derived data ----------------------------- */

  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );
  useEffect(() => () => photoPreview && URL.revokeObjectURL(photoPreview), [photoPreview]);

  const stateOptions = useMemo(
    () => filterByParent(states, "country", countryVal).sort(byName).map((s) => ({ value: s.id, label: s.name })),
    [states, countryVal]
  );
  const cityOptions = useMemo(
    () => filterByParent(cities, "state", stateVal).sort(byName).map((c) => ({ value: c.id, label: c.name })),
    [cities, stateVal]
  );
  const countryOptions = useMemo(
    () => [...countries].sort(byName).map((c) => ({ value: c.id, label: c.name })),
    [countries]
  );
  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ value: s.id, label: subjectLabel(s) })),
    [subjects]
  );

  const initials = (fullName.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "?";
  const hasChanges = isDirty || !!photoFile;

  /* -------------------------------- Handlers ------------------------------- */

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoError(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setPhotoError(`Image must be smaller than ${MAX_IMAGE_MB} MB.`);
      e.target.value = "";
      return;
    }
    setPhotoError(null);
  };

  const photoReg = register("user_profile");

  // Reset dependent dropdowns, but only when the API tells us how they relate
  const onCountryChange = () => {
    if (supportsParent(states, "country")) {
      setValue("address_data.state", "");
      setValue("address_data.city", "");
    }
  };
  const onStateChange = () => {
    if (supportsParent(cities, "state")) setValue("address_data.city", "");
  };

  const handleCancel = () => {
    if (hasChanges && !window.confirm("Discard your unsaved changes?")) return;
    navigate(-1);
  };

  const onSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setFormErrors([]);

      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value !== "object" && value !== null && value !== undefined) {
          if (!isTeacher && (key === "cadre" || key === "subject")) return;
          payload.append(key, value.toString());
        }
      });

      if (formData.user_profile?.[0]) payload.append("user_profile", formData.user_profile[0]);

      const appendNested = (prefix, obj) =>
        Object.entries(obj || {}).forEach(([k, v]) => {
          if (v !== null && v !== undefined) payload.append(`${prefix}.${k}`, v.toString());
        });
      appendNested("banking_detail_input", formData.banking_data);
      appendNested("address_input", formData.address_data);

      if (isTeacher) await editTeachersdetails(id, payload);
      else await editOfficeStaffdetails(id, payload);

      setUpdateModal(true);
    } catch (err) {
      const messages = collectErrors(err?.response?.data ?? err).filter(Boolean);
      setFormErrors(messages.length ? messages : ["An unexpected error occurred. Please try again."]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------- Render -------------------------------- */

  if (loading) return <PageLoader />;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <p className="text-lg font-medium text-red-500">{loadError}</p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            Go back
          </button>
          <button onClick={loadData} className="btn bgTheme text-white">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const common = { register, errors };

  return (
    <div className="mb-24 md:mb-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* Header */}
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 ring-4 ring-white dark:ring-gray-800 shadow-md">
                {photoPreview || existingPhoto ? (
                  <img src={photoPreview || existingPhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-500 dark:text-gray-300">{initials}</span>
                )}
              </div>
              <label
                htmlFor="user_profile"
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition cursor-pointer"
              >
                Change
              </label>
              <input
                id="user_profile"
                type="file"
                accept="image/*"
                className="sr-only"
                {...photoReg}
                onChange={(e) => {
                  handlePhotoChange(e);
                  photoReg.onChange(e);
                }}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                {isTeacher ? "Update Teacher Details" : "Update Staff Details"}
              </h1>
              {fullName && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{fullName}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Hover the photo to change it (JPG or PNG, up to {MAX_IMAGE_MB} MB). Fields marked * are required.
              </p>
              {photoError && (
                <p role="alert" className="text-xs text-red-500 mt-1">
                  {photoError}
                </p>
              )}
            </div>
          </div>

          {/* Backend errors */}
          {formErrors.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-200">Update failed</p>
                  <ul className="mt-1 list-disc list-inside text-sm text-red-700 dark:text-red-200 space-y-0.5">
                    {formErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setFormErrors([])}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <Section title="Personal information">
            <TextField {...common} name="first_name" label="First name" required rules={RULES.first_name} />
            <TextField {...common} name="middle_name" label="Middle name" rules={RULES.middle_name} />
            <TextField {...common} name="last_name" label="Last name" required rules={RULES.last_name} />
            <SelectField
              {...common}
              name="gender"
              label="Gender"
              required
              placeholder="Select gender"
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]}
            />
          </Section>

          <Section title="Contact">
            <TextField {...common} name="email" label="Email" type="email" required rules={RULES.email} />
            <TextField
              {...common}
              name="phone_no"
              label="Phone number"
              required
              inputMode="numeric"
              transform={digitsOnly(10)}
              rules={RULES.phone_no}
              hint="10-digit mobile number"
            />
          </Section>

          <Section title="Professional details">
            {isTeacher && (
              <>
                <Field label="Cadre" required error={errors.cadre?.message} full>
                  <div role="radiogroup" aria-label="Cadre" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CADRE_CHOICES.map((c) => (
                      <label
                        key={c.value}
                        className={`cursor-pointer rounded-lg border-2 px-4 py-3 transition ${
                          selectedCadre === c.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          value={c.value}
                          className="sr-only"
                          {...register("cadre", { required: "Please select a cadre" })}
                        />
                        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{c.value}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{c.hint}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                <SelectField
                  {...common}
                  name="subject"
                  label="Subject"
                  required
                  placeholder="Select subject"
                  options={subjectOptions}
                  disabled={subjectsError}
                  hint={subjectsError ? "Couldn't load subjects. Reload the page to try again." : undefined}
                />
              </>
            )}

            <TextField {...common} name="qualification" label="Qualification" required rules={RULES.qualification} />
            <TextField
              {...common}
              name="joining_date"
              label="Joining date"
              type="date"
              readOnly
              hint="Set by the school and can't be edited."
            />
          </Section>

          <Section title="Identity documents">
            <TextField
              {...common}
              name="adhaar_no"
              label="Aadhaar number"
              required
              inputMode="numeric"
              transform={digitsOnly(12)}
              rules={RULES.adhaar_no}
              hint="12 digits"
            />
            <TextField
              {...common}
              name="pan_no"
              label="PAN number"
              required
              transform={upper(10)}
              rules={RULES.pan_no}
              hint="e.g. ABCDE1234F"
            />
          </Section>

          <Section title="Bank details">
            <TextField
              {...common}
              name="banking_data.account_no"
              label="Account number"
              required
              inputMode="numeric"
              transform={digitsOnly(18)}
              rules={RULES.account_no}
            />
            <TextField
              {...common}
              name="banking_data.ifsc_code"
              label="IFSC code"
              required
              transform={upper(11)}
              rules={RULES.ifsc_code}
            />
            <TextField
              {...common}
              name="banking_data.holder_name"
              label="Account holder name"
              required
              rules={RULES.holder_name}
            />
          </Section>

          <Section title="Address">
            <TextField {...common} name="address_data.address_line" label="Address line" required rules={RULES.address_line} full />
            <TextField {...common} name="address_data.house_no" label="House no" rules={RULES.house_no} />
            <TextField {...common} name="address_data.habitation" label="Habitation" rules={RULES.habitation} />
            <TextField {...common} name="address_data.ward_no" label="Ward no" inputMode="numeric" transform={digitsOnly(5)} rules={RULES.ward_no} />
            <TextField {...common} name="address_data.zone_no" label="Zone no" inputMode="numeric" transform={digitsOnly(5)} rules={RULES.zone_no} />
            <TextField {...common} name="address_data.block" label="Block" rules={RULES.block} />
            <TextField {...common} name="address_data.district" label="District" rules={RULES.district} />
            <TextField {...common} name="address_data.division" label="Division" rules={RULES.division} />
            <TextField {...common} name="address_data.area_code" label="Area code" inputMode="numeric" transform={digitsOnly(10)} rules={RULES.area_code} />

            <SelectField
              {...common}
              name="address_data.country"
              label="Country"
              required
              placeholder="Select country"
              options={countryOptions}
              onChange={onCountryChange}
            />
            <SelectField
              {...common}
              name="address_data.state"
              label="State"
              required
              placeholder="Select state"
              options={stateOptions}
              onChange={onStateChange}
            />
            <SelectField
              {...common}
              name="address_data.city"
              label="City"
              required
              placeholder="Select city"
              options={cityOptions}
            />
          </Section>

          {/* Sticky action bar */}
          <div className="-mx-4 sm:mx-0 border-t sm:border sm:rounded-xl border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg">
            <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-end gap-3">
              <div className="flex gap-3">
                <button type="button" onClick={handleCancel} disabled={submitting} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !hasChanges}
                  className="btn bgTheme text-white min-w-[9rem]"
                >
                  {submitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm" /> Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {updateModal && (
        <UpdateSuccessful
          handleCloseOnly={() => setUpdateModal(false)}
          handleCloseAndNavigate={() => navigate(`/staffDetail/${type}/${id}`)}
        />
      )}
    </div>
  );
};

export default UpdateStaffDetails;