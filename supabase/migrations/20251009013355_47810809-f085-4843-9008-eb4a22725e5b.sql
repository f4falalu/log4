-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('system_admin', 'warehouse_officer', 'driver', 'zonal_manager', 'viewer');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'system_admin'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for delivery_batches
DROP POLICY IF EXISTS "Allow all operations on delivery_batches" ON public.delivery_batches;

CREATE POLICY "Authenticated users can view batches"
  ON public.delivery_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can create batches"
  ON public.delivery_batches FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Warehouse officers can update batches"
  ON public.delivery_batches FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Drivers can update their assigned batches"
  ON public.delivery_batches FOR UPDATE
  USING (driver_id::text = auth.uid()::text);

-- Update RLS policies for drivers
DROP POLICY IF EXISTS "Allow all operations on drivers" ON public.drivers;

CREATE POLICY "Authenticated users can view drivers"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage drivers"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Drivers can update their own location and status"
  ON public.drivers FOR UPDATE
  USING (id::text = auth.uid()::text);

-- Update RLS policies for facilities
DROP POLICY IF EXISTS "Allow all operations on facilities" ON public.facilities;

CREATE POLICY "Authenticated users can view facilities"
  ON public.facilities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage facilities"
  ON public.facilities FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for vehicles
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for warehouses
DROP POLICY IF EXISTS "Allow all operations on warehouses" ON public.warehouses;

CREATE POLICY "Authenticated users can view warehouses"
  ON public.warehouses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage warehouses"
  ON public.warehouses FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'));

-- Update RLS policies for optimization_cache
DROP POLICY IF EXISTS "Allow all operations on optimization_cache" ON public.optimization_cache;

CREATE POLICY "Authenticated users can view cache"
  ON public.optimization_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage cache"
  ON public.optimization_cache FOR ALL
  USING (auth.role() = 'authenticated');

-- Update RLS policies for route_history
DROP POLICY IF EXISTS "Allow all operations on route_history" ON public.route_history;

CREATE POLICY "Authenticated users can view route history"
  ON public.route_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage route history"
  ON public.route_history FOR ALL
  USING (
    public.has_role(auth.uid(), 'warehouse_officer') OR 
    public.has_role(auth.uid(), 'system_admin')
  );