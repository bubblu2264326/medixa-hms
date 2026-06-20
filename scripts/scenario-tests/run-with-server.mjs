// Stage C — orchestrator: boot the prod server, run the scenario suite, tear down.
//
// One self-contained command so the live-server scenario run is atomic and
// leaves no orphaned `next start` process behind (Windows-safe teardown).
//
// Prereq: a production build exists (`pnpm build`). Reads env from .env.local.
// Usage: node scripts/scenario-tests/run-with-server.mjs
// Exit 0 = scenarios + invariants green.

import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.PORT || "3000";
const BASE = `http://localhost:${PORT}`;
const READY_PATH = "/api/public/system-timezone";
const isWin = process.platform === "win32";

function killTree(pid) {
  if (pid == null) return;
  try {
    if (isWin) {
      spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    /* already gone */
  }
}

async function waitForReady(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}${READY_PATH}`);
      if (res.ok || res.status === 401) return true; // any HTTP answer = server up
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  return false;
}

const main = async () => {
  console.log(`Booting production server on ${BASE} ...`);
  // Invoke the Next bin directly via node — avoids spawning a .cmd shim
  // (which throws spawn EINVAL on Windows) and keeps the process tree shallow.
  const nextBin = "node_modules/next/dist/bin/next";
  const server = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
      detached: !isWin, // own process group on POSIX so we can kill the tree
    }
  );

  let exitCode = 2;
  try {
    const ready = await waitForReady();
    if (!ready) {
      console.error("Server did not become ready in time.");
      return;
    }
    console.log("Server ready. Running scenario suite...\n");

    const run = spawnSync(
      process.execPath,
      ["--env-file=.env.local", "scripts/scenario-tests/run-scenarios.mjs"],
      { stdio: "inherit", env: { ...process.env, BASE_URL: BASE } }
    );
    exitCode = run.status ?? 2;
  } finally {
    console.log("\nTearing down server...");
    killTree(server.pid);
  }
  process.exit(exitCode);
};

main().catch((e) => {
  console.error("orchestrator error:", e.message);
  process.exit(2);
});
