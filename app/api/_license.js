/**
 * License helpers (disabled).
 *
 * This project no longer enforces license checks. These stubs keep
 * API routes compatible without requiring activation.
 */

export async function getLicenseStatus() {
  return {
    verified: true,
    purchase_code_set: true,
    buyer: "",
    item_name: "",
    verified_at: new Date().toISOString(),
  };
}

export async function activateLicense() {
  return { success: true, message: "License check disabled." };
}

export function deactivateLicense() {
  // no-op
}

export function requireLicense(handler) {
  return async function (request, context) {
    return handler(request, context);
  };
}
