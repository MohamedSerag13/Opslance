import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Courses from '@/pages/Courses';
import CourseCard from '@/components/courses/CourseCard';
import TickCheckbox from '@/components/courses/TickCheckbox';
import { ToastProvider } from '@/components/ui';
import type { CourseSummary } from '@/pages/courses-types';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '@/api/client';
const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const CKA: CourseSummary = {
  id: 'cka-8-weeks',
  slug: 'cka-8-weeks',
  title: 'CKA in 8 Weeks',
  subtitle: 'exam-ready by Dec 25, 2026',
  author: '@mohamed',
  difficulty: 'advanced',
  exam_domain: 'CKA',
  duration_weeks: 8,
  hours_per_week: 14,
  pass_mark: 66,
  cover_color: 'primary',
  tags: ['kubernetes', 'cka'],
  weeks_count: 8,
  enrollment_pct: 12,
};

describe('CourseCard', () => {
  it('renders title, stats strip and progress', () => {
    render(
      <MemoryRouter>
        <CourseCard course={CKA} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'CKA in 8 Weeks' })).toBeTruthy();
    expect(screen.getByText(/📅 8 weeks/)).toBeTruthy();
    expect(screen.getByText(/⏱ 14 h\/week/)).toBeTruthy();
    expect(screen.getByText(/🎯 Pass mark 66%/)).toBeTruthy();
    expect(screen.getByText('12%')).toBeTruthy();
  });
});

describe('TickCheckbox', () => {
  it('calls onToggle with the tick type when clicked', async () => {
    const onToggle = vi.fn();
    const { container } = render(
      <TickCheckbox
        item={{ tick: 'read', text: 'Ch 4 Common kubectl Commands' }}
        checked={false}
        onToggle={onToggle}
      />,
    );
    const box = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    box.click();
    expect(onToggle).toHaveBeenCalledWith('read', true);
  });
});

describe('Courses catalog page', () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
  });

  it('renders the catalog with one card per course', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [CKA, { ...CKA, id: 'linux-fundamentals', slug: 'linux-fundamentals', title: 'Linux Fundamentals', difficulty: 'beginner', exam_domain: 'Linux', duration_weeks: 15, hours_per_week: 6, pass_mark: null, cover_color: 'success', tags: ['linux'] }] });
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/courses']}>
          <Routes>
            <Route path="/courses" element={<Courses />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    expect(screen.getByText('Learning Paths')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CKA in 8 Weeks' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Linux Fundamentals' })).toBeTruthy();
    });
  });

  it('shows an empty state when no courses exist', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/courses']}>
          <Routes>
            <Route path="/courses" element={<Courses />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('No published courses yet')).toBeTruthy();
    });
  });
});
