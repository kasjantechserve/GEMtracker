import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the regular client for general logic, 
// but need a Service Role client for deletion to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  // Check for authorization (e.g., CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // 1. Initialize Supabase Client
    // Note: For deletion, we MUST have the service role key
    if (!serviceRoleKey) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Cleanup skipped.");
    }

    const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

    // --- PHASE 1: EXPIRY REMINDERS ---
    console.log("DEBUG: Checking for expiring tenders...");

    // Fetch tenders expiring in the next 24 hours
    // We use the URL/Anon key indirectly via standard supabase import if needed, 
    // but adminClient works for everything too.
    const activeClient = adminClient || createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data: expiringTenders, error } = await activeClient
      .from('tenders')
      .select('bid_number, nickname, subject, bid_end_date, companies(name)')
      .gt('bid_end_date', now.toISOString())
      .lt('bid_end_date', tomorrow.toISOString())
      .eq('status', 'active');

    if (error) throw error;

    if (expiringTenders && expiringTenders.length > 0) {
      console.log(`Sending reminder for ${expiringTenders.length} tenders...`);
      // Email logic here...
    }

    // --- PHASE 2: AUTOMATIC CLEANUP (DELETE > 10 DAYS EXPIRED) ---
    let deletedCount = 0;
    let cleanupReport = "";

    if (adminClient) {
      console.log(`DEBUG: Running cleanup for tenders expired before ${tenDaysAgo.toISOString()}`);

      // 1. Find the tenders to delete
      const { data: toDelete, error: fetchError } = await adminClient
        .from('tenders')
        .select('id, bid_number, file_path')
        .lt('bid_end_date', tenDaysAgo.toISOString());

      if (fetchError) throw fetchError;

      if (toDelete && toDelete.length > 0) {
        console.log(`DEBUG: Found ${toDelete.length} old tenders to remove.`);

        for (const tender of toDelete) {
          try {
            // A. Delete PDF from Storage
            if (tender.file_path) {
              await adminClient.storage.from('tender-pdfs').remove([tender.file_path]);
              console.log(`DEBUG: Deleted PDF for ${tender.bid_number}`);
            }

            // B. Delete from Database (Cascades to checklist_items)
            await adminClient.from('tenders').delete().eq('id', tender.id);

            deletedCount++;
          } catch (delErr) {
            console.error(`ERROR: Failed to delete tender ${tender.bid_number}:`, delErr);
          }
        }
        cleanupReport = `Cleaned up ${deletedCount} expired tenders.`;
      } else {
        cleanupReport = "No expired tenders found for cleanup.";
      }
    } else {
      cleanupReport = "Cleanup skipped (Service Role Key not configured).";
    }

    return NextResponse.json({
      success: true,
      remindersSent: expiringTenders?.length || 0,
      cleanup: cleanupReport,
      timestamp: now.toISOString()
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
