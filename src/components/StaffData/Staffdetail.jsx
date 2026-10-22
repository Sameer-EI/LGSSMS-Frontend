import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchOfficeStaff, fetchTeachers } from "../../services/api/Api";
import { constants } from "../../global/constants";

const BASE_URL = constants.baseUrl;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const CADRE_LABELS = {
  PRT: "Primary Teacher",
  TGT: "Trained Graduate Teacher",
  PGT: "Post Graduate Teacher",
};

// null, undefined and "" are all "empty". 0 is a real value.
const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

const photoUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const mask = (value) => {
  const s = String(value);
  return s.length <= 4 ? s : `${"•".repeat(s.length - 4)}${s.slice(-4)}`;
};

// Aadhaar reads better in groups of 4
const formatAadhaar = (value) => String(value).replace(/(\d{4})(?=\d)/g, "$1 ");

const titleCase = (s) => (s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s);

const fullNameOf = (d) =>
  titleCase(
    [d.first_name, d.middle_name, d.last_name]
      .filter((p) => !isEmpty(p))
      .join(" "),
  );

const initialsOf = (d) =>
  `${d.first_name?.[0] || ""}${d.last_name?.[0] || ""}`.toUpperCase() || "?";

const buildFullAddress = (a = {}) =>
  [
    a.house_no,
    a.habitation,
    a.address_line,
    a.block,
    !isEmpty(a.ward_no) && `Ward ${a.ward_no}`,
    !isEmpty(a.zone_no) && `Zone ${a.zone_no}`,
    a.district,
    a.division,
    a.city_name,
    a.state_name,
    a.country_name,
    a.area_code,
  ]
    .filter((p) => p && !isEmpty(p))
    .join(", ");

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                      */
/* -------------------------------------------------------------------------- */

const Badge = ({ children, tone = "blue", dot }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    green:
      "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200",
    red: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  };
  const dots = { green: "bg-green-500", red: "bg-red-500" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
};

const Section = ({ title, icon, children }) => (
  <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
    <h2 className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 text-base font-semibold text-gray-800 dark:text-gray-100">
      <i
        className={`fa-solid ${icon} text-gray-400 w-4`}
        aria-hidden="true"
      ></i>
      {title}
    </h2>
    <dl className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
      {children}
    </dl>
  </section>
);

const Item = ({ label, value, children, full }) => (
  <div className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">
      {children ??
        (isEmpty(value) ? <span className="text-gray-400">—</span> : value)}
    </dd>
  </div>
);

/** Sensitive value: masked by default, reveal and copy controls */
const Sensitive = ({ value, format = String, label }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isEmpty(value)) return <span className="text-gray-400">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context): silently ignore */
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono tracking-wide">
        {visible ? format(value) : mask(value)}
      </span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      >
        <i
          className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"} text-xs`}
          aria-hidden="true"
        ></i>
      </button>
      <button
        type="button"
        onClick={copy}
        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label={`Copy ${label}`}
      >
        <i
          className={`fa-solid ${copied ? "fa-check text-green-500" : "fa-copy"} text-xs`}
          aria-hidden="true"
        ></i>
      </button>
      {copied && <span className="text-xs text-green-600">Copied</span>}
    </span>
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

const Staffdetail = () => {
  const { id, type } = useParams();
  const isTeacher = type === "teacher";

  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (type === "teacher") {
        setStaffData(await fetchTeachers(id));
      } else if (type === "office") {
        setStaffData(await fetchOfficeStaff(id));
      } else {
        setError("Invalid staff type.");
      }
    } catch {
      setError("Failed to load staff data.");
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    getStaff();
  }, [getStaff]);

  if (loading) return <PageLoader />;

  if (error || !staffData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <i
          className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"
          aria-hidden="true"
        ></i>
        <p className="text-lg text-gray-800 dark:text-gray-100 font-medium">
          We couldn't load this profile
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {error || "No data available."}
        </p>
        {type === "teacher" || type === "office" ? (
          <button onClick={getStaff} className="btn bgTheme text-white mt-5">
            <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> Try
            again
          </button>
        ) : null}
      </div>
    );
  }

  const d = staffData;
  const bank = d.banking_data || {};
  const addr = d.address_data || {};
  const name = fullNameOf(d);
  const src = photoUrl(d.user_profile);
  const fullAddress = buildFullAddress(addr);
  const hasActiveFlag = typeof d.is_active === "boolean";

  // Only show address sub-fields that actually have a value
  const addressDetails = [
    ["House no", addr.house_no],
    ["Habitation", addr.habitation],
    ["Ward no", addr.ward_no],
    ["Zone no", addr.zone_no],
    ["Block", addr.block],
    ["District", addr.district],
    ["Division", addr.division],
    ["Area code", addr.area_code],
  ].filter(([, v]) => !isEmpty(v));

  return (
    <div className="mb-24 md:mb-10 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Profile header */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="h-20 bgTheme" aria-hidden="true" />
          <div className="px-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 ring-4 ring-white dark:ring-gray-800 shadow-md self-center sm:self-auto">
                {src ? (
                  <img
                    src={src}
                    alt={`${name} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-500 dark:text-gray-300">
                    {initialsOf(d)}
                  </span>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left sm:pb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isTeacher ? "Teacher" : "Office staff"}
                  {!isEmpty(d.qualification) && ` · ${d.qualification}`}
                </p>
              </div>

              <div className="text-center sm:pb-1">
                <Link
                  to={`/staffdetail/update/${type}/${id}`}
                  className="btn bgTheme text-white"
                >
                  <i
                    className="fa-solid fa-pen-to-square"
                    aria-hidden="true"
                  ></i>{" "}
                  Update profile
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              {hasActiveFlag && (
                <Badge tone={d.is_active ? "green" : "red"} dot>
                  {d.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
              {isTeacher && !isEmpty(d.cadre) && (
                <Badge>
                  {d.cadre}
                  {CADRE_LABELS[d.cadre] && ` · ${CADRE_LABELS[d.cadre]}`}
                </Badge>
              )}
              {isTeacher && !isEmpty(d.subject_name) && (
                <Badge tone="gray">{d.subject_name}</Badge>
              )}
              {!isEmpty(d.joining_date) && (
                <Badge tone="gray">Joined {formatDate(d.joining_date)}</Badge>
              )}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-1.5 mt-4 text-sm items-center sm:items-start">
              {!isEmpty(d.email) && (
                <a
                  href={`mailto:${d.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <i
                    className="fa-solid fa-envelope mr-2 text-gray-400"
                    aria-hidden="true"
                  ></i>
                  {d.email}
                </a>
              )}
              {!isEmpty(d.phone_no) && (
                <a
                  href={`tel:${d.phone_no}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <i
                    className="fa-solid fa-phone mr-2 text-gray-400"
                    aria-hidden="true"
                  ></i>
                  {d.phone_no}
                </a>
              )}
            </div>
          </div>
        </div>

        <Section title="Personal information" icon="fa-user">
          <Item label="First name" value={titleCase(d.first_name)} />
          <Item label="Middle name" value={titleCase(d.middle_name)} />
          <Item label="Last name" value={titleCase(d.last_name)} />
          <Item label="Gender" value={d.gender} />
          <Item label="Email" value={d.email} />
          <Item label="Phone number" value={d.phone_no} />
        </Section>

        <Section title="Professional details" icon="fa-briefcase">
          {isTeacher && (
            <>
              <Item
                label="Cadre"
                value={
                  d.cadre
                    ? `${d.cadre}${CADRE_LABELS[d.cadre] ? ` (${CADRE_LABELS[d.cadre]})` : ""}`
                    : null
                }
              />
              <Item label="Subject" value={d.subject_name} />
            </>
          )}
          <Item label="Qualification" value={d.qualification} />
          <Item label="Date of joining" value={formatDate(d.joining_date)} />
        </Section>

        <Section title="Identity documents" icon="fa-id-card">
          <Item label="Aadhaar number">
            <Sensitive
              value={d.adhaar_no}
              format={formatAadhaar}
              label="Aadhaar number"
            />
          </Item>
          <Item label="PAN number">
            <Sensitive value={d.pan_no} label="PAN number" />
          </Item>
        </Section>

        <Section title="Bank details" icon="fa-building-columns">
          <Item label="Account holder" value={bank.holder_name} />
          <Item label="Account number">
            <Sensitive value={bank.account_no} label="account number" />
          </Item>
          <Item label="IFSC code" value={bank.ifsc_code} />
          {!isEmpty(bank.bank_name) && (
            <Item label="Bank" value={bank.bank_name} />
          )}
        </Section>

        <Section title="Address" icon="fa-location-dot">
          <Item label="Full address" full value={fullAddress} />
          {addressDetails.map(([label, value]) => (
            <Item key={label} label={label} value={String(value)} />
          ))}
        </Section>
      </div>
    </div>
  );
};

export default Staffdetail;
