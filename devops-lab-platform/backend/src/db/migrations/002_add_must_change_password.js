exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'must_change_password');
  if (!hasColumn) {
    await knex.schema.table('users', t => {
      t.boolean('must_change_password').defaultTo(false);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.table('users', t => {
    t.dropColumn('must_change_password');
  });
};
