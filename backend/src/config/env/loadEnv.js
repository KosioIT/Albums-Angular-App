import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import path from "path";

export function loadEnv() {
  const envFile =
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env";

  const envPath = path.resolve(process.cwd(), envFile);

  const env = dotenv.config({ path: envPath });
  dotenvExpand.expand(env);

  console.log(`Loaded environment: ${envFile}`);
}
