'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, Calendar, ClipboardList, CheckCircle2, 
  ArrowLeft, Loader2, HelpCircle, Inbox, Search 
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FormField {
  id: string;
  type: 'text' | 'number' | 'select';
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

interface CustomForm {
  id: string;
  title: string;
  description: string;
  schema: FormField[];
  is_active: boolean;
  created_at: string;
}

interface Submission {
  id: string;
  submitted_at: string;
  responses: Record<string, any>;
  industries: {
    name: string;
    allottee_code: string;
  } | null;
}

export default function FormSubmissionsPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<CustomForm | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (formId) {
      loadData();
    }
  }, [formId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubmissions(submissions);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredSubmissions(
        submissions.filter(s => 
          s.industries?.name.toLowerCase().includes(lower) || 
          s.industries?.allottee_code?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchQuery, submissions]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch form metadata
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;
      setForm(formData);

      // 2. Fetch all submissions for this form
      const { data: subData, error: subError } = await supabase
        .from('custom_form_submissions')
        .select(`
          id,
          submitted_at,
          responses,
          industries (
            name,
            allottee_code
          )
        `)
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (subError) throw subError;

      // Type-cast the join result
      const formattedSubs: Submission[] = (subData || []).map((sub: any) => ({
        id: sub.id,
        submitted_at: sub.submitted_at,
        responses: sub.responses || {},
        industries: sub.industries ? {
          name: sub.industries.name,
          allottee_code: sub.industries.allottee_code || ''
        } : null
      }));

      setSubmissions(formattedSubs);
      setFilteredSubmissions(formattedSubs);
    } catch (err: any) {
      console.error('Error loading submissions data:', err);
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#003366] animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading submission responses...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h3 className="text-xl font-bold text-red-600">Form Not Found</h3>
        <p className="text-muted-foreground mt-2">The requested custom form does not exist.</p>
        <Link href="/dashboard/admin/forms" className="mt-4 inline-block">
          <Button>Back to Forms</Button>
        </Link>
      </div>
    );
  }

  const fields = Array.isArray(form.schema) ? form.schema : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Link & Title */}
      <div className="mb-8">
        <Link 
          href="/dashboard/admin/forms" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003366] hover:text-[#002244] hover:underline mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Custom Forms
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003366] flex items-center gap-2.5">
              <ClipboardList className="w-8 h-8 text-[#FF9900]" />
              Submission Responses
            </h1>
            <p className="text-sm font-semibold text-[#003366]/70 mt-1.5">
              Form: <span className="underline">{form.title}</span>
            </p>
            {form.description && (
              <p className="text-slate-500 text-xs mt-2 max-w-3xl leading-relaxed">
                {form.description}
              </p>
            )}
          </div>
          <div className="bg-[#003366]/5 border border-[#003366]/10 rounded-xl px-5 py-3 text-center flex-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Filings</span>
            <span className="text-2xl font-black text-[#003366]">{submissions.length}</span>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 p-16 text-center">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 text-lg mb-1">No responses yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Industrial allottees have not submitted any responses to this questionnaire yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input 
              type="text"
              placeholder="Search by company name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#003366] text-xs transition-colors"
            />
          </div>

          {/* Results Table Container */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#003366] text-white font-bold border-b border-[#002244]">
                    <th className="px-6 py-4 font-semibold w-[220px]">Industry</th>
                    <th className="px-4 py-4 font-semibold w-[130px]">Filing Date</th>
                    {fields.map(f => (
                      <th key={f.id} className="px-4 py-4 font-semibold min-w-[150px] max-w-[300px] truncate">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={2 + fields.length} className="px-6 py-12 text-center text-slate-400 italic">
                        No submissions matching the search query.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-xs">
                            {sub.industries?.name || 'Unknown Industry'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {sub.industries?.allottee_code || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(sub.submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(sub.submitted_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        {fields.map(field => {
                          const val = sub.responses[field.id];
                          const formattedVal = val != null ? String(val) : '—';
                          return (
                            <td key={field.id} className="px-4 py-4 text-slate-700 font-medium">
                              {field.type === 'number' && val != null ? (
                                <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                  {val}
                                </span>
                              ) : (
                                <span>{formattedVal}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
