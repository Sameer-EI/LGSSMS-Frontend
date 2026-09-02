import React, { useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { allRouterLink } from "../router/AllRouterLinks";
import { constants } from "../global/constants";
import { AuthContext } from "../context/AuthContext";

export const Sidebar = () => {
  const { isAuthenticated, studentID } = useContext(AuthContext);
  const drawerRef = useRef(null);
  const navigate = useNavigate();
  const role = localStorage.getItem("userRole");

  const handleNavigation = (e, path) => {
    e.preventDefault();
    closeDrawer();
    navigate(path);
  };

  const closeDrawer = () => {
    if (drawerRef.current) {
      drawerRef.current.checked = false;
    }
  };

  return (
    <div className="drawer z-50 ">
      <input
        ref={drawerRef}
        id="my-drawer"
        type="checkbox"
        className="drawer-toggle"
      />
      <div className="drawer-content"></div>

      <div className="drawer-side">
        <label htmlFor="my-drawer" className="drawer-overlay"></label>

        <div className="min-h-full w-72 bg-white dark:bg-gray-900 shadow-lg p-4 border-r border-gray-200 dark:border-gray-700">
          <nav className="space-y-6">
            {/* Dashboard / Home */}
            {isAuthenticated && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Home
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      onClick={(e) => {
                        e.preventDefault();
                        let dashboardPath = "/";
                        if (role === constants.roles.director) {
                          dashboardPath = allRouterLink.directorDashboard;
                        } else if (role === constants.roles.officeStaff) {
                          dashboardPath = allRouterLink.officeStaffDashboard;
                        } else if (role === constants.roles.guardian) {
                          dashboardPath = allRouterLink.guardianDashboard;
                        } else if (role === constants.roles.student) {
                          dashboardPath = allRouterLink.studentDashboard;
                        } else if (role === constants.roles.teacher) {
                          dashboardPath = allRouterLink.teacherDashboard;
                        }
                        handleNavigation(e, dashboardPath);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                    >
                      <i className="fa-solid fa-house w-5"></i> Dashboard
                    </Link>
                  </li>
                  <div>
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <ul className="space-y-1">
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(e, allRouterLink.allClasses)
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-graduation-cap w-5"></i>{" "}
                              All Classes
                            </Link>
                          </li>
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(e, allRouterLink.allStaffMembers)
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-id-card-clip w-5"></i>
                              Staff Members
                            </Link>
                          </li>
                          {(role === constants.roles.director ||
                            role === constants.roles.officeStaff) && (
                              <li>
                                <Link
                                  onClick={(e) =>
                                    handleNavigation(
                                      e,
                                      allRouterLink.teacherAttendance
                                    )
                                  }
                                  className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                                >
                                  <i className="fa-solid fa-clipboard-user w-5"></i>
                                  Staff Attendance
                                </Link>
                              </li>
                            )}
                          {(role === constants.roles.officeStaff || role === constants.roles.director) && (
                            <li>
                              <Link
                                onClick={(e) =>
                                  handleNavigation(
                                    e,
                                    allRouterLink.TeacherSubstitute
                                  )
                                }
                                className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                              >
                                <i className="fa-solid fa-person-chalkboard w-5"></i>
                                Teacher Substitute
                              </Link>
                            </li>
                          )}
                        </ul>
                      )}
                  </div>
                </ul>
              </div>
            )}

            {/* Admissions */}
            {(role === constants.roles.director ||
              role === constants.roles.officeStaff) &&
              isAuthenticated && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Admissions
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.admissionForm)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-user-graduate w-5"></i>{" "}
                        Admission Form
                      </Link>
                    </li>
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.addmissionDetails)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-clipboard-list w-5"></i>{" "}
                        Student Details
                      </Link>
                    </li>
                  </ul>
                </div>
              )}

            {/* Documents */}
            {(role === constants.roles.director ||
              role === constants.roles.officeStaff ||
              role === constants.roles.student ||
              role === constants.roles.teacher ||
              role === constants.roles.guardian) &&
              isAuthenticated && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Documents
                  </h3>
                  <ul className="space-y-1">
                    {/* {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.documentUpload)
                        }
                         className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-file-arrow-up w-5"></i> Upload
                        Documents
                      </Link>
                    </li>)} */}
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.viewDocuments)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-file-circle-check w-5"></i>{" "}
                        View Documents
                      </Link>
                    </li>
                    {/* Add Transfer Certificates link - Only for Director and Office Staff */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.transferCertificates)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-file-pdf w-5 "></i>{" "}
                            View Transfer Certificates
                          </Link>
                        </li>
                      )}
                  </ul>
                </div>
              )}

            {/* Management */}
            {(role === constants.roles.director ||
              role === constants.roles.teacher ||
              role === constants.roles.student ||
              role === constants.roles.officeStaff) &&
              isAuthenticated && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Management
                  </h3>
                  <ul className="space-y-1">
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <>
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(
                                  e,
                                  allRouterLink.subjectAssignment
                                )
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-tasks w-5"></i> Assign
                              Subjects
                            </Link>
                          </li>
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(
                                  e,
                                  allRouterLink.directorMarkHolidays
                                )
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-calendar-day w-5"></i>{" "}
                              Assign Holidays
                            </Link>
                          </li>
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(e, allRouterLink.periodsByClass)
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-clock w-5"></i> Assigned
                              Periods
                            </Link>
                          </li>

                          {/* <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.UploadExamPaper)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-file-upload w-5"></i>{" "}
                            Upload Exam Paper
                          </Link>
                        </li> */}
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(e, allRouterLink.ViewExamPaper)
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-eye w-5"></i> View Exam
                              Paper
                            </Link>
                          </li>
                          <li>
                            <Link
                              onClick={(e) =>
                                handleNavigation(e, allRouterLink.MarksheetsTable)
                              }
                              className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                            >
                              <i className="fa-solid fa-file-alt w-5"></i> View
                              Marksheets
                            </Link>
                          </li>
                        </>
                      )}
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.TimeTable)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-table-list w-5"></i>{" "}
                        Examination Schedule
                      </Link>
                    </li>
                    {(role === constants.roles.director ||
                      role === constants.roles.teacher) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.ExamSchedule)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
      hover:bg-blue-100 dark:hover:bg-gray-700 
      transition text-gray-800 dark:text-gray-200 whitespace-nowrap"
                          >
                            <i className="fa-solid fa-calendar-days w-5"></i>
                            Create Examination Schedule
                          </Link>
                        </li>
                      )}

                    {role === constants.roles.student && (
                      <>
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.TimeTable)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-table-list w-5"></i> Time
                            Table
                          </Link>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}

            {/* Teaching */}
            {role === constants.roles.teacher && isAuthenticated && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Teaching
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      onClick={(e) =>
                        handleNavigation(e, allRouterLink.attendance)
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                    >
                      <i className="fa-solid fa-clipboard-user w-5"></i>{" "}
                      Attendance
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Fees */}
            {isAuthenticated &&
              (role === constants.roles.director ||
                role === constants.roles.student ||
                role === constants.roles.teacher ||
                role === constants.roles.officeStaff ||
                role === constants.roles.guardian) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Fees
                  </h3>
            <ul className="space-y-1">
                    {/* Fee Structure */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff ||
                      role === constants.roles.student ||
                      role === constants.roles.guardian ||
                      role === constants.roles.teacher) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.feeStructure)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-table-cells w-5"></i> Fee Structure
                          </Link>
                        </li>
                      )}

                    {/* Fee Submission: director, office staff, student */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff ||
                      role === constants.roles.student ||
                      role === constants.roles.guardian) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.admissionFees)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-money-bill-wave w-5"></i>{" "}
                            Fee Submission
                          </Link>
                        </li>
                      )
                      }

                    {/* Student Fee Card: student only */}
                    {(role === constants.roles.student ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(
                                e,
                                studentID
                                  ? allRouterLink.studentFeeCard.replace(
                                    ":student_id",
                                    studentID
                                  )
                                  : allRouterLink.studentFeeCard
                              )
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-envelope w-5"></i> Student
                            Fee Card
                          </Link>
                        </li>
                      )}

                    {/* Student Fee Card List: guardian only */}
                    {role === constants.roles.guardian && (
                      <li>
                        <Link
                          onClick={(e) =>
                            handleNavigation(e, allRouterLink.guardianChildren)
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-envelope w-5"></i> Student
                          Fee Card
                        </Link>
                      </li>
                    )}

                    {/* Fee Record: director and office staff only */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.feeSummary)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-receipt w-5"></i> Fee Record
                          </Link>
                        </li>
                      )}

                    {/* Overdue Accounts Summary */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff ||
                      role === constants.roles.teacher) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.overdueAccounts)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-file-invoice w-5"></i>{" "}
                            Overdue Accounts
                          </Link>
                        </li>
                      )}

                    {/* Create Discount Fees */}
                    {role === constants.roles.director && (
                      <li>
                        <Link
                          onClick={(e) =>
                            handleNavigation(e, allRouterLink.createDiscount)
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-tag"></i>
                          Create Discount
                        </Link>
                      </li>
                    )}

                    {role === constants.roles.director && (
                      <li>
                        <Link
                          onClick={(e) =>
                            handleNavigation(
                              e,
                              allRouterLink.discountedStudents
                            )
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-percentage w-5"></i>{" "}
                          Discounted Students
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

            {/* Expense */}
            {isAuthenticated &&
              (role === constants.roles.director ||
                role === constants.roles.officeStaff) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Manage Expenses
                  </h3>
                  <ul className="space-y-1">
                    {/* View Total Expenses */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.viewAllExpenses)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-money-check-dollar"></i>{" "}
                            View Total Expenses
                          </Link>
                        </li>
                      )}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.managecategory)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-list-check"></i> Manage
                            Category
                          </Link>
                        </li>
                      )}
                  </ul>
                </div>
              )}
            {/* Income */}
            {isAuthenticated &&
              (role === constants.roles.director ||
                role === constants.roles.officeStaff) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Incomes
                  </h3>
                  <ul className="space-y-1">
                    {/* View Total Incomes */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.schoolIncome)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-money-bills"></i> View Total
                            Income
                          </Link>
                        </li>
                      )}
                  </ul>
                </div>
              )}
            {/* Salary */}
            {isAuthenticated &&
              (role === constants.roles.director ||
                role === constants.roles.officeStaff) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Manage Salaries
                  </h3>
                  <ul className="space-y-1">
                    {/* Create Salary: director only */}
                    {(role === constants.roles.director ||
                      role === constants.roles.officeStaff) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.viewSalaryExpense)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-wallet"></i>
                            View Salary
                          </Link>
                        </li>
                      )}
                  </ul>
                </div>
              )}

            {/* Reports */}
            {(role === constants.roles.director ||
              role === constants.roles.teacher ||
              role === constants.roles.student ||
              role === constants.roles.officeStaff) &&
              isAuthenticated && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Reports
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.attendanceRecord)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-square-poll-vertical w-5"></i>{" "}
                        Attendance Record
                      </Link>
                    </li>
                    <li>
                      <Link
                        onClick={(e) =>
                          handleNavigation(e, allRouterLink.HolidayCalendar)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                      >
                        <i className="fa-solid fa-calendar-days w-5"></i>{" "}
                        Academic Calendar
                      </Link>
                    </li>
                    {(role === constants.roles.director ||
                      role === constants.roles.teacher) && (
                        <li>
                          <Link
                            onClick={(e) =>
                              handleNavigation(e, allRouterLink.StudentMarksFill)
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                          >
                            <i className="fa-solid fa-fill-drip w-5"></i> Fill Student
                            Marks
                          </Link>
                        </li>
                      )}
                    {role === constants.roles.director && (
                      <li>
                        <Link
                          onClick={(e) =>
                            handleNavigation(
                              e,
                              allRouterLink.ClassTeacherAssign
                            )
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-chalkboard-teacher w-5"></i>{" "}
                          View Allocate Class
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

            {/* Guardian Reports */}
            {role === constants.roles.guardian && isAuthenticated && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Reports
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      onClick={(e) =>
                        handleNavigation(
                          e,
                          allRouterLink.guardianAttendanceRecord
                        )
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                    >
                      <i className="fa-solid fa-square-poll-vertical w-5"></i>{" "}
                      Attendance Record
                    </Link>
                  </li>
                  <li>
                    <Link
                      onClick={(e) =>
                        handleNavigation(e, allRouterLink.HolidayCalendar)
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-md 
                         hover:bg-blue-100 dark:hover:bg-gray-700 
                         transition text-gray-800 dark:text-gray-200"
                    >
                      <i className="fa-solid fa-calendar-days w-5"></i> Holiday
                      Calendar
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};
