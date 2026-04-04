/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { Badge, Button, EmptyState, Input } from '@/components/ui';

describe('UI primitives', () => {
  it('renders EmptyState with title, description, and optional action', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">icon</span>}
        title="Nothing here"
        description="Add something to get started."
        action={<button type="button">Create</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Add something to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders Badge with variant class for success', () => {
    const { container } = render(<Badge variant="success">Live</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveTextContent('Live');
    expect(badge?.className).toMatch(/green/);
  });

  it('forwards click and label on Button', () => {
    const onClick = jest.fn();
    render(
      <Button variant="secondary" onClick={onClick}>
        Save draft
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders Input with associated label', () => {
    render(<Input id="email-field" label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'you@example.com');
  });
});
