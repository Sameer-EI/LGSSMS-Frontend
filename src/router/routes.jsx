// import { AdmissionDetails } from "../components/AdmissionProcess/AdmissionDetails";
// import { AdmissionFees } from "../components/AdmissionProcess/AdmissionFees";
// import { AdmissionForm } from "../components/AdmissionProcess/AdmissionForm";
// import { EditAddmissionDetails } from "../components/AdmissionProcess/Admissions/EditAddmissionDetails";
// import { SingleAdmissionDetails } from "../components/AdmissionProcess/Admissions/SingleAdmissionDetails";
// import FeeSummaryTable from "../components/AdmissionProcess/FeeSummaryTable";
// import { ClassStudent } from "../components/ClassStudents/ClassStudent";
// import { DirectorDashboard } from "../components/DirectorDashboard/DirectorDashboard";
// import DirectorProfile from "../components/DirectorDashboard/DirectorProfile";
// import GuardianAttendanceRecord from "../components/GuardianDashboard/GuardianAttendanceRecord";
// import StudentAttendance from "../components/GuardianDashboard/StudentAttendance";
// import { GuardianDashboard } from "../components/GuardianDashboard/GuardianDashboard";
// import GuardianProfile from "../components/GuardianDashboard/GuardianProfile";
// import { NotFound } from "../components/NotFound";
// import { OfficeStaffDashboard } from "../components/OfficestaffDashboard/OfficeStaffDashboard";
// import OfficestaffProfile from "../components/OfficestaffDashboard/OfficestaffProfile";
// import StudentProfile from "../components/Student Dashboard/StudentProfile";
// import { Attendance } from "../components/Teacher/Attendance";
// import AttendanceRecord from "../components/Teacher/AttendanceRecord";
// import FullAttendance from "../components/Teacher/FullAttendance";
// import { TeacherDashboard } from "../components/TeacherDashboard/TeacherDashboard";
// import TeacherProfile from "../components/TeacherDashboard/TeacherProfile";
// import { Unauthorized } from "../components/Unauthorized";
// import { ViewDocuments } from "../components/UploadDocs/ViewDocuments";
// import { constants } from "../global/constants";
// import { AllTeacherAssignments } from "../screens/Assignments/AllTeacherAssignments";
// import { SubjectAssignments } from "../screens/Assignments/SubjectAssignments";
// import { ChangePassword } from "../screens/Auth/ChangePassword";
// import { ForgotPassword } from "../screens/Auth/ForgotPassword";
// import { Login } from "../screens/Auth/Login";
// import { Register } from "../screens/Auth/Register";
// import { ResetPassword } from "../screens/Auth/ResetPassword";
// import { DocumentUpload } from "../screens/DocumentUpload";
// import { HomeScreen } from "../screens/HomeScreen";
// import { allRouterLink } from "./AllRouterLinks";
// import Allclasses from "../components/Classesdata/Allclasses";
// import Allstudentsperclass from "../components/Classesdata/Allstudentsperclass";
// import StudentDetails from "../components/Classesdata/StudentDetails";
// import UpdateStudentDetail from "../components/Classesdata/UpdateStudentDetail";
// import FeeDashboard from "../components/AdmissionProcess/FeeDashboard";
// import AllStaff from "../components/StaffData/AllStaff";
// import Staffdetail from "../components/StaffData/Staffdetail";
// import DirectorMarkHolidays from "../components/DirectorDashboard/DirectorMarkHolidays";
// import UpdateStaffdetails from "../components/StaffData/UpdateStaffdetails";
// import { StudentDashboard } from "../components/Student Dashboard/StudentDashboard";
// import ExamSchedule from "../components/Teacher/ExamSchedule";
// import UpdateExamSchedule from "../components/Teacher/UpdateExamSchedule";
// import TimeTable from "../components/Teacher/TimeTable";
// import UploadExamPaper from "../components/Teacher/UploadExamPaper";
// import ViewExamPaper from "../components/Teacher/ViewExamPaper";
// import UpdateExamPaper from "../components/Teacher/UpdateExamPaper";
// import MyAttendance from "../components/Student Dashboard/MyAttendance";
// import PeriodAssignment from "../screens/Assignments/PeriodAssignment";
// import PeriodsByClass from "../components/Classesdata/PeriodsByClass";
// import HolidayCalendar from "../screens/HolidayCalendar";
// import StudentMarksFill from "../components/Teacher/StudentMarksFill";

// import GuardianChildren from "../components/GuardianDashboard/GuardianChildren";
// import Marksheet from "../components/Student Dashboard/Marksheet";
// import ClassTeacherAssign from "../components/DirectorDashboard/ClassTeacherAssign";
// import ViewAllocatedClass from "../components/DirectorDashboard/ViewAllocatedClass";
// import MarksheetsTable from "../components/Student Dashboard/MarksheetsTable";
// import TeacherSubstitute from "../components/OfficestaffDashboard/TeacherSubstitute";
// import SingleTeacher from "../components/OfficestaffDashboard/SingleTeacher";

// import CreateDiscount from "../components/AdmissionProcess/Discount/CreateDiscount";
// import UnpaidFeesList from "../components/AdmissionProcess/UnpaidFees";
// import StudentFeeAndUnpaidSummary from "../components/AdmissionProcess/StudentFeeandUnpaidSummary";
// import DiscountedStudents from "../components/AdmissionProcess/Discount/DiscountedStudents";
// import EditDiscount from "../components/AdmissionProcess/Discount/EditDiscount";
// import { CreateSalaryExpense } from "../components/ManageExpenses/SalaryExpense/CreateSalaryExpense";
// import { ViewSalaryExpense } from "../components/ManageExpenses/SalaryExpense/ViewSalaryExpense";
// import { ViewAllExpenses } from "../components/ManageExpenses/AllExpenses/ViewAllExpenses";
// import { EditSalaryExpense } from "../components/ManageExpenses/SalaryExpense/EditSalaryExpense";
// import TeacherAttendance from "../components/OfficestaffDashboard/TeacherAttendance";
// import TeacherAttendanceRecord from "../components/OfficestaffDashboard/TeacherAttendanceRecord";
// import { SchoolIncome } from "../components/Incomes/SchoolIncomes";
// import CreateIncome from "../components/Incomes/CreateIncome";
// import { PaySalaryExpense } from "../components/ManageExpenses/SalaryExpense/PaySalaryExpense";
// import { CreateExpenses } from "../components/ManageExpenses/AllExpenses/CreateExpenses";
// import { EditExpenses } from "../components/ManageExpenses/AllExpenses/EditExpenses";
// import UpdateIncome from "../components/Incomes/UpdateIncome";
// import { UpdateSalaryExpense } from "../components/ManageExpenses/SalaryExpense/UpdateSalaryExpense";
// import { EmployeeMonthlySalary } from "../components/ManageExpenses/SalaryExpense/EmployeeMonthlySalary";
// import PrivacyPolicy from "../components/Privacy/Privacy";
// import CreateCategory from "../components/ManageExpenses/AllExpenses/CreateCategory";
// import { StudentAdmissionFees } from "../components/AdmissionProcess/StudentAdmissionFees";
// import { ViewFeesDetails } from "../components/AdmissionProcess/ViewFeesDetails";
// import { CreateMarksheet } from "../components/Marksheet/CreateMarksheet";
// import EditMarksheet  from "../components/Marksheet/EditMarksheet";

// export const routes = [
//   {
//     path: allRouterLink.homeScreen,
//     element: <HomeScreen />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.registerUser,
//     element: <Register />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.loginUser,
//     element: <Login />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.changePassword,
//     element: <ChangePassword />,
//     protected: true,
//   },
//   {
//     path: allRouterLink.forgotPassword,
//     element: <ForgotPassword />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.resetPassword,
//     element: <ResetPassword />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.admissionForm,
//     element: <AdmissionForm />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.addmissionDetails,
//     element: <AdmissionDetails />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.viewFeesDetails,
//     element: <ViewFeesDetails />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.addmissionDetailsById,
//     element: <SingleAdmissionDetails />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.editAddmisionDetails,
//     element: <EditAddmissionDetails />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.admissionFees,
//     element: <AdmissionFees />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.officeStaff,
//       constants.roles.student,
//       constants.roles.teacher,
//       constants.roles.guardian,
//     ],
//   },
//   {
//     path: allRouterLink.HolidayCalendar,
//     element: <HolidayCalendar />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.officeStaff,
//       constants.roles.student,
//       constants.roles.teacher,
//       constants.roles.guardian,
//     ],
//   },
//   {
//     path: allRouterLink.studentFeeCard,
//     element: <StudentFeeAndUnpaidSummary />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.officeStaff,
//       constants.roles.student,
//       constants.roles.teacher,
//       constants.roles.guardian,
//     ],
//   },
//   {
//     path: allRouterLink.documentUpload,
//     element: <DocumentUpload />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.officeStaff,
//       constants.roles.teacher,
//     ],
//   },
//   {
//     path: allRouterLink.UploadExamPaper,
//     element: <UploadExamPaper />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: allRouterLink.StudentMarksFill,
//     element: <StudentMarksFill />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.ViewExamPaper,
//     element: <ViewExamPaper />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: `${allRouterLink.UpdateExamPaper}/:id`,
//     element: <UpdateExamPaper />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: allRouterLink.viewDocuments,
//     element: <ViewDocuments />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.officeStaff,
//       constants.roles.student,
//       constants.roles.teacher,
//       constants.roles.guardian,
//     ],
//   },
//   {
//     path: allRouterLink.TimeTable,
//     element: <TimeTable />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.student,
//       constants.roles.officeStaff,
//       constants.roles.guardian,
//     ],
//   },
//   {
//     path: allRouterLink.Marksheet,
//     element: <Marksheet />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.student,
//     ],
//   },
//   {
//     path: allRouterLink.CreateMarksheet,
//     element: <CreateMarksheet />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.UpdateMarksheet,
//     element: <EditMarksheet />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.ExamSchedule,
//     element: <ExamSchedule />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.UpdateExamSchedule,
//     element: <UpdateExamSchedule />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.subjectAssignment,
//     element: <SubjectAssignments />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.MarksheetsTable,
//     element: <MarksheetsTable />,

//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.ClassTeacherAssign,
//     element: <ClassTeacherAssign />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.allTeacherAssignment,
//     element: <AllTeacherAssignments />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.ViewAllocatedClass,
//     element: <ViewAllocatedClass />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.TeacherSubstitute,
//     element: <TeacherSubstitute />,
//     protected: true,
//     allowedRoles: [constants.roles.officeStaff, constants.roles.director],
//   },
//   {
//     path: allRouterLink.SingleTeacher,
//     element: <SingleTeacher />,
//     protected: true,
//     allowedRoles: [constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.attendance,
//     element: <Attendance />,
//     protected: true,
//     allowedRoles: [constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.classStudents,
//     element: <ClassStudent />,
//     protected: true,
//     allowedRoles: [constants.roles.teacher],
//   },
//   // PROFILES
//   {
//     path: allRouterLink.directorProfile,
//     element: <DirectorProfile />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.directorMarkHolidays,
//     element: <DirectorMarkHolidays />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.officeStaffProfile,
//     element: <OfficestaffProfile />,
//     protected: true,
//     allowedRoles: [constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.teacherProfile,
//     element: <TeacherProfile />,
//     protected: true,
//     allowedRoles: [constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.guardianProfile,
//     element: <GuardianProfile />,
//     protected: true,
//     allowedRoles: [constants.roles.guardian],
//   },
//   {
//     path: allRouterLink.guardianAttendanceRecord,
//     element: <GuardianAttendanceRecord />,
//     protected: true,
//     allowedRoles: [constants.roles.guardian],
//   },
//   {
//     path: allRouterLink.studentAttendance,
//     element: <StudentAttendance />,
//     protected: true,
//     allowedRoles: [constants.roles.guardian],
//   },
//   {
//     path: allRouterLink.studentProfile,
//     element: <StudentProfile />,
//     protected: true,
//     allowedRoles: [constants.roles.student],
//   },
//   // DASHBOARD
//   {
//     path: allRouterLink.teacherDashboard,
//     element: <TeacherDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.teacher],
//   },
//   {
//     path: allRouterLink.guardianDashboard,
//     element: <GuardianDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.guardian],
//   },
//   {
//     path: allRouterLink.studentDashboard,
//     element: <StudentDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.student],
//   },
//   {
//     path: allRouterLink.officeStaffDashboard,
//     element: <OfficeStaffDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.directorDashboard,
//     element: <DirectorDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   // Attendance Record

//   {
//     path: allRouterLink.attendanceRecord,
//     element: <AttendanceRecord />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.feeSummary,
//     element: <FeeSummaryTable />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.feeDashboard,
//     element: <FeeDashboard />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.createDiscount,
//     element: <CreateDiscount />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.editDiscount,
//     element: <EditDiscount />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.fullAttendance,
//     element: <FullAttendance />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.allClasses,
//     element: <Allclasses />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.allStudentsperClass,
//     element: <Allstudentsperclass />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.studentDetails,
//     element: <StudentDetails />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.updateStudentdetail,
//     element: <UpdateStudentDetail />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.allStaffMembers,
//     element: <AllStaff />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.staffDetail,
//     element: <Staffdetail />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.updateStaffDetails,
//     element: <UpdateStaffdetails />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.myAttendance,
//     element: <MyAttendance />,
//     protected: true,
//     allowedRoles: [constants.roles.student],
//   },
//   {
//     path: allRouterLink.periodsByClass,
//     element: <PeriodsByClass />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: allRouterLink.periodAssignment,
//     element: <PeriodAssignment />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: allRouterLink.guardianChildren,
//     element: <GuardianChildren />,
//     protected: true,
//     allowedRoles: [constants.roles.guardian],
//   },
//   {
//     path: allRouterLink.overdueAccounts,
//     element: <UnpaidFeesList />,
//     protected: true,
//     allowedRoles: [
//       constants.roles.director,
//       constants.roles.teacher,
//       constants.roles.officeStaff,
//     ],
//   },
//   {
//     path: allRouterLink.discountedStudents,
//     element: <DiscountedStudents />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.editStudentDiscount,
//     element: <EditDiscount />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.createSalaryExpense,
//     element: <CreateSalaryExpense />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.viewSalaryExpense,
//     element: <ViewSalaryExpense />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.editSalaryExpense,
//     element: <EditSalaryExpense />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.paySalaryExpense,
//     element: <PaySalaryExpense />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.employeeMonthySalary,
//     element: <EmployeeMonthlySalary />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.updateSalaryExpense,
//     element: <UpdateSalaryExpense />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.viewAllExpenses,
//     element: <ViewAllExpenses />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.createExpenses,
//     element: <CreateExpenses />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.teacherAttendance,
//     element: <TeacherAttendance />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.editExpenses,
//     element: <EditExpenses />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.teacherAttendanceRecord,
//     element: <TeacherAttendanceRecord />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.schoolIncome,
//     element: <SchoolIncome />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.createIncome,
//     element: <CreateIncome />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   {
//     path: allRouterLink.editIncom,
//     element: <UpdateIncome />,
//     protected: true,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.privacyPolicy,
//     element: <PrivacyPolicy />,
//     protected: false,
//     allowedRoles: [constants.roles.director],
//   },
//   {
//     path: allRouterLink.managecategory,
//     element: <CreateCategory />,
//     protected: true,
//   },
//   {
//     path: allRouterLink.studentAdmissionFees,
//     element: <StudentAdmissionFees />,
//     protected: true,
//     allowedRoles: [constants.roles.director, constants.roles.officeStaff],
//   },
//   // include all routes before this please

//   {
//     path: allRouterLink.unAuthorized,
//     element: <Unauthorized />,
//     protected: false,
//   },
//   {
//     path: allRouterLink.notFound,
//     element: <NotFound />,
//     protected: false,
//   },
// ];






import { AdmissionDetails } from "../components/AdmissionProcess/AdmissionDetails";
import { AdmissionFees } from "../components/AdmissionProcess/AdmissionFees";
import { AdmissionForm } from "../components/AdmissionProcess/AdmissionForm";
import { EditAddmissionDetails } from "../components/AdmissionProcess/Admissions/EditAddmissionDetails";
import { SingleAdmissionDetails } from "../components/AdmissionProcess/Admissions/SingleAdmissionDetails";
import FeeSummaryTable from "../components/AdmissionProcess/FeeSummaryTable";
import { ClassStudent } from "../components/ClassStudents/ClassStudent";
import { DirectorDashboard } from "../components/DirectorDashboard/DirectorDashboard";
import DirectorProfile from "../components/DirectorDashboard/DirectorProfile";
import GuardianAttendanceRecord from "../components/GuardianDashboard/GuardianAttendanceRecord";
import StudentAttendance from "../components/GuardianDashboard/StudentAttendance";
import { GuardianDashboard } from "../components/GuardianDashboard/GuardianDashboard";
import GuardianProfile from "../components/GuardianDashboard/GuardianProfile";
import { NotFound } from "../components/NotFound";
import { OfficeStaffDashboard } from "../components/OfficestaffDashboard/OfficeStaffDashboard";
import OfficestaffProfile from "../components/OfficestaffDashboard/OfficestaffProfile";
import StudentProfile from "../components/Student Dashboard/StudentProfile";
import { Attendance } from "../components/Teacher/Attendance";
import AttendanceRecord from "../components/Teacher/AttendanceRecord";
import FullAttendance from "../components/Teacher/FullAttendance";
import { TeacherDashboard } from "../components/TeacherDashboard/TeacherDashboard";
import TeacherProfile from "../components/TeacherDashboard/TeacherProfile";
import { Unauthorized } from "../components/Unauthorized";
import { ViewDocuments } from "../components/UploadDocs/ViewDocuments";
import { constants } from "../global/constants";
import { AllTeacherAssignments } from "../screens/Assignments/AllTeacherAssignments";
import { SubjectAssignments } from "../screens/Assignments/SubjectAssignments";
import { ChangePassword } from "../screens/Auth/ChangePassword";
import { ForgotPassword } from "../screens/Auth/ForgotPassword";
import { Login } from "../screens/Auth/Login";
import { Register } from "../screens/Auth/Register";
import { ResetPassword } from "../screens/Auth/ResetPassword";
import { DocumentUpload } from "../screens/DocumentUpload";
import { HomeScreen } from "../screens/HomeScreen";
import { allRouterLink } from "./AllRouterLinks";
import Allclasses from "../components/Classesdata/Allclasses";
import Allstudentsperclass from "../components/Classesdata/Allstudentsperclass";
import StudentDetails from "../components/Classesdata/StudentDetails";
import UpdateStudentDetail from "../components/Classesdata/UpdateStudentDetail";
import FeeDashboard from "../components/AdmissionProcess/FeeDashboard";
import AllStaff from "../components/StaffData/AllStaff";
import Staffdetail from "../components/StaffData/Staffdetail";
import DirectorMarkHolidays from "../components/DirectorDashboard/DirectorMarkHolidays";
import UpdateStaffdetails from "../components/StaffData/UpdateStaffdetails";
import { StudentDashboard } from "../components/Student Dashboard/StudentDashboard";
import ExamSchedule from "../components/Teacher/ExamSchedule";
import UpdateExamSchedule from "../components/Teacher/UpdateExamSchedule";
import TimeTable from "../components/Teacher/TimeTable";
import UploadExamPaper from "../components/Teacher/UploadExamPaper";
import ViewExamPaper from "../components/Teacher/ViewExamPaper";
import UpdateExamPaper from "../components/Teacher/UpdateExamPaper";
import MyAttendance from "../components/Student Dashboard/MyAttendance";
import PeriodAssignment from "../screens/Assignments/PeriodAssignment";
import PeriodsByClass from "../components/Classesdata/PeriodsByClass";
import HolidayCalendar from "../screens/HolidayCalendar";
import StudentMarksFill from "../components/Teacher/StudentMarksFill";

import GuardianChildren from "../components/GuardianDashboard/GuardianChildren";
import Marksheet from "../components/Student Dashboard/Marksheet";
import ClassTeacherAssign from "../components/DirectorDashboard/ClassTeacherAssign";
import ViewAllocatedClass from "../components/DirectorDashboard/ViewAllocatedClass";
import MarksheetsTable from "../components/Student Dashboard/MarksheetsTable";
import TeacherSubstitute from "../components/OfficestaffDashboard/TeacherSubstitute";
import SingleTeacher from "../components/OfficestaffDashboard/SingleTeacher";

import CreateDiscount from "../components/AdmissionProcess/Discount/CreateDiscount";
import UnpaidFeesList from "../components/AdmissionProcess/UnpaidFees";
import StudentFeeAndUnpaidSummary from "../components/AdmissionProcess/StudentFeeandUnpaidSummary";
import DiscountedStudents from "../components/AdmissionProcess/Discount/DiscountedStudents";
import EditDiscount from "../components/AdmissionProcess/Discount/EditDiscount";
import { CreateSalaryExpense } from "../components/ManageExpenses/SalaryExpense/CreateSalaryExpense";
import { ViewSalaryExpense } from "../components/ManageExpenses/SalaryExpense/ViewSalaryExpense";
import { ViewAllExpenses } from "../components/ManageExpenses/AllExpenses/ViewAllExpenses";
import { EditSalaryExpense } from "../components/ManageExpenses/SalaryExpense/EditSalaryExpense";
import TeacherAttendance from "../components/OfficestaffDashboard/TeacherAttendance";
import TeacherAttendanceRecord from "../components/OfficestaffDashboard/TeacherAttendanceRecord";
import { SchoolIncome } from "../components/Incomes/SchoolIncomes";
import CreateIncome from "../components/Incomes/CreateIncome";
import { PaySalaryExpense } from "../components/ManageExpenses/SalaryExpense/PaySalaryExpense";
import { CreateExpenses } from "../components/ManageExpenses/AllExpenses/CreateExpenses";
import { EditExpenses } from "../components/ManageExpenses/AllExpenses/EditExpenses";
import UpdateIncome from "../components/Incomes/UpdateIncome";
import { UpdateSalaryExpense } from "../components/ManageExpenses/SalaryExpense/UpdateSalaryExpense";
import { EmployeeMonthlySalary } from "../components/ManageExpenses/SalaryExpense/EmployeeMonthlySalary";
import PrivacyPolicy from "../components/Privacy/Privacy";
import CreateCategory from "../components/ManageExpenses/AllExpenses/CreateCategory";
import { StudentAdmissionFees } from "../components/AdmissionProcess/StudentAdmissionFees";
import { ViewFeesDetails } from "../components/AdmissionProcess/ViewFeesDetails";
import { CreateMarksheet } from "../components/Marksheet/CreateMarksheet";
import EditMarksheet  from "../components/Marksheet/EditMarksheet";
import NewAdmissionList from "../components/AdmissionProcess/Admissions/NewAdmissionList";
import TransferCertificates from "../components/UploadDocs/ViewTC";
import FeeStructure from "../components/AdmissionProcess/FeeStructure";

export const routes = [
  {
    path: allRouterLink.homeScreen,
    element: <HomeScreen />,
    protected: false,
  },
  {
    path: allRouterLink.registerUser,
    element: <Register />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.loginUser,
    element: <Login />,
    protected: false,
  },
  {
    path: allRouterLink.changePassword,
    element: <ChangePassword />,
    protected: true,
  },
  {
    path: allRouterLink.forgotPassword,
    element: <ForgotPassword />,
    protected: false,
  },
  {
    path: allRouterLink.resetPassword,
    element: <ResetPassword />,
    protected: false,
  },
  {
    path: allRouterLink.admissionForm,
    element: <AdmissionForm />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.addmissionDetails,
    element: <AdmissionDetails />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.viewFeesDetails,
    element: <ViewFeesDetails />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.addmissionDetailsById,
    element: <SingleAdmissionDetails />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.editAddmisionDetails,
    element: <EditAddmissionDetails />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.admissionFees,
    element: <AdmissionFees />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.officeStaff,
      constants.roles.student,
      constants.roles.teacher,
      constants.roles.guardian,
    ],
  },
  {
    path: allRouterLink.feeStructure,
    element: <FeeStructure />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.HolidayCalendar,
    element: <HolidayCalendar />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.officeStaff,
      constants.roles.student,
      constants.roles.teacher,
      constants.roles.guardian,
    ],
  },
  {
    path: allRouterLink.studentFeeCard,
    element: <StudentFeeAndUnpaidSummary />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.officeStaff,
      constants.roles.student,
      constants.roles.teacher,
      constants.roles.guardian,
    ],
  },
  {
    path: allRouterLink.documentUpload,
    element: <DocumentUpload />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.officeStaff,
      constants.roles.teacher,
    ],
  },
  {
    path: allRouterLink.UploadExamPaper,
    element: <UploadExamPaper />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: allRouterLink.StudentMarksFill,
    element: <StudentMarksFill />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.teacher],
  },
  {
    path: allRouterLink.ViewExamPaper,
    element: <ViewExamPaper />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: `${allRouterLink.UpdateExamPaper}/:id`,
    element: <UpdateExamPaper />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: allRouterLink.viewDocuments,
    element: <ViewDocuments />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.officeStaff,
      constants.roles.student,
      constants.roles.teacher,
      constants.roles.guardian,
    ],
  },
  {
    path: allRouterLink.TimeTable,
    element: <TimeTable />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.student,
      constants.roles.officeStaff,
      constants.roles.guardian,
    ],
  },
  {
    path: allRouterLink.Marksheet,
    element: <Marksheet />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.student,
    ],
  },
  {
    path: allRouterLink.CreateMarksheet,
    element: <CreateMarksheet />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.teacher],
  },
  {
    path: allRouterLink.UpdateMarksheet,
    element: <EditMarksheet />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.teacher],
  },
  {
    path: allRouterLink.ExamSchedule,
    element: <ExamSchedule />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.teacher],
  },
  {
    path: allRouterLink.UpdateExamSchedule,
    element: <UpdateExamSchedule />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.teacher],
  },
  {
    path: allRouterLink.subjectAssignment,
    element: <SubjectAssignments />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.MarksheetsTable,
    element: <MarksheetsTable />,

    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.ClassTeacherAssign,
    element: <ClassTeacherAssign />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.allTeacherAssignment,
    element: <AllTeacherAssignments />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.ViewAllocatedClass,
    element: <ViewAllocatedClass />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.TeacherSubstitute,
    element: <TeacherSubstitute />,
    protected: true,
    allowedRoles: [constants.roles.officeStaff, constants.roles.director],
  },
  {
    path: allRouterLink.SingleTeacher,
    element: <SingleTeacher />,
    protected: true,
    allowedRoles: [constants.roles.officeStaff],
  },
  {
    path: allRouterLink.attendance,
    element: <Attendance />,
    protected: true,
    allowedRoles: [constants.roles.teacher],
  },
  {
    path: allRouterLink.classStudents,
    element: <ClassStudent />,
    protected: true,
    allowedRoles: [constants.roles.teacher],
  },
  // PROFILES
  {
    path: allRouterLink.directorProfile,
    element: <DirectorProfile />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.directorMarkHolidays,
    element: <DirectorMarkHolidays />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.officeStaffProfile,
    element: <OfficestaffProfile />,
    protected: true,
    allowedRoles: [constants.roles.officeStaff],
  },
  {
    path: allRouterLink.teacherProfile,
    element: <TeacherProfile />,
    protected: true,
    allowedRoles: [constants.roles.teacher],
  },
  {
    path: allRouterLink.guardianProfile,
    element: <GuardianProfile />,
    protected: true,
    allowedRoles: [constants.roles.guardian],
  },
  {
    path: allRouterLink.guardianAttendanceRecord,
    element: <GuardianAttendanceRecord />,
    protected: true,
    allowedRoles: [constants.roles.guardian],
  },
  {
    path: allRouterLink.studentAttendance,
    element: <StudentAttendance />,
    protected: true,
    allowedRoles: [constants.roles.guardian],
  },
  {
    path: allRouterLink.studentProfile,
    element: <StudentProfile />,
    protected: true,
    allowedRoles: [constants.roles.student],
  },
  // DASHBOARD
  {
    path: allRouterLink.teacherDashboard,
    element: <TeacherDashboard />,
    protected: true,
    allowedRoles: [constants.roles.teacher],
  },
  {
    path: allRouterLink.guardianDashboard,
    element: <GuardianDashboard />,
    protected: true,
    allowedRoles: [constants.roles.guardian],
  },
  {
    path: allRouterLink.studentDashboard,
    element: <StudentDashboard />,
    protected: true,
    allowedRoles: [constants.roles.student],
  },
  {
    path: allRouterLink.officeStaffDashboard,
    element: <OfficeStaffDashboard />,
    protected: true,
    allowedRoles: [constants.roles.officeStaff],
  },
  {
    path: allRouterLink.directorDashboard,
    element: <DirectorDashboard />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  // Attendance Record

  {
    path: allRouterLink.attendanceRecord,
    element: <AttendanceRecord />,
    protected: false,
  },
  {
    path: allRouterLink.feeSummary,
    element: <FeeSummaryTable />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.feeDashboard,
    element: <FeeDashboard />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.createDiscount,
    element: <CreateDiscount />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.editDiscount,
    element: <EditDiscount />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.fullAttendance,
    element: <FullAttendance />,
    protected: false,
  },
  {
    path: allRouterLink.allClasses,
    element: <Allclasses />,
    protected: false,
  },
  {
    path: allRouterLink.allStudentsperClass,
    element: <Allstudentsperclass />,
    protected: false,
  },
  {
    path: allRouterLink.studentDetails,
    element: <StudentDetails />,
    protected: false,
  },
  {
    path: allRouterLink.updateStudentdetail,
    element: <UpdateStudentDetail />,
    protected: false,
  },
  {
    path: allRouterLink.allStaffMembers,
    element: <AllStaff />,
    protected: false,
  },
  {
    path: allRouterLink.staffDetail,
    element: <Staffdetail />,
    protected: false,
  },
  {
    path: allRouterLink.updateStaffDetails,
    element: <UpdateStaffdetails />,
    protected: false,
  },
  {
    path: allRouterLink.myAttendance,
    element: <MyAttendance />,
    protected: true,
    allowedRoles: [constants.roles.student],
  },
  {
    path: allRouterLink.periodsByClass,
    element: <PeriodsByClass />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: allRouterLink.periodAssignment,
    element: <PeriodAssignment />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: allRouterLink.guardianChildren,
    element: <GuardianChildren />,
    protected: true,
    allowedRoles: [constants.roles.guardian],
  },
  {
    path: allRouterLink.overdueAccounts,
    element: <UnpaidFeesList />,
    protected: true,
    allowedRoles: [
      constants.roles.director,
      constants.roles.teacher,
      constants.roles.officeStaff,
    ],
  },
  {
    path: allRouterLink.discountedStudents,
    element: <DiscountedStudents />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.editStudentDiscount,
    element: <EditDiscount />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.createSalaryExpense,
    element: <CreateSalaryExpense />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.viewSalaryExpense,
    element: <ViewSalaryExpense />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.editSalaryExpense,
    element: <EditSalaryExpense />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.paySalaryExpense,
    element: <PaySalaryExpense />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.employeeMonthySalary,
    element: <EmployeeMonthlySalary />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.updateSalaryExpense,
    element: <UpdateSalaryExpense />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.viewAllExpenses,
    element: <ViewAllExpenses />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.createExpenses,
    element: <CreateExpenses />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.teacherAttendance,
    element: <TeacherAttendance />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.editExpenses,
    element: <EditExpenses />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.teacherAttendanceRecord,
    element: <TeacherAttendanceRecord />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.schoolIncome,
    element: <SchoolIncome />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.createIncome,
    element: <CreateIncome />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.editIncom,
    element: <UpdateIncome />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.privacyPolicy,
    element: <PrivacyPolicy />,
    protected: true,
    allowedRoles: [constants.roles.director],
  },
  {
    path: allRouterLink.managecategory,
    element: <CreateCategory />,
    protected: true,
  },
  {
    path: allRouterLink.studentAdmissionFees,
    element: <StudentAdmissionFees />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
    {
    path: allRouterLink.newAdmissionList,
    element: <NewAdmissionList />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.transferCertificates,
    element: <TransferCertificates />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },
  {
    path: allRouterLink.feeStructure,
    element: <FeeStructure />,
    protected: true,
    allowedRoles: [constants.roles.director, constants.roles.officeStaff],
  },

  // include all routes before this please

  {
    path: allRouterLink.unAuthorized,
    element: <Unauthorized />,
    protected: false,
  },
  {
    path: allRouterLink.notFound,
    element: <NotFound />,
    protected: false,
  },
];
