'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  industry_name?: string;
  allottee_code?: string;
  district?: string;
  department?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    industry_name: '',
    district: '',
    department: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          full_name: userProfile.full_name || '',
          industry_name: userProfile.industry_name || '',
          district: userProfile.district || '',
          department: userProfile.department || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          ...(profile.role === 'industry' && { industry_name: formData.industry_name }),
          ...(profile.role === 'official' && { district: formData.district, department: formData.department }),
        })
        .eq('id', profile.id);

      if (!error) {
        setProfile({
          ...profile,
          full_name: formData.full_name,
          industry_name: formData.industry_name,
          district: formData.district,
          department: formData.department,
        });
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-foreground">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-foreground">Profile not found</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-[#003366] mb-8">User Profile</h1>

      <Card className="p-8 space-y-6">
        <div>
          <Label className="text-foreground">Email (cannot be changed)</Label>
          <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
            {profile.email}
          </div>
        </div>

        <div>
          <Label className="text-foreground">Role</Label>
          <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </div>
        </div>

        {editing ? (
          <>
            <div>
              <Label htmlFor="full_name" className="text-foreground">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="mt-2"
              />
            </div>

            {profile.role === 'industry' && (
              <div>
                <Label htmlFor="industry_name" className="text-foreground">
                  Industry Name
                </Label>
                <Input
                  id="industry_name"
                  value={formData.industry_name}
                  onChange={(e) =>
                    setFormData({ ...formData, industry_name: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            )}

            {profile.role === 'official' && (
              <>
                <div>
                  <Label htmlFor="district" className="text-foreground">
                    District
                  </Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="department" className="text-foreground">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    full_name: profile.full_name || '',
                    industry_name: profile.industry_name || '',
                    district: profile.district || '',
                    department: profile.department || '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-foreground">Full Name</Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                {profile.full_name || 'Not provided'}
              </div>
            </div>

            {profile.role === 'industry' && (
              <>
                <div>
                  <Label className="text-foreground">Industry Name</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                    {profile.industry_name || 'Not provided'}
                  </div>
                </div>

                <div>
                  <Label className="text-foreground">Allottee Code</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                    {profile.allottee_code || 'Not linked'}
                  </div>
                </div>
              </>
            )}

            {profile.role === 'official' && (
              <>
                <div>
                  <Label className="text-foreground">District</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                    {profile.district || 'Not provided'}
                  </div>
                </div>

                <div>
                  <Label className="text-foreground">Department</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                    {profile.department || 'Not provided'}
                  </div>
                </div>
              </>
            )}

            <Button onClick={() => setEditing(true)} className="w-full">
              Edit Profile
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
