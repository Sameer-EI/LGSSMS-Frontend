import axios from "axios";
import { constants } from "../../global/constants";

const BASE_URL = constants.baseUrl;

export const fetchRoles = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/roles/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    throw err;
  }
};

//  OFFICE STAFF ATTENDANCE RECORDS
export const fetchOfficeStaffAttendanceRecords = async () => {
  const res = await axios.get(`${BASE_URL}/a/office-staff-attendance/`);
  return res.data;
};

export const saveOfficeStaffAttendance = async (staffList, attendance) => {
  try {
    const payload = {
      marked_at: new Date().toISOString().split("T")[0],
      P: [],
      A: [],
      L: [],
    };

    const statusMap = {
      present: "P",
      absent: "A",
      leave: "L",
    };

    staffList.forEach((s) => {
      const att = attendance[s.id];
      if (!att?.status) return;

      const shortStatus = statusMap[att.status];

      if (shortStatus === "P") payload.P.push(s.id);
      if (shortStatus === "A") payload.A.push(s.id);
      if (shortStatus === "L") payload.L.push(s.id);
    });

    console.log("Office staff attendance payload:", payload);

    return await axios.post(`${BASE_URL}/a/office-staff-attendance/`, payload);
  } catch (error) {
    console.error(
      "Error saving staff attendance:",
      error.response?.data || error,
    );
    throw error;
  }
};

// multiple office staff attendance
export const saveAllOfficeStaffAttendance = async (
  attendanceMap,
  staffList,
) => {
  try {
    const payload = {
      marked_at: new Date().toISOString().split("T")[0],
      P: [],
      A: [],
      L: [],
    };

    const statusMap = {
      present: "P",
      absent: "A",
      leave: "L",
    };

    staffList.forEach((s) => {
      const att = attendanceMap[s.id];
      if (!att?.status) return;

      const shortStatus = statusMap[att.status];

      if (shortStatus === "P") payload.P.push(s.id);
      if (shortStatus === "A") payload.A.push(s.id);
      if (shortStatus === "L") payload.L.push(s.id);
    });

    console.log("Office staff attendance payload:", payload);

    return await axios.post(`${BASE_URL}/a/office-staff-attendance/`, payload);
  } catch (error) {
    console.error(
      "Error saving ALL staff attendance:",
      error.response?.data || error,
    );
    throw error;
  }
};

// Update office staff attendance
export const updateOfficeStaffAttendance = async (id, payload) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/a/office-staff-attendance/${id}/`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating office staff attendance:", error);
    throw error;
  }
};

// Update student attendance
export const updateStudentAttendance = async (id, payload) => {
  try {
    const response = await axios.put(
      `${constants.baseUrl}/a/student-attendance/${id}/`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating student attendance:", error);
    throw error;
  }
};

export const fetchSchoolYear = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/school-years/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    throw err;
  }
};

export const fetchExpenseCategory = async (accessToken) => {
  try {
    const response = await axios.get(`${BASE_URL}/d/Expense-Category/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch expense category:", err);
    throw err;
  }
};

export const fetchExamType = async (accessToken) => {
  try {
    const token = accessToken ? accessToken.trim() : "";

    if (!token) {
      throw new Error("No access token provided");
    }

    const response = await axios.get(`${BASE_URL}/d/Exam-Type/`, {
      headers: {
        Authorization: `Bearer ${token}`, // Using trimmed token
      },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    throw err;
  }
};

export const fetchMarksheet = async (accessToken, id) => {
  try {
    const token = accessToken ? accessToken.trim() : "";

    if (!token) {
      throw new Error("No access token provided");
    }

    const response = await axios.get(`${BASE_URL}/d/report-cards/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch marksheet:", err);
    throw err;
  }
};

export const fetchMarksheets = async (accessToken) => {
  try {
    const token = accessToken ? accessToken.trim() : "";

    if (!token) {
      throw new Error("No access token provided");
    }

    const response = await axios.get(`${BASE_URL}/d/report-cards/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch marksheet:", err);
    throw err;
  }
};

export const fetchGuardianType = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/s/guardian-types/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch guardian type:", err);
    throw err;
  }
};

export const fetchDocumentType = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/DocumentType/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch document type:", err);
    throw err;
  }
};

export const fetchStudents = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/s/students/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch students:", err);
    throw err;
  }
};

export const fetchStudentYearLevel = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/s/studentYearLevels/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch all students:", err);
    throw err;
  }
};


export const fetchStudentYearLevelByClass = async (year_level_id, year_name = null, gender = null) => {
  try {
    let url = `${BASE_URL}/s/studentyearlevels/?level__id=${year_level_id}`;
    
    // Add year_name filter if provided
    if (year_name && year_name !== "All") {
      url += `&year__year_name=${encodeURIComponent(year_name)}`;
    }
    
    // Add gender filter if provided
    if (gender) {
      url += `&student__gender=${encodeURIComponent(gender)}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch students:", err);
    throw err;
  }
};

export const fetchTeachers = async (id) => {
  try {
    const res = await axios.get(`${BASE_URL}/t/teacher/${id ? `${id}/` : ""}`);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch teachers:", err);
    throw err;
  }
};

export const fetchOfficeStaff = async (id) => {
  try {
    const res = await axios.get(
      `${BASE_URL}/d/officestaff/${id ? `${id}/` : ""}`,
    );
    return res.data;
  } catch (err) {
    console.error("Failed to fetch office staff:", err);
    throw err;
  }
};

export const fetchGuardians = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/s/guardian/`);
    return response.data.results;
  } catch (err) {
    console.error("Failed to fetch guardians:", err);
    throw err;
  }
};

export const fetchAllTeachers = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/t/teacher/`);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch teachers:", err);
    throw err;
  }
};

export const fetchPeriods = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/Period/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch periods:", err);
    throw err;
  }
};

export const fetchSubjects = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/subject/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch subjects:", err);
    throw err;
  }
};

export const fetchTerms = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/terms/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch subjects:", err);
    throw err;
  }
};

export const fetchAllTeacherAssignments = async (accessToken) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/t/teacher/all-teacher-assignments/`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to all teacher assignments:", err);
    throw err;
  }
};

export const fetchAllTeacherClasses = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/a/teacher-classes/${id}/`);
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch all teacher classes:", err);
    throw err;
  }
};

export const fetchCountry = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/country/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch country:", err);
    throw err;
  }
};

export const fetchState = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/states/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch state:", err);
    throw err;
  }
};

export const fetchCity = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/city/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch city:", err);
    throw err;
  }
};

export const fetchPeriodsByYearLevel = async (yearLevelId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/periods/?year_level_id=${yearLevelId}`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch periods:", err);
    throw err;
  }
};

// Get all banks
export const fetchBankNames = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/bank_name/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch bank names:", err);
    throw err;
  }
};

// Add a new bank
export const addBankName = async (bankData) => {
  try {
    const response = await axios.post(`${BASE_URL}/d/bank_name/`, bankData);
    return response.data;
  } catch (err) {
    console.error("Failed to add bank:", err);
    throw err;
  }
};

// fetchAbsentTeachers
export const fetchAbsentTeachers = async (date) => {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/t/absent-teacher/?date_value=${date}`,
    );
    return data?.absent_teachers || [];
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};

// substitute teacher
export const fetchSubAssignments = async () => {
  const response = await axios.get(`${BASE_URL}/t/substitute-assign/`);
  return response.data;
};

// fetch Allocated Classes
export const fetchAllocatedClasses = async (token) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/t/teacheryearlevel/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch allocated classes:", error);
    throw error;
  }
};

// DASHBOARD

// Director Dashboard
export const fetchDirectorDashboard = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/director-dashboard/`);
    return response.data;
  } catch (err) {
    console.error("Failed to load director Dashboard:", err);
    throw err;
  }
};

// Student Category Dashboard

export const fetchStudentCategoryDashboard = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/student-category-dashboard/`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to load student category director Dashboard:", err);
    throw err;
  }
};

// Income Distribution Dashboard

export const fetchIncomeDistributionDashboard = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/income-distribution-dashboard/`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to load Income Distribution Dashboard:", err);
    throw err;
  }
};

// Office Staff Dashboard

export const fetchOfficeStaffDashboard = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/office-staff-dashboard/`);
    return response.data;
  } catch (err) {
    console.error("Failed to officeStaff Dashboard:", err);
    throw err;
  }
};

// Guardian Dashboard

export const fetchGuardianDashboard = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/d/guardian-dashboard/${id}/`);
    return response.data;
  } catch (err) {
    console.error("Failed to guardian Dashboard:", err);
    throw err;
  }
};

export const getAttendanceByGuardianId = async (guardianId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/api/report/?guardian_id=${guardianId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    throw error;
  }
};

// Guardian Dashboard

export const fetchStudentDashboard = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/d/student_dashboard/${id}/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch student Dashboard:", err);
    throw err;
  }
};

// Teacher Dashboard

export const fetchTeacherDashboard = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/d/teacher-dashboard/${id}/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Teacher Dashboard:", err);
    throw err;
  }
};

// Fee Dashboard

export const fetchFeeDashboard = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/fee-dashboard/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch fee Dashboard:", err);
    throw err;
  }
};

// Fee Dashboard by month

export const fetchFeeDashboardByMonth = async (month) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/fee-dashboard/?month=${month}`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch fee Dashboard by month:", err);
    throw err;
  }
};

// admission detailos get api
export const fetchAdmissionDetails = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/admission/`);
    return response.data;
  } catch (err) {
    console.error("Failed to admission details:", err);
    throw err;
  }
};
// admission details get api by id
export const fetchAdmissionDetailsById = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/d/admission/${id}/`);
    return response.data;
  } catch (err) {
    console.error("Failed to admission details:", err);
    throw err;
  }
};

// fetch View upload documents api
export const fetchViewDocuments = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/d/Document/`);
    return response.data;
  } catch (err) {
    console.error("Failed to load upload data details:", err);
    throw err;
  }
};

export const fetchStudents1 = async (classId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/s/studentyearlevels/?level__id=${classId}`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    throw err;
  }
};

export const fetchStudents2 = async (classId) => {
  try {
    const response = await axios.get(`${BASE_URL}/s/studentyearlevels/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    throw err;
  }
};

export const fetchyearLevelData = async (classId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/year-level-fee/${classId}/`,
    );
    return response.data;
  } catch (err) {
    console.log("Failed to load year level data. Please try again." + err);
    throw err;
  }
};

export const fetchYearLevels = async () => {
  try {
    const response = await axios.get(`${constants.baseUrl}/d/year-levels/`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch year levels:", err);
    throw err;
  }
};

export const fetchEmployee = async (accessToken, role) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/d/Employee/get_emp/?role=${role}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Employee:", err);
    throw err;
  }
};

export const fetchSchoolExpense = async (
  accessToken,
  schoolYear,
  categoryId,
) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/d/School-Expense/?school_year=${schoolYear}&category=${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Employee:", err);
    throw err;
  }
};

export const fetchSchoolExpenseById = async (accessToken, id) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/d/School-Expense/${id}/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Employee:", err);
    throw err;
  }
};

export const fetchSalaryExpense = async (accessToken) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/d/Employee/get_emp/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Employee:", err);
    throw err;
  }
};

export const fetchSalaryExpenseById = async (accessToken, id) => {
  try {
    const response = await axios.get(
      `${constants.baseUrl}/d/Employee/get_emp/?id=${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch Employee:", err);
    throw err;
  }
};

export const fetchFeeSummary = async ({ selectedMonth, selectedClass }) => {
  const url = `${constants.baseUrl}/d/fee-record/monthly-summary/`;

  const params = {};
  if (selectedMonth) params.month = selectedMonth;
  if (selectedClass) params.year_level = selectedClass;

  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = JSON.parse(authTokens).access;

    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (
      error.response &&
      (error.response.status === 404 ||
        error.response.data?.detail === "No records found.")
    ) {
      return [];
    }

    throw error;
  }
};

export const fetchAttendanceData = async (date = "") => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/director-dashboard/?date=${date}`,
    );

    return response.data;
  } catch (error) {
    console.error("Failed to fetch attendance data:", error);
    return null;
  }
};
export const fetchAttendanceDataStudent = async (
  date = "",
  studentId,
  month = "",
  year = "",
) => {
  try {
    let url = `${BASE_URL}/a/student-dashboard/${studentId}/`;

    // Build query parameters
    const params = new URLSearchParams();

    if (date) {
      params.append("date", date);
    }

    if (month) {
      params.append("month", month);
    }

    if (year) {
      params.append("year", year);
    }

    // Add query string if we have any parameters
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch attendance data:", error);
    return null;
  }
};
export const fetchGuardianAttendanceData = async (date = "", guardianId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/guardian/attendance/${guardianId}/?date=${date}`,
    );

    return response.data;
  } catch (error) {
    console.error("Failed to fetch attendance data:", error);
    return null;
  }
};

export const fetchTeacherAttendanceData = async (date = "", className) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/teacher-dashboard/?class_name=${className}&date=${date}`,
    );

    return response.data;
  } catch (error) {
    console.error("Failed to fetch attendance data:", error);
    return null;
  }
};

// In your Api.js file
export const fetchStudentAttendanceData = async (year_level_id, date = "") => {
  try {
    // You might need to adjust the endpoint based on your actual API
    const response = await axios.get(
      `${BASE_URL}/a/student-attendance/?year_level=${year_level_id}&date=${date}`,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch student attendance data:", error);
    return [];
  }
};

export const fetchAttendance = async (studentId, month, year) => {
  try {
    let url = `${BASE_URL}/a/api/report/`;
    if (studentId) {
      url += `?student_id=${studentId}`;
      if (month) url += `&month=${month}`;

      if (year) url += `&year=${year}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch attendance:",
      error.response?.data || error.message,
    );
    throw error.response?.data || new Error("Something went wrong.");
  }
};

export const fetchClassAttendance = async (className) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/api/report/?class=${className}`,
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch students:", err);
    throw err;
  }
};

export const fetchStudentById = async (student_id) => {
  try {
    const response = await axios.get(`${BASE_URL}/s/students/${student_id}/`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch student details:", error);
    throw error;
  }
};

export const fetchStudentFee = async (student_id) => {
  try {
    console.log("Fetching student fee for ID:", student_id);
    const tokens = JSON.parse(localStorage.getItem("authTokens"));
    const accessToken = tokens?.access;

    if (!accessToken) {
      throw new Error("Access token missing! Please login again.");
    }

    const response = await axios.get(
      `${BASE_URL}/d/fee-record/student-fee-card/?student_id=${student_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    console.log("Fetched student fee data:", response.data);

    return response.data;
  } catch (error) {
    console.error("Failed to fetch student fees details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

export const fetchGuardianChildren = async () => {
  try {
    const token = JSON.parse(localStorage.getItem("authTokens"))?.access;
    if (!token) {
      throw new Error("No auth token found. User might not be logged in.");
    }
    const response = await axios.get(
      `${constants.baseUrl}/s/studentguardian/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch guardian's children:", err);
    throw err;
  }
};

// export const fetchUnpaidFees = async ({
//   role,
//   class_id,
//   student_id,
//   month,
// }) => {
//   try {
//     console.log("Fetching unpaid fees for role:", role);

//     let endpoint = "";
//     let params = {};

//     if (
//       role === constants.roles.director ||
//       role === constants.roles.officeStaff
//     ) {
//       endpoint = `${BASE_URL}/d/fee-record/overall_unpaid_fees/`;
//       if (class_id) params.class_id = class_id;
//       if (month) params.month = month;
//     } else if (role === constants.roles.teacher) {
//       endpoint = `${BASE_URL}/d/fee-record/overall_unpaid_fees/`;
//       if (month) params.month = month;
//     } else if (role === constants.roles.student) {
//       endpoint = `${BASE_URL}/d/fee-record/student_unpaid_fees/`;
//       if (student_id) params.student_id = student_id;
//     } else {
//       throw new Error("Invalid role provided");
//     }

//     const authTokens = localStorage.getItem("authTokens");
//     const accessToken = JSON.parse(authTokens).access;
//     if (!accessToken) throw new Error("No access token found");

//     const response = await axios.get(endpoint, {
//       params,
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });

//     let data = response.data;

//     if (
//       (role === constants.roles.director ||
//         role === constants.roles.officeStaff) &&
//       student_id
//     ) {
//       data = data.filter((fee) => fee.student_id === student_id);
//     }

//     return data;
//   } catch (error) {
//     console.error("Error fetching unpaid fees:", error);
//     throw error;
//   }
// };

export const fetchUnpaidFees = async ({
  role,
  class_id,
  student_id,
  month,
}) => {
  try {
    console.log("Fetching unpaid fees for role:", role);

    let endpoint = "";
    let params = {};

    if (
      role === constants.roles.director ||
      role === constants.roles.officeStaff
    ) {
      endpoint = `${BASE_URL}/d/studentfees/unpaid-fees/`;
      if (class_id) params.class_id = class_id;
      if (month) params.month = month;
    } else if (role === constants.roles.teacher) {
      endpoint = `${BASE_URL}/d/studentfees/unpaid-fees/`;
      if (month) params.month = month;
    } else if (role === constants.roles.student) {
      endpoint = `${BASE_URL}/d/studentfees/unpaid-fees/`;
      if (student_id) params.student_id = student_id;
    } else {
      throw new Error("Invalid role provided");
    }

    const authTokens = localStorage.getItem("authTokens");
    const accessToken = JSON.parse(authTokens).access;
    if (!accessToken) throw new Error("No access token found");

    const response = await axios.get(endpoint, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let data = response.data;

    if (
      (role === constants.roles.director ||
        role === constants.roles.officeStaff) &&
      student_id
    ) {
      data = data.filter((fee) => fee.student_id === student_id);
    }

    return data;
  } catch (error) {
    console.error("Error fetching unpaid fees:", error);
    throw error;
  }
};

export const fetchTeacherYearLevel = async () => {
  try {
    const tokens = localStorage.getItem("authTokens");
    const accessToken = tokens ? JSON.parse(tokens).access : null;

    if (!accessToken) {
      throw new Error("No access token found for teacher. Please login again.");
    }

    const response = await axios.get(`${BASE_URL}/t/teacheryearlevel/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching teacher year level:", error);
    throw error;
  }
};

// Fetch all discounts
export const fetchDiscounts = async (accessToken) => {
  try {
    const token = accessToken?.trim();
    if (!token) throw new Error("No access token provided");

    const response = await axios.get(`${BASE_URL}/d/appliedfeediscounts/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (err) {
    console.error("Failed to fetch discounts:", err);
    throw err;
  }
};

// Delete discount by ID
export const deleteDiscount = async (accessToken, id) => {
  try {
    const token = accessToken?.trim();
    if (!token) throw new Error("No access token provided");

    await axios.delete(`${BASE_URL}/d/fee-discounts/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return true;
  } catch (err) {
    console.error("Failed to delete discount:", err);
    throw err;
  }
};

// Update discount by ID
export const updateDiscount = async (accessToken, id, payload) => {
  try {
    const token = accessToken?.trim();
    if (!token) throw new Error("No access token provided");

    const response = await axios.put(
      // `${BASE_URL}/d/fee-discounts/${id}/`,
      `${BASE_URL}/d/appliedfeediscounts/${id}/update_discount/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  } catch (err) {
    console.error("Failed to update discount:", err);
    throw err;
  }
};

// teacher attendances
export const saveTeacherAttendance = async (teachers, attendance) => {
  try {
    const today =
      teachers.length > 0
        ? attendance[teachers[0].id]?.date
        : new Date().toISOString().split("T")[0];

    const payload = {
      marked_at: today,
      P: [],
      A: [],
      L: [],
    };

    teachers.forEach((teacher) => {
      const attendanceData = attendance[teacher.id];
      if (!attendanceData?.status) return;

      const status = attendanceData.status.toLowerCase();

      if (status === "present") {
        payload.P.push(teacher.id);
      } else if (status === "absent") {
        payload.A.push(teacher.id);
      } else if (status === "leave") {
        payload.L.push(teacher.id);
      }
    });

    const res = await axios.post(`${BASE_URL}/a/teacher-attendance/`, payload);

    return res;
  } catch (error) {
    console.error(
      "Error saving teacher attendance:",
      error.response?.data || error,
    );
    throw error;
  }
};

export const saveAllTeacherAttendance = saveTeacherAttendance;

//  Techer attendance records
export const fetchTeacherAttendanceRecords = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/a/teacher-attendance/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    throw error;
  }
};

export const fetchSchoolIncome = async (filters = {}) => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = JSON.parse(authTokens).access;
    if (!accessToken) throw new Error("No access token found");

    const response = await axios.get(`${BASE_URL}/d/school-income/`, {
      params: filters, // { month, school_year, category }
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching school income:", error);
    throw error;
  }
};

export const fetchIncomeCategories = async () => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = JSON.parse(authTokens)?.access;

    const response = await axios.get(`${BASE_URL}/d/income-category/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching income categories:", error);
    throw error;
  }
};

// Notification api
export const sendDueFeeNotifications = async () => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    if (!authTokens) throw new Error("No access token found. Please login.");

    const accessToken = JSON.parse(authTokens).access;
    if (!accessToken) throw new Error("Access token missing. Please login.");

    console.log("Access Token:", accessToken);

    const response = await axios.get(
      `${BASE_URL}/d/fee-record/student_unpaid_fees/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (err) {
    console.error(
      "API sendDueFeeNotifications error:",
      err.response?.data || err.message,
    );
    throw err;
  }
};

// POST APIS

export const createSalary = async (accessToken, payload) => {
  try {
    const response = await axios.post(
      `${constants.baseUrl}/d/Employee/create_emp/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to create Employee:", err);
    throw err;
  }
};

export const handleAdmissionForm = async (formData) => {
  try {
    const response = await axios.post(`${BASE_URL}/d/admission/`, formData, {
      headers: {
        "Content-Type": "application/json",
        // "Content-Type": "multipart/form-data",
      },
    });
    if (response.status === 200 || response.status === 201) {
      // alert("successfully submitted the form");
    }

    return response.data;
  } catch (err) {
    throw err;
  }
};

export const createSchoolIncome = async (payload) => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = JSON.parse(authTokens).access;
    if (!accessToken) throw new Error("No access token found");

    const response = await axios.post(`${BASE_URL}/d/school-income/`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error creating school income:", error);
    throw error;
  }
};

// EDIT APIS

export const handleEditAdmissionForm = async (formData, id) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/d/admission/${id}/`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
          // "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const updateStudentById = async (id, formData) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/s/students/${id}/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log("Student profile updated response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to update student profile:",
      error.response?.data || error.message,
    );
    throw (
      error.response?.data ||
      new Error("Something went wrong while updating student profile.")
    );
  }
};

export const editTeachersdetails = async (id, formData) => {
  try {
    const response = await axios.put(`${BASE_URL}/t/teacher/${id}/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("Teacher details updated response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to update teacher details:",
      error.response?.data || error.message,
    );
    throw (
      error.response?.data ||
      new Error("Something went wrong while updating teacher details.")
    );
  }
};

export const editOfficeStaffdetails = async (id, formData) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/d/officestaff/${id}/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log("Office staff updated response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to update office staff details:",
      error.response?.data || error.message,
    );
    throw (
      error.response?.data ||
      new Error("Something went wrong while updating office staff details.")
    );
  }
};

export const fetchGuardianAttendance = async (id, month, year) => {
  try {
    const response = await axios.get(`${BASE_URL}/a/guardian/attendance/`, {
      params: {
        guardian_id: id,
        month: month,
        year: year,
      },
    });
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch guardian attendance:", err);
    throw err;
  }
};

export const fetchCalendar = async (month, year) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/calendar/?month=${month}&year=${year}`,
    );
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch calendar:", err);
    throw err;
  }
};

export const importHolidays = async (year) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/a/holidays/import?year=${year}`,
      { year },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data.message || "Failed to import holidays",
      );
    } else if (error.request) {
      throw new Error("No response received from server");
    } else {
      throw new Error(error.message);
    }
  }
};

export const createEvent = async (eventData) => {
  try {
    const response = await axios.post(`${BASE_URL}/a/events/`, eventData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || "Failed to create event");
    } else if (error.request) {
      throw new Error("No response received from server");
    } else {
      throw new Error(error.message || "Failed to create event");
    }
  }
};

// DISCOUNT API

export const createDiscount = async (accessToken, payload) => {
  try {
    if (!payload) {
      throw new Error("Payload is required");
    }

    const response = await axios.post(`${BASE_URL}/d/fee-discounts/`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      // Return full backend error object for field-wise handling
      throw error.response.data;
    } else if (error.request) {
      throw { non_field_errors: ["No response received from server"] };
    } else {
      throw {
        non_field_errors: [error.message || "Failed to create discount"],
      };
    }
  }
};

// Assign substitute
export const assignSubstitute = async (payload) => {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/t/substitute-assign/`,
      payload,
    );
    return data;
  } catch (error) {
    console.error(
      "API Error in assignSubstitute:",
      error.response?.data || error,
    );
    throw error;
  }
};

// EDIT API

export const editSalary = async (accessToken, payload, id) => {
  try {
    const response = await axios.put(
      `${constants.baseUrl}/d/Employee/${id}/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (response.status == 200 || response.status == 201) {
      return response.data;
    }
  } catch (err) {
    console.error("Failed to create Employee:", err);
    throw err;
  }
};

// Update  teacher attendance
export const updateTeacherAttendance = async (id, payload) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/a/teacher-attendance/${id}/`,
      payload,
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

// Update School Income

export const updateSchoolIncome = async (id, payload) => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    if (!authTokens) throw new Error("No access token found. Please login.");

    const accessToken = JSON.parse(authTokens).access;
    if (!accessToken) throw new Error("Access token missing. Please login.");

    const isFormData = payload instanceof FormData;

    const response = await axios.patch(
      `${BASE_URL}/d/school-income/${id}/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(isFormData
            ? { "Content-Type": "multipart/form-data" }
            : { "Content-Type": "application/json" }),
        },
      },
    );

    return response.data;
  } catch (err) {
    console.error(
      "API updateSchoolIncome error:",
      err.response?.data || err.message,
    );
    throw err;
  }
};

// Delete School Income
export const deleteSchoolIncome = async (accessToken, id) => {
  try {
    const token = accessToken?.trim();
    if (!token) throw new Error("No access token provided");

    await axios.delete(`${BASE_URL}/d/school-income/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return true;
  } catch (err) {
    console.error("Failed to delete school income:", err);
    throw err;
  }
};

export const fetchSchoolIncomeById = async (id) => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = authTokens ? JSON.parse(authTokens).access : null;
    if (!accessToken) throw new Error("No access token found");

    const response = await axios.get(`${BASE_URL}/d/school-income/${id}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching school income by ID:", error);
    throw error;
  }
};


// export const deactivateStudents = async (studentIds) => {
//   try {
//     const response = await axios.patch(
//       `${BASE_URL}/s/graduate/bulk-deactivate/`,
//       { student_ids: studentIds }
//     );
//     return response.data;
//   } catch (err) {
//     console.error("Failed to deactivate students:", err);
//     throw err;
//   }
// };



export const deactivateStudents = async (studentIds, reason = "TC") => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/s/graduate/bulk-deactivate/`,
      { 
        student_ids: studentIds,
        reason: reason 
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to deactivate students:", err);
    throw err;
  }
};

export const fetchInactiveStudents = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/s/graduate/inactive-students/`
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (err) {
    console.error("Failed to fetch inactive students:", err);
    throw err;
  }
};


export const reactivateStudents = async (studentIds) => {
  try {
    const response = await axios.patch(
      `${BASE_URL}/s/graduate/bulk-reactivate/`,
      { student_ids: studentIds }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to reactivate students:", err);
    throw err;
  }
};


// ===================== STAFF DEACTIVATION/REACTIVATION APIs =====================

// Fetch inactive users
export const fetchInactiveUsers = async (accessToken) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/d/inactive-user/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch inactive users:", err);
    throw err;
  }
};

// Deactivate users (staff/teachers)
export const deactivateUsers = async (accessToken, userIds, reason) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/d/deactivate-user/`,
      { 
        user_id: userIds, // 
        reason: reason 
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to deactivate users:", err);
    throw err;
  }
};

// Reactivate users (staff/teachers)
export const reactivateUsers = async (accessToken, userIds) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/d/reactivate-user/`,
      { user_id: userIds }, // This expects an array of user IDs
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to reactivate users:", err);
    throw err;
  }
};



// Transfer Certificates API
export const fetchTransferCertificates = async (page = 1, pageSize = 10) => {
  try {
    const authTokens = localStorage.getItem("authTokens");
    const accessToken = authTokens ? JSON.parse(authTokens).access : null;

    if (!accessToken) {
      throw new Error("Please login again");
    }

    const response = await axios.get(
      `${BASE_URL}/d/transfer-certificates/?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch transfer certificates:", err);
    throw err;
  }
};