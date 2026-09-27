import type { CoachingSalesWindow } from "./coaching-sales-window";

type BundlePageAvailability = { status: "open" } | { status: "closed" };

type OpenBundlePageUseCaseOptions = {
  salesWindow: CoachingSalesWindow;
};

export class OpenBundlePageUseCase {
  constructor(private readonly options: OpenBundlePageUseCaseOptions) {}

  async execute(): Promise<BundlePageAvailability> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    return { status: "open" };
  }
}
