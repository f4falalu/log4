import { useState } from 'react';
import { format } from 'date-fns';
import { Facility, Delivery } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Package, AlertTriangle } from 'lucide-react';

interface SchedulingFormProps {
  facilities: Facility[];
  deliveries: Delivery[];
  onDeliveryCreate: (delivery: Delivery) => void;
}

const SchedulingForm = ({ facilities, deliveries, onDeliveryCreate }: SchedulingFormProps) => {
  const [formData, setFormData] = useState({
    facilityId: '',
    scheduledDate: '',
    scheduledTime: '',
    driver: '',
    medicationType: '',
    quantity: '',
    priority: 'medium',
    estimatedDuration: '30',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const facility = facilities.find(f => f.id === formData.facilityId);
      if (!facility) {
        toast({
          title: "Error",
          description: "Please select a valid facility",
          variant: "destructive",
        });
        return;
      }

      const delivery: Delivery = {
        id: `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        facilityId: formData.facilityId,
        facilityName: facility.name,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        status: 'scheduled',
        driver: formData.driver.trim() || undefined,
        medicationType: formData.medicationType,
        quantity: parseInt(formData.quantity),
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        notes: formData.notes.trim() || undefined,
        estimatedDuration: parseInt(formData.estimatedDuration),
        createdAt: new Date().toISOString(),
      };

      onDeliveryCreate(delivery);

      toast({
        title: "Delivery scheduled",
        description: `Delivery to ${facility.name} scheduled for ${format(new Date(formData.scheduledDate), 'MMM d, yyyy')} at ${formData.scheduledTime}`,
      });

      // Reset form
      setFormData({
        facilityId: '',
        scheduledDate: '',
        scheduledTime: '',
        driver: '',
        medicationType: '',
        quantity: '',
        priority: 'medium',
        estimatedDuration: '30',
        notes: '',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule delivery",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    return priority === 'urgent' || priority === 'high' ? AlertTriangle : Package;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>Schedule New Delivery</span>
          </CardTitle>
          <CardDescription>
            Create a new pharmaceutical delivery schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facility Selection */}
              <div className="space-y-2">
                <Label htmlFor="facility">Facility *</Label>
                <Select 
                  value={formData.facilityId} 
                  onValueChange={(value) => handleInputChange('facilityId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{facility.name}</span>
                          <span className="text-sm text-muted-foreground">({facility.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Driver */}
              <div className="space-y-2">
                <Label htmlFor="driver">Driver</Label>
                <Input
                  id="driver"
                  value={formData.driver}
                  onChange={(e) => handleInputChange('driver', e.target.value)}
                  placeholder="Enter driver name"
                />
              </div>

              {/* Medication Type */}
              <div className="space-y-2">
                <Label htmlFor="medicationType">Medication Type *</Label>
                <Input
                  id="medicationType"
                  value={formData.medicationType}
                  onChange={(e) => handleInputChange('medicationType', e.target.value)}
                  placeholder="e.g., Insulin, Antibiotics"
                  required
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="Number of units"
                  min="1"
                  required
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-yellow-600" />
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Urgent</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                  min="5"
                  max="480"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Special instructions, delivery requirements, etc."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || facilities.length === 0}
                className="bg-gradient-medical hover:opacity-90"
              >
                <Clock className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Scheduling...' : 'Schedule Delivery'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {facilities.length === 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">No facilities available</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Please add facilities before scheduling deliveries.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchedulingForm;