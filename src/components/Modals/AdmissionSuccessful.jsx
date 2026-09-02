import React from "react";

const AdmissionSuccessful = ({ handleCloseOnly, handleCloseAndNavigate }) => {
    return (
        <div className="modal modal-open bg-black/30 backdrop-blur-sm">
            <div className="modal-box text-center">
                <h3 className="font-bold text-2xl mb-4">Admission Successful!</h3>
                <i className="fa-regular fa-circle-check text-green-500 text-5xl mb-4"></i>
                <p className="mb-6 text-gray-600">
                    Your admission form has been submitted successfully.
                </p>
                <div className="flex flex-col gap-3 justify-center px-4 md:flex-row md:items-center">
                    <button
                        className="btn border border-gray-400 text-gray-600 bg-transparent hover:bg-gray-100 min-w-[200px] text-sm"
                        onClick={handleCloseOnly}
                    >
                        OK
                    </button>
                    <button
                        className="btn text-gray-600 bg-gray-100 hover:opacity-90 min-w-[200px] text-sm"
                        onClick={handleCloseAndNavigate}
                    >
                        Go to Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdmissionSuccessful;
