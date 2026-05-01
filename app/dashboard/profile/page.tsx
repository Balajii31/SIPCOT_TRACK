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
  company_name?: string;
  company_sector?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
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
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          full_name: userProfile.full_name || '',
          company_name: userProfile.company_name || '',
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
        .from('users')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
        })
        .eq('id', profile.id);

      if (!error) {
        setProfile({
          ...profile,
          full_name: formData.full_name,
          company_name: formData.company_name,
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
    return <div className="p-8">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-8">Profile not found</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-8">User Profile</h1>

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

            <div>
              <Label htmlFor="company_name" className="text-foreground">
                Company Name
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="mt-2"
              />
            </div>

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
                    company_name: profile.company_name || '',
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

            <div>
              <Label className="text-foreground">Company Name</Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                {profile.company_name || 'Not provided'}
              </div>
            </div>

            {profile.company_sector && (
              <div>
                <Label className="text-foreground">Sector</Label>
                <div className="mt-2 p-3 bg-muted rounded-md text-foreground font-medium">
                  {profile.company_sector}
                </div>
              </div>
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
