import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, ClipboardList, Truck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StorefrontHome() {
  const modules = [
    {
      title: 'Facilities',
      description: 'Manage delivery destinations and facility details',
      icon: Warehouse,
      href: '/storefront/facilities',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      iconColor: 'text-blue-500'
    },
    {
      title: 'Requisitions',
      description: 'Create and manage delivery requisitions',
      icon: ClipboardList,
      href: '/storefront/requisitions',
      gradient: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      iconColor: 'text-green-500'
    },
    {
      title: 'Payload Planning',
      description: 'Plan vehicle loads and optimize capacity',
      icon: Package,
      href: '/storefront/payloads',
      gradient: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Batch Management',
      description: 'Organize deliveries into batches',
      icon: Truck,
      href: '/storefront/batches',
      gradient: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      iconColor: 'text-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="border-b bg-white">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Warehouse & Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage warehouses, facilities, and delivery requisitions
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.href} to={module.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className={`mb-3 rounded-lg ${module.bgColor} p-3`}>
                  <module.icon className={`h-6 w-6 ${module.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold">{module.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground text-center">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Activity & Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No recent activity</h3>
              <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                Activity will appear here once operations begin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Facilities
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Pending Requisitions
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Batches Today
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
