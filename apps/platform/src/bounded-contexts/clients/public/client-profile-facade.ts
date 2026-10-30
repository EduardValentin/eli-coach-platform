export type ClientProfileOpeningDto = {
  clientId: string;
  openedAt: string;
};

export interface ClientProfileFacade {
  openClientProfile(dto: ClientProfileOpeningDto): Promise<void>;
}
