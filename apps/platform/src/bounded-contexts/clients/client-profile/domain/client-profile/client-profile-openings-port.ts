export interface ClientProfileOpeningsPort {
  open(admission: { clientId: string; at: Date }): Promise<void>;
}
