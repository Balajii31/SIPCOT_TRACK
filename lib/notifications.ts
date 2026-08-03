import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: 'submission_reminder' | 'threshold_alert' | 'system',
  relatedReportId?: string
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        related_report_id: relatedReportId,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return false;
  }
}

export async function getUserNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

export async function checkThresholdViolations(reportId: string) {
  try {
    // Get the report
    const { data: report } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) return;

    // Get industry details
    const { data: industry } = await supabase
      .from('industries')
      .select('*')
      .eq('id', report.industry_id)
      .single();

    if (!industry) return;

    // Get thresholds for this sector
    const { data: thresholds } = await supabase
      .from('thresholds')
      .select('*')
      .eq('sector', industry.sector || '');

    if (!thresholds) return;

    // Check each metric
    const violations = [];

    for (const threshold of thresholds) {
      const value = report[threshold.metric_name + '_amount'] || 
                   report[threshold.metric_name + '_count'] || 
                   report[threshold.metric_name + '_consumption'] || 
                   report[threshold.metric_name + '_spending'];

      if (value) {
        if (value < threshold.min_value && threshold.alert_when !== 'above') {
          violations.push(
            `${threshold.metric_name} is below minimum threshold: ${value} < ${threshold.min_value}`
          );
        } else if (value > threshold.max_value && threshold.alert_when !== 'below') {
          violations.push(
            `${threshold.metric_name} is above maximum threshold: ${value} > ${threshold.max_value}`
          );
        }
      }
    }

    // Send alerts for violations
    for (const violation of violations) {
      await sendNotification(
        industry.user_id || report.submitted_by,
        'Threshold Alert',
        violation,
        'threshold_alert',
        reportId
      );
    }

    return violations;
  } catch (error) {
    console.error('Error checking thresholds:', error);
    return [];
  }
}
