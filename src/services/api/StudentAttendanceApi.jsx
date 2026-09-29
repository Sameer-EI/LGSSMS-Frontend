import axios from "axios";
import { constants } from "../../global/constants";

const BASE_URL = constants.baseUrl;

export const fetchAttendanceDefaulters = async (
  threshold = 75,
  yearLevelId = "ALL",
  limit = 5,
  offset = 0,
) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/student-attendance/defaulters/`,
      {
        params: { threshold, year_level_id: yearLevelId, limit, offset },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch attendance defaulters:", err);
    throw err;
  }
};

// Update this in your Api.js file
export const fetchStudentAttendanceData = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.year_level_id)
      queryParams.append("year_level_id", params.year_level_id);
    if (params.date) queryParams.append("date", params.date);
    if (params.search) queryParams.append("search", params.search);

    const response = await axios.get(
      `${BASE_URL}/a/student-attendance/register/?${queryParams.toString()}`,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch student attendance data:", error);
    return [];
  }
};

export const notifyParentAboutAttendance = async (
  studentId,
  notificationType = "defaulter",
  customMessage = null,
) => {
  try {
    const response = await axios.post(
      `${BASE_URL}a/student-attendance/notify-parent/`,
      {
        student_id: studentId,
        notification_type: notificationType,
        custom_message: customMessage,
      },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to notify parent:", err);
    throw err;
  }
};

// Add this to your Api.js file
export const fetchStudentAttendanceRegister = async (
  yearLevelId,
  date,
  search = "",
) => {
  try {
    const params = new URLSearchParams();
    if (yearLevelId) params.append("year_level_id", yearLevelId);
    if (date) params.append("date", date);
    if (search) params.append("search", search);

    const response = await axios.get(
      `${BASE_URL}/a/student-attendance/register/?${params.toString()}`,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch attendance register:", error);
    throw error;
  }
};

// NOTE: This hits the bulk Update/Create endpoint — POST /a/student-attendance/.
// If a student in P/A/L already has an attendance record for `marked_at`,
// the backend updates it in place; otherwise it creates a new one. So this
// same function is used for BOTH the first mark and any later edit — no
// separate "edit" endpoint/method is needed. Both teachers and office staff
// can call this to edit an already-marked student; nothing here restricts it.
export const markStudentAttendance = async (
  yearLevelId,
  marker, // { teacherId, officeStaffId } — exactly one is non-null
  markedAt,
  attendanceMap,
) => {
  try {
    const payload = {
      year_level_id: yearLevelId,
      marked_at: markedAt,
      P: [],
      A: [],
      L: [],
    };

    // Only the id of whoever is actually logged in goes into the payload —
    // the other key is omitted entirely, not sent as null.
    if (marker?.teacherId) {
      payload.teacher_id = marker.teacherId;
    } else if (marker?.officeStaffId) {
      payload.office_staff_id = marker.officeStaffId;
    }

    Object.entries(attendanceMap).forEach(([studentId, status]) => {
      const id = parseInt(studentId);
      if (status === "P") {
        payload.P.push(id);
      } else if (status === "A") {
        payload.A.push(id);
      } else if (["Late", "L", "Leave", "LV"].includes(status)) {
        payload.L.push(id);
      }
    });

    const response = await axios.post(
      `${BASE_URL}/a/student-attendance/`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Failed to mark student attendance:", error);
    throw error;
  }
};

export const fetchStudentHeatMap = async (studentId, days = 30) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/a/student-attendance/heat-map/`,
      { params: { student_id: studentId, days } },
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch student heat map:", err);
    throw err;
  }
};


export const fetchAllAttendanceDefaulters = async (
  threshold = 75,
  yearLevelId = "ALL",
) => {
  try {
    const url = `${BASE_URL}/a/student-attendance/defaulters/`;
    const baseParams = { threshold, year_level_id: yearLevelId };
 
    const response = await axios.get(url, { params: baseParams });
    const data = response.data;
 
    // Plain array response — already everything.
    if (Array.isArray(data)) return data;
 
    const all = Array.isArray(data?.results) ? [...data.results] : [];
 
    // Paginated response — keep pulling pages until there's no `next`.
    const pageSize = all.length;
    let hasNext = Boolean(data?.next);
 
    while (hasNext && pageSize > 0) {
      const page = await axios.get(url, {
        params: { ...baseParams, limit: pageSize, offset: all.length },
      });
      const results = Array.isArray(page.data?.results)
        ? page.data.results
        : [];
 
      if (results.length === 0) break; // safety: never loop on an empty page
      all.push(...results);
      hasNext = Boolean(page.data?.next);
    }
 
    return all;
  } catch (err) {
    console.error("Failed to fetch all attendance defaulters:", err);
    throw err;
  }
};