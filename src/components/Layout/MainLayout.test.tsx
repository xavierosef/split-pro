/** @jest-environment jsdom */

import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createMockRouter } from '~/tests/helpers/router';
import MainLayout from './MainLayout';

// The innermost span carrying the title is the label that changes colour.
const labelOf = (link: HTMLElement, title: string) =>
  [...link.querySelectorAll('span')].filter((span) => span.textContent === title).at(-1);

// Fork: the navigation is Expenses (the single group) / Activity / Account.
it('marks the active navigation section for nested routes', () => {
  renderWithProviders(
    <MainLayout title="Overview">
      <p>Content</p>
    </MainLayout>,
    {
      router: createMockRouter({ pathname: '/groups/[groupId]', asPath: '/groups/7' }),
    },
  );
  expect(screen.getByText('Content')).toBeInTheDocument();
  const expenses = screen.getAllByRole('link', { name: 'Expenses' });
  expect(expenses).toHaveLength(2);
  expenses.forEach((link) => {
    expect(link).toHaveAttribute('href', '/groups/1');
    expect(labelOf(link, 'Expenses')).toHaveClass('text-primary');
  });
  screen.getAllByRole('link', { name: 'Activity' }).forEach((link) => {
    expect(labelOf(link, 'Activity')).not.toHaveClass('text-primary');
  });
});
