import type {
  ClientCoaching,
  ReadClientCoachingUseCase,
  SaveClientEquipmentUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-coaching";
import type {
  ClientCoachingDto,
  ClientCoachingFacade,
  ClientEquipmentSaveDto,
  ClientEquipmentSaveOutcomeDto,
} from "~/bounded-contexts/clients/public/client-coaching-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type ClientCoachingFacadeAdapterOptions = {
  readClientCoachingUseCase: ReadClientCoachingUseCase;
  saveClientEquipmentUseCase: SaveClientEquipmentUseCase;
  unitOfWork: UnitOfWork;
};

export class ClientCoachingFacadeAdapter implements ClientCoachingFacade {
  constructor(private readonly options: ClientCoachingFacadeAdapterOptions) {}

  async coachingOf(clientId: string): Promise<ClientCoachingDto> {
    return this.coachingDtoOf(
      await this.options.unitOfWork(() =>
        this.options.readClientCoachingUseCase.execute(clientId),
      ),
    );
  }

  async saveEquipment({
    clientId,
    equipment,
  }: ClientEquipmentSaveDto): Promise<ClientEquipmentSaveOutcomeDto> {
    const { status } = await this.options.unitOfWork(() =>
      this.options.saveClientEquipmentUseCase.execute({ clientId, equipment }),
    );

    return { status };
  }

  private coachingDtoOf(coaching: ClientCoaching): ClientCoachingDto {
    const { facts } = coaching;

    return {
      clientId: coaching.clientId,
      answersApproved: coaching.answersApproved,
      coachingFacts: facts && {
        primaryGoal: facts.primaryGoal,
        level: facts.level,
        trainingDays: facts.trainingDays,
        sessionMinutes: facts.sessionMinutes,
        equipment: [...facts.equipment],
        trainingPlace: facts.trainingPlace,
        limitations: facts.limitations,
      },
      equipmentOptions: coaching.equipmentOptions.map((option) => ({
        equipment: option.equipment,
        exclusive: option.exclusive,
      })),
      primaryGoalOptions: [...coaching.primaryGoalOptions],
    };
  }
}
