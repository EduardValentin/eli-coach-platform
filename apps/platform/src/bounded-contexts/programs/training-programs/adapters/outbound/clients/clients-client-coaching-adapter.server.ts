import {
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  type ClientCoaching,
  type ClientCoachingFacts,
  type ClientCoachingPort,
  type EquipmentUpdate,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type {
  ClientCoachingDto,
  ClientCoachingFacade,
} from "~/bounded-contexts/clients/public/client-coaching-facade";

type CoachingFactsDto = NonNullable<ClientCoachingDto["coachingFacts"]>;

export class ClientsClientCoachingAdapter implements ClientCoachingPort {
  constructor(private readonly clientCoachingFacade: ClientCoachingFacade) {}

  async find(clientId: string): Promise<ClientCoaching> {
    return this.clientCoachingOf(
      await this.clientCoachingFacade.coachingOf(clientId),
    );
  }

  async saveEquipment({ clientId, equipment }: EquipmentUpdate): Promise<void> {
    const { status } = await this.clientCoachingFacade.saveEquipment({
      clientId,
      equipment: [...equipment],
    });

    // Every other outcome means her equipment was not written, so the start
    // must fail and its unit of work roll the program back with it.
    if (status !== "saved" && status !== "unchanged") {
      throw new Error(`The client's equipment was not saved: ${status}.`);
    }
  }

  private clientCoachingOf(coaching: ClientCoachingDto): ClientCoaching {
    const { coachingFacts } = coaching;

    return {
      answers:
        coaching.answersApproved && coachingFacts
          ? {
              status: "approved",
              coachingFacts: this.coachingFactsOf(coachingFacts),
            }
          : { status: "not-approved" },
      equipmentOptions: coaching.equipmentOptions.map((option) => ({
        value: option.equipment,
        exclusive: option.exclusive,
      })),
      goalOptions: [...coaching.primaryGoalOptions],
    };
  }

  private coachingFactsOf(facts: CoachingFactsDto): ClientCoachingFacts {
    return {
      goal: facts.primaryGoal,
      level: facts.level,
      trainingDays: this.optionOf(TRAINING_DAY_OPTIONS, facts.trainingDays),
      sessionMinutes: this.optionOf(
        SESSION_MINUTE_OPTIONS,
        facts.sessionMinutes,
      ),
      equipment: [...facts.equipment],
    };
  }

  private optionOf<Option extends number>(
    options: readonly Option[],
    value: number,
  ): Option {
    const option = options.find((candidate) => candidate === value);

    if (option === undefined) {
      throw new Error(
        `The client's coaching facts hold ${value}, outside ${options.join(", ")}.`,
      );
    }

    return option;
  }
}
