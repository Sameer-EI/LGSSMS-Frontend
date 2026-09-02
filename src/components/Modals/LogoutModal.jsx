import React from "react";

const LogoutModal = ({ show, onConfirm, onClose, isLoading }) => {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${
        show ? "" : "hidden"
      } bg-black/30 backdrop-blur-sm dark:bg-black/60`}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-[80%] max-w-xl h-auto max-h-[80vh] p-6 border border-gray-200 dark:border-gray-700 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="text-4xl text-center textTheme dark:text-white">
          Logout
        </h1>
        <p className="text-center text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to logout?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            className="btn btnThemeOutline w-full"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="btn bgTheme text-white w-full"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>
            )}
            {isLoading ? "" : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
