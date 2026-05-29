'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, Plus, Trash2, Calendar, ClipboardList, CheckCircle2, 
  HelpCircle, AlertTriangle, Loader2 
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CustomForm {
  id: string;
  title: string;
  description: string;
  schema: any[];
  is_active: boolean;
  created_at: string;
}

interface SubmissionCount {
  form_id: string;
  count: number;
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadFormsAndStats();
  }, []);

  async function loadFormsAndStats() {
    setLoading(true);
    try {
      // 1. Fetch all custom forms
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (formError) throw formError;

      // 2. Fetch submissions to count them
      const { data: subData, error: subError } = await supabase
        .from('custom_form_submissions')
        .select('form_id');

      if (subError) throw subError;

      // Calculate counts per form
      const counts: Record<string, number> = {};
      subData?.forEach(sub => {
        counts[sub.form_id] = (counts[sub.form_id] || 0) + 1;
      });

      setForms(formData || []);
      setSubmissionCounts(counts);
    } catch (err: any) {
      console.error('Error loading custom forms:', err);
      toast.error('Failed to load forms: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteForm = async (id: string) => {
    const loadingToast = toast.loading('Deleting custom form...');
    try {
      const { error } = await supabase
        .from('custom_forms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Form deleted successfully');
      setForms(prev => prev.filter(f => f.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete form: ' + err.message);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#003366] animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading custom compliance forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#003366] flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-[#FF9900]" />
            Custom Compliance Forms
          </h1>
          <p className="text-muted-foreground mt-1">
            Publish, monitor, and delete custom surveys and questionnaires for allottees.
          </p>
        </div>
        <Link href="/dashboard/admin/forms/new">
          <Button className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-3 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Form
          </Button>
        </Link>
      </div>

      {/* Grid of Forms */}
      {forms.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 p-16 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 text-lg mb-1">No custom forms found</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
            Create custom compliance forms to gather specific data and audits from industrial partners.
          </p>
          <Link href="/dashboard/admin/forms/new">
            <Button className="bg-[#FF9900] hover:bg-amber-500 font-bold px-5 py-2.5 text-xs uppercase tracking-wider">
              Build First Form
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {forms.map(form => {
            const fieldCount = Array.isArray(form.schema) ? form.schema.length : 0;
            const submissionCount = submissionCounts[form.id] || 0;
            const isConfirming = deletingId === form.id;

            return (
              <Card 
                key={form.id} 
                className="p-6 border border-slate-200 hover:border-slate-300/80 shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                {/* Form Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-[#003366] font-bold text-[10px] rounded-full uppercase tracking-wider">
                      <Calendar className="w-3 h-3 text-[#FF9900]" />
                      Created: {new Date(form.created_at).toLocaleDateString('en-IN')}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      form.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#003366] truncate mb-2">{form.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-3xl mb-4">
                    {form.description || 'No description or guidelines provided.'}
                  </p>
                  
                  {/* Stats Bar */}
                  <div className="flex flex-wrap gap-5 text-xs text-slate-500 font-semibold border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>{fieldCount} Input fields</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <Link 
                        href={`/dashboard/admin/forms/${form.id}/submissions`}
                        className="text-[#003366] hover:text-[#002244] hover:underline font-bold transition-colors"
                      >
                        {submissionCount} Submissions received
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Actions / Deletion */}
                <div className="flex-none self-end md:self-center">
                  {!isConfirming ? (
                    <Button 
                      variant="outline" 
                      onClick={() => setDeletingId(form.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Form
                    </Button>
                  ) : (
                    <div className="bg-red-50/50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-250">
                      <div className="text-left">
                        <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Confirm Deletion?
                        </p>
                        <p className="text-[10px] text-red-500 max-w-[200px] mt-0.5 leading-tight">
                          This deletes the form and all its {submissionCount} submissions permanently.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteForm(form.id)}
                          className="bg-red-600 hover:bg-red-700 text-xs font-bold px-3 py-1.5"
                        >
                          Yes, Delete
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                          className="border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
