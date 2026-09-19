export type FeatureFlagSet = Record<string, boolean>;

export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

type FeatureFlagProps = {
  id: number;
  name: string;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class FeatureFlag {
  readonly id: number;
  readonly name: string;
  readonly enabled: boolean;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: FeatureFlagProps) {
    this.id = props.id;
    this.name = props.name;
    this.enabled = props.enabled;
    this.description = props.description;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: FeatureFlagProps): FeatureFlag {
    return new FeatureFlag(props);
  }

  static toSet(flags: readonly FeatureFlag[]): FeatureFlagSet {
    return Object.fromEntries(flags.map((flag) => [flag.name, flag.enabled]));
  }
}
