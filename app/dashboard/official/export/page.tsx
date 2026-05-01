'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportReportsToCSV, generateComprehensiveReport } from '@/lib/exports';

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const handleExportCSV = async () => {
    setExporting(true);
    setStatus('Preparing export...');

    try {
      const csv = await exportReportsToCSV({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sipcot-reports-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus('Export completed successfully');
    } catch (error) {
      setStatus('Error during export: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    setExporting(true);
    setStatus('Generating comprehensive report...');

    try {
      const { summary } = await generateComprehensiveReport();

      // Create text report
      const reportText = `
SIPCOT Comprehensive Industrial Report
Generated: ${new Date().toLocaleString()}

SUMMARY STATISTICS
==================
Total Active Companies: ${summary.total_companies}
Total Reports Submitted: ${summary.total_reports}

INVESTMENT METRICS
Investment Amount (₹): ${summary.total_investment?.toLocaleString('en-IN')}
Annual Turnover (₹): ${summary.total_turnover?.toLocaleString('en-IN')}

EMPLOYMENT & RESOURCES
Total Employment Count: ${summary.total_employment}
Water Consumption (ML): ${summary.total_water?.toLocaleString('en-IN')}
Power Consumption (MWh): ${summary.total_power?.toLocaleString('en-IN')}

SOCIAL RESPONSIBILITY
CSR Spending (₹): ${summary.total_csr?.toLocaleString('en-IN')}

End of Report
      `;

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sipcot-comprehensive-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus('Comprehensive report generated successfully');
    } catch (error) {
      setStatus('Error generating report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Export & Reports</h1>
      <p className="text-muted-foreground mb-8">Generate reports and export data</p>

      {status && (
        <div className={`mb-6 p-4 rounded-md ${
          status.includes('completed') || status.includes('successfully')
            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
            : status.includes('Error')
            ? 'bg-destructive/10 text-destructive'
            : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
        }`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Export Data as CSV</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Export verified reports in CSV format for analysis and record-keeping
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="status" className="text-foreground">
                Filter by Status
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={exporting}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="submitted">Submitted Only</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full"
          >
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </Button>
        </Card>

        <Card className="p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Comprehensive Report</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a complete report with summary statistics and aggregated metrics
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Includes: Investment trends, employment data, resource usage, and CSR metrics
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={exporting}
            variant="outline"
            className="w-full"
          >
            {exporting ? 'Generating...' : 'Generate Report'}
          </Button>
        </Card>
      </div>

      <Card className="p-8 mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Export Features</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Export verified and submitted reports</li>
          <li>✓ Filter by report status</li>
          <li>✓ Download in CSV format for spreadsheet analysis</li>
          <li>✓ Generate comprehensive system reports</li>
          <li>✓ Summary statistics and aggregated metrics</li>
          <li>✓ Timestamped export files for record-keeping</li>
        </ul>
      </Card>
    </div>
  );
}
