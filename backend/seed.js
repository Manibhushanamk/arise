import mongoose from 'mongoose';
import 'dotenv/config';

import Role from './models/roleModel.js';
import SkillResource from './models/skillResourecModel.js';
import config from './config.js';

const sampleRoles = [
  {
    roleId: 'swe001',
    title: 'Software Engineer Intern',
    company: 'Google',
    location: 'Work from Home',
    stipend: '80,000/month',
    duration: '3 Months',
    description: 'Work on exciting projects at Google. Develop your skills in a fast-paced environment.',
    skillsRequired: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    applyLink: '#',
  },
  {
    roleId: 'pm001',
    title: 'Product Manager Intern',
    company: 'Microsoft',
    location: 'Hyderabad',
    stipend: '60,000/month',
    duration: '6 Months',
    description: 'Define product strategy and roadmap. Work with cross-functional teams to deliver great products.',
    skillsRequired: ['Product Management', 'Agile', 'JIRA'],
    applyLink: '#',
  },
];

const sampleSkillResources = [
  {
    skillName: 'JavaScript',
    youtubeLink: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    docsLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    practiceLink: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
  },
  {
    skillName: 'React',
    youtubeLink: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    docsLink: 'https://reactjs.org/docs/getting-started.html',
    practiceLink: 'https://scrimba.com/learn/learnreact',
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('MongoDB Connected');

    await Role.deleteMany({});
    await SkillResource.deleteMany({});

    await Role.insertMany(sampleRoles);
    await SkillResource.insertMany(sampleSkillResources);

    console.log('Data seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
