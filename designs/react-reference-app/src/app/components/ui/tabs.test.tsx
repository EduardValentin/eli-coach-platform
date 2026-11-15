import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function SegmentedTabs({ withList }: { withList: 'shown' | 'absent' }) {
  return (
    <Tabs defaultValue="upcoming" variant="segmented">
      {withList === 'shown' && (
        <TabsList aria-label="Call status">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      )}
      <TabsContent value="upcoming" labelWithoutTabs="Upcoming">
        Two upcoming calls
      </TabsContent>
    </Tabs>
  );
}

describe('segmented tabs', () => {
  it('pads each tab narrower below the small breakpoint', () => {
    // arrange
    // act
    render(<SegmentedTabs withList="shown" />);

    // assert
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveClass('px-4', 'sm:px-5');
  });

  it('draws its bar inside the soft control border', () => {
    // arrange
    // act
    render(<SegmentedTabs withList="shown" />);

    // assert
    expect(screen.getByRole('tablist')).toHaveClass('border', 'border-control-border-soft');
  });

  it('names its panel by the selected tab while the tabs are shown', () => {
    // arrange
    // act
    render(<SegmentedTabs withList="shown" />);

    // assert
    const panel = screen.getByRole('tabpanel', { name: 'Upcoming' });
    expect(document.getElementById(panel.getAttribute('aria-labelledby') ?? '')).toBe(screen.getByRole('tab', { name: 'Upcoming' }));
  });

  it('names its panel by its own label while the tabs are absent', () => {
    // arrange
    // act
    render(<SegmentedTabs withList="absent" />);

    // assert
    const panel = screen.getByRole('tabpanel', { name: 'Upcoming' });
    expect(panel).not.toHaveAttribute('aria-labelledby');
  });
});
