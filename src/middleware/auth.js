import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret_key', {
    expiresIn: '24h'
  });
};

export const authenticateToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      throw new Error('Authentication token required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

export const authenticateHTTP = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}; 