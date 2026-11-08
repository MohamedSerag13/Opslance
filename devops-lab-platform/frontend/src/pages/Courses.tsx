import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import AppNav from '../components/layout/AppNav';
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { BlurFade, AnimatedGradientText } from '../components/fx';
import CourseCard from '../components/courses/CourseCard';
import type { CourseSummary } from '../pages/courses-types';

/** Student-facing catalog of structured learning paths. */
export default function Courses() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/courses')
      .then((res) => { if (alive) setCourses(res.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const heroCopy = useMemo(
    () => ({
      title: 'Learning Paths',
      sub: 'Structured, week-by-week study plans with daily ticks, lab days and weekly gates — progress persists, motivation compounds.',
    }),
    [],
  );
  const [hero] = useState(heroCopy);

  return (
    <div className="min-h-screen bg-bg" id="main">
      <AppNav />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* hero banner */}
        <BlurFade className="relative overflow-hidden rounded-2xl border border-border p-10 mesh-bg">
          <span className="glow-orb left-1/4 top-[-120px] h-72 w-96 bg-primary/25" aria-hidden="true" />
          <div className="relative">
            <AnimatedGradientText duration={6}>{hero.title}</AnimatedGradientText>
            <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-content sm:text-4xl">
              Courses that get you certified
            </h1>
            <p className="mt-3 max-w-2xl font-medium text-muted">{hero.sub}</p>
          </div>
        </BlurFade>

        {failed ? (
          <Card className="p-6">
            <EmptyState
              icon={<span className="text-2xl">⚠️</span>}
              title="Couldn't load courses"
              description="The backend didn't respond. Check your connection and try again."
            />
          </Card>
        ) : !courses ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={<span className="text-2xl">🎓</span>}
              title="No published courses yet"
              description="Structured study paths will appear here once your instructors publish them."
              action={<Link to="/dashboard"><Button variant="primary">Back to dashboard</Button></Link>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2" role="list" aria-label="Courses">
            {courses.map((course, i) => (
              <BlurFade key={course.id} delay={0.1 * (i + 1)} role="listitem">
                <CourseCard course={course} index={i} />
              </BlurFade>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-semibold text-muted">
          <span>Progress = checked daily ticks across the whole plan</span>
          <Badge variant="primary" dot>Synced live</Badge>
        </div>
      </div>
    </div>
  );
}
