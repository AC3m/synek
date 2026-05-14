import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandingSection } from '~/components/landing/shared/LandingSection';

describe('LandingSection', () => {
  it('renders a <section> element by default', () => {
    const { container } = render(<LandingSection>content</LandingSection>);
    expect(container.querySelector('section')).not.toBeNull();
  });

  it('forwards id to the element', () => {
    render(<LandingSection id="features">x</LandingSection>);
    expect(document.getElementById('features')).not.toBeNull();
  });

  it('renders children', () => {
    render(<LandingSection>hello section</LandingSection>);
    expect(screen.getByText('hello section')).toBeInTheDocument();
  });

  it('applies max-w-6xl by default', () => {
    const { container } = render(<LandingSection>x</LandingSection>);
    const inner = container.querySelector('[class*="max-w-6xl"]');
    expect(inner).not.toBeNull();
  });

  it('applies max-w-5xl when maxWidth="5xl"', () => {
    const { container } = render(<LandingSection maxWidth="5xl">x</LandingSection>);
    expect(container.querySelector('[class*="max-w-5xl"]')).not.toBeNull();
  });

  it('skips inner container when maxWidth="none"', () => {
    const { container } = render(<LandingSection maxWidth="none">x</LandingSection>);
    expect(container.querySelector('[class*="max-w-"]')).toBeNull();
  });

  it('accepts className and merges onto outer element', () => {
    const { container } = render(<LandingSection className="custom-test-class">x</LandingSection>);
    expect(container.querySelector('.custom-test-class')).not.toBeNull();
  });

  it('renders as <div> when as="div"', () => {
    const { container } = render(<LandingSection as="div">x</LandingSection>);
    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
  });
});
