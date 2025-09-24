import 'dotenv/config';

const config = {
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

export default config;