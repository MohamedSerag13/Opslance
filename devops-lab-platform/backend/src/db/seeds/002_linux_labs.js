const fs = require('fs');
const path = require('path');

async function run(knex) {
  const labsDir = process.env.HOST_LABS_DIR || path.join(__dirname, '../../../../labs');
  const linuxDir = path.join(labsDir, 'linux');

  if (!fs.existsSync(linuxDir)) {
    console.log('[SEED] Linux labs directory not found, skipping');
    return;
  }

  const categories = {
    'filesystem': 'Linux Administration',
    'navigation': 'Linux Administration',
    'read-write-permissions': 'Linux Administration',
    'permission-denied': 'Linux Administration',
    'users-and-groups': 'Linux Administration',
    'processes': 'Linux Administration',
    'logs': 'Linux Administration',
    'storage': 'Linux Administration',
    'services': 'Linux Administration',
  };

  const defaultCategory = await knex('lab_categories').where({ slug: 'linux' }).first();
  if (!defaultCategory) return;

  for (const [subdir, subcategory] of Object.entries(categories)) {
    const subPath = path.join(linuxDir, subdir);
    if (!fs.existsSync(subPath)) continue;

    const labDirs = fs.readdirSync(subPath).filter(d => d.startsWith('lab-'));

    for (const labDir of labDirs) {
      const readmePath = path.join(subPath, labDir, 'README.md');
      if (!fs.existsSync(readmePath)) continue;

      const readme = fs.readFileSync(readmePath, 'utf8');
      const labKey = `linux-${subdir}-${labDir}`;

      const existing = await knex('labs').where({ lab_key: labKey }).first();
      if (existing) continue;

      const titleMatch = readme.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : labDir;

      const difficultyMatch = readme.match(/\*\*Difficulty:\*\*\s*(\w+)/i);
      const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : 'beginner';

      const pointsMatch = readme.match(/\*\*Points:\*\*\s*(\d+)/i);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 100;

      const timeMatch = readme.match(/\*\*Estimated Time:\*\*\s*(\d+)/i);
      const estimatedMinutes = timeMatch ? parseInt(timeMatch[1]) : 30;

      const skillsMatch = readme.match(/\*\*Skills:\*\*\s*(.+)/i);
      const skills = skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [];

      const scenarioMatch = readme.match(/##\s+Scenario\s*\n([\s\S]*?)(?=##|\*\*|$)/i);
      const scenario = scenarioMatch ? scenarioMatch[1].trim() : null;

      const symptomsMatch = readme.match(/##\s+Symptoms?\s*\n([\s\S]*?)(?=##|\*\*|$)/i);
      const symptoms = symptomsMatch ? symptomsMatch[1].trim() : null;

      const missionMatch = readme.match(/##\s+Mission\s*\n([\s\S]*?)(?=##|\*\*|$)/i);
      const mission = missionMatch ? missionMatch[1].trim() : null;

      const hintsMatch = readme.match(/##\s+Hints?\s*\n([\s\S]*?)(?=##|\*\*|$)/i);
      const hints = hintsMatch
        ? hintsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^\s*-\s*/, '').trim())
        : [];

      const composePath = `labs/linux/${subdir}/${labDir}/docker-compose.yml`;
      const dockerfilePath = `labs/linux/${subdir}/${labDir}/Dockerfile`;

      const hasDockerfile = fs.existsSync(path.join(subPath, labDir, 'Dockerfile'));
      const hasCompose = fs.existsSync(path.join(subPath, labDir, 'docker-compose.yml'));

      if (!hasCompose) continue;

      await knex('labs').insert({
        lab_key: labKey,
        category_id: defaultCategory.id,
        subcategory,
        title,
        description: mission || scenario || null,
        difficulty,
        points,
        estimated_minutes: estimatedMinutes,
        skills: JSON.stringify(skills),
        scenario,
        symptoms,
        mission,
        hints: JSON.stringify(hints),
        docker_compose_path: composePath,
        dockerfile_path: hasDockerfile ? dockerfilePath : null,
        is_visible: true,
        order_index: Object.keys(categories).indexOf(subdir) * 100 + labDirs.indexOf(labDir),
      });

      console.log(`[SEED] Linux lab: ${labKey}`);
    }
  }

  console.log('[SEED] Linux labs seeded');
}

module.exports = { run };
