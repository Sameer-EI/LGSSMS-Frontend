function reloadpage() {
  window.location.reload()
}
const Noconnection = () => {
  return (
    <div>
      <div className="hero bg-base-200 min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <i className="ri-wifi-off-fill"></i>
            <h1 className="text-5xl font-bold">No Internet</h1>
            <p className="py-6">
              Try checking your internet or wifi connection
            </p>
            <button className="btn bgTheme text-white w-24" onClick={reloadpage}>Retry</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Noconnection
