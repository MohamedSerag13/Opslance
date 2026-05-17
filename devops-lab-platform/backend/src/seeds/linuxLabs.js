const fs = require('fs');
const path = require('path');

async function seedLinuxLabs(db) {
  // Use the env var set in docker-compose.yml, fallback to a relative path
  const baseDir = process.env.HOST_LABS_DIR 
    ? path.join(process.env.HOST_LABS_DIR, 'linux') 
    : path.join(__dirname, '../../../../labs/linux');

  if (!fs.existsSync(baseDir)) {
    console.log(`[Seed] Labs directory not found at ${baseDir}. Skipping dynamic seeding.`);
    return;
  }

  const topics = [
    { folder: 'filesystem', abbrev: 'fs', name: 'Filesystem' },
    { folder: 'navigation', abbrev: 'nav', name: 'Navigation' },
    { folder: 'read-write-permissions', abbrev: 'rwp', name: 'Read-Write Permissions' },
    { folder: 'permission-denied', abbrev: 'perm', name: 'Permission Denied' },
    { folder: 'users-and-groups', abbrev: 'ug', name: 'Users and Groups' },
    { folder: 'processes', abbrev: 'proc', name: 'Processes' },
    { folder: 'logs', abbrev: 'logs', name: 'Logs' },
    { folder: 'storage', abbrev: 'stor', name: 'Storage' },
    { folder: 'services', abbrev: 'svc', name: 'Services' }
  ];

  let globalOrder = 1;

  for (const topic of topics) {
    const topicPath = path.join(baseDir, topic.folder);
    if (!fs.existsSync(topicPath)) continue;

    const labFolders = fs.readdirSync(topicPath).filter(f => f.startsWith('lab-')).sort();
    
    let labNum = 1;
    for (const labFolder of labFolders) {
      const readmePath = path.join(topicPath, labFolder, 'README.md');
      if (!fs.existsSync(readmePath)) continue;

      const content = fs.readFileSync(readmePath, 'utf8');
      
      const titleMatch = content.match(/# Lab .*?: (.*)/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

      const diffMatch = content.match(/\*\*Difficulty:\*\*\s*(?:[^\w\s]+)?\s*(.*)/);
      const difficulty = diffMatch ? diffMatch[1].trim() : 'Beginner';
      let points = 10;
      if (difficulty === 'Intermediate') points = 20;
      if (difficulty === 'Advanced') points = 30;

      const timeMatch = content.match(/\*\*Estimated Time:\*\*\s*(\d+)–(\d+) minutes/);
      let estimated_minutes = 10;
      if (timeMatch) {
        estimated_minutes = Math.floor((parseInt(timeMatch[1]) + parseInt(timeMatch[2])) / 2);
      } else {
        const timeMatch2 = content.match(/\*\*Estimated Time:\*\*\s*(\d+)/);
        if (timeMatch2) estimated_minutes = parseInt(timeMatch2[1]);
      }

      const skillsMatch = content.match(/\*\*Skills Practiced:\*\*\s*(.*)/);
      const skills = skillsMatch ? JSON.stringify(skillsMatch[1].split(',').map(s => s.trim().replace(/`/g, ''))) : "[]";

      const scenarioMatch = content.match(/## Scenario\n\n([\s\S]*?)\n\n##/);
      const scenario = scenarioMatch ? scenarioMatch[1].trim() : '';

      const symptomsMatch = content.match(/## Symptoms\n\n([\s\S]*?)\n\n##/);
      let symptoms = symptomsMatch ? symptomsMatch[1].trim() : '';
      symptoms = symptoms.replace(/^- /gm, '- ');

      const missionMatch = content.match(/## Your Mission\n\n([\s\S]*?)(?=\n\n\*\*Verification:\*\*|\n\n##)/);
      const mission = missionMatch ? missionMatch[1].trim() : '';

      const verifyMatch = content.match(/\*\*Verification:\*\*\s*.*?\`([^`]+)\`/);
      const verification_command = verifyMatch ? verifyMatch[1] : null;

      const hints = [];
      const hintRegex = /<details>[\s\S]*?<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/g;
      let hm;
      while ((hm = hintRegex.exec(content)) !== null) {
        hints.push({
          title: hm[1].replace(/—/g, '-').trim(),
          content: hm[2].trim().replace(/<[^>]+>/g, '')
        });
      }

      const useful_commands = [];
      const tableRegex = /\| \`(.*?)\`\s*\|\s*(.*?)\s*\|/g;
      let tm;
      while ((tm = tableRegex.exec(content)) !== null) {
        if (tm[1] === 'Command' || tm[1].includes('---')) continue;
        useful_commands.push({
          command: tm[1].trim(),
          purpose: tm[2].trim()
        });
      }

      const lab_key = `lab-linux-${topic.abbrev}-${labNum.toString().padStart(2, '0')}`;
      const docker_compose_path = `labs/linux/${topic.folder}/${labFolder}/docker-compose.yml`;

      const labData = {
        lab_key,
        category: 'Linux',
        subcategory: topic.name,
        title,
        difficulty,
        points,
        estimated_minutes,
        skills,
        scenario,
        symptoms,
        mission,
        hints: JSON.stringify(hints),
        verification_command,
        useful_commands: JSON.stringify(useful_commands),
        solution: null,
        docker_compose_path,
        is_visible: true,
        order_index: globalOrder,
        flag_value: null
      };

      const exists = await db('labs').where({ lab_key }).first();
      if (!exists) {
        await db('labs').insert(labData);
        console.log(`  ✓ Seeded: ${lab_key}`);
      } else {
        await db('labs').where({ lab_key }).update(labData);
        console.log(`  ↻ Updated: ${lab_key}`);
      }

      globalOrder++;
      labNum++;
    }
  }
}

module.exports = { seedLinuxLabs };
