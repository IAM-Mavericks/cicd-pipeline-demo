const jwt = require('jsonwebtoken');

const authController = {
  async register(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth
      } = req.body || {};

      if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
      }

      // Minimal, framework-agnostic stub implementation.
      // In production, you would create the user, hash passwords, etc.
      const userId = `user_${Date.now()}`;

      const accessToken = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            phoneNumber
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      console.error('AuthController.register error:', error);
      return res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Stub logic: in production, verify user credentials from DB.
      const userId = `user_${Date.now()}`;

      const accessToken = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: { id: userId, email },
          tokens: { accessToken, refreshToken }
        }
      });
    } catch (error) {
      console.error('AuthController.login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.'
      });
    }
  },

  async verifyMFA(req, res) {
    try {
      const { sessionId, code, method } = req.body || {};

      if (!sessionId || !code || !method) {
        return res.status(400).json({
          success: false,
          error: 'Session ID, code, and method are required'
        });
      }

      // Stub verification result; in production, call mfaService.
      return res.json({
        success: true,
        message: 'MFA verification successful',
        data: {
          sessionId,
          method
        }
      });
    } catch (error) {
      console.error('AuthController.verifyMFA error:', error);
      return res.status(500).json({
        success: false,
        error: 'MFA verification failed'
      });
    }
  },

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body || {};

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required'
        });
      }

      // Stub decode: in production, verify and decode refresh token.
      let decoded;
      try {
        decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        data: { accessToken: newAccessToken }
      });
    } catch (error) {
      console.error('AuthController.refreshToken error:', error);
      return res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  },

  async logout(req, res) {
    try {
      // In production, you might blacklist tokens or clear sessions here.
      return res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('AuthController.logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }
};

module.exports = authController;
