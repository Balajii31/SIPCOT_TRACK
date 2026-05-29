'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, CheckCircle2, ClipboardList, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CustomForm {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface Submission {
  form_id: string;
  submitted_at: string;
}

export default function AllotteeFormsList() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [industryName, setIndustryName] = useState('');
  const [industryId, setIndustryId] = useState('');

  useEffect(() => {
    async function loadFormsAndSubmissions() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Session expired. Please sign in again.');
          setLoading(false);
          return;
        }

        // Get matching industry record
        const { data: industry, error: indError } = await supabase
          .from('industries')
          .select('id, name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (indError) throw indError;

        if (!industry) {
          // If no direct user_id link, check if we can link by profiles allottee_code
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

            if (linkedInd) {
              setIndustryName(linkedInd.name);
              setIndustryId(linkedInd.id);
              
              // Load active forms
              const { data: activeForms } = await supabase
                .from('custom_forms')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

              setForms(activeForms || []);

              // Load submissions
              const { data: subs } = await supabase
                .from('custom_form_submissions')
                .select('form_id, submitted_at')
                .eq('industry_id', linkedInd.id);

              const subMap: Record<string, Submission> = {};
              subs?.forEach(s => {
                subMap[s.form_id] = s;
              });
              setSubmissions(subMap);
            }
          }
        } else {
          setIndustryName(industry.name);
          setIndustryId(industry.id);

          // Load active forms
          const { data: activeForms } = await supabase
            .from('custom_forms')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          setForms(activeForms || []);

          // Load submissions
          const { data: subs } = await supabase
            .from('custom_form_submissions')
            .select('form_id, submitted_at')
            .eq('industry_id', industry.id);

          const subMap: Record<string, Submission> = {};
          subs?.forEach(s => {
            subMap[s.form_id] = s;
          });
          setSubmissions(subMap);
        }
      } catch (err: any) {
        console.error('Error loading forms:', err);
        toast.error('Failed to load forms data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFormsAndSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading custom forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#003366] mb-1">Custom Compliance Forms</h1>
        <p className="text-muted-foreground">
          Review and submit answers for additional surveys and audits requested by SIPCOT HQ.
        </p>
      </div>

      {/* Industry Info Banner */}
      {!industryName ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-8 text-sm text-amber-800 flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 mb-1">Account not associated with any Industrial Allottee</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              We could not find an industrial company linked to your user account. 
              Custom compliance forms are only visible to profiles linked to a registered SIPCOT industry via an <strong>Allottee Code</strong>. 
              Please edit your profile to add your code, or contact your administrator.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#003366]/5 border border-[#003366]/10 rounded-xl px-5 py-3 mb-8 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[#FF9900]" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">FILING ON BEHALF OF</span>
            <span className="font-bold text-[#003366] text-sm">{industryName}</span>
          </div>
        </div>
      )}

      {/* Forms Listing */}
      {forms.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">No forms published</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            There are no active custom forms published by the administrator at this time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forms.map(form => {
            const hasSubmitted = !!submissions[form.id];
            const submissionDate = hasSubmitted 
              ? new Date(submissions[form.id].submitted_at).toLocaleDateString('en-IN')
              : null;

            return (
              <Card 
                key={form.id} 
                className={`p-6 border-2 shadow-sm transition-all duration-300 flex flex-col justify-between ${
                  hasSubmitted 
                    ? 'border-green-100 hover:border-green-300/60 bg-green-50/10' 
                    : 'border-slate-100 hover:border-[#003366]/30'
                }`}
              >
                <div>
                  {/* Status header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-slate-400 font-mono">
                      PUBLISHED: {new Date(form.created_at).toLocaleDateString('en-IN')}
                    </span>
                    {hasSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Submitted ({submissionDate})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        Filing Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#003366] mb-2">{form.title}</h3>
                  <p className="text-slate-500 text-sm mb-6 line-clamp-3">
                    {form.description || 'No instructions provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-50/80 flex items-center justify-end">
                  {hasSubmitted ? (
                    <Link href={`/dashboard/allottee/forms/${form.id}`}>
                      <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50/50 hover:text-green-800 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1">
                        View Submitted Responses
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/allottee/forms/${form.id}`}>
                      <Button className="bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm group">
                        Fill Questionnaire
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
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
