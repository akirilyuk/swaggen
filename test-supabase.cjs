const { createClient } = require('@supabase/supabase-js');

const url = 'https://rtfojyiqvckrcuefljxn.supabase.co';
const key = '';
const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase connection...');
  console.log('URL:', url);

  // Test if table exists
  const { data, error } = await supabase.from('kv_store').select('*').limit(1);

  if (error) {
    console.error('Select Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Select Success! Data:', data);
  }

  // Try to insert
  const { data: insertData, error: insertError } = await supabase
    .from('kv_store')
    .upsert({ key: 'test_key', value: { test: true } }, { onConflict: 'key' })
    .select();

  if (insertError) {
    console.error('Insert Error:', JSON.stringify(insertError, null, 2));
  } else {
    console.log('Insert Success:', insertData);
  }
}

test()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
