import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, Wrench, Fuel, Users, AlertTriangle, ClipboardCheck, ArrowRight } from 'lucide-react';

export default function VLMSPage() {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Vehicle Management',
      description: 'Manage your fleet vehicles, specifications, and documentation',
      icon: Car,
      href: '/fleetops/vlms/vehicles',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Maintenance Tracking',
      description: 'Schedule and track vehicle maintenance, repairs, and services',
      icon: Wrench,
      href: '/fleetops/vlms/maintenance',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Fuel Management',
      description: 'Log fuel purchases and track consumption efficiency',
      icon: Fuel,
      href: '/fleetops/vlms/fuel',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Vehicle Assignments',
      description: 'Assign vehicles to drivers and track assignments',
      icon: Users,
      href: '/fleetops/vlms/assignments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Incident Reports',
      description: 'Report and manage vehicle accidents, damage, and incidents',
      icon: AlertTriangle,
      href: '/fleetops/vlms/incidents',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Inspections',
      description: 'Conduct and track vehicle safety inspections',
      icon: ClipboardCheck,
      href: '/fleetops/vlms/inspections',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Vehicle Lifecycle Management System</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive fleet management solution for tracking vehicles from acquisition to disposal
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">Ready to add vehicles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">Under service</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">Currently assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.href}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(module.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${module.bgColor}`}>
                    <Icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{module.description}</p>
                <Button variant="link" className="px-0 mt-4">
                  Open Module
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
              1
            </div>
            <div>
              <p className="font-medium">Add Your First Vehicle</p>
              <p className="text-sm text-muted-foreground">
                Navigate to Vehicle Management and click "Add Vehicle" to register your first fleet vehicle
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
              2
            </div>
            <div>
              <p className="font-medium">Schedule Maintenance</p>
              <p className="text-sm text-muted-foreground">
                Set up maintenance schedules to keep your vehicles in optimal condition
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
              3
            </div>
            <div>
              <p className="font-medium">Assign to Drivers</p>
              <p className="text-sm text-muted-foreground">
                Create vehicle assignments to track who is using which vehicle
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
