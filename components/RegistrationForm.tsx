'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Shield, UserCog, Mail, Lock, User, 
  MapPin, Briefcase, Hash, Phone, AlertCircle, 
  CheckCircle2, ChevronRight, Loader2, ArrowLeft,
  Building, UserCheck, FileText, Smartphone
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISTRICTS = [
  'Chennai', 'Coimbatore', 'Kancheepuram', 'Madurai', 'Salem', 
  'Trichy', 'Vellore', 'Erode', 'Tiruppur', 'Thoothukudi', 
  'Cuddalore', 'Thiruvallur', 'Krishnagiri', 'Ranipet'
].sort();

const DEPARTMENTS = [
  'Projects', 'Planning', 'Land Acquisition', 'Finance', 'Environmental',
  'IT & Smart Cities', 'Legal', 'Administration', 'District Office'
].sort();

const PARKS = [
  'Hosur I', 'Hosur II', 'Sriperumbudur', 'Oragadam', 'Gummidipoondi',
  'Ranipet', 'Cuddalore', 'Perundurai', 'Cheyyar', 'Gangaikondan'
].sort();

const registrationSchema = z.object({
  role: z.enum(['industry', 'official', 'admin']),
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  // Industry specific
  industryName: z.string().optional(),
  allotteeCode: z.string().optional(),
  parkName: z.string().optional(),
  phoneNumber: z.string().optional(),
  
  // Official specific
  designation: z.string().optional(),
  officialId: z.string().optional(),
  assignedPark: z.string().optional(),
  reasonForAccess: z.string().optional(),
  
  // Admin specific
  adminLevel: z.string().optional(),
  hqDepartment: z.string().optional(),
}).refine((data) => {
  if (data.role === 'industry') {
    return !!data.industryName && !!data.parkName && !!data.phoneNumber;
  }
  if (data.role === 'official') {
    return !!data.designation && !!data.officialId && !!data.assignedPark && !!data.reasonForAccess;
  }
  if (data.role === 'admin') {
    return !!data.adminLevel && !!data.hqDepartment && !!data.phoneNumber;
  }
  return true;
}, {
  message: "Please fill all required fields for your role",
  path: ["role"],
});

type FormData = z.infer<typeof registrationSchema>;

export default function RegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<'industry' | 'official' | 'admin'>('industry');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: 'industry',
      fullName: '',
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const meta = {
        full_name: data.fullName,
        role: data.role,
        ...(data.role === 'industry' && {
          industry_name: data.industryName,
          allottee_code: data.allotteeCode,
          park_name: data.parkName,
          phone_number: data.phoneNumber,
        }),
        ...(data.role === 'official' && {
          designation: data.designation,
          official_id: data.officialId,
          assigned_park: data.assignedPark,
          reason_for_access: data.reasonForAccess,
        }),
        ...(data.role === 'admin' && {
          admin_level: data.adminLevel,
          hq_department: data.hqDepartment,
          phone_number: data.phoneNumber,
        }),
      };

      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: meta },
      });

      if (authError) throw authError;

      setSuccess(true);
      if (data.role === 'industry') {
        toast.success('Registration successful! Redirecting...');
        setTimeout(() => router.push('/allottee/update'), 2000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success && role !== 'industry') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Approval Pending</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your account has been created and is awaiting manual approval by an HQ Administrator. 
            You will be notified via email once activated.
          </p>
          <button 
            onClick={() => router.push('/')}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" 
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400 uppercase">
              Government of Tamil Nadu
            </span>
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            SIPCOT <span className="text-blue-500">TRACK</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">Smart Registration Portal</p>
        </div>

        {/* Card */}
        <motion.div 
          layout
          className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200"
        >
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Role Selection */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Your Access Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'industry', label: 'Industry', icon: Building2, color: 'blue' },
                    { id: 'official', label: 'Official', icon: Shield, color: 'indigo' },
                    { id: 'admin', label: 'HQ Admin', icon: UserCog, color: 'violet' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRole(r.id as any);
                        reset({ ...watch(), role: r.id as any });
                      }}
                      className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                        role === r.id 
                        ? 'border-blue-600 bg-blue-50/50' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${role === r.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <r.icon size={18} />
                      </div>
                      <span className={`text-sm font-bold ${role === r.id ? 'text-blue-700' : 'text-slate-500'}`}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      {...register('fullName')}
                      placeholder="e.g. John Doe"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      {...register('email')}
                      type="email"
                      placeholder="name@organization.com"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                </div>
              </div>

              {/* Role Specific Fields with AnimatePresence */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={role}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100"
                >
                  {role === 'industry' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Company Name</label>
                        <div className="relative">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('industryName')}
                            placeholder="Official Industry Name"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Allottee Code</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('allotteeCode')}
                            placeholder="Unique ID (if any)"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">SIPCOT Park</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                            {...register('parkName')}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 appearance-none"
                          >
                            <option value="">Select a Park</option>
                            {PARKS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('phoneNumber')}
                            placeholder="+91 98765 43210"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {role === 'official' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
                        <div className="relative">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('designation')}
                            placeholder="e.g. Park Manager"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Official ID</label>
                        <div className="relative">
                          <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('officialId')}
                            placeholder="Employee Code"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Assigned District/Park</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                            {...register('assignedPark')}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 appearance-none"
                          >
                            <option value="">Select Location</option>
                            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Reason for Access</label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('reasonForAccess')}
                            placeholder="Verification Queue access"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {role === 'admin' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Admin Level</label>
                        <div className="relative">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                            {...register('adminLevel')}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 appearance-none"
                          >
                            <option value="">Select Level</option>
                            <option value="State HQ">State HQ Admin</option>
                            <option value="Regional">Regional Admin</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">HQ Department</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                            {...register('hqDepartment')}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 appearance-none"
                          >
                            <option value="">Select Department</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Official Mobile Number</label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            {...register('phoneNumber')}
                            placeholder="+91 98765 43210"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Secure Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    {...register('password')}
                    type="password"
                    placeholder="Min. 8 characters"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    Initialize Account
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 p-6 text-center border-t border-slate-200">
            <p className="text-slate-500 text-sm font-medium">
              Existing user? 
              <button 
                onClick={() => router.push('/login')}
                className="ml-2 text-blue-600 font-bold hover:underline"
              >
                Sign in to Dashboard
              </button>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">
          SIPCOT TRACK © 2026 · Secure Infrastructure & Compliance Monitoring Platform
        </p>
      </div>
    </div>
  );
}
