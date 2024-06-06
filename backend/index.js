import dotenv from "dotenv";
import { app } from "./app.js";
import { connectDB } from "./db/index.js";

// config environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`⚙️ Server is running at port : ${PORT}`);
  connectDB();
});
