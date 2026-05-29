'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, CheckCircle2, ArrowLeft, ClipboardCheck, Calendar, ShieldAlert 
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
  created_at: string;
}

export default function FormRendererPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);

  const [form, setForm] = useState<CustomForm | null>(null);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [industryName, setIndustryName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Submission response data
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Existing submission data if already filled
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFormAndUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Session expired. Please sign in again.');
          setLoading(false);
          return;
        }
        setUserId(user.id);

        // 1. Get industry associated with the user
        const { data: industry, error: indError } = await supabase
          .from('industries')
          .select('id, name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (indError) throw indError;

        let activeIndustry = industry;
        
        // If not linked directly, try allottee code fallback
        if (!activeIndustry) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('allottee_code')
            .eq('id', user.id)
            .single();

          if (profile?.allottee_code) {
            const { data: linkedInd } = await supabase
              .from('industries')
              .select('id, name')
              .eq('allottee_code', profile.allottee_code)
              .maybeSingle();
            
            if (linkedInd) activeIndustry = linkedInd;
          }
        }

        if (!activeIndustry) {
          toast.error('No industry associated with your account. Access denied.');
          setLoading(false);
          return;
        }

        setIndustryId(activeIndustry.id);
        setIndustryName(activeIndustry.name);

        // 2. Fetch the custom form definition
        const { data: formDef, error: formError } = await supabase
          .from('custom_forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (formError) throw formError;
        
        // Ensure schema is properly parsed if returned as string
        const parsedSchema = typeof formDef.schema === 'string' 
          ? JSON.parse(formDef.schema) 
          : formDef.schema;
        
        setForm({
          ...formDef,
          schema: parsedSchema
        });

        // 3. Check if a submission already exists for this form by this industry
        const { data: subData, error: subError } = await supabase
          .from('custom_form_submissions')
          .select('*')
          .eq('form_id', formId)
          .eq('industry_id', activeIndustry.id)
          .maybeSingle();

        if (subError) throw subError;

        if (subData) {
          setExistingSubmission(subData);
          setResponses(typeof subData.responses === 'string' ? JSON.parse(subData.responses) : subData.responses);
          setSubmitted(true);
        }
      } catch (err: any) {
        console.error('Error fetching dynamic form data:', err);
        toast.error('Failed to load form details: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFormAndUser();
  }, [formId]);

  const handleInputChange = (fieldId: string, value: string) => {
    if (existingSubmission) return; // Prevent edits if already submitted
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingSubmission) return;

    if (!form || !industryId || !userId) {
      toast.error('Authentication details missing. Please refresh.');
      return;
    }

    // Validation
    for (const field of form.schema) {
      const value = responses[field.id]?.trim();
      if (field.required && !value) {
        toast.error(`Please fill in required field: ${field.label}`);
        return;
      }
      if (field.type === 'number' && value && isNaN(Number(value))) {
        toast.error(`Field "${field.label}" must be a valid number`);
        return;
      }
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting form answers...');

    try {
      const { data, error } = await supabase
        .from('custom_form_submissions')
        .insert({
          form_id: formId,
          industry_id: industryId,
          responses: responses,
          submitted_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Form submitted successfully!');
      setExistingSubmission(data);
      setSubmitted(true);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Filing submission failed: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Evaluating form coordinates...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <Card className="p-8 border-2 border-dashed border-slate-200">
          <ShieldAlert className="w-12 h-12 text-[#C0392B] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Form Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            The questionnaire you are trying to access does not exist or has been archived.
          </p>
          <Link href="/dashboard/allottee/forms">
            <Button className="bg-[#003366] text-white">Back to Forms List</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard/allottee/forms" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003366] hover:text-[#002244] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Custom Forms
        </Link>
      </div>

      {/* Success banner if already submitted */}
      {existingSubmission && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-green-800 text-base">Filing Completed</h3>
            <p className="text-green-700 text-sm mt-0.5">
              This form was successfully submitted on behalf of <strong>{industryName}</strong> on{' '}
              {new Date(existingSubmission.submitted_at).toLocaleString('en-IN')}.
            </p>
            <span className="text-[10px] text-green-600 block mt-2 font-mono">
              Filing Receipt Ref: {existingSubmission.id.slice(0, 13).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Form Card */}
      <Card className="p-8 border-2 border-slate-100 shadow-sm bg-white">
        {/* Header */}
        <div className="border-b border-slate-100 pb-6 mb-8">
          <div className="flex items-center gap-2 mb-2 text-[#FF9900]">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold tracking-widest uppercase">SIPCOT COMPLIANCE FORM</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#003366]">{form.title}</h2>
          {form.description && (
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Interactive Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.schema.map((field) => {
            const isSelect = field.type === 'select';
            const value = responses[field.id] || '';

            return (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1 font-bold">*</span>
                  )}
                </label>

                {isSelect ? (
                  <div className="relative">
                    <select
                      id={field.id}
                      value={value}
                      required={field.required}
                      disabled={!!existingSubmission}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm bg-slate-50 disabled:bg-slate-100/50 disabled:opacity-80 disabled:cursor-not-allowed appearance-none cursor-pointer text-slate-800"
                    >
                      <option value="">-- Choose Option --</option>
                      {field.options && field.options.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {!existingSubmission && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    id={field.id}
                    placeholder={field.placeholder || `Enter response...`}
                    required={field.required}
                    disabled={!!existingSubmission}
                    value={value}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm bg-slate-50 disabled:bg-slate-100/50 disabled:opacity-80 disabled:cursor-not-allowed text-slate-800"
                  />
                )}
                {field.placeholder && !existingSubmission && (
                  <p className="text-[11px] text-slate-400 italic pl-1">{field.placeholder}</p>
                )}
              </div>
            );
          })}

          {/* Submission and Control Bar */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link href="/dashboard/allottee/forms">
              <Button type="button" variant="outline" className="border-slate-200 text-slate-700 font-semibold rounded-lg px-6 py-2.5">
                {existingSubmission ? 'Close' : 'Cancel'}
              </Button>
            </Link>
            {!existingSubmission && (
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-lg px-6 py-2.5 shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                <ClipboardCheck className="w-4 h-4" />
                {submitting ? 'Filing Responses...' : 'Submit Answers'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
