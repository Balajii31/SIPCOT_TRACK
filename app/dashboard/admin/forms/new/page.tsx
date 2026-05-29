'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Save, FileText, Check, AlertCircle, X, ListPlus 
} from 'lucide-react';
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

export default function NewFormBuilder() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  // Field Options State (temporary input for dropdown options)
  const [newOptionTexts, setNewOptionTexts] = useState<Record<string, string>>({});

  const addField = (type: 'text' | 'number' | 'select') => {
    const newField: FormField = {
      id: 'field_' + Math.random().toString(36).substr(2, 9),
      type,
      label: '',
      placeholder: '',
      required: false,
      ...(type === 'select' && { options: [] })
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    // Clean up option state
    const updatedOptionTexts = { ...newOptionTexts };
    delete updatedOptionTexts[id];
    setNewOptionTexts(updatedOptionTexts);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const updatedFields = [...fields];
    const [movedField] = updatedFields.splice(index, 1);
    updatedFields.splice(newIndex, 0, movedField);
    setFields(updatedFields);
  };

  // Selection Field Options management
  const addOption = (fieldId: string) => {
    const text = newOptionTexts[fieldId]?.trim();
    if (!text) {
      toast.error('Option text cannot be empty');
      return;
    }
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const currentOptions = field.options || [];
    if (currentOptions.includes(text)) {
      toast.error('Option already exists');
      return;
    }

    updateField(fieldId, {
      options: [...currentOptions, text]
    });
    
    // Clear input
    setNewOptionTexts({
      ...newOptionTexts,
      [fieldId]: ''
    });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    updateField(fieldId, {
      options: field.options.filter((_, idx) => idx !== optionIndex)
    });
  };

  const handleSaveForm = async () => {
    if (!title.trim()) {
      toast.error('Please enter a Form Title');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please add at least one input field');
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        toast.error('All fields must have a label');
        return;
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        toast.error(`Selection field "${field.label || 'Unnamed'}" must have at least one option`);
        return;
      }
    }

    setSaving(true);
    const loadingToast = toast.loading('Publishing custom compliance form...');

    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .insert({
          title: title.trim(),
          description: description.trim(),
          schema: fields,
          is_active: true
        })
        .select();

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Form created and published successfully!');
      
      // Reset form builder
      setTitle('');
      setDescription('');
      setFields([]);
      setNewOptionTexts({});
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to publish form: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#003366] flex items-center gap-2">
            <FileText className="w-8 h-8 text-[#FF9900]" />
            Custom Form Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Design dynamic compliance and audit questionnaires for industrial allottees.
          </p>
        </div>
        <Button 
          onClick={handleSaveForm} 
          disabled={saving}
          className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-3 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Publishing...' : 'Publish Form'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Setup & Fields List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="p-6 border-2 border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-[#003366] mb-4">Form Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Form Title</label>
                <input
                  type="text"
                  placeholder="e.g. Green Infrastructure & Pollution Audit"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Guidelines</label>
                <textarea
                  placeholder="Provide instructions or background context for allottees filling this form..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#003366] transition-colors text-sm resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Builder area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#003366]">Form Fields ({fields.length})</h2>
              {fields.length === 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF9900]" />
                  Add fields below to get started
                </span>
              )}
            </div>

            {fields.map((field, idx) => (
              <Card key={field.id} className="p-6 border-2 border-slate-100 shadow-sm relative group hover:border-[#003366]/30 transition-all">
                {/* Field Control Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-[#003366] rounded-full uppercase tracking-wider">
                      Field {idx + 1}: {field.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveField(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-400 hover:text-[#003366] hover:bg-slate-50 rounded transition-colors disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveField(idx, 'down')}
                      disabled={idx === fields.length - 1}
                      className="p-1.5 text-slate-400 hover:text-[#003366] hover:bg-slate-50 rounded transition-colors disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <button 
                      onClick={() => removeField(field.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove Field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Field configurations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Field Label / Question</label>
                    <input
                      type="text"
                      placeholder="e.g. Total area covered under solar panels (sq ft)"
                      value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-slate-100 rounded-lg text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Help Text / Placeholder</label>
                    <input
                      type="text"
                      placeholder="e.g. Enter 0 if not applicable"
                      value={field.placeholder}
                      onChange={e => updateField(field.id, { placeholder: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-slate-100 rounded-lg text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(field.id, { required: e.target.checked })}
                      className="rounded border-slate-300 text-[#003366] focus:ring-[#003366] w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-600">Strictly Required Field</span>
                  </label>
                </div>

                {/* Dropdown Options builder */}
                {field.type === 'select' && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Dropdown Options</label>
                    
                    {/* Add option input */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add option (e.g. Solar, Wind, Hydro)"
                        value={newOptionTexts[field.id] || ''}
                        onChange={e => setNewOptionTexts({ ...newOptionTexts, [field.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption(field.id))}
                        className="flex-1 px-3 py-1.5 border-2 border-slate-100 rounded-lg text-xs focus:outline-none focus:border-[#003366]"
                      />
                      <Button
                        type="button"
                        onClick={() => addOption(field.id)}
                        variant="outline"
                        className="border-slate-200 text-slate-700 px-3 py-1.5 text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>

                    {/* Options list */}
                    <div className="flex flex-wrap gap-1.5">
                      {field.options && field.options.map((opt, oIdx) => (
                        <span 
                          key={oIdx} 
                          className="inline-flex items-center gap-1 bg-[#003366]/5 border border-[#003366]/10 text-[#003366] text-xs font-medium px-2.5 py-1 rounded-md"
                        >
                          {opt}
                          <button 
                            type="button" 
                            onClick={() => removeOption(field.id, oIdx)}
                            className="text-[#003366]/60 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {(!field.options || field.options.length === 0) && (
                        <p className="text-[11px] text-red-500 italic mt-1">Please add at least one selection option.</p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {fields.length === 0 && (
              <Card className="border-2 border-dashed border-slate-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">No fields added yet</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Click one of the buttons on the right to append input modules to this form configuration.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Right Col: Add Fields Toolbox */}
        <div>
          <Card className="p-6 border-2 border-slate-100 shadow-sm sticky top-8">
            <h2 className="text-base font-bold text-[#003366] mb-4 flex items-center gap-1.5">
              <ListPlus className="w-4 h-4 text-[#FF9900]" />
              Field Toolbox
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Append input components to build your schema. Layout coordinates are evaluated dynamically.
            </p>

            <div className="space-y-3">
              {[
                { type: 'text' as const, label: 'Text Input', desc: 'Short alphanumeric responses' },
                { type: 'number' as const, label: 'Number Input', desc: 'Financial, counts, or capacity values' },
                { type: 'select' as const, label: 'Dropdown Selection', desc: 'Multiple options select menu' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => addField(item.type)}
                  className="w-full text-left p-3.5 rounded-xl border-2 border-slate-100 hover:border-[#FF9900]/40 hover:bg-[#FF9900]/5 transition-all group flex flex-col"
                >
                  <span className="font-bold text-[#003366] text-sm group-hover:text-[#FF9900] transition-colors">
                    + {item.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Preview Schema</h3>
              <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-4 rounded-xl max-h-[220px] overflow-auto">
                <pre>{JSON.stringify({ title, description, schema: fields }, null, 2)}</pre>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
