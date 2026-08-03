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
        industries(name, contact_email),
        profiles!submitted_by(full_name)
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
          <p><strong>Company:</strong> ${report.industries?.name || 'N/A'}</p>
          <p><strong>Submitted by:</strong> ${report.profiles?.full_name || 'N/A'}</p>
          <p><strong>Period:</strong> Month ${report.month}, Year ${report.year}</p>
          <p><strong>Status:</strong> ${report.status}</p>
          
          <h2>Performance Metrics</h2>
          <table>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Investment</td>
              <td>₹${report.investment_cr != null ? `${report.investment_cr.toLocaleString()} Cr` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Employment</td>
              <td>${report.emp_total != null ? `${report.emp_total} Persons` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Water Consumption (KLD)</td>
              <td>${report.water_kld != null ? `${report.water_kld} KLD` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Power Consumption (kWh)</td>
              <td>${report.power_kwh != null ? `${report.power_kwh.toLocaleString()} kWh` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Turnover</td>
              <td>₹${report.turnover_cr != null ? `${report.turnover_cr.toLocaleString()} Cr` : 'N/A'}</td>
            </tr>
            <tr>
              <td>CSR Spending</td>
              <td>₹${report.csr_spend_lakhs != null ? `${report.csr_spend_lakhs.toLocaleString()} Lakhs` : 'N/A'}</td>
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
        industries(name, contact_email),
        profiles!submitted_by(full_name, email)
      `);

    if (filters?.userId) {
      query = query.eq('industries.user_id', filters.userId);
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
      report.industries?.name || 'N/A',
      report.industries?.contact_email || report.profiles?.email || 'N/A',
      `${report.month}/${report.year}`,
      report.investment_cr ?? '',
      report.emp_total ?? '',
      report.water_kld ?? '',
      report.power_kwh ?? '',
      report.turnover_cr ?? '',
      report.csr_spend_lakhs ?? '',
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
        industries(name, sector, user_id)
      `)
      .eq('status', 'verified')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (!reports || reports.length === 0) {
      return {
        summary: {
          total_companies: 0,
          total_reports: 0,
          total_investment: 0,
          total_employment: 0,
          total_water: 0,
          total_power: 0,
          total_turnover: 0,
          total_csr: 0,
        },
        data: []
      };
    }

    // Calculate summary stats
    const summary = {
      total_companies: new Set(reports.map(r => r.industry_id)).size,
      total_reports: reports.length,
      total_investment: reports.reduce((sum, r) => sum + Number(r.investment_cr || 0), 0),
      total_employment: reports.reduce((sum, r) => sum + Number(r.emp_total || 0), 0),
      total_water: reports.reduce((sum, r) => sum + Number(r.water_kld || 0), 0),
      total_power: reports.reduce((sum, r) => sum + Number(r.power_kwh || 0), 0),
      total_turnover: reports.reduce((sum, r) => sum + Number(r.turnover_cr || 0), 0),
      total_csr: reports.reduce((sum, r) => sum + Number(r.csr_spend_lakhs || 0), 0),
    };

    return { summary, data: reports };
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    throw error;
  }
}
