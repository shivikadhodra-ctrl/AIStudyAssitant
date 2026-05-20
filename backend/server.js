const express    = require('express');
const dotenv     = require('dotenv');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const connectDB        = require('./config/db');
const rateLimiter      = require('./middleware/rateLimiter');
const errorHandler     = require('./middleware/errorHandler');
const authRoutes       = require('./routes/Auth');
const workspaceRoutes  = require('./routes/Workspaces');
const aiRoutes         = require('./routes/Ai');

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Type'],
}))
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', rateLimiter);

app.use('/api/auth',       authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai',         aiRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'AI Study Assistant API running' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});