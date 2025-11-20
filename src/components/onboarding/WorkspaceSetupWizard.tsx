/**
 * Workspace Setup Wizard
 *
 * This wizard guides new users through setting up their workspace:
 * 1. Select Country
 * 2. Create Workspace
 * 3. Import Admin Boundaries (Optional)
 *
 * Only shown on first login if user has no workspace assigned.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_COUNTRY_NIGERIA_ID } from '@/lib/constants';
import { Globe, Building2, MapPin, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface Country {
  id: string;
  name: string;
  iso_code: string;
  iso3_code: string;
}

type WizardStep = 'country' | 'workspace' | 'boundaries' | 'complete';

export default function WorkspaceSetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>('country');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  // Auto-generate slug from workspace name
  const handleWorkspaceNameChange = (name: string) => {
    setWorkspaceName(name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setWorkspaceSlug(slug);
  };

  // Step 1: Country Selection
  const handleCountrySelect = async () => {
    if (!selectedCountry) {
      toast({
        title: 'Country Required',
        description: 'Please select a country to continue',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep('workspace');
  };

  // Step 2: Workspace Creation
  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim() || !workspaceSlug.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a workspace name',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedCountry) {
      toast({
        title: 'Error',
        description: 'Country not selected',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);

      const { data, error } = await supabase
        .from('workspaces')
        .insert([{
          name: workspaceName.trim(),
          slug: workspaceSlug.trim(),
          country_id: selectedCountry.id,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setCreatedWorkspaceId(data.id);

      toast({
        title: 'Workspace Created',
        description: `${workspaceName} has been created successfully!`,
      });

      setCurrentStep('boundaries');
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create workspace',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Step 3: Import Boundaries (Optional)
  const handleSkipBoundaries = () => {
    setCurrentStep('complete');
  };

  const handleImportBoundaries = async () => {
    if (!createdWorkspaceId || !selectedCountry) return;

    try {
      const { data, error } = await supabase.functions.invoke('import-boundaries', {
        body: {
          region: selectedCountry.iso_code.toLowerCase(),
          adminLevels: [4, 6], // States and LGAs
          countryId: selectedCountry.id,
          workspaceId: createdWorkspaceId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Import Started',
        description: 'Admin boundaries are being imported in the background',
      });

      setCurrentStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: 'You can import boundaries later from Location Management',
        variant: 'destructive',
      });
      // Still allow to continue
      setCurrentStep('complete');
    }
  };

  // Step 4: Complete
  const handleFinish = () => {
    navigate('/');
    window.location.reload(); // Reload to apply workspace context
  };

  const getStepProgress = () => {
    const steps: WizardStep[] = ['country', 'workspace', 'boundaries', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {currentStep === 'country' && <Globe className="h-6 w-6 text-primary" />}
                {currentStep === 'workspace' && <Building2 className="h-6 w-6 text-primary" />}
                {currentStep === 'boundaries' && <MapPin className="h-6 w-6 text-primary" />}
                {currentStep === 'complete' && <CheckCircle className="h-6 w-6 text-green-600" />}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {currentStep === 'country' && 'Select Your Country'}
                  {currentStep === 'workspace' && 'Create Your Workspace'}
                  {currentStep === 'boundaries' && 'Import Admin Boundaries'}
                  {currentStep === 'complete' && 'Setup Complete!'}
                </CardTitle>
                <CardDescription>
                  {currentStep === 'country' && 'Choose the country where you operate'}
                  {currentStep === 'workspace' && 'Set up your organization workspace'}
                  {currentStep === 'boundaries' && 'Download geographic boundaries (optional)'}
                  {currentStep === 'complete' && 'Your workspace is ready to use'}
                </CardDescription>
              </div>
            </div>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Country Selection */}
          {currentStep === 'country' && (
            <div className="space-y-4">
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Your workspace will operate within one country. You can create additional workspaces for other countries later.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={selectedCountry?.id}
                  onValueChange={(value) => {
                    // For now, hardcoded to Nigeria
                    setSelectedCountry({
                      id: DEFAULT_COUNTRY_NIGERIA_ID,
                      name: 'Nigeria',
                      iso_code: 'NG',
                      iso3_code: 'NGA',
                    });
                  }}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_COUNTRY_NIGERIA_ID}>
                      🇳🇬 Nigeria
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCountry && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription>
                    <strong>{selectedCountry.name}</strong> selected. You'll be able to import states, LGAs, and wards from OpenStreetMap.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Workspace Creation */}
          {currentStep === 'workspace' && (
            <div className="space-y-4">
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  Create a workspace for your organization. All your facilities, zones, and data will belong to this workspace.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Kano Pharma, Lagos Health Services"
                  value={workspaceName}
                  onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-slug">Workspace URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">app.example.com/</span>
                  <Input
                    id="workspace-slug"
                    placeholder="kano-pharma"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                    disabled={isCreating}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-generated from workspace name. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>

              {selectedCountry && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Country:</strong> {selectedCountry.name} ({selectedCountry.iso_code})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Import Boundaries */}
          {currentStep === 'boundaries' && (
            <div className="space-y-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Import administrative boundaries (States, LGAs) from OpenStreetMap. This is optional and can be done later.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">What will be imported</h4>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• All states in {selectedCountry?.name}</li>
                      <li>• All LGAs (Local Government Areas)</li>
                      <li>• Geographic boundaries for mapping</li>
                      <li>• Population and area data</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-sm">
                    <strong>Note:</strong> The import process downloads ~300MB of data and may take 5-10 minutes. You can skip this and import boundaries later from the Location Management page.
                  </AlertDescription>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4 text-center py-8">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">You're all set!</h3>
                <p className="text-muted-foreground mt-2">
                  Your workspace <strong>{workspaceName}</strong> has been created and is ready to use.
                </p>
              </div>
              <Alert className="text-left">
                <AlertDescription>
                  <strong>Next steps:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Add facilities to your workspace</li>
                    <li>• Create operational zones</li>
                    <li>• Import admin boundaries (if skipped)</li>
                    <li>• Invite team members</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {currentStep !== 'country' && currentStep !== 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                const steps: WizardStep[] = ['country', 'workspace', 'boundaries'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1]);
                }
              }}
              disabled={isCreating}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep === 'country' && (
            <Button onClick={handleCountrySelect} disabled={!selectedCountry} className="ml-auto">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 'workspace' && (
            <Button onClick={handleCreateWorkspace} disabled={isCreating || !workspaceName.trim()} className="ml-auto">
              {isCreating ? 'Creating...' : 'Create Workspace'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 'boundaries' && (
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleSkipBoundaries}>
                Skip for Now
              </Button>
              <Button onClick={handleImportBoundaries}>
                Import Boundaries
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {currentStep === 'complete' && (
            <Button onClick={handleFinish} className="ml-auto">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
