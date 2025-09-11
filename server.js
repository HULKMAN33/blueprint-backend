const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simple Supabase client without the problematic import
const createSupabaseClient = (url, key) => {
  return {
    from: (table) => ({
      select: (columns = '*') => ({
        eq: (column, value) => ({
          single: async () => {
            try {
              const response = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                }
              });
              const data = await response.json();
              return { data: data[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
          async () => {
            try {
              const response = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                }
              });
              const data = await response.json();
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        }),
        order: (column) => ({
          async () => {
            try {
              const response = await fetch(`${url}/rest/v1/${table}?select=${columns}&order=${column}`, {
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                }
              });
              const data = await response.json();
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        }),
        async () => {
          try {
            const response = await fetch(`${url}/rest/v1/${table}?select=${columns}`, {
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
              }
            });
            const data = await response.json();
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        }
      }),
      insert: (records) => ({
        select: () => ({
          single: async () => {
            try {
              const response = await fetch(`${url}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(Array.isArray(records) ? records[0] : records)
              });
              const data = await response.json();
              return { data: data[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        })
      }),
      upsert: (records) => ({
        select: () => ({
          single: async () => {
            try {
              const response = await fetch(`${url}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation,resolution=merge-duplicates'
                },
                body: JSON.stringify(records)
              });
              const data = await response.json();
              return { data: data[0] || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        })
      })
    })
  };
};

const app = express();
const port = process.env.PORT || 5000;

// Initialize simple Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://wicgporgkaterpqajzhn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpY2dwb3Jna2F0ZXJwcWFqemhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MzA4NSwiZXhwIjoyMDcyMTE5MDg1fQ.rAGKiLS5c6Cl1DC8SXi4_bFD2Cl7_EKiwomCFa74MkU';
const jwtSecret = process.env.JWT_SECRET || 'blueprint-secret-key-2025';

const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Simple user creation for now - in production you'd want proper validation
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: email, email: email },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: email, email: email, name: name }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Simple login for now - in production you'd want proper user validation
    const token = jwt.sign(
      { userId: email, email: email },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: email, email: email, name: 'User' }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    
    res.json({
      id: email,
      email: email,
      name: 'User',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error getting profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock data for modules
const mockModules = [
  {
    id: '1',
    title: 'AI Skills Mastery',
    description: 'Master AI tools and automation to 10x your productivity',
    order_index: 1,
    total_lessons: 8,
    estimated_hours: 12,
    icon: 'Bot',
    color: '#3B82F6',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '2',
    title: 'SaaS Development',
    description: 'Build and launch profitable SaaS products',
    order_index: 2,
    total_lessons: 10,
    estimated_hours: 20,
    icon: 'Globe',
    color: '#10B981',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '3',
    title: 'App Creation',
    description: 'Create mobile and web applications that generate revenue',
    order_index: 3,
    total_lessons: 9,
    estimated_hours: 15,
    icon: 'Smartphone',
    color: '#8B5CF6',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '4',
    title: 'Content Empire',
    description: 'Build YouTube channel and content that scales to millions',
    order_index: 4,
    total_lessons: 12,
    estimated_hours: 18,
    icon: 'Video',
    color: '#EF4444',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '5',
    title: 'Prompt Engineering',
    description: 'Master AI interactions for maximum output and efficiency',
    order_index: 5,
    total_lessons: 6,
    estimated_hours: 8,
    icon: 'MessageCircle',
    color: '#F59E0B',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '6',
    title: 'E-commerce Mastery',
    description: 'Launch and scale profitable online stores',
    order_index: 6,
    total_lessons: 11,
    estimated_hours: 16,
    icon: 'ShoppingCart',
    color: '#06B6D4',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '7',
    title: 'Lead Generation',
    description: 'Build systems that generate qualified leads automatically',
    order_index: 7,
    total_lessons: 8,
    estimated_hours: 12,
    icon: 'Target',
    color: '#EC4899',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '8',
    title: 'Sales Conversion',
    description: 'Master high-ticket sales and closing techniques',
    order_index: 8,
    total_lessons: 7,
    estimated_hours: 10,
    icon: 'TrendingUp',
    color: '#84CC16',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '9',
    title: 'Marketing Automation',
    description: 'Create marketing funnels that convert at scale',
    order_index: 9,
    total_lessons: 9,
    estimated_hours: 14,
    icon: 'Megaphone',
    color: '#F97316',
    completed_lessons: 0,
    progress_percentage: 0
  },
  {
    id: '10',
    title: 'Business Growth',
    description: 'Scale operations and systems to reach $1M revenue',
    order_index: 10,
    total_lessons: 10,
    estimated_hours: 15,
    icon: 'Award',
    color: '#6366F1',
    completed_lessons: 0,
    progress_percentage: 0
  }
];

// Modules routes
app.get('/api/modules', authenticateToken, async (req, res) => {
  try {
    res.json(mockModules);
  } catch (err) {
    console.error('Error getting modules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/modules/:id', authenticateToken, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const module = mockModules.find(m => m.id === moduleId);
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Mock lessons for the module
    const mockLessons = [];
    for (let i = 1; i <= module.total_lessons; i++) {
      mockLessons.push({
        id: `${moduleId}-${i}`,
        module_id: moduleId,
        title: `Lesson ${i}: ${module.title} Fundamentals`,
        content: `This is lesson ${i} content for ${module.title}. Learn the fundamentals and apply them to your business.`,
        order_index: i,
        estimated_minutes: 30,
        lesson_type: 'content',
        completed: false,
        notes: ''
      });
    }
    
    res.json({
      module,
      lessons: mockLessons
    });
  } catch (err) {
    console.error('Error getting module:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Progress routes
app.get('/api/progress/overview', authenticateToken, async (req, res) => {
  try {
    const totalLessons = mockModules.reduce((sum, module) => sum + module.total_lessons, 0);
    const completed = 0; // For now, no progress tracking
    const progressPercentage = 0;
    
    res.json({
      total_lessons: totalLessons,
      completed_lessons: completed,
      progress_percentage: progressPercentage
    });
  } catch (err) {
    console.error('Error getting progress overview:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/progress/lesson', authenticateToken, async (req, res) => {
  try {
    const { lessonId, completed, notes } = req.body;
    
    // For now, just return success - in production you'd save to database
    res.json({
      lesson_id: lessonId,
      completed: completed,
      notes: notes || '',
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error updating lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
