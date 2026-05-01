import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateReportPDF(reportId: string) {
  try {
    const { data: report } = await supabase
      .from('monthly_reports')
      .select(`
        *,
        users!user_id(full_name, email, company_name)
      `)
      .eq('id', reportId)
      .single();

    if (!report) {
      throw new Error('Report not found');
    }

    // Create a simple HTML representation
    const html = `
      <html>
        <head>
          <title>SIPCOT Monthly Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>SIPCOT Monthly Report</h1>
          <p><strong>Company:</strong> ${report.users?.company_name || 'N/A'}</p>
          <p><strong>Submitted by:</strong> ${report.users?.full_name || 'N/A'}</p>
          <p><strong>Period:</strong> Month ${report.month}, Year ${report.year}</p>
          <p><strong>Status:</strong> ${report.status}</p>
          
          <h2>Performance Metrics</h2>
          <table>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Investment Amount</td>
              <td>₹${report.investment_amount?.toLocaleString() || 'N/A'}</td>
            </tr>
            <tr>
              <td>Employment Count</td>
              <td>${report.employment_count || 'N/A'}</td>
            </tr>
            <tr>
              <td>Water Consumption (ML)</td>
              <td>${report.water_consumption || 'N/A'}</td>
            </tr>
            <tr>
              <td>Power Consumption (MWh)</td>
              <td>${report.power_consumption || 'N/A'}</td>
            </tr>
            <tr>
              <td>Annual Turnover</td>
              <td>₹${report.annual_turnover?.toLocaleString() || 'N/A'}</td>
            </tr>
            <tr>
              <td>CSR Spending</td>
              <td>₹${report.csr_spending?.toLocaleString() || 'N/A'}</td>
            </tr>
          </table>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;

    return html;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function exportReportsToCSV(filters?: {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let query = supabase
      .from('monthly_reports')
      .select(`
        *,
        users!user_id(full_name, email, company_name)
      `);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: reports } = await query;

    if (!reports || reports.length === 0) {
      throw new Error('No reports found');
    }

    // Create CSV header
    const headers = [
      'Company',
      'Contact Email',
      'Period',
      'Investment',
      'Employment',
      'Water (ML)',
      'Power (MWh)',
      'Turnover',
      'CSR',
      'Status',
      'Submitted At',
    ];

    // Create CSV rows
    const rows = reports.map(report => [
      report.users?.company_name || 'N/A',
      report.users?.email || 'N/A',
      `${report.month}/${report.year}`,
      report.investment_amount || '',
      report.employment_count || '',
      report.water_consumption || '',
      report.power_consumption || '',
      report.annual_turnover || '',
      report.csr_spending || '',
      report.status,
      report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : '',
    ]);

    // Combine and format CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
}

export async function generateComprehensiveReport(filters?: {
  sector?: string;
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
}) {
  try {
    // Get all reports
    const { data: reports } = await supabase
      .from('monthly_reports')
      .select(`
        *,
        users!user_id(full_name, company_name, company_sector)
      `)
      .eq('status', 'verified')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (!reports || reports.length === 0) {
      return { summary: {}, data: [] };
    }

    // Calculate summary stats
    const summary = {
      total_companies: new Set(reports.map(r => r.user_id)).size,
      total_reports: reports.length,
      total_investment: reports.reduce((sum, r) => sum + (r.investment_amount || 0), 0),
      total_employment: reports.reduce((sum, r) => sum + (r.employment_count || 0), 0),
      total_water: reports.reduce((sum, r) => sum + (r.water_consumption || 0), 0),
      total_power: reports.reduce((sum, r) => sum + (r.power_consumption || 0), 0),
      total_turnover: reports.reduce((sum, r) => sum + (r.annual_turnover || 0), 0),
      total_csr: reports.reduce((sum, r) => sum + (r.csr_spending || 0), 0),
    };

    return { summary, data: reports };
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    throw error;
  }
}
