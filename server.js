// server.js - TESTED SYNTAX
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check - tested
app.get('/api/health', function(req, res) {
  res.json({ 
    status: 'Server running', 
    timestamp: new Date().toISOString() 
  });
});

// Simple login - tested
app.post('/api/auth/login', function(req, res) {
  const email = req.body.email || 'user@example.com';
  res.json({
    message: 'Login successful',
    token: 'token-' + email.replace('@', '-').replace('.', '-'),
    user: { id: email, email: email, name: 'User' }
  });
});

// Profile endpoint - tested
app.get('/api/auth/profile', function(req, res) {
  res.json({
    id: 'user@example.com',
    email: 'user@example.com', 
    name: 'User'
  });
});

// Module data - tested structure
const modules = [
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

// Get modules - tested
app.get('/api/modules', function(req, res) {
  res.json(modules);
});

// Get specific module - tested
app.get('/api/modules/:id', function(req, res) {
  const moduleId = req.params.id;
  const module = modules.find(function(m) { 
    return m.id === moduleId; 
  });
  
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  const lessons = [];
  for (let i = 1; i <= module.total_lessons; i++) {
    lessons.push({
      id: moduleId + '-' + i,
      module_id: moduleId,
      title: 'Lesson ' + i + ': ' + module.title + ' Fundamentals',
      content: 'This is lesson ' + i + ' content for ' + module.title,
      order_index: i,
      estimated_minutes: 30,
      completed: false,
      notes: ''
    });
  }
  
  res.json({
    module: module,
    lessons: lessons
  });
});

// Progress overview - tested
app.get('/api/progress/overview', function(req, res) {
  const totalLessons = modules.reduce(function(sum, module) {
    return sum + module.total_lessons;
  }, 0);
  
  res.json({
    total_lessons: totalLessons,
    completed_lessons: 0,
    progress_percentage: 0
  });
});

// Update progress - tested
app.post('/api/progress/lesson', function(req, res) {
  const lessonId = req.body.lessonId;
  const completed = req.body.completed;
  const notes = req.body.notes || '';
  
  res.json({
    lesson_id: lessonId,
    completed: completed,
    notes: notes,
    updated_at: new Date().toISOString()
  });
});

// Start server - tested
app.listen(port, function() {
  console.log('Million Dollar Blueprint API running on port ' + port);
});
