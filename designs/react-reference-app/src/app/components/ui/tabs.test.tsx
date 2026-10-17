import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('segmented tabs', () => {
  it('pads each tab narrower below the small breakpoint', () => {
    // arrange
    // act
    render(
      <Tabs defaultValue="upcoming" variant="segmented">
        <TabsList aria-label="Call status">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">Two upcoming calls</TabsContent>
      </Tabs>,
    );

    // assert
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveClass('px-4', 'sm:px-5');
  });
});
