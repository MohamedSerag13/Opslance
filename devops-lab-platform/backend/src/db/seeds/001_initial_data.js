async function run(knex) {
  const orgExists = await knex('organizations').where({ slug: 'default' }).first();
  if (!orgExists) {
    await knex('organizations').insert({
      name: 'DevOps Lab Platform',
      slug: 'default',
      primary_color: '#3B82F6',
    });
    console.log('[SEED] Created default organization');
  }

  const org = await knex('organizations').where({ slug: 'default' }).first();

  const adminExists = await knex('users').where({ username: 'admin' }).first();
  if (!adminExists) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    await knex('users').insert({
      organization_id: org.id,
      username: 'admin',
      email: 'admin@devops.local',
      password_hash: hash,
      role: 'super_admin',
      is_active: true,
    });
    console.log('[SEED] Created super_admin user');
  }

  const instructorExists = await knex('users').where({ username: 'instructor' }).first();
  if (!instructorExists) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(process.env.INSTRUCTOR_PASSWORD || 'instructor123', 12);
    await knex('users').insert({
      organization_id: org.id,
      username: 'instructor',
      email: 'instructor@devops.local',
      password_hash: hash,
      role: 'instructor',
      is_active: true,
    });
    console.log('[SEED] Created instructor user');
  }

  const studentExists = await knex('users').where({ username: 'student' }).first();
  if (!studentExists) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(process.env.STUDENT_PASSWORD || 'student123', 12);
    await knex('users').insert({
      organization_id: org.id,
      username: 'student',
      email: 'student@devops.local',
      password_hash: hash,
      role: 'student',
      is_active: true,
    });
    console.log('[SEED] Created student user');
  }

  const categories = [
    { slug: 'linux', name: 'Linux Administration', description: 'Master Linux system administration', icon: 'Terminal', order_index: 1 },
    { slug: 'docker', name: 'Docker & Containers', description: 'Containerization with Docker', icon: 'Container', order_index: 2 },
    { slug: 'nginx', name: 'Nginx & Web Servers', description: 'Web server configuration and optimization', icon: 'Globe', order_index: 3 },
    { slug: 'networking', name: 'Networking', description: 'Network troubleshooting and configuration', icon: 'Network', order_index: 4 },
    { slug: 'git', name: 'Git & Version Control', description: 'Version control with Git', icon: 'Git', order_index: 5 },
    { slug: 'cicd', name: 'CI/CD Pipelines', description: 'Continuous integration and deployment', icon: 'Pipeline', order_index: 6 },
    { slug: 'monitoring', name: 'Monitoring & Observability', description: 'System monitoring and alerting', icon: 'Activity', order_index: 7 },
    { slug: 'databases', name: 'Databases', description: 'Database administration and optimization', icon: 'Database', order_index: 8 },
    { slug: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration with K8s', icon: 'Hexagon', order_index: 9 },
    { slug: 'final-scenarios', name: 'Final Scenarios', description: 'Capstone challenges combining all skills', icon: 'Flag', order_index: 10 },
  ];

  for (const cat of categories) {
    const exists = await knex('lab_categories').where({ slug: cat.slug }).first();
    if (!exists) {
      await knex('lab_categories').insert(cat);
    }
  }
  console.log('[SEED] Created lab categories');

  const badges = [
    { slug: 'first-lab', name: 'First Steps', description: 'Complete your first lab', type: 'milestone', criteria: { labs_completed: 1 } },
    { slug: 'five-labs', name: 'Getting Started', description: 'Complete 5 labs', type: 'milestone', criteria: { labs_completed: 5 } },
    { slug: 'ten-labs', name: 'Dedicated Learner', description: 'Complete 10 labs', type: 'milestone', criteria: { labs_completed: 10 } },
    { slug: 'all-linux', name: 'Linux Master', description: 'Complete all Linux labs', type: 'category', criteria: { category: 'linux' } },
    { slug: 'all-docker', name: 'Container Expert', description: 'Complete all Docker labs', type: 'category', criteria: { category: 'docker' } },
    { slug: 'perfect-score', name: 'Perfectionist', description: 'Get a perfect score without hints', type: 'perfect', criteria: { no_hints: true, full_score: true } },
    { slug: 'speed-demon', name: 'Speed Demon', description: 'Complete a lab in under half the estimated time', type: 'speed', criteria: { time_ratio: 0.5 } },
    { slug: 'streak-3', name: 'On a Roll', description: '3-day activity streak', type: 'streak', criteria: { streak: 3 } },
    { slug: 'streak-7', name: 'Week Warrior', description: '7-day activity streak', type: 'streak', criteria: { streak: 7 } },
    { slug: 'streak-30', name: 'Monthly Master', description: '30-day activity streak', type: 'streak', criteria: { streak: 30 } },
  ];

  for (const badge of badges) {
    const exists = await knex('badges').where({ slug: badge.slug }).first();
    if (!exists) {
      await knex('badges').insert(badge);
    }
  }
  console.log('[SEED] Created badges');
}

module.exports = { run };
