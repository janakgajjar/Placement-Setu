
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function TestMessage() {
  return <h1>Placement Setu Testing</h1>;
}

describe('Frontend testing setup', () => {
  it('renders the Placement Setu test message', () => {
    render(<TestMessage />);

    expect(
      screen.getByRole('heading', { name: 'Placement Setu Testing' })
    ).toBeInTheDocument();
  });
});
