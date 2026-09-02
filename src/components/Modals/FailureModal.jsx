// FailureModal.js
import React, { forwardRef, useImperativeHandle, useRef } from "react";

export const FailureModal = forwardRef((props, ref) => {
  const dialogRef = useRef();

  useImperativeHandle(ref, () => ({
    show: () => dialogRef.current.showModal()
  }));

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box border border-red-500 text-center">
        <h3 className="font-bold text-lg text-red-600">Failure</h3>
        <p className="py-4 text-gray-700">Something went wrong.</p>
        <div className="modal-action justify-center">
          <form method="dialog">
            <button className="btn btn-error">Close</button>
          </form>
        </div>
      </div>
    </dialog>
  );
});