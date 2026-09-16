import type {
  ManagementAuthenticationResult,
  ManagementAuthenticator,
  ManagementCredentials,
} from "@eli-coach-platform/domain/shared";

export class AllowAllManagementAuthenticator implements ManagementAuthenticator {
  async authenticate(
    _credentials: ManagementCredentials,
  ): Promise<ManagementAuthenticationResult> {
    return {
      status: "authenticated",
      principal: { id: "test-principal", kind: "machine" },
    };
  }
}
