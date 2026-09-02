import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NetworkProvider } from "./context/NetworkContext";
import AppRouter from "./router";
function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <BrowserRouter>
        <AppRouter />
        </BrowserRouter>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App;
