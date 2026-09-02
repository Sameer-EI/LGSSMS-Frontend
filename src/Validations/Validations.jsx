// // /------------------------------------Login form validations---------------------------------------------/

// -----------------------------------------Email--------------------------------------------------------------
export const validloginemail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required.";
    if (!emailRegex.test(email)) return "Enter a valid email address.";
    return "";
};

// -------------------------------------------Password----------------------------------------------------------/
export const validloginpassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
};

// // /------------------------------------Register form validations---------------------------------------------/

// -------------------------------------------First Name----------------------------------------------------------
export const validfirstname = (firstName) => {
    if (!firstName) return "First name is required";
    if (firstName.length < 3) return "First name must be at least 3 characters";
    if (firstName.length > 20) return "First name must be less than 20 characters";
    const firstnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!firstnameRegex.test(firstName)) {
        return "First name can only contain letters, spaces, apostrophes, or hyphens";
    }
    return "";
}

// -------------------------------------------------Last Name-------------------------------------------------------
export const validlastname = (lastName) => {
    if (!lastName) return "Last name is required";
    if (lastName.length < 3) return "Last name must be at least 3 characters";
    if (lastName.length > 30) return "Last name must be less than 30 characters";
    const lastnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!lastnameRegex.test(lastName)) {
        return "Last name can only contain letters, spaces, apostrophes, or hyphens";
    }
    return "";
}

// --------------------------------------------------Email----------------------------------------------------------
export const validregisteremail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address (e.g., username@example.com).";
    return "";
};

// --------------------------------------------------Role----------------------------------------------------------
export const validregisterrole = (roleId) => {
    if (!roleId) return "Please select a role";
    return ""
};

// -------------------------------------------------Password-----------------------------------------------------------
export const validregisterpassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!password) return "Password is required";
    if (!passwordRegex.test(password)) {
        return "Password must be minimum eight characters, at least one letter, one number and one special character";
    }
    return "";
}


// // /------------------------------------Admission form validations---------------------------------------------/
// ----------------------------------------------Student Information-------------------------------------------------
// -------------------------------------------Student First Name---------------------------------------------------
export const validStudentFirstName = (student_first_name) => {
    if (!student_first_name) return "Student's first name is required";
    if (student_first_name.length < 3) return "First name must be at least 3 characters";
    if (student_first_name.length > 20) return "First name must be less than 20 characters";
    const firstnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!firstnameRegex.test(student_first_name)) return "First name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};



// -------------------------------------------Student Last Name----------------------------------------------------
export const validStudentLastName = (student_last_name) => {
    if (!student_last_name) return "Student's last name is required";
    if (student_last_name.length < 3) return "Last name must be at least 3 characters";
    if (student_last_name.length > 30) return "Last name must be less than 30 characters";
    const lastnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!lastnameRegex.test(student_last_name)) return "Last name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};

// -------------------------------------------Student Email---------------------------------------------------------
export const validStudentEmail = (student_email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!student_email) return "Student email is required";
    if (!emailRegex.test(student_email)) return "Enter a valid student email address";
    return "";
};

// -------------------------------------------Student Password------------------------------------------------------
export const validStudentPassword = (student_password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!student_password) return "Student password is required";
    if (!passwordRegex.test(student_password)) return "Password must be at least 8 characters, include one letter, one number, and one special character";
    return "";
};

// ------------------------------------------- Student Date of Birth-------------------------------------------------------
export const validDOB = (student_date_of_birth) => {
    if (!student_date_of_birth) return "Date of Birth is required";
    const dobDate = new Date(student_date_of_birth);
    const now = new Date();
    if (student_date_of_birth >= now) return "Date of Birth must be in the past";
    return "";
};

// ------------------------------------------- Student Gender-------------------------------------------------------
export const validgender = (gender) => {
    if (!gender) return "gender is required"
    return ""
}


// -------------------------------------------Guardian Father Name-------------------------------------------------------
export const validGuardianFatherName = (guardian_Father_name) => {
    if (!guardian_Father_name) return "Father's name is required";
    if (guardian_Father_name.length < 3) return "Father's name must be at least 3 characters";
    if (guardian_Father_name.length > 50) return "Father's name must be less than 50 characters";
    const firstNameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!firstNameRegex.test(guardian_Father_name)) return "Name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};


// -------------------------------------------Guardian Mother Name-------------------------------------------------------
export const validGuardianMotherName = (guardian_mother_name) => {
    if (!guardian_mother_name) return "Mother's name is required";
    if (guardian_mother_name.length < 3) return "Mother's name must be at least 3 characters";
    if (guardian_mother_name.length > 50) return "Mother's name must be less than 50 characters";
    const middlenameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!middlenameRegex.test(guardian_mother_name)) return "Name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};

// ------------------------------------------- Religion-------------------------------------------------------
export const validReligion = (Religion) => {
    if (!Religion) return "Religion is required"
    return ""
}

// ------------------------------------------- Category-------------------------------------------------------
export const validCategory = (Category) => {
    if (!Category) return "Category is required"
    return ""
}

// ------------------------------------------Guardian Information-------------------------------------------------

// -------------------------------------------Guardian First Name-------------------------------------------------------
export const validGuardianFirstName = (guardian_first_name) => {
    if (!guardian_first_name) return "Guardian's name is required";
    if (guardian_first_name.length < 3) return "Guardian's name must be at least 3 characters";
    if (guardian_first_name.length > 50) return "Guardian's name must be less than 50 characters";
    const firstNameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!firstNameRegex.test(guardian_first_name)) return "Name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};
// -------------------------------------------Guardian last Name-------------------------------------------------------
export const validGuardianlastName = (guardian_last_name) => {
    if (!guardian_last_name) return "Guardian's name is required";
    if (guardian_last_name.length < 3) return "Guardian's name must be at least 3 characters";
    if (guardian_last_name > 50) return "Guardian's name must be less than 50 characters";
    const lastnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!lastnameRegex.test(guardian_last_name)) return "Name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};


// -------------------------------------------Guardian Email-------------------------------------------------------
export const validGuardianEmail = (guardian_email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!guardian_email) return "Guardian email is required";
    if (!emailRegex.test(guardian_email)) return "Enter a valid guardian email address";
    return "";
};

// -------------------------------------------Guardian Password----------------------------------------------------
export const validGuardianPassword = (guardian_password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!guardian_password) return "Guardian password is required";
    if (!passwordRegex.test(guardian_password)) return "Password must be at least 8 characters, include one letter, one number, and one special character";
    return "";
};
// -------------------------------------------Guardian Type -------------------------------------------------------
export const ValidGuardianType = (GuardianType) => {
    if (!GuardianType) return "Guardian Type is required"
    return ""
}

// -------------------------------------------Guardian Mobile Number-------------------------------------------------------
export const validMobileNumber = (guardian_phone_no) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!guardian_phone_no) return "Mobile number is required";
    if (!mobileRegex.test(guardian_phone_no)) return "Enter a valid 10-digit Indian mobile number starting with 6-9";
    return "";
};


// ----------------------------------------------Academic Information-------------------------------------------------
// -------------------------------------------------Admission date-----------------------------------------------------------

export const validadmissiondate = (admission_date) => {
    if (!admission_date) return "Admission Date is required"
    return ""
}

// -------------------------------------------------TC letter-----------------------------------------------------------

export const validtc = (tc_letter) => {
    if (!tc_letter) return "TC letter is required"
    return ""
}
// -------------------------------------------Emergency Mobile Number-------------------------------------------------------
export const validEmergencyNumber = (Emergency_Number) => {
    if (!Emergency_Number) return "Emergency Contact number is required";
    return "";
};

// -------------------------------------------------Residental Address-----------------------------------------------------------

// -------------------------------------------------Habitation-----------------------------------------------------------

export const validHabitation = (Habitation) => {
    if (!Habitation) return "Habitation is required"

    return ""
}
// -------------------------------------------------District-----------------------------------------------------------

export const validDistrict = (District) => {
    if (!District) return "District is required"
    return ""
}


// -------------------------------------------------State-----------------------------------------------------------

export const validState = (State) => {
    if (!State) return "State is required"
    return ""
}
// -------------------------------------------------Pin Code-----------------------------------------------------------

export const validPinCode = (Pin_Code) => {
    if (!Pin_Code) return "Pin Code is required"
    if (Pin_Code.length < 6) return "Enter a 6 digits valid Pin Code";
    if (Pin_Code.length > 6) return "Enter a 6 digits valid Pin Code";


    return ""
}
// -------------------------------------------Bank Account Details-------------------------------------------------------

// -------------------------------------------Account Holder Name-------------------------------------------------------
export const validAccountHolderName = (Account_Holder_Name) => {
    if (!Account_Holder_Name) return "Account Holder name is required";
    if (Account_Holder_Name.length < 3) return "Account Holder name must be at least 3 characters";
    if (Account_Holder_Name.length > 50) return "Account Holder name must be less than 50 characters";
    const AccountnameRegex = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/;
    if (!AccountnameRegex.test(Account_Holder_Name)) return "Name can only contain letters, spaces, apostrophes, or hyphens";
    return "";
};

// -------------------------------------------------Account Number-----------------------------------------------------------

export const validAccountNumber = (Account_Number) => {
    if (!Account_Number) return "Account Number is required"
    if (Account_Number.length > 18 ) return "Invalid Account Number Must be 9-18 digits"
    if (Account_Number.length < 9 ) return "Invalid Account Number Must be 9-18 digits"
    return ""
}

// -------------------------------------------------Bank Name-----------------------------------------------------------

export const validBankName = (Bank_Name) => {
    if (!Bank_Name) return "Bank Name is required"
    return ""
}

// -------------------------------------------------IFSC Code-----------------------------------------------------------

export const validIFSCcode = (IFSC_code) => {
    if (!IFSC_code) return "IFSC Code is required"
    if (IFSC_code <11) return "Invalid IFSC Code"
    if (IFSC_code >11) return "Invalid IFSC Code"
    return ""
}


// -----------------------------------------------Change Password validation-------------------------------------------------

// ---------------------------------------------------------current password-----------------------------------------------------------

export const validCurrentPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!password) return "Current password is required."
    if (!passwordRegex.test(password)) return "Password must be at least 8 characters, include one letter, one number, and one special character"
    return ""
};





// -------------------------------------------------Reset Password-----------------------------------------------------------
// -----------------------------------------------------Email-----------------------------------------------------------

export const validResetEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return ("Enter a valid email address");
    return "";
}

// -------------------------------------------------------Otp-----------------------------------------------------------

export const validOtp = (otp) => {
    if (!otp) return "OTP is required";
    return "";

}
// ---------------------------------------------------new password------------------------------------------------------



export const validNewPassword = (newpassword) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!newpassword) return "New Password is required";
    if (!passwordRegex.test(newpassword)) return "Password must be at least 8 characters, include one letter, one number, and one special character";
    return "";
};



// -------------------------------------------------confirm password------------------------------------------------------------

export const validConfirmPassword = (newPassword, confirmPassword) => {
    if (!confirmPassword) return "Confirm password is required.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return "";
};


// -------------------------------------------------Forget Password-----------------------------------------------------------
// -----------------------------------------------------Email-----------------------------------------------------------

// -----------------------------------------------------Discount Validations-----------------------------------------------------------

// export const validAdmissionFeeDiscount = (value) => {
//     if (!value) return true;
//     const num = Number(value);
//     if (num < 0 || isNaN(num)) return "Enter a valid admission fee discount";
//     return true;
// };

// export const validTuitionFeeDiscount = (value) => {
//     if (!value) return true;
//     const num = Number(value);
//     if (num < 0 || isNaN(num)) return "Enter a valid tuition fee discount";
//     return true;
// };

// export const validDiscountReason = (value) => {
//     if (value.trim().length < 5) return "Reason must be at least 10 characters";
//     return true;
// };
