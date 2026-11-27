import { BrandMark } from '../components/BrandMark';
import { ErrorPage } from '../components/ErrorPage';

export function ComingSoon() {
  return (
    <ErrorPage
      icon={<BrandMark />}
      eyebrow="Coming soon"
      title="Evoa is almost here."
      description="Strength, nutrition, and cycle-aware coaching. The full site opens soon."
      landmarkLabel="Coming soon"
      parityRoot="ComingSoon"
    />
  );
}
