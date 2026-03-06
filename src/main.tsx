import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializePaddle } from "@paddle/paddle-js";

/*
// Initialize Paddle.js
initializePaddle({
  environment: "sandbox",
  token: "YOUR_PADDLE_CLIENT_SIDE_TOKEN",
}).then((paddle) => {
  if (paddle) {
    console.log("Paddle.js loaded!", paddle);
  }
});
*/

createRoot(document.getElementById("root")!).render(<App />);
