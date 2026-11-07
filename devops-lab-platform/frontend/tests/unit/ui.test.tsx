import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { applyTheme, toggleTheme, getStoredTheme } from '@/lib/theme';

describe('Button', () => {
  it('renders children and forwards clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start lab</Button>);
    const btn = screen.getByRole('button', { name: 'Start lab' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and non-clickable while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Check</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn).catch(() => {});
    expect(onClick).not.toHaveBeenCalled();
    expect(btn.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('applies the danger variant and sm size classes', () => {
    render(<Button variant="danger" size="sm">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('bg-danger');
    expect(btn.className).toContain('h-8');
  });
});

describe('Badge', () => {
  it('renders the default variant with a status dot', () => {
    render(<Badge variant="success" dot>Passed</Badge>);
    const badge = screen.getByText('Passed');
    expect(badge.className).toContain('text-success');
    expect(badge.querySelector('span')).toBeTruthy();
  });

  it('omits the dot when not requested', () => {
    render(<Badge>Plain</Badge>);
    expect(screen.getByText('Plain').querySelector('span')).toBeNull();
  });
});

describe('Card', () => {
  it('adds interactive hover affordance only when interactive', () => {
    const { rerender } = render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId('c').className).not.toContain('cursor-pointer');
    rerender(<Card data-testid="c" interactive>x</Card>);
    expect(screen.getByTestId('c').className).toContain('cursor-pointer');
  });

  it('CardHeader renders title, sub and action', () => {
    render(<CardHeader title="History" sub="Last 12 weeks" action={<button>Action</button>} />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('Last 12 weeks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});

describe('ProgressBar / ProgressRing', () => {
  it('progressbar exposes aria values', () => {
    render(<ProgressBar value={40} label="CKA progress" />);
    const pb = screen.getByRole('progressbar', { name: 'CKA progress' });
    expect(pb).toHaveAttribute('aria-valuenow', '40');
  });

  it('ring shows the centered percent child', () => {
    render(<ProgressRing value={72}><span>72%</span></ProgressRing>);
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72');
  });

  it('clamps out-of-range values', () => {
    render(<ProgressBar value={140} label="clamped" />);
    expect(screen.getByRole('progressbar', { name: 'clamped' })).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('EmptyState', () => {
  it('renders icon, title, description and action', () => {
    render(
      <EmptyState
        icon={<span>🃏</span>}
        title="No submissions yet"
        description="Pass your first lab."
        action={<button>Retry</button>}
      />
    );
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
    expect(screen.getByText('Pass your first lab.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('marks the active tab with aria-selected and fires onChange', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        ariaLabel="Filter"
        active="all"
        onChange={onChange}
        items={[{ id: 'all', label: 'All' }, { id: 'passed', label: 'Passed' }]}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(tabs[1]);
    expect(onChange).toHaveBeenCalledWith('passed');
  });
});

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}>hidden</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as an aria-modal dialog and closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm"><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Body')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton', () => {
  it('renders with an aria-hidden pulse', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('w-10');
  });
});

describe('theme', () => {
  it('applyTheme persists to localStorage and the data-theme attribute', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('ops-theme')).toBe('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('toggleTheme flips the attribute and returns the new theme', () => {
    applyTheme('dark');
    expect(toggleTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(toggleTheme()).toBe('dark');
  });
});
