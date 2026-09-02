export const Unauthorized = () => {
  return (
    <div className="hero">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <i className="ri-lock-password-line text-5xl text-primary"></i>
          <h1 className="text-5xl font-bold">Access Restricted</h1>
          <p className="py-6">
            Oops! This area is off-limits. <br />
            Please check your credentials or contact support if you believe this is an error.
          </p>
          {/* <button className="btn btn-primary mt-4">
            Return to Safety
          </button> */}
        </div>
      </div>
    </div>
  );
};