const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: passwordHash, name }])
      .select()
      .single();
    
    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, name')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modules routes
app.get('/api/modules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .order('order_index');
    
    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return res.status(500).json({ error: 'Failed to fetch modules' });
    }
    
    // Get progress for each module
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        // Get lessons for this module
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', module.id);
        
        // Get completed lessons for this user
        const { data: completed } = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', userId)
          .eq('completed', true)
          .in('lesson_id', lessons?.map(l => l.id) || []);
        
        const completedLessons = completed?.length || 0;
        const totalLessons = lessons?.length || module.total_lessons;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        
        return {
          ...module,
          completed_lessons: completedLessons,
          progress_percentage: progressPercentage
        };
      })
    );
    
    res.json(modulesWithProgress);
  } catch (err) {
    console.error('Error getting modules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/modules/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const moduleId = req.params.id;
    
    // Get module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('*')
      .eq('id', moduleId)
      .single();
    
    if (moduleError || !module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Get lessons with progress
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        *,
        user_progress!left(completed, notes)
      `)
      .eq('module_id', moduleId)
      .order('order_index');
    
    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return res.status(500).json({ error: 'Failed to fetch lessons' });
    }
    
    // Format lessons with progress
    const lessonsWithProgress = lessons?.map(lesson => ({
      ...lesson,
      completed: lesson.user_progress?.[0]?.completed || false,
      notes: lesson.user_progress?.[0]?.notes || ''
    })) || [];
    
    res.json({
      module,
      lessons: lessonsWithProgress
    });
  } catch (err) {
    console.error('Error getting module:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Progress routes
app.get('/api/progress/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get total lessons
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id');
    
    // Get completed lessons for user
    const { data: completedLessons } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true);
    
    const totalLessons = allLessons?.length || 0;
    const completed = completedLessons?.length || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    
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
    const userId = req.user.userId;
    const { lessonId, completed, notes } = req.body;
    
    // Upsert progress
    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating progress:', error);
      return res.status(500).json({ error: 'Failed to update progress' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error updating lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});