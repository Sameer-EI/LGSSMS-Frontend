import React, { useEffect, useState, useRef, useContext } from "react";
import {
  fetchDocumentType,
  fetchGuardians,
  fetchOfficeStaff,
  fetchRoles,
  fetchStudentYearLevelByClass,
  fetchTeachers,
  fetchYearLevels,
} from "../services/api/Api";
import { constants } from "../global/constants";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";


// ======================================================================
// TC (Transfer Certificate) helpers
// ======================================================================
const TC_DEFAULTS = {
  form_no: "4",
  tc_no: "",
  scholar_no: "",
  aadhar_no: "",
  sssmid: "",
  fmd: "",
  apar_id: "",
  pen_no: "",
  student_name: "",
  father_name: "",
  mother_name: "",
  school: "Alhikmah", // prefilled
  district: "Bhopal", // prefilled
  admission_date: "", // stored as YYYY-MM-DD (matches <input type="date">)
  leaving_date: "", // YYYY-MM-DD
  dob: "", // YYYY-MM-DD
  dob_words: "",
  vaccinated: "Yes",
  last_class: "",
  medium: "English",
  exam_year: "",
  promoted_to_class: "",
  character: "Good",
  date: "", // certificate date, YYYY-MM-DD
};

// Same format that validateIdentity() enforces for "Transfer Certificate"
const TC_NO_REGEX = /^TC-\d{4}-\d{3,}$/;
const TC_NO_HINT = "TC-YYYY-XXX (e.g. TC-2022-00123)";
const validateTcNo = (v) =>
  !v ? "TC No. is required" : TC_NO_REGEX.test(v) ? "" : `TC: ${TC_NO_HINT}`;

// Small reusable field wrapper for the TC modal
const TcField = ({ label, required, error, children }) => (
  <div className="form-control w-full">
    <label className="label py-1">
      <span className="label-text text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-error">*</span>}
      </span>
    </label>
    {children}
    {error && <span className="text-error text-xs mt-1">{error}</span>}
  </div>
);
const tcInput =
  "input input-bordered input-sm sm:input-md w-full bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-600";

const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Any of "2016-09-10", "10-09-2016", "10/09/2016", "10/09/16", ISO timestamp -> "2016-09-10"
const toISODate = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
};

// "2016-09-10" -> "10-09-2016" (what is printed on the certificate)
const isoToDMY = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

// ---- number / date to words (for "DOB in words") ----
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const ORDINALS = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth", "Twenty First", "Twenty Second", "Twenty Third", "Twenty Fourth", "Twenty Fifth", "Twenty Sixth", "Twenty Seventh", "Twenty Eighth", "Twenty Ninth", "Thirtieth", "Thirty First"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const below100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`);
const below1000 = (n) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
};
const yearToWords = (y) => {
  if (!y) return "";
  const th = Math.floor(y / 1000);
  const r = y % 1000;
  return [th ? `${below100(th)} Thousand` : "", r ? below1000(r) : ""].filter(Boolean).join(" ");
};
const dobToWords = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const day = ORDINALS[Number(m[3])];
  const month = MONTHS[Number(m[2]) - 1];
  if (!day || !month) return "";
  return `${day} ${month} ${yearToWords(Number(m[1]))}`;
};

// ---- API response -> form data ----
const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

// Accepts an object, an array, a DRF-style {results:[...]}, or {data:{...}}
const unwrapTcResponse = (raw) => {
  let d = raw;
  if (Array.isArray(d)) d = d[0];
  if (d && Array.isArray(d.results)) d = d.results[0];
  if (d && d.data && typeof d.data === "object" && !Array.isArray(d.data)) d = d.data;
  if (d && Array.isArray(d.data)) d = d.data[0];
  if (!d || typeof d !== "object") return {};

  // Flatten one level of nested objects (student_input, bank details ...) without overriding top-level keys
  const flat = { ...d };
  Object.values(d).forEach((v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.entries(v).forEach(([k, val]) => {
        if (!(k in flat)) flat[k] = val;
      });
    }
  });
  return flat;
};

const TC_ALIASES = {
  form_no: ["form_no", "form_number", "formno"],
  tc_no: ["tc_no", "tc_number", "tcno", "tc", "transfer_certificate_no"],
  scholar_no: ["scholar_no", "scholar_number", "scholar number", "scholarno", "scholar"],
  aadhar_no: ["aadhar_no", "aadhaar_no", "aadhar_number", "aadhaar_number", "adhaar number", "adhaar_no", "aadhar", "aadhaar", "adhaar"],
  sssmid: ["sssmid", "sssm_id", "sss_mid", "sssm"],
  fmd: ["fmd", "fmid", "fmid_number", "fmd_number", "fm_id", "fmd_no"],
  apar_id: ["apar_id", "apaar_id", "apar", "apar_no", "apar_number"],
  pen_no: ["pen_no", "pen_number", "pen", "penno"],
  student_name: ["student_name", "name", "full_name", "student_full_name", "studentname"],
  father_name: ["father_name", "fathers_name", "father", "fathername"],
  mother_name: ["mother_name", "mothers_name", "mother", "mothername"],
  school: ["school", "school_name", "schoolname"],
  district: ["district", "dist", "district_name"],
  admission_date: ["admission_date", "date_of_admission", "admitted_on", "admission"],
  leaving_date: ["leaving_date", "date_of_leaving", "leave_date", "left_on", "to_date"],
  dob: ["dob", "date_of_birth", "birth_date", "dateofbirth"],
  dob_words: ["dob_words", "dob_in_words", "date_of_birth_in_words", "dob_text"],
  vaccinated: ["vaccinated", "is_vaccinated", "vaccination"],
  last_class: ["last_class", "last_class_passed", "class", "class_name", "year_level", "level_name", "current_class"],
  medium: ["medium", "medium_of_instruction"],
  exam_year: ["exam_year", "year_of_exam", "academic_year", "school_year", "school year", "year"],
  promoted_to_class: ["promoted_to_class", "promoted_to", "promotion_class", "next_class"],
  character: ["character", "conduct"],
  date: ["date", "tc_date", "issue_date", "issued_on", "certificate_date"],
};

const pickValue = (lookup, aliases) => {
  for (const a of aliases) {
    const v = lookup[normKey(a)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
};

const DATE_FIELDS = ["admission_date", "leaving_date", "dob", "date"];

const mapTcResponse = (raw) => {
  const flat = unwrapTcResponse(raw);
  const lookup = {};
  Object.entries(flat).forEach(([k, v]) => {
    const nk = normKey(k);
    if (!(nk in lookup)) lookup[nk] = v;
  });

  const out = {};
  Object.entries(TC_ALIASES).forEach(([field, aliases]) => {
    const v = pickValue(lookup, aliases);
    out[field] = DATE_FIELDS.includes(field) ? toISODate(v) : v === "" ? "" : String(v).trim();
  });

  // Boolean-ish vaccinated -> Yes / No
  if (typeof pickValue(lookup, TC_ALIASES.vaccinated) === "boolean") {
    out.vaccinated = pickValue(lookup, TC_ALIASES.vaccinated) ? "Yes" : "No";
  }
  if (out.vaccinated && /^(true|yes|y|1)$/i.test(out.vaccinated)) out.vaccinated = "Yes";
  if (out.vaccinated && /^(false|no|n|0)$/i.test(out.vaccinated)) out.vaccinated = "No";

  // Aadhaar: digits only
  if (out.aadhar_no) out.aadhar_no = String(out.aadhar_no).replace(/\D/g, "");

  // Derive "DOB in words" when the API doesn't send it
  if (!out.dob_words && out.dob) out.dob_words = dobToWords(out.dob);

  return out;
};

export const DocumentUpload = () => {
  // Get Auth Context
  const { axiosInstance } = useContext(AuthContext);

  // STEPS LOGIC
  const [step, setStep] = useState(0);
  const next = () => setStep((prev) => Math.min(prev + 1, 1));
  const prev = () => setStep((prev) => Math.max(prev - 1, 0));

  // FORM DATA & DROPDOWN STATES
  const [allRoles, setAllRoles] = useState([]);
  const [documentType, setDocumentType] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [officeStaff, setOfficeStaff] = useState([]);
  const [yearLevel, setYearLevel] = useState([]);
  const [yearLevelID, setYearLevelID] = useState("");

  const [loadingRoles, setLoadingRoles] = useState(false);
  const [Disable, setDisable] = useState(true);
  const [AddField, setAddField] = useState(0);
  const [selectedTeacherName, setSelectedTeacherName] = useState("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [searchTeacherInput, setSearchTeacherInput] = useState("");
  const [showGuardianDropdown, setShowGuardianDropdown] = useState(false);
  const [selectedGuardianName, setSelectedGuardianName] = useState("");
  const [searchGuardianInput, setSearchGuardianInput] = useState("");
  const [showOfficeStaffDropdown, setShowOfficeStaffDropdown] = useState(false);
  const [selectedOfficeStaffName, setSelectedOfficeStaffName] = useState("");
  const [searchOfficeStaffInput, setSearchOfficeStaffInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [searchStudentInput, setSearchStudentInput] = useState("");

  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [loadingOfficeStaff, setLoadingOfficeStaff] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [docTypeErrors, setDocTypeErrors] = useState([]);
  const [FilesErrors, setFilesErrors] = useState([]);
  const [apiErrors, setApiErrors] = useState({});

  // TC Modal States
  const [showTcModal, setShowTcModal] = useState(false);
  const [tcFormData, setTcFormData] = useState({ ...TC_DEFAULTS });
  const [tcUploadIndex, setTcUploadIndex] = useState(-1);
  const [generatingTC, setGeneratingTC] = useState(false);
  const [tcGeneratedFile, setTcGeneratedFile] = useState(null);
  const [tcPreviewUrl, setTcPreviewUrl] = useState("");
  const [tcNoError, setTcNoError] = useState("");
  const [showPreviewFull, setShowPreviewFull] = useState(false);

  const [role, setRole] = useState("");

  const studentDropdownRef = useRef(null);
  const teacherDropdownRef = useRef(null);
  const guardianDropdownRef = useRef(null);
  const officeStaffDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    student: "",
    teacher: "",
    guardian: "",
    office_staff: "",
    year_level: "",
  });

  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.first_name} ${teacher.last_name}`
      .toLowerCase()
      .includes(searchTeacherInput.toLowerCase())
  );
  const filteredGuardians = guardians.filter((guardian) =>
    `${guardian.first_name} ${guardian.last_name}`
      .toLowerCase()
      .includes(searchGuardianInput.toLowerCase())
  );
  const filteredOfficeStaff = officeStaff.filter((staff) =>
    `${staff.first_name} ${staff.last_name}`
      .toLowerCase()
      .includes(searchOfficeStaffInput.toLowerCase())
  );
  const filteredStudents = students.filter((studentObj) =>
    studentObj.student_name
      .toLowerCase()
      .includes(searchStudentInput.toLowerCase())
  );

  // Dynamic fields for document uploads
  const [uploadFields, setUploadFields] = useState([
    { files: null, document_types: "", identities: "" },
  ]);
  const [identityErrors, setIdentityErrors] = useState([]);

  // Helper function to get max length based on document type
  const getIdentityMaxLength = (docTypeId) => {
    if (!docTypeId) return undefined;

    const selectedDoc = documentType.find(
      (doc) => doc.id.toString() === docTypeId.toString()
    );
    if (!selectedDoc) return undefined;

    const name = selectedDoc.name.trim().toLowerCase();

    const maxLengths = {
      "adharcard": 12,
      "pan card": 10,
      "passport": 8,
      "driving license": 20,
      "caste certificate": 15,
      "birth certificate": 15,
      "transfer certificate": 20,
      "bonafide certificate": 20,
      "migration certificate": 20,
      "date of birth certificate": 20,
      "income certificate": 20,
      "domicile certificate": 20,
      "library card": 15,
      "other": 50
    };

    const matchedType = Object.keys(maxLengths).find(key =>
      name.includes(key) || key.includes(name)
    );

    return matchedType ? maxLengths[matchedType] : 50;
  };

  // NOTE: Transfer Certificate is intentionally NOT auto-generated.
  // The user must type the TC identity manually.
  const getAutoIdentityValue = (docTypeId) => {
    if (!docTypeId) return "";

    const selectedDoc = documentType.find(
      (doc) => doc.id.toString() === docTypeId.toString()
    );
    if (!selectedDoc) return "";

    const name = selectedDoc.name.trim().toLowerCase();
    const year = new Date().getFullYear();

    if (name === "birth certificate") {
      return `BRN-${year}-001`;
    }
    if (name === "bonafide certificate") {
      return `BONAFIDE-${year}-001`;
    }
    if (name === "caste certificate") {
      return `CASTE-${year}-001`;
    }
    if (name === "pan card") {
      return `AAAAA0000A`;
    }
    if (name === "adharcard") {
      return "123456789012";
    }
    if (name === "passport") {
      return "K1234567";
    }

    return "";
  };

  // validation
  const validateIdentity = (identity, docTypeId) => {
    if (!docTypeId || !identity) return "";

    const selectedDoc = documentType.find(
      (doc) => doc.id.toString() === docTypeId.toString()
    );
    if (!selectedDoc) return "";

    const name = selectedDoc.name.trim().toLowerCase();

    if (name === "adharcard") {
      const aadhaarRegex = /^\d{12}$/;
      return aadhaarRegex.test(identity)
        ? ""
        : "Aadhaar must be 12 digits (e.g. 123456789012)";
    } else if (name === "passport") {
      const passportRegex = /^[A-Z]{1}[0-9]{7}$/;
      return passportRegex.test(identity)
        ? ""
        : "Passport format: 1 letter + 7 digits (e.g. K1234567)";
    } else if (name === "birth certificate") {
      const bcRegex = /^BRN-\d{4}-\d{3,}$/;
      return bcRegex.test(identity)
        ? ""
        : "Birth: BRN-2021-000123";
    } else if (name === "transfer certificate") {
      return TC_NO_REGEX.test(identity)
        ? ""
        : `TC: ${TC_NO_HINT}`;
    } else if (name === "bonafide certificate") {
      const bonafideRegex = /^BONAFIDE-\d{4}-\d{3,}$/;
      return bonafideRegex.test(identity)
        ? ""
        : "Bonafide: BONAFIDE-2023-001";
    } else if (name === "pan card") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      return panRegex.test(identity)
        ? ""
        : "PAN: AAAAA9999A (format)";
    } else if (name === "migration certificate") {
      const migrationRegex = /^[A-Z]{2,10}\/\d{4}\/\d{3,6}$/;
      return migrationRegex.test(identity)
        ? ""
        : "Migration: CBSE/2020/123456";
    } else if (name === "driving license") {
      const dlRegex = /^[A-Z]{2}[ -]?\d{2}[ -]?\d{2,4}[ -]?\d{6,7}$/;
      return dlRegex.test(identity)
        ? ""
        : "DL: XX00-YYYY-Number (e.g. DL01-2017-001234)";
    } else if (name === "caste certificate") {
      const casteRegex = /^CASTE-\d{4}-\d{3,}$/;
      return casteRegex.test(identity)
        ? ""
        : "Caste: CASTE-2023-001 (format)";
    }

    return "";
  };

  // --- API FETCH FUNCTIONS ---
  const getRoles = async () => {
    setLoadingRoles(true);
    try {
      const roles = await fetchRoles();
      setAllRoles(roles);
    } catch {
      console.log("Failed to load roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const getDocumentTypes = async () => {
    setLoadingDocumentTypes(true);
    try {
      const docType = await fetchDocumentType();
      const sortedDocType = [...docType].sort((a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );
      setDocumentType(sortedDocType);
    } catch (error) {
      console.log("Failed to load document types");
    } finally {
      setLoadingDocumentTypes(false);
    }
  };

  const getTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const allTeachers = await fetchTeachers();
      const sortedTeachers = [...allTeachers].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB, "en", { sensitivity: "base" });
      });
      setTeachers(sortedTeachers);
    } catch {
      console.log("Failed to load teachers");
    } finally {
      setLoadingTeachers(false);
    }
  };

  const getGuardians = async () => {
    setLoadingGuardians(true);
    try {
      const allGuardians = await fetchGuardians();
      const sortedGuardians = [...allGuardians].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB, "en", { sensitivity: "base" });
      });

      setGuardians(sortedGuardians);
    } catch {
      console.log("Failed to load guardians");
    } finally {
      setLoadingGuardians(false);
    }
  };

  const getOfficeStaff = async () => {
    setLoadingOfficeStaff(true);
    try {
      const allStaff = await fetchOfficeStaff();
      const sortedStaff = [...allStaff].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB, "en", { sensitivity: "base" });
      });

      setOfficeStaff(sortedStaff);
    } catch {
      console.log("Failed to load office staff");
    } finally {
      setLoadingOfficeStaff(false);
    }
  };

  const getYearLevels = async () => {
    try {
      const yl = await fetchYearLevels();
      setYearLevel(yl);
    } catch {
      console.log("Failed to load year levels");
    }
  };

  const getStudentsYearLevel = async () => {
    if (!yearLevelID) return;
    setLoadingStudents(true);
    try {
      const allStudentsByClass = await fetchStudentYearLevelByClass(
        yearLevelID
      );
      const sortedStudents = [...allStudentsByClass].sort((a, b) =>
        a.student_name.localeCompare(b.student_name, "en", {
          sensitivity: "base",
        })
      );

      setStudents(sortedStudents);
    } catch {
      console.log("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  // --- FETCH STUDENT DETAILS FOR TC USING GetTCdata API ---
  // Returns { data, ok }. On failure the form opens empty (never with fake data).
  const fetchStudentDetailsForTC = async (studentId) => {
    try {
      const response = await axiosInstance.get(`/d/GetTCdata/`, {
        params: { student_id: parseInt(studentId, 10) },
      });
      console.log("GetTCdata API response:", response.data);
      const mapped = mapTcResponse(response.data);
      console.log("Mapped TC form data:", mapped);
      return { data: mapped, ok: true };
    } catch (error) {
      console.error("GetTCdata API error:", error);
      if (error.response && error.response.status === 401) {
        setAlertMessage("⚠️ Session expired. Please login again.");
      } else {
        setAlertMessage(
          "Could not load the student's TC details. You can fill the form manually."
        );
      }
      setShowAlert(true);
      return { data: {}, ok: false };
    }
  };

  // --- HANDLERS ---
  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    setFormData({
      student: "",
      teacher: "",
      guardian: "",
      office_staff: "",
      year_level: "",
    });
    setSelectedStudentName("");
    setSelectedTeacherName("");
    setSelectedGuardianName("");
    setSelectedOfficeStaffName("");
    setDisable(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "year_level") {
      setFormData((prev) => ({ ...prev, [name]: value, student: "" }));
      setSelectedStudentName("");
      setDisable(true);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddField = () => {
    if (AddField < 3) {
      setAddField(AddField + 1);
      setUploadFields([
        ...uploadFields,
        { files: null, document_types: "", identities: "" },
      ]);
      setIdentityErrors([...identityErrors, ""]);
      setDocTypeErrors([...docTypeErrors, ""]);
      setFilesErrors([...FilesErrors, ""]);
    }
  };

  const handleFileChange = (e, index) => {
    const newFields = [...uploadFields];
    newFields[index].files = e.target.files[0];
    setUploadFields(newFields);
    
    const newFileErrors = [...FilesErrors];
    newFileErrors[index] = "";
    setFilesErrors(newFileErrors);
  };

  // --- TC MODAL HANDLERS ---
  const handleDocumentTypeChange = async (e, index) => {
    const selectedDocType = e.target.value;
    
    console.log("======= DOCUMENT TYPE CHANGE =======");
    console.log("Selected Doc Type ID:", selectedDocType);
    console.log("Student ID:", formData.student);
    
    const selectedDoc = documentType.find(doc => doc.id.toString() === selectedDocType);
    
    const newFields = [...uploadFields];
    newFields[index].document_types = selectedDocType;

    // Transfer Certificate identity must be typed manually: clear any
    // value left over from a previously selected document type.
    const isTCType =
      selectedDoc &&
      selectedDoc.name.toLowerCase().includes("transfer") &&
      selectedDoc.name.toLowerCase().includes("certificate");
    if (isTCType) newFields[index].identities = "";

    if (!newFields[index].identities) {
      const autoIdentity = getAutoIdentityValue(selectedDocType);
      if (autoIdentity) {
        newFields[index].identities = autoIdentity;
      }
    }

    setUploadFields(newFields);

    if (selectedDoc && formData.student) {
      const docName = selectedDoc.name.toLowerCase().trim();
      const isTC = docName.includes('transfer') && docName.includes('certificate');
      
      if (isTC) {
        console.log("✅ Opening TC Modal...");
        setTcUploadIndex(index);
        setTcNoError("");
        
        const { data: details } = await fetchStudentDetailsForTC(formData.student);
        setTcFormData({
          ...TC_DEFAULTS,
          ...Object.fromEntries(
            Object.entries(details).filter(([, v]) => v !== "" && v !== undefined)
          ),
          student_name: details.student_name || selectedStudentName || "",
          date: details.date || todayISO(),
        });
        setShowTcModal(true);
      }
    } else {
      if (selectedDoc && selectedDoc.name.toLowerCase().includes('transfer')) {
        setAlertMessage("⚠️ Please select a student first!");
        setShowAlert(true);
      }
    }
  };

  // --- GENERATE TC IMAGE (Using Canvas) ---
  const generateTcImage = async () => {
    setGeneratingTC(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const W = 1000, H = 1414, S = 2; // A4 ratio, 2x for sharpness
      const canvas = document.createElement("canvas");
      canvas.width = W * S;
      canvas.height = H * S;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(S, 0, 0, S, 0, 0);

      const INK = "#111827", BLUE = "#1e3a8a", VALUE = "#1d4ed8";
      const SERIF = '"Times New Roman", Times, serif';
      const HAND = '"Segoe Script","Brush Script MT","Comic Sans MS",cursive';

      // paper + double border
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      const text = (t, x, y, { size = 20, bold = false, italic = false, align = "left", color = INK, font = SERIF } = {}) => {
        ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${font}`;
        ctx.textAlign = align;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = color;
        ctx.fillText(t, x, y);
      };

      // label + handwritten value sitting on a dotted line
      const field = (label, value, x, y, w) => {
        ctx.font = `20px ${SERIF}`;
        const lw = ctx.measureText(label + " ").width;
        text(label, x, y);
        const vx = x + lw, vw = w - lw;
        ctx.save();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = "#6b7280";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vx, y + 6);
        ctx.lineTo(x + w, y + 6);
        ctx.stroke();
        ctx.restore();
        let size = 22;
        const v = String(value || "");
        while (size > 11) {
          ctx.font = `italic ${size}px ${HAND}`;
          if (ctx.measureText(v).width <= vw - 8) break;
          size -= 1;
        }
        text(v, vx + 6, y + 1, { size, italic: true, color: VALUE, font: HAND });
      };

      const L = 90, R = W - 90, FW = R - L;

      // header
      text(`Form No. ${tcFormData.form_no || "4"}`, L, 85, { size: 16 });

      // title box
      const tw = 340, th = 46, tx = (W - tw) / 2, ty = 105;
      ctx.fillStyle = "#eef2ff";
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 8);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeRect(tx, ty, tw, th);
      }
      text("TRANSFER CERTIFICATE", W / 2, ty + 31, { size: 24, bold: true, align: "center", color: BLUE });

      field("No.", tcFormData.tc_no, L, 215, 360);
      field("Scholar No.", tcFormData.scholar_no, 520, 215, R - 520);
      field("Aadhar No.", tcFormData.aadhar_no, L, 265, 430);
      field("SSSMID", tcFormData.sssmid, 550, 265, R - 550);
      field("FMID", tcFormData.fmd, L, 315, 430);
      field("APAAR ID", tcFormData.apar_id, 550, 315, R - 550);
      field("PEN No.", tcFormData.pen_no, 550, 365, R - 550);

      field("This is to certify that Shri/Km.", tcFormData.student_name, L, 450, FW);
      field("Father's Name Shri", tcFormData.father_name, L, 500, FW);
      field("Mother's Name Smt.", tcFormData.mother_name, L, 550, FW);
      field("School", tcFormData.school, L, 600, 560);
      field("Dist.", tcFormData.district, 680, 600, R - 680);
      field("was attending this school from", isoToDMY(tcFormData.admission_date), L, 650, 520);
      field("to", isoToDMY(tcFormData.leaving_date), 630, 650, R - 630);
      field("and now leaves the school on", isoToDMY(tcFormData.leaving_date), L, 700, FW);
      field("His/her date of birth according to the Admission Register is", isoToDMY(tcFormData.dob), L, 750, FW);
      field("(in words)", tcFormData.dob_words, L, 800, FW);

      text("He/She has been vaccinated or is otherwise protected from small pox.", L, 865, { size: 20, italic: true });
      text("The Last Annual Examination Passed by him/her was that of", L, 915, { size: 20 });

      field("Class", tcFormData.last_class, L, 965, 220);
      field("Medium", tcFormData.medium, 340, 965, 330);
      field("in the year", tcFormData.exam_year, 690, 965, R - 690);
      field("and promotion has been to class", tcFormData.promoted_to_class, L, 1015, 520);
      field("His/her Character was", tcFormData.character, 630, 1015, R - 630);

      field("Date", isoToDMY(tcFormData.date), L, 1180, 280);
      text("Principal / H.M.", R, 1180, { size: 20, bold: true, align: "right" });

      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });

      if (!blob) {
        throw new Error("Blob creation failed");
      }

      return new File(
        [blob],
        `Transfer_Certificate_${tcFormData.scholar_no || "student"}_${Date.now()}.png`,
        { type: "image/png" }
      );
    } catch (error) {
      setAlertMessage("Error generating TC: " + error.message);
      setShowAlert(true);
      return null;
    } finally {
      setGeneratingTC(false);
    }
  };

  // --- HANDLE TC SUBMIT ---
  const handleTcSubmit = async () => {
    try {
      const tcErr = validateTcNo(tcFormData.tc_no);
      setTcNoError(tcErr);

      const requiredFields = {
        scholar_no: "Scholar No.",
        student_name: "Student Name",
        father_name: "Father Name",
        mother_name: "Mother Name",
        dob: "Date of Birth",
      };
      const missingFields = Object.keys(requiredFields)
        .filter((field) => !String(tcFormData[field] || "").trim())
        .map((f) => requiredFields[f]);

      if (tcErr || missingFields.length > 0) {
        setAlertMessage(
          [
            tcErr ? `❌ ${tcErr}` : "",
            missingFields.length
              ? `❌ Please fill in all required fields: ${missingFields.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        );
        setShowAlert(true);
        return;
      }

      setGeneratingTC(true);

      const tcFile = await generateTcImage();
      
      if (!tcFile) {
        setAlertMessage("Failed to generate TC image. Please try again.");
        setShowAlert(true);
        setGeneratingTC(false);
        return;
      }

      console.log("📄 Generated TC File:", tcFile);
      console.log("📄 File type:", typeof tcFile);
      console.log("📄 Is File instance:", tcFile instanceof File);

      if (tcPreviewUrl) {
        URL.revokeObjectURL(tcPreviewUrl);
      }
      const previewUrl = URL.createObjectURL(tcFile);
      setTcPreviewUrl(previewUrl);
      setTcGeneratedFile(tcFile);
      
      const newFields = [...uploadFields];
      if (tcUploadIndex !== -1) {
        newFields[tcUploadIndex].files = tcFile;
        console.log("✅ File set in uploadFields:", newFields[tcUploadIndex].files);
        
        // NOTE: identity is NOT auto-generated for TC. The user enters it manually.
        setUploadFields(newFields);
        
        const newIdentityErrors = [...identityErrors];
        newIdentityErrors[tcUploadIndex] = "";
        setIdentityErrors(newIdentityErrors);
        
        const newFileErrors = Array.isArray(FilesErrors) ? [...FilesErrors] : [];
        newFileErrors[tcUploadIndex] = "";
        setFilesErrors(newFileErrors);
        
        const newDocErrors = Array.isArray(docTypeErrors) ? [...docTypeErrors] : [];
        newDocErrors[tcUploadIndex] = "";
        setDocTypeErrors(newDocErrors);
        
        console.log("✅ TC file attached to upload field");
        console.log("✅ uploadFields after update:", newFields);
      }

      setShowTcModal(false);
      setAlertMessage("✅ Transfer Certificate generated successfully! Enter the TC identity, then click 'Upload' to submit.");
      setShowAlert(true);
      
      setTcFormData({ ...TC_DEFAULTS });
      setTcUploadIndex(-1);
      
    } catch (error) {
      console.error("❌ Error in handleTcSubmit:", error);
      setAlertMessage("Error: " + error.message);
      setShowAlert(true);
      setGeneratingTC(false);
    }
  };

  const handleUploadChange = (e, index) => {
    const { name, value } = e.target;

    const newFields = [...uploadFields];
    newFields[index][name] = value;
    setUploadFields(newFields);

    if (name === "document_types" && !newFields[index].identities) {
      const autoIdentity = getAutoIdentityValue(value);
      if (autoIdentity) {
        newFields[index].identities = autoIdentity;
        setUploadFields(newFields);
      }
    }

    if (name === "identities" || name === "document_types") {
      const newErrors = [...identityErrors];
      const validationError = validateIdentity(
        name === "identities" ? value : newFields[index].identities,
        name === "document_types" ? value : newFields[index].document_types
      );
      newErrors[index] = validationError || "";
      setIdentityErrors(newErrors);
    }
  };

  const getAvailableDocumentTypes = (currentIndex) => {
    const selectedDocTypes = uploadFields
      .map((field, idx) => (idx !== currentIndex ? field.document_types : null))
      .filter(Boolean);
    return documentType.filter(
      (doc) => !selectedDocTypes.includes(doc.id.toString())
    );
  };

  // --- HANDLE SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("🚀 Submit clicked");
    console.log("📦 Current uploadFields:", uploadFields);

    const newDocErrors = [...docTypeErrors];
    const newIdentityErrors = [...identityErrors];
    const newFileErrors = [...FilesErrors];
    let hasError = false;

    try {
      for (const [index, field] of uploadFields.entries()) {
        console.log(`🔍 Validating field ${index}:`, {
          hasFiles: !!field.files,
          fileType: field.files ? typeof field.files : 'null',
          isFileInstance: field.files instanceof File,
          fileName: field.files instanceof File ? field.files.name : 'N/A',
          docType: field.document_types,
          identity: field.identities
        });
        
        // Validate document type
        if (!field.document_types) {
          newDocErrors[index] = "Please select a document type";
          hasError = true;
        } else {
          newDocErrors[index] = "";
        }

        // Validate file
        if (!field.files) {
          newFileErrors[index] = "Please upload a file";
          hasError = true;
        } else if (field.files instanceof File) {
          newFileErrors[index] = "";
          console.log(`✅ File ${index} is valid:`, field.files.name);
        } else {
          newFileErrors[index] = "Invalid file format";
          hasError = true;
        }

        // Validate identities
        if (!field.identities) {
          newIdentityErrors[index] = "Please enter identity";
          hasError = true;
        } else {
          const identityError = validateIdentity(
            field.identities,
            field.document_types
          );
          if (identityError) {
            newIdentityErrors[index] = identityError;
            hasError = true;
          } else {
            newIdentityErrors[index] = "";
          }
        }
      }

      setDocTypeErrors(newDocErrors);
      setIdentityErrors(newIdentityErrors);
      setFilesErrors(newFileErrors);

      if (hasError) {
        console.log("❌ Validation failed");
        setLoading(false);
        return;
      }

      console.log("✅ Validation passed, submitting...");

      for (const field of uploadFields) {
        const formDataToSend = new FormData();
        
        console.log("📤 Preparing to upload:", field.files instanceof File ? field.files.name : 'No file');
        
        if (field.files instanceof File) {
          formDataToSend.append("files", field.files);
          console.log("📤 File appended:", field.files.name);
        } else {
          console.error("❌ No valid file found for upload");
          continue;
        }
        
        formDataToSend.append("document_types", field.document_types);

        if (formData.student)
          formDataToSend.append("student", formData.student);
        if (formData.teacher)
          formDataToSend.append("teacher", formData.teacher);
        if (formData.guardian)
          formDataToSend.append("guardian", formData.guardian);
        if (formData.office_staff)
          formDataToSend.append("office_staff", formData.office_staff);
        if (field.identities)
          formDataToSend.append("identities", field.identities);

        console.log("📤 Sending request...");
        await axios.post(`${constants.baseUrl}/d/Document/`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("✅ Upload successful");
      }

      setAlertMessage("✅ Documents uploaded successfully!");
      setShowAlert(true);
      setUploadFields([{ files: null, document_types: "", identities: "" }]);
      setFormData({
        student: "",
        teacher: "",
        guardian: "",
        office_staff: "",
        year_level: "",
      });
      setRole("");
      setStep(0);
      setApiErrors({});
      setSelectedTeacherName("");
      setSearchTeacherInput("");
      setSelectedGuardianName("");
      setSearchGuardianInput("");
      setSelectedOfficeStaffName("");
      setSearchOfficeStaffInput("");
      setSelectedStudentName("");
      setSearchStudentInput("");
      setTcGeneratedFile(null);
      setTcPreviewUrl("");
      setDisable(true);
      
    } catch (err) {
      console.error("Submit error:", err);
      if (err.response && err.response.data) {
        const responseData = err.response.data;
        if (responseData.error === "You can't modify the identity of an existing document.") {
          setAlertMessage("You can't modify the identity of an existing document.");
          setShowAlert(true);
        } else {
          setApiErrors(responseData);
          setAlertMessage("Error uploading documents. Please try again.");
          setShowAlert(true);
        }
      } else {
        setAlertMessage("An unexpected error occurred. Please try again.");
        setShowAlert(true);
      }
      setDisable(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setUploadFields([{ files: null, document_types: "", identities: "" }]);
    setFormData({
      student: "",
      teacher: "",
      guardian: "",
      office_staff: "",
      year_level: "",
    });
    setSelectedTeacherName("");
    setSearchTeacherInput("");
    setSelectedGuardianName("");
    setSearchGuardianInput("");
    setSelectedOfficeStaffName("");
    setSearchOfficeStaffInput("");
    setSelectedStudentName("");
    setSearchStudentInput("");
    setApiErrors({});
    setDocTypeErrors([]);
    setFilesErrors([]);
    setIdentityErrors([]);
    setAddField(0);
    setTcGeneratedFile(null);
    setTcPreviewUrl("");
    prev();
    setDisable(true);
  };

  useEffect(() => {
    getRoles();
    getDocumentTypes();
    getTeachers();
    getGuardians();
    getOfficeStaff();
    getYearLevels();
  }, []);

  useEffect(() => {
    if (formData.year_level && yearLevel.length > 0) {
      const selected = yearLevel.find(
        (yl) => yl.id === parseInt(formData.year_level)
      );
      if (selected) setYearLevelID(selected.id);
    }
  }, [formData.year_level, yearLevel]);

  useEffect(() => {
    if (yearLevelID) getStudentsYearLevel();
  }, [yearLevelID]);

  useEffect(() => {
    return () => {
      if (tcPreviewUrl) {
        URL.revokeObjectURL(tcPreviewUrl);
      }
    };
  }, [tcPreviewUrl]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target)
      ) {
        setShowStudentDropdown(false);
      }
      if (
        teacherDropdownRef.current &&
        !teacherDropdownRef.current.contains(event.target)
      ) {
        setShowTeacherDropdown(false);
      }
      if (
        guardianDropdownRef.current &&
        !guardianDropdownRef.current.contains(event.target)
      ) {
        setShowGuardianDropdown(false);
      }
      if (
        officeStaffDropdownRef.current &&
        !officeStaffDropdownRef.current.contains(event.target)
      ) {
        setShowOfficeStaffDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const hasNoDocTypeErrors = uploadFields.every((field, index) => {
      return field.document_types && !docTypeErrors[index];
    });

    const hasNoFileErrors = uploadFields.every((field, index) => {
      return field.files && !FilesErrors[index];
    });

    const hasNoIdentityErrors = uploadFields.every((field, index) => {
      return field.identities && !identityErrors[index];
    });

    const hasSelectedIdentity =
      formData.student ||
      formData.teacher ||
      formData.guardian ||
      formData.office_staff;

    const hasNoApiErrors = Object.keys(apiErrors).length === 0;

    const isFormValid =
      hasNoDocTypeErrors &&
      hasNoFileErrors &&
      hasNoIdentityErrors &&
      hasSelectedIdentity &&
      hasNoApiErrors;

    setDisable(!isFormValid);
  }, [uploadFields, docTypeErrors, FilesErrors, identityErrors, formData, apiErrors]);

  const filteredRoles = allRoles
    .filter(
      (role) =>
        role.name === constants.roles.teacher ||
        role.name === constants.roles.officeStaff ||
        role.name === constants.roles.student ||
        role.name === constants.roles.guardian
    )
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return (
    <div className="min-h-screen p-2 sm:p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-7xl mx-auto p-3 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md my-3 sm:my-5"
      >
        {/* Steps */}
        <ul className="steps mb-6 w-full">
          <li className={`step ${step >= 0 ? "step-primary" : ""}`}>Role</li>
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>
            Fill Form
          </li>
        </ul>

        <style>
          {`
            .steps .step.step-primary::before,
            .steps .step.step-primary:before {
              background-color: #6d28d9 !important; 
              border-color: #6d28d9 !important;
              color: #ffffff !important; 
            }
            .steps .step.step-primary {
              color: #6d28d9 !important;
            }
            .steps .step.step-primary::after {
              border-color: #6d28d9 !important;
            }
          `}
        </style>

        {/* STEP 0 */}
        {step === 0 && (
          <div className="w-full max-w-6xl mx-auto p-2 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800 dark:text-gray-100">
              Upload Documents
              <i className="fa-solid fa-cloud-upload-alt ml-2"></i>
              <p className="text-xl sm:text-2xl m-1"> Select Your Role</p>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <i className="fa-solid fa-user-shield text-sm"></i> Role
                  </span>
                </label>
                <select
                  className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                  value={role}
                  onChange={handleRoleChange}
                >
                  <option value="">
                    {loadingRoles ? "Loading roles..." : "Select Role"}
                  </option>
                  {filteredRoles.map((roleItem) => (
                    <option key={roleItem.id} value={roleItem.name}>
                      {roleItem.name.charAt(0).toUpperCase() +
                        roleItem.name.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {role === constants.roles.student && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-graduation-cap text-sm"></i>{" "}
                      Class <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    name="year_level"
                    className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                    required
                    value={formData.year_level}
                    onChange={handleChange}
                  >
                    <option value="">
                      {yearLevel.length === 0
                        ? "Loading classes..."
                        : "Select Class"}
                    </option>
                    {yearLevel.map((yearlev) => (
                      <option value={yearlev.id} key={yearlev.id}>
                        {yearlev.level_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* STEP 1 */}
        {step === 1 && (
          <div className="w-full max-w-6xl mx-auto p-2 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800 dark:text-gray-100">
              Upload your documents{" "}
              <i className="fa-solid fa-cloud-upload-alt ml-2"></i>
            </h1>

            {/* Role-based dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {role === constants.roles.student && (
                <div className="form-control relative" ref={studentDropdownRef}>
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-user-graduate text-sm"></i>{" "}
                      Student <span className="text-error">*</span>
                    </span>
                  </label>

                  <div
                    className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                    onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                    role="button"
                    tabIndex={0}
                  >
                    {selectedStudentName ||
                      (loadingStudents
                        ? "Loading students..."
                        : "Select Student")}
                    <span className="arrow">&#9662;</span>
                  </div>

                  {showStudentDropdown && (
                    <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                      <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                        <input
                          type="text"
                          placeholder="Search Student..."
                          className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                          value={searchStudentInput}
                          onChange={(e) =>
                            setSearchStudentInput(e.target.value)
                          }
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        {!loadingStudents && filteredStudents.length > 0 ? (
                          filteredStudents.map((studentObj) => (
                            <p
                              key={studentObj.student_id}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                              onClick={() => {
                                const studentId = studentObj.student_id.toString();
                                setFormData(prev => ({
                                  ...prev,
                                  student: studentId,
                                }));
                                setSelectedStudentName(studentObj.student_name);
                                setSearchStudentInput("");
                                setShowStudentDropdown(false);
                                setDisable(false);
                              }}
                            >
                              {studentObj.student_name}
                            </p>
                          ))
                        ) : (
                          <p className="p-2 text-gray-500 dark:text-gray-400">
                            {loadingStudents
                              ? "Loading students..."
                              : "No students found. Please select a class first."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === constants.roles.teacher && (
                <div className="form-control relative" ref={teacherDropdownRef}>
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-chalkboard-teacher text-sm"></i>{" "}
                      Teacher
                    </span>
                  </label>

                  <div
                    className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                    onClick={() =>
                      setShowTeacherDropdown(!showTeacherDropdown)
                    }
                  >
                    {selectedTeacherName || "Select Teacher"}
                    <span className="arrow">&#9662;</span>
                  </div>

                  {showTeacherDropdown && (
                    <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                      <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                        <input
                          type="text"
                          placeholder="Search Teacher..."
                          className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                          value={searchTeacherInput}
                          onChange={(e) =>
                            setSearchTeacherInput(e.target.value)
                          }
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        {filteredTeachers.map((teacher) => (
                          <p
                            key={teacher.id}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                teacher: teacher.id.toString(),
                              }));
                              setSelectedTeacherName(
                                `${teacher.first_name} ${teacher.last_name}`
                              );
                              setSearchTeacherInput("");
                              setShowTeacherDropdown(false);
                            }}
                          >
                            {teacher.first_name} {teacher.last_name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === constants.roles.guardian && (
                <div className="form-control relative" ref={guardianDropdownRef}>
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-user-shield text-sm"></i>{" "}
                      Guardian
                    </span>
                  </label>

                  <div
                    className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                    onClick={() =>
                      setShowGuardianDropdown(!showGuardianDropdown)
                    }
                  >
                    {selectedGuardianName || "Select Guardian"}
                    <span className="arrow">&#9662;</span>
                  </div>

                  {showGuardianDropdown && (
                    <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                      <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                        <input
                          type="text"
                          placeholder="Search Guardian..."
                          className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                          value={searchGuardianInput}
                          onChange={(e) =>
                            setSearchGuardianInput(e.target.value)
                          }
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        {filteredGuardians.map((guardian) => (
                          <p
                            key={guardian.id}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                guardian: guardian.id.toString(),
                              }));
                              setSelectedGuardianName(
                                `${guardian.first_name} ${guardian.last_name}`
                              );
                              setSearchGuardianInput("");
                              setShowGuardianDropdown(false);
                            }}
                          >
                            {guardian.first_name} {guardian.last_name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === constants.roles.officeStaff && (
                <div className="form-control relative" ref={officeStaffDropdownRef}>
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-briefcase text-sm"></i> Office
                      Staff
                    </span>
                  </label>

                  <div
                    className="input input-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                    onClick={() =>
                      setShowOfficeStaffDropdown(!showOfficeStaffDropdown)
                    }
                  >
                    {selectedOfficeStaffName || "Select Office Staff"}
                    <span className="arrow">&#9662;</span>
                  </div>

                  {showOfficeStaffDropdown && (
                    <div className="absolute z-10 bg-white dark:bg-gray-700 rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                      <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-gray-700">
                        <input
                          type="text"
                          placeholder="Search Office Staff..."
                          className="input input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                          value={searchOfficeStaffInput}
                          onChange={(e) =>
                            setSearchOfficeStaffInput(e.target.value)
                          }
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        {filteredOfficeStaff.map((staff) => (
                          <p
                            key={staff.id}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                office_staff: staff.id.toString(),
                              }));
                              setSelectedOfficeStaffName(
                                `${staff.first_name} ${staff.last_name}`
                              );
                              setSearchOfficeStaffInput("");
                              setShowOfficeStaffDropdown(false);
                            }}
                          >
                            {staff.first_name} {staff.last_name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Document Upload Fields */}
            {uploadFields.map((field, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 items-start w-full"
              >
                {/* File Upload */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-file-upload text-sm"></i>{" "}
                      Document Upload
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="file-input file-input-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
                    onChange={(e) => handleFileChange(e, index)}
                  />
                  <div className="min-h-[1.25rem]">
                    <span className="text-red-500 text-sm leading-tight">
                      {FilesErrors[index] || ""}
                    </span>
                  </div>
                </div>

                {/* Document Type */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-file text-sm"></i> Document Type
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    name="document_types"
                    className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                    value={field.document_types}
                    onChange={(e) => handleDocumentTypeChange(e, index)}
                  >
                    <option value="">Select Document Type</option>
                    {getAvailableDocumentTypes(index).map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                  <div className="min-h-[1.25rem]">
                    <span className="text-red-500 text-sm leading-tight">
                      {docTypeErrors[index] || ""}
                    </span>
                  </div>
                </div>
                
                {/* Identity */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <i className="fa-solid fa-id-card text-sm"></i> Identity  <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    name="identities"
                    value={field.identities.toUpperCase()}
                    onChange={(e) => handleUploadChange(e, index)}
                    placeholder="Enter identity ID"
                    className="input input-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none"
                    maxLength={
                      field.document_types
                        ? getIdentityMaxLength(field.document_types)
                        : undefined
                    }
                  />
                  <div className="min-h-[1.25rem]">
                    <span className="text-error text-sm block mt-1">
                      {identityErrors[index] || ""}
                    </span>
                  </div>
                </div>

                {/* Add/Remove */}
                <div className="form-control w-full flex sm:col-span-2 lg:col-span-1 justify-end lg:items-end lg:pt-9 mb-4">
                  {index === 0 ? (
                    <button
                      type="button"
                      className={`btn bgTheme text-white w-full sm:w-36 sm:ml-auto ${AddField === 3
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-purple-700"
                        }`}
                      onClick={handleAddField}
                      disabled={AddField === 3}
                    >
                      <i className="fa-solid fa-plus mr-1"></i> Add
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-error w-full sm:w-36 sm:ml-auto"
                      onClick={() => {
                        setUploadFields(
                          uploadFields.filter((_, i) => i !== index)
                        );
                        setAddField(AddField - 1);
                        setDocTypeErrors(docTypeErrors.filter((_, i) => i !== index));
                        setIdentityErrors(identityErrors.filter((_, i) => i !== index));
                        setFilesErrors(FilesErrors.filter((_, i) => i !== index));
                      }}
                    >
                      <i className="fa-solid fa-trash mr-1"></i> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Display generated TC file info */}
            {tcGeneratedFile && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded-lg border border-green-300">
                <p className="text-green-700 dark:text-green-300 break-words">
                  <i className="fa-solid fa-check-circle mr-2"></i>
                  TC generated and ready to upload: 
                  <strong className="ml-1">{tcGeneratedFile.name}</strong>
                  <span className="ml-2 text-sm">({(tcGeneratedFile.size / 1024).toFixed(2)} KB)</span>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  File is attached to the upload field above. Enter the TC identity, then click "Upload" to submit.
                </p>
              </div>
            )}

            {/* TC Preview */}
            {tcPreviewUrl && (
              <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-100">
                    <i className="fa-solid fa-image mr-2 text-purple-600"></i>
                    Transfer Certificate Preview
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-xs sm:btn-sm btn-outline"
                      onClick={() => setShowPreviewFull(true)}
                    >
                      <i className="fa-solid fa-expand mr-1"></i> Full size
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs sm:btn-sm btn-outline btn-error"
                      onClick={() => {
                        URL.revokeObjectURL(tcPreviewUrl);
                        setTcPreviewUrl("");
                        setUploadFields((f) =>
                          f.map((x) =>
                            x.files === tcGeneratedFile ? { ...x, files: null } : x
                          )
                        );
                        setTcGeneratedFile(null);
                      }}
                    >
                      <i className="fa-solid fa-trash mr-1"></i> Remove
                    </button>
                  </div>
                </div>
                <div className="p-3 sm:p-6 bg-gray-100 dark:bg-gray-900 flex justify-center">
                  <img
                    src={tcPreviewUrl}
                    alt="Generated transfer certificate preview"
                    className="w-full max-w-2xl h-auto rounded shadow-md bg-white cursor-zoom-in"
                    onClick={() => setShowPreviewFull(true)}
                  />
                </div>
              </div>
            )}

            {/* Show file in upload field */}
            {uploadFields.some(f => f.files && f.files instanceof File) && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200">
                <p className="text-sm text-blue-700 dark:text-blue-300 break-words">
                  <i className="fa-solid fa-file mr-2"></i>
                  File attached: <strong>{uploadFields.find(f => f.files instanceof File)?.files?.name}</strong>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Click "Upload" button to submit the document.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col md:flex-row items-center md:items-stretch gap-4 p-2 sm:p-6">
          {step === 0 && (
            <div className="flex-1 flex justify-end w-full">
              <button
                type="button"
                onClick={next}
                className={`btn bgTheme text-white w-full sm:w-40 ${role.length === 0 ||
                  (role === constants.roles.student && !formData.year_level)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-purple-700"
                  }`}
                disabled={
                  role.length === 0 ||
                  (role === constants.roles.student && !formData.year_level)
                }
              >
                Next
              </button>
            </div>
          )}
          {step === 1 && (
            <div className="flex-1 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 w-full">
              <button
                type="button"
                onClick={handleBack}
                className="btn bgTheme w-full sm:w-36 text-white hover:bg-purple-700 flex items-center justify-center"
              >
                <i className="fa-solid fa-arrow-left mr-2"></i> Back
              </button>

              <button
                type="submit"
                className={`btn bgTheme text-white w-full sm:w-36 ${Disable
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-purple-700"
                  }`}
                disabled={Disable}
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-upload-alt mr-2"></i> Upload
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Full-size TC preview */}
      {showPreviewFull && tcPreviewUrl && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl p-2 sm:p-4 bg-white dark:bg-gray-800">
            <img
              src={tcPreviewUrl}
              alt="Transfer certificate"
              className="w-full h-auto rounded"
            />
            <div className="modal-action mt-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowPreviewFull(false)}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowPreviewFull(false)}
          />
        </dialog>
      )}

      {/* TC Modal */}
      {showTcModal && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl p-0 flex flex-col max-h-[92vh] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                <i className="fa-solid fa-file-alt text-purple-600"></i>
                Transfer Certificate Details
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Review and complete the details, then click "Generate TC".
              </p>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
              {/* Certificate numbers */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-2">
                  Certificate numbers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <TcField label="Form No.">
                    <input
                      type="text"
                      className={tcInput}
                      value={tcFormData.form_no}
                      placeholder="Enter Form No"
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, form_no: e.target.value })
                      }
                    />
                  </TcField>

                  <TcField label="TC No." required error={tcNoError}>
                    <input
                      type="text"
                      className={`${tcInput} ${tcNoError ? "input-error" : ""}`}
                      value={tcFormData.tc_no.toUpperCase()}
                      maxLength={20}
                      placeholder={TC_NO_HINT}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase();
                        setTcFormData({ ...tcFormData, tc_no: v });
                        setTcNoError(v ? validateTcNo(v) : "");
                      }}
                    />
                    {!tcNoError && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Format: {TC_NO_HINT}
                      </span>
                    )}
                  </TcField>

                  <TcField label="Scholar No.">
                    <input
                      type="text"
                      className={tcInput}
                      value={tcFormData.scholar_no}
                      placeholder="Enter Scholar No"
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, scholar_no: e.target.value })
                      }
                    />
                  </TcField>

                  <TcField label="Aadhar No.">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      className={tcInput}
                      value={tcFormData.aadhar_no}
                      placeholder="12 digits"
                      onChange={(e) =>
                        setTcFormData({
                          ...tcFormData,
                          aadhar_no: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </TcField>

                  {[
                    ["sssmid", "SSSMID"],
                    ["fmd", "FMID"],
                    ["apar_id", "APAAR ID"],
                    ["pen_no", "PEN No."],
                  ].map(([key, label]) => (
                    <TcField key={key} label={label}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={tcInput}
                        value={tcFormData[key]}
                        placeholder={`Enter ${label}`}
                        onChange={(e) =>
                          setTcFormData({
                            ...tcFormData,
                            [key]: e.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                    </TcField>
                  ))}
                </div>
              </section>

              {/* Student */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-2">
                  Student details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    ["student_name", "Student Name", true],
                    ["father_name", "Father Name", true],
                    ["mother_name", "Mother Name", true],
                    ["school", "School"],
                    ["district", "District"],
                  ].map(([key, label, req]) => (
                    <TcField key={key} label={label} required={req}>
                      <input
                        type="text"
                        className={tcInput}
                        value={tcFormData[key]}
                        placeholder={`Enter ${label}`}
                        onChange={(e) =>
                          setTcFormData({ ...tcFormData, [key]: e.target.value })
                        }
                      />
                    </TcField>
                  ))}
                </div>
              </section>

              {/* Dates */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-2">
                  Dates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <TcField label="Admission Date">
                    <input
                      type="date"
                      className={tcInput}
                      value={tcFormData.admission_date}
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, admission_date: e.target.value })
                      }
                    />
                  </TcField>
                  <TcField label="Leaving Date">
                    <input
                      type="date"
                      className={tcInput}
                      value={tcFormData.leaving_date}
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, leaving_date: e.target.value })
                      }
                    />
                  </TcField>
                  <TcField label="Certificate Date">
                    <input
                      type="date"
                      className={tcInput}
                      value={tcFormData.date}
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, date: e.target.value })
                      }
                    />
                  </TcField>
                  <TcField label="Date of Birth" required>
                    <input
                      type="date"
                      className={tcInput}
                      value={tcFormData.dob}
                      onChange={(e) => {
                        const dob = e.target.value;
                        setTcFormData({
                          ...tcFormData,
                          dob,
                          dob_words: dobToWords(dob),
                        });
                      }}
                    />
                  </TcField>
                  <div className="sm:col-span-1 lg:col-span-2">
                    <TcField label="DOB (in words)">
                      <input
                        type="text"
                        className={tcInput}
                        value={tcFormData.dob_words}
                        placeholder="Auto-filled from Date of Birth"
                        onChange={(e) =>
                          setTcFormData({ ...tcFormData, dob_words: e.target.value })
                        }
                      />
                    </TcField>
                  </div>
                </div>
              </section>

              {/* Academic */}
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-2">
                  Academic details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    ["last_class", "Last Class", "Enter Class"],
                    ["medium", "Medium", "Enter Medium"],
                    ["exam_year", "Exam Year", "e.g., 2026"],
                    ["promoted_to_class", "Promoted to Class", "Enter Class"],
                  ].map(([key, label, ph]) => (
                    <TcField key={key} label={label}>
                      <input
                        type="text"
                        className={tcInput}
                        value={tcFormData[key]}
                        placeholder={ph}
                        onChange={(e) =>
                          setTcFormData({ ...tcFormData, [key]: e.target.value })
                        }
                      />
                    </TcField>
                  ))}
                  <TcField label="Character">
                    <select
                      className="select select-bordered select-sm sm:select-md w-full bg-white dark:bg-gray-700 dark:text-gray-100"
                      value={tcFormData.character}
                      onChange={(e) =>
                        setTcFormData({ ...tcFormData, character: e.target.value })
                      }
                    >
                      <option value="Good">Good</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
                  </TcField>
                </div>
              </section>
            </div>

            {/* Sticky footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                className="btn w-full sm:w-auto"
                onClick={() => setShowTcModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn bgTheme text-white w-full sm:w-auto"
                onClick={handleTcSubmit}
                disabled={generatingTC}
              >
                {generatingTC ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-file-circle-check mr-2"></i>
                    Generate TC
                  </>
                )}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Alert Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Notification</h3>
            <p className="py-4">
              {alertMessage.split("\n").map((line, idx) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-full sm:w-30"
                onClick={() => {
                  setShowAlert(false);
                  setApiErrors({});
                }}
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