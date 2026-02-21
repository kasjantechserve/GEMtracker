import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
    // Check for authorization (e.g., CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Fetch tenders expiring in the next 24 hours
        const { data: expiringTenders, error } = await supabase
            .from('tenders')
            .select('bid_number, nickname, subject, bid_end_date, companies(name)')
            .gt('bid_end_date', now.toISOString())
            .lt('bid_end_date', tomorrow.toISOString())
            .eq('status', 'active');

        if (error) throw error;

        if (!expiringTenders || expiringTenders.length === 0) {
            return NextResponse.json({ message: 'No tenders expiring in next 24h' });
        }

        // Logic to send email (Mocking with console.log for now, user needs to set up provider)
        console.log(`Sending reminder for ${expiringTenders.length} tenders...`);

        for (const tender of expiringTenders) {
            const emailBody = `
        <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #0f172a;">
          <h1 style="color: #ef4444;">⚠️ ACTION REQUIRED: Tender Expiring Tomorrow</h1>
          <p>The following tender is expiring within 24 hours:</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Tender Name:</strong> ${tender.nickname || 'N/A'}</p>
            <p><strong>ID:</strong> ${tender.bid_number}</p>
            <p><strong>Client:</strong> ${(tender.companies as any)?.name || 'N/A'}</p>
            <p><strong>Deadline:</strong> ${new Date(tender.bid_end_date!).toLocaleString()}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View & Update Tender
          </a>
          <p style="font-size: 12px; color: #64748b; margin-top: 40px;">
            Recipients CC: kasjantechserve@gmail.com, Kasjnahr@gmail.com
          </p>
        </div>
      `;

            // NOTE: In production, integrate with Resend/Nodemailer/SendGrid here
            // For example with Resend:
            /*
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
              },
              body: JSON.stringify({
                from: 'GEMtracker <reminders@gem-tracker.com>',
                to: ['kasjantechserve@gmail.com', 'Kasjnahr@gmail.com'],
                subject: `⚠️ ACTION REQUIRED: ${tender.nickname || tender.bid_number} Expiring Tomorrow`,
                html: emailBody
              })
            });
            */

            console.log(`[MOCK EMAIL SENT] To: kasjantechserve@gmail.com, Kasjnahr@gmail.com | Subject: Tender Expiring Tomorrow | Body: ${tender.nickname || tender.bid_number}`);
        }

        return NextResponse.json({
            success: true,
            processedCount: expiringTenders.length,
            message: 'Reminders processed successfully'
        });
    } catch (err: any) {
        console.error('Cron error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
