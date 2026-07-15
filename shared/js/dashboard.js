import { authManager } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  await authManager.init();
  if (!authManager.configured) location.href = "auth.html?next=dashboard.html&reason=backend";
  else if (!authManager.authenticated) location.href = "auth.html?next=dashboard.html";
  else location.href = authManager.routeForRole();
});
