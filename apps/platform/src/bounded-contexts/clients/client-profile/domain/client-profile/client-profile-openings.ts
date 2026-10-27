export interface ClientProfileOpenings {
  open(admission: { clientId: string; at: Date }): Promise<void>;
}
