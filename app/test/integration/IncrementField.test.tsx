import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '~/test/utils/render';
import { IncrementField } from '~/components/strength/IncrementField';

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

function renderField(
  value: number | null,
  onChange: (v: number | null) => void = () => {},
  opts: { loadUnit?: 'kg' | 'sec'; disabled?: boolean } = {},
) {
  return renderWithProviders(
    <IncrementField
      value={value}
      loadUnit={opts.loadUnit ?? 'kg'}
      onChange={onChange}
      disabled={opts.disabled}
    />,
  );
}

describe('IncrementField', () => {
  beforeEach(() => {
    toastError.mockReset();
  });

  it('is collapsed by default', () => {
    renderField(null);
    // The actual input should not be visible initially
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('expands on trigger click', async () => {
    const user = userEvent.setup();
    renderField(null);

    await user.click(screen.getByRole('button', { name: /advanced/i }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange with numeric value on valid input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(null, onChange);

    await user.click(screen.getByRole('button', { name: /advanced/i }));
    await user.type(screen.getByRole('textbox'), '2.5');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('accepts comma as a decimal separator', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(null, onChange);

    await user.click(screen.getByRole('button', { name: /advanced/i }));
    await user.type(screen.getByRole('textbox'), '2,5');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('calls onChange(null) when input is cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(5, onChange);

    await user.click(screen.getByRole('button', { name: /advanced/i }));
    await user.clear(screen.getByRole('textbox'));
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange(null) when input value is 0 or negative', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField(null, onChange);

    await user.click(screen.getByRole('button', { name: /advanced/i }));
    await user.type(screen.getByRole('textbox'), '0');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(null);
    expect(toastError).toHaveBeenCalled();
  });

  it('shows unit suffix "kg" for kg loadUnit', async () => {
    const user = userEvent.setup();
    renderField(null, undefined, { loadUnit: 'kg' });

    await user.click(screen.getByRole('button', { name: /advanced/i }));

    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'decimal');
  });

  it('shows unit suffix "s" for sec loadUnit', async () => {
    const user = userEvent.setup();
    renderField(null, undefined, { loadUnit: 'sec' });

    await user.click(screen.getByRole('button', { name: /advanced/i }));

    expect(screen.getByText('s')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'decimal');
  });

  it('shows increment chip above trigger when value is non-null', () => {
    renderField(2.5);

    expect(screen.getByTestId('increment-chip')).toBeInTheDocument();
  });

  it('does not show chip when value is null', () => {
    renderField(null);

    expect(screen.queryByTestId('increment-chip')).not.toBeInTheDocument();
  });

  it('disables input when disabled prop is true', async () => {
    const user = userEvent.setup();
    renderField(null, undefined, { disabled: true });

    // Trigger should be disabled
    expect(screen.getByRole('button', { name: /advanced/i })).toBeDisabled();
  });
});
