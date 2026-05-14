import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandingField } from '~/components/landing/primitives/LandingField';

describe('LandingField', () => {
  it('renders label text', () => {
    render(<LandingField id="name" label="Full name" />);
    expect(screen.getByText('Full name')).toBeInTheDocument();
  });

  it('label htmlFor matches id', () => {
    render(<LandingField id="email" label="Email" />);
    const label = screen.getByText('Email') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe('email');
  });

  it('renders <input> by default', () => {
    const { container } = render(<LandingField id="x" label="X" />);
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('renders <textarea> when multiline=true', () => {
    const { container } = render(<LandingField id="msg" label="Message" multiline />);
    expect(container.querySelector('textarea')).not.toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('passes type to input', () => {
    const { container } = render(<LandingField id="em" label="Email" type="email" />);
    expect(container.querySelector('input')?.getAttribute('type')).toBe('email');
  });

  it('shows error message when error prop given', () => {
    render(<LandingField id="x" label="X" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('no alert when no error', () => {
    render(<LandingField id="x" label="X" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('input has correct id', () => {
    const { container } = render(<LandingField id="my-input" label="My" />);
    expect(container.querySelector('#my-input')).not.toBeNull();
  });

  it('passes placeholder to input', () => {
    render(<LandingField id="x" label="X" placeholder="Enter here" />);
    expect(screen.getByPlaceholderText('Enter here')).toBeInTheDocument();
  });
});
