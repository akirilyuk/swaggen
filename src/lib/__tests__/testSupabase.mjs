/**
 * Manual test script for Supabase connection with normalized tables.
 *
 * Run with: node --env-file=.env src/lib/__tests__/testSupabase.mjs
 *
 * This script tests:
 * 1. Connection to Supabase
 * 2. CRUD operations on projects table
 * 3. CRUD operations on entities table
 * 4. CRUD operations on middlewares table
 * 5. Cleanup
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const TEST_PROJECT_ID = randomUUID();
const TEST_ENTITY_ID = randomUUID();
const TEST_MIDDLEWARE_ID = randomUUID();

async function runTests() {
  console.log('🧪 Supabase Normalized Tables Test\n');
  console.log('─'.repeat(50));

  // 1. Check env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   URL: ${url}`);
  console.log('');

  const supabase = createClient(url, key);

  // 2. Test Projects table
  console.log('📁 Testing PROJECTS table...');

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      id: TEST_PROJECT_ID,
      name: 'Test Project',
      description: 'A test project',
      open_api_spec: '{}',
      data_storage: {
        provider: 'supabase',
        connectionString: '',
        enabled: false,
      },
      git_repo: { url: '', branch: 'main', token: '', autoCommit: false },
    })
    .select()
    .single();

  if (projectError) {
    console.error('❌ Projects INSERT failed:', projectError.message);
    console.error('   Hint:', projectError.hint);
    console.error('   Details:', projectError.details);
    console.log('\n⚠️  Run the migration SQL first:');
    console.log('   supabase/migrations/002_normalized_tables.sql\n');
    process.exit(1);
  }
  console.log('✅ Project created:', projectData.name);

  // 3. Test Entities table
  console.log('\n📦 Testing ENTITIES table...');

  const { data: entityData, error: entityError } = await supabase
    .from('entities')
    .insert({
      id: TEST_ENTITY_ID,
      project_id: TEST_PROJECT_ID,
      name: 'User',
      description: 'User entity',
      fields: [
        { name: 'id', type: 'uuid', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'name', type: 'string', required: false },
      ],
      middleware_bindings: [],
    })
    .select()
    .single();

  if (entityError) {
    console.error('❌ Entities INSERT failed:', entityError.message);
    await cleanup(supabase);
    process.exit(1);
  }
  console.log('✅ Entity created:', entityData.name);

  // 4. Test Middlewares table
  console.log('\n🔧 Testing MIDDLEWARES table...');

  const { data: middlewareData, error: middlewareError } = await supabase
    .from('middlewares')
    .insert({
      id: TEST_MIDDLEWARE_ID,
      project_id: TEST_PROJECT_ID,
      name: 'authMiddleware',
      description: 'Authentication middleware',
      enabled: true,
      order: 0,
      scope: 'global',
      is_preset: false,
      code: 'export default async function auth(req, res, next) { next(); }',
    })
    .select()
    .single();

  if (middlewareError) {
    console.error('❌ Middlewares INSERT failed:', middlewareError.message);
    await cleanup(supabase);
    process.exit(1);
  }
  console.log('✅ Middleware created:', middlewareData.name);

  // 5. Test reading with relations
  console.log('\n📖 Testing SELECT with relations...');

  const { data: fullProject, error: selectError } = await supabase
    .from('projects')
    .select('*, entities(*), middlewares(*)')
    .eq('id', TEST_PROJECT_ID)
    .single();

  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message);
    await cleanup(supabase);
    process.exit(1);
  }

  console.log('✅ Project with relations:');
  console.log(`   - Name: ${fullProject.name}`);
  console.log(`   - Entities: ${fullProject.entities.length}`);
  console.log(`   - Middlewares: ${fullProject.middlewares.length}`);

  // 6. Cleanup
  console.log('\n🗑️  Cleaning up test data...');
  await cleanup(supabase);

  console.log('\n' + '─'.repeat(50));
  console.log('🎉 All tests passed! Normalized tables are working.');
  console.log('');
}

async function cleanup(supabase) {
  // Delete in reverse order due to foreign keys
  await supabase.from('middlewares').delete().eq('id', TEST_MIDDLEWARE_ID);
  await supabase.from('entities').delete().eq('id', TEST_ENTITY_ID);
  await supabase.from('projects').delete().eq('id', TEST_PROJECT_ID);
  console.log('✅ Test data cleaned up');
}

runTests().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
