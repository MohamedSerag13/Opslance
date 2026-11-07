require('dotenv').config();
const { db } = require('./db');

const genLab = (id, cat, sub, title, diff, mins, pts, skills, cmd, sol) => {
    const orderNum = parseInt(id.replace(/\D/g, '')) || 0;
    const folderName = `lab-${String(orderNum).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
    return {
        lab_key: id,
        category: cat,
        subcategory: sub,
        title: title,
        difficulty: diff,
        estimated_minutes: mins,
        points: pts,
        skills: JSON.stringify(skills.split(',').map(s=>s.trim())),
        scenario: `Scenario for ${title}`,
        symptoms: `Symptoms for ${title}`,
        mission: `Mission for ${title}`,
        hints: JSON.stringify(['Try checking logs', 'Check permissions']),
        verification_command: cmd,
        useful_commands: JSON.stringify([{command: 'ls', purpose: 'list files'}]),
        solution: sol,
        docker_compose_path: `labs/${cat.toLowerCase().replace(/ /g, '-')}/${sub.toLowerCase().replace(/ /g, '-')}/${folderName}/docker-compose.yml`,
        order_index: orderNum,
        is_visible: true
    };
};

const fs = require('fs');
const labsJsContent = fs.readFileSync(__dirname + '/labs.js', 'utf8');

const extractLabs = new Function('genLab', `
  ${labsJsContent}
  return rawLabs;
`);

const rawLabs = extractLabs(genLab);

async function run() {
  console.log(`Seeding ${rawLabs.length} labs with corrected paths...`);
  for (const lab of rawLabs) {
    const exists = await db('labs').where({ lab_key: lab.lab_key }).first();
    if (!exists) {
      await db('labs').insert(lab);
    } else {
      await db('labs').where({ lab_key: lab.lab_key }).update(lab);
    }
  }
  console.log("Seeding complete.");
  process.exit(0);
}

run();
