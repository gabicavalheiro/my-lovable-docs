
-- Create modules table
CREATE TABLE public.doc_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pages table
CREATE TABLE public.doc_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.doc_modules(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES public.doc_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, slug)
);

-- Enable RLS
ALTER TABLE public.doc_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_pages ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view modules" ON public.doc_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view pages" ON public.doc_pages FOR SELECT USING (true);

-- Authenticated users can manage (for now, any authenticated user - can restrict later)
CREATE POLICY "Authenticated users can create modules" ON public.doc_modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update modules" ON public.doc_modules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete modules" ON public.doc_modules FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can create pages" ON public.doc_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pages" ON public.doc_pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pages" ON public.doc_pages FOR DELETE TO authenticated USING (true);

-- Timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_doc_modules_updated_at BEFORE UPDATE ON public.doc_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doc_pages_updated_at BEFORE UPDATE ON public.doc_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
