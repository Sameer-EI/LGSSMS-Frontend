

const ErrorFallBack = () => {
  return (
     <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">Something went wrong, Try Again</p>
      </div>
  )
}

export default ErrorFallBack
