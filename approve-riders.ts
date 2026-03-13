import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function approveRiders() {
  const { data, error } = await supabase
    .from('riders')
    .update({ status: 'approved' })
    .eq('status', 'pending');

  if (error) {
    console.error('Error approving riders:', error);
  } else {
    console.log('Successfully approved all pending riders.');
  }
}

approveRiders();
