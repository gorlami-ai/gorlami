import { useEffect } from "react";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import "./App.css";

function App() {
  useEffect(() => {
    // This is a menu bar app, minimal UI
    // The main functionality is handled by the Rust backend
  }, []);

  return <ProcessingOverlay />;
}

export default App;