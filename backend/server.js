import app from './src/app.js';
import { loadEnv } from "./config/loadEnv.js";
loadEnv();

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${API_PORT}...`));
