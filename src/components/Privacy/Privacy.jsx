import React from "react";
import { schoolConfig } from "../../config/schoolConfig";

const PrivacyPolicy = () => {
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        {/* 1. Privacy Policy */}
        <h1 className="text-3xl font-bold mb-4 textTheme">
          Privacy Policy – {schoolConfig.schoolName}
        </h1>

        <p className="mb-4">
          At <strong>{schoolConfig.schoolName}</strong>,
          we are committed to protecting the privacy and personal information of
          students, parents, staff, and visitors. This Privacy Policy explains
          how we collect, use, and safeguard your information when you visit our
          website or interact with our services.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 textTheme">
          Information We Collect
        </h2>
        <ul className="list-disc list-inside mb-4">
          <li>Student and parent names</li>
          <li>Contact details (phone number and email address)</li>
          <li>Admission and academic information</li>
          <li>Payment-related details (processed securely)</li>
          <li>Any information submitted through forms on our website</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2 textTheme">
          How We Use the Information
        </h2>
        <ul className="list-disc list-inside mb-4">
          <li>Process admissions and registrations</li>
          <li>Communicate academic and administrative updates</li>
          <li>Manage fees and payments</li>
          <li>Improve services and website experience</li>
          <li>Comply with legal and regulatory requirements</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2 textTheme">
          Data Protection
        </h2>
        <p className="mb-4">
          We take appropriate security measures to protect personal data from
          unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 textTheme">
          Third-Party Sharing
        </h2>
        <ul className="list-disc list-inside mb-4">
          <li>
            We do not sell or share personal information with third parties
          </li>
          <li>Information may be shared when required by law</li>
          <li>
            Shared with trusted service providers strictly for school-related
            operations
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2 textTheme">
          Changes to the Privacy Policy
        </h2>
        <p className="mb-6">
          {schoolConfig.schoolName} reserves the right to update this policy at any time. Any
          changes will be posted on this page.
        </p>

        <hr className="my-6" />

        {/* 2. Terms & Conditions */}
        <h1 className="text-2xl font-bold mb-4 textTheme">
          Terms & Conditions (Terms of Use)
        </h1>

        <p className="mb-4">
          By accessing and using the {schoolConfig.schoolName} website, you agree to comply with the
          following terms and conditions.
        </p>

        <h2 className="text-xl font-semibold mb-2 textTheme">Website Usage</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Website content is for informational purposes only</li>
          <li>Unauthorized use of content or images is prohibited</li>
          <li>Users must not misuse or disrupt website functionality</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 textTheme">
          Accuracy of Information
        </h2>
        <ul className="list-disc list-inside mb-4">
          <li>Information may not always be up to date</li>
          <li>{schoolConfig.schoolName} may modify content without prior notice</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 textTheme">
          Intellectual Property
        </h2>
        <p className="mb-4">
          All website content including text, images, logos, and designs are the
          property of {schoolConfig.schoolName}. Reuse without written permission is prohibited.
        </p>

        <h2 className="text-xl font-semibold mb-6 textTheme">
          Limitation of Liability
        </h2>
        <p className="mb-6">
          {schoolConfig.schoolName} shall not be held liable for any direct or indirect damages
          arising from website usage.
        </p>

        <hr className="my-6" />

        {/* 3. Contact Information */}
        <h1 className="text-2xl font-bold mb-4 textTheme">
          Contact Information
        </h1>

        <p className="mb-2">
          <strong>School Name:</strong> {schoolConfig.schoolName}
        </p>
        <p className="mb-2">
          <strong>Address:</strong> {schoolConfig.schoolAddress}
        </p>
        <p className="mb-2">
          <strong>Phone Number:</strong> {schoolConfig.schoolPhone}
        </p>
        <p className="mb-2">
          <strong>Email ID:</strong>{" "}
          <a href={`mailto:${schoolConfig.schoolEmail}`} className="textTheme underline">
            {schoolConfig.schoolEmail}
          </a>
        </p>
        {schoolConfig.googleMapsLink && (
          <p className="mb-6">
            <strong>Location:</strong>{" "}
            <a
              href={schoolConfig.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="textTheme underline"
            >
              View on Google Maps
            </a>
          </p>
        )}

        <hr className="my-6" />

        {/* 4. Fee Structure */}
        <h1 className="text-2xl font-bold mb-4 textTheme">
          Fee Structure / Pricing Policy
        </h1>

        <ul className="list-disc list-inside mb-6">
          <li>Fee structure is decided by school management</li>
          <li>Fees vary based on grade, facilities, and academic year</li>
          <li>Fees must be paid within due dates</li>
          <li>Late payments may attract penalties</li>
          <li>School reserves the right to revise fees with prior notice</li>
          <li>Detailed fee information is available at the school office</li>
        </ul>

        <hr className="my-6" />

        {/* 5. Refund Policy */}
        <h1 className="text-2xl font-bold mb-4 textTheme">Refund Policy</h1>

        <ul className="list-disc list-inside">
          <li>Admission fees are non-refundable</li>
          <li>Tuition fees are non-refundable after payment</li>
          <li>Refunds apply only for duplicate or administrative errors</li>
          <li>Approved refunds are processed within 15–30 working days</li>
        </ul>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
