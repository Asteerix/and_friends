#!/usr/bin/env node

/**
 * This script is used to reset the project to a blank state.
 * It deletes or moves the /app, /components, /hooks, /scripts, and /constants directories to /app-example based on user input and creates a new /app directory with an index.tsx and _layout.tsx file.
 * You can remove the `reset-project` script from package.json and safely delete this file after running it.
 */

const { execSync } = require("child_process");
const readline = require("readline");

console.log(
  "\n⚠️  WARNING: This will RESET your Supabase database and apply all migrations. ALL DATA WILL BE LOST."
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Are you sure you want to reset the remote database? This is DESTRUCTIVE. (y/N): ",
  (answer) => {
    if (answer.trim().toLowerCase() === "y") {
      try {
        console.log("\nRunning: supabase db reset --linked ...");
        execSync("supabase db reset --linked", { stdio: "inherit" });
        console.log("\nRunning: supabase db push ...");
        execSync("supabase db push", { stdio: "inherit" });
        console.log("\n✅ Database reset and migrations applied.");
      } catch (err) {
        console.error("\n❌ Error during reset:", err.message);
        process.exit(1);
      }
    } else {
      console.log("Aborted. No changes made.");
    }
    rl.close();
  }
);
