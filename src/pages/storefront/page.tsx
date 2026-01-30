import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  ShoppingCart,
  FileText,
  CalendarClock,
  Layers,
  Building2,
  Warehouse as WarehouseIcon,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StorefrontHome() {
  const moduleGroups = [
    {
      label: 'Order Management',
      modules: [
        {
          title: 'Items',
          description: 'Inventory management and stock information',
          icon: Package,
          href: '/storefront/items',
          color: 'bg-primary'
        },
        {
          title: 'Requisitions',
          description: 'Create and manage delivery requisitions',
          icon: ShoppingCart,
          href: '/storefront/requisitions',
          color: 'bg-success'
        },
        {
          title: 'Invoice',
          description: 'Generate and manage delivery invoices',
          icon: FileText,
          href: '/storefront/invoice',
          color: 'bg-info'
        },
      ]
    },
    {
      label: 'Planning',
      modules: [
        {
          title: 'Scheduler',
          description: 'Plan and organize delivery batches for dispatch',
          icon: CalendarClock,
          href: '/storefront/scheduler',
          color: 'bg-warning'
        },
      ]
    },
    {
      label: 'Resources',
      modules: [
        {
          title: 'Zones',
          description: 'Manage service zones and territories',
          icon: Layers,
          href: '/storefront/zones',
          color: 'bg-violet-500'
        },
        {
          title: 'Facilities',
          description: 'Manage delivery destinations and facility details',
          icon: Building2,
          href: '/storefront/facilities',
          color: 'bg-cyan-500'
        },
        {
          title: 'Warehouse',
          description: 'Warehouse management and storage zones',
          icon: WarehouseIcon,
          href: '/storefront/warehouse',
          color: 'bg-orange-500'
        },
      ]
    },
    {
      label: 'Analytics',
      modules: [
        {
          title: 'Stock Reports',
          description: 'Inventory analytics and reporting',
          icon: BarChart3,
          href: '/storefront/stock-reports',
          color: 'bg-pink-500'
        },
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Storefront Operations</h1>
        <p className="text-muted-foreground mt-2">
          Manage inventory, requisitions, invoices, and warehouse resources
        </p>
      </div>

      <div className="space-y-8">
        {moduleGroups.map((group) => (
          <div key={group.label}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.modules.map((module) => (
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
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest storefront operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Storefront metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Items</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending Requisitions</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Invoices</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Warehouses</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
