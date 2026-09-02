export const constants = {
  isOnline: true,
  // isOffline: true,
  baseUrl: "https://api.newprogressive.in", //deployed for school newprogressive PRODUCTION
  // baseUrl: "https://smsproject1.pythonanywhere.com/", //deployed for testing
  // baseUrl: "https://smsproject.pythonanywhere.com/", //deployed for school NPEPS deployed
//  baseUrl: "https://newprogressive.pythonanywhere.com/", //deployed for school newprogressive testing
  // baseUrl: "https://superkidz.pythonanywhere.com/",
  // baseUrl: "https://superkidsschool.pythonanywhere.com/", //deployed for school SUPER KIDS
  // baseUrl: "https://187gwsw1-8000.inc1.devtunnels.ms/", //farha
  //  baseUrl: "https://9gqxjbjg-8000.inc1.devtunnels.ms/", //tahur
  // baseUrl:"https://958cp4w5-8000.inc1.devtunnels.ms/", //saba
  // baseUrl: "https://94f38xkg-8000.inc1.devtunnels.ms", //naaz
  // baseUrl: "https://p0209tcw-8000.inc1.devtunnels.ms/", //naaz
  //  baseUrl:"https://187gwsw1-8000.inc1.devtunnels.ms/", //farha

  hideEdgeRevealStyle: `
      input[type="password"]::-ms-reveal,   
      input[type="password"]::-ms-clear {
        display: none;
      }
    `,
  roles: {
    director: "director",
    officeStaff: "office staff",
    teacher: "teacher",
    student: "student",
    guardian: "guardian",
  },
  allMonths: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],

  // roles: {
  //   director: "Director",
  //   officeStaff: "Office staff",
  //   teacher: "Teacher",
  //   student: "Student",
  //   guardian: "Guardain",
  // },

  bgTheme: "#5E35B1",
  textTheme: "#5E35B1",
  saffronOrange: "#FF9933",
  usColor: "#5cb7ffd9",
  italianGreen: "#4bcd89d9",
  neutralGrey: "#a6a6a6ff",
  canadaPink: "#ff6c88d9",
  textColor: "#333",
  whiteColor: "#fff",
};

const urlParts = constants.baseUrl.split("-");
if (urlParts.length > 1) {
  const portPart = urlParts[1].split(".")[0];
  if (!isNaN(portPart)) {
    constants.PORT = parseInt(portPart, 10);
  }
}
