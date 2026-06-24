import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.js';

describe('App', () => {
  it('renders and increments the amount (behavior, not implementation)', () => {
    render(<App />);
    expect(screen.getByLabelText('amount').textContent).toBe('USD 19.99');
    fireEvent.click(screen.getByText('+$1'));
    expect(screen.getByLabelText('amount').textContent).toBe('USD 20.99');
  });
});
