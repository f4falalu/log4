import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, ClipboardList, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StorefrontHome() {
  const modules = [
    {
      title: 'Facilities',
      description: 'Manage delivery destinations and facility details',
      icon: Warehouse,
      href: '/storefront/facilities',
      color: 'bg-blue-500'
    },
    {
      title: 'Requisitions',
      description: 'Create and manage delivery requisitions',
      icon: ClipboardList,
      href: '/storefront/requisitions',
      color: 'bg-green-500'
    },
    {
      title: 'Payload Planning',
      description: 'Plan vehicle loads and optimize capacity',
      icon: Package,
      href: '/storefront/payloads',
      color: 'bg-purple-500'
    },
    {
      title: 'Batch Management',
      description: 'Organize deliveries into batches',
      icon: Truck,
      href: '/storefront/batches',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Storefront Operations</h1>
        <p className="text-muted-foreground">
          Manage warehouses, facilities, and delivery requisitions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((module) => (
          <Link key={module.href} to={module.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest warehouse operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Warehouse metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Facilities</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending Requisitions</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Batches Today</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
