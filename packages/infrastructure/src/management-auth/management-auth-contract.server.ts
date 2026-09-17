type ManagementTransportPolicy = "any" | "https_required";

export type ManagementAuthConfig = {
  principalId: string;
  secret: string;
  transportPolicy: ManagementTransportPolicy;
};
