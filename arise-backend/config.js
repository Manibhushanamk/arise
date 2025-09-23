import 'dotenv/config';

const config = {
  MONGODB_URI: process.env.MONGODB_URI,
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000',
  PORT: process.env.PORT || 3000,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  API_KEY: process.env.API_KEY,
  PM_SITE_URL: process.env.PM_SITE_URL || 'https://www.pminternship.gov.in/',
  JWT_SECRET: process.env.JWT_SECRET,
};

export default config;
