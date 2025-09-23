import mongoose from 'mongoose';
import config from './config.js';
import 'dotenv/config';

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('MongoDB connected for seeding.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Schemas
const roleSchema = new mongoose.Schema({
    title: String,
    description: String,
    salary: String,
    skillsRequired: [String],
    applyLink: String,
});
const Role = mongoose.model('Role', roleSchema);

const skillResourceSchema = new mongoose.Schema({
    skillName: { type: String, required: true, unique: true },
    youtubeLink: String,
    docsLink: String,
    practiceLink: String,
});
const SkillResource = mongoose.model('SkillResource', skillResourceSchema);


// Sample Data
const rolesData = [
    {
        title: "Frontend Developer Intern",
        description: "Work on modern web UIs with HTML, CSS, and JS. Gain hands-on experience with frameworks like React or Vue.",
        salary: "₹20,000/month",
        skillsRequired: ["HTML", "CSS", "JavaScript", "React"],
        applyLink: "https://internship.aicte-india.org/internship-details.php?uid=INTERNSHIP_f2d5718a-4aad-11ef-9359-062e2c2193b0"
    },
    {
        title: "Backend Developer Intern",
        description: "Build scalable APIs and manage databases with Node.js and MongoDB. Learn about server-side logic and architecture.",
        salary: "₹22,000/month",
        skillsRequired: ["Node.js", "MongoDB", "Express", "REST APIs"],
        applyLink: "https://internship.aicte-india.org/internship-details.php?uid=INTERNSHIP_5108f97e-128a-11ef-9944-062e2c2193b0"
    },
    {
        title: "AI Research Intern",
        description: "Experiment with machine learning models, data analysis, and AI research tools. Contribute to cutting-edge projects.",
        salary: "₹25,000/month",
        skillsRequired: ["Python", "TensorFlow", "ML Basics", "Data Analysis"],
        applyLink: "https://internship.aicte-india.org/internship-details.php?uid=INTERNSHIP_6e7716ca-333e-11ef-9359-062e2c2193b0"
    },
    {
        title: "UI/UX Design Intern",
        description: "Create intuitive and visually appealing user interfaces. Work with design tools like Figma and conduct user research.",
        salary: "₹18,000/month",
        skillsRequired: ["Figma", "UI/UX Principles", "Wireframing", "Prototyping"],
        applyLink: "https://internship.aicte-india.org/internship-details.php?uid=INTERNSHIP_148332ba-42ad-11ef-9359-062e2c2193b0"
    }
];

const skillResourcesData = [
    {
        skillName: "JavaScript",
        youtubeLink: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
        docsLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        practiceLink: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/"
    },
    {
        skillName: "MongoDB",
        youtubeLink: "https://www.youtube.com/watch?v=oSIv-E60NiU",
        docsLink: "https://www.mongodb.com/docs/",
        practiceLink: "https://www.w3schools.com/mongodb/"
    },
    {
        skillName: "TensorFlow",
        youtubeLink: "https://www.youtube.com/watch?v=tPYj3fFJGjk",
        docsLink: "https://www.tensorflow.org/learn",
        practiceLink: "https://www.kaggle.com/learn/intro-to-machine-learning"
    },
    {
        skillName: "HTML",
        youtubeLink: "https://www.youtube.com/watch?v=kUMe1FH4CHE",
        docsLink: "https://developer.mozilla.org/en-US/docs/Web/HTML",
        practiceLink: "https://www.w3schools.com/html/"
    },
    {
        skillName: "CSS",
        youtubeLink: "https://www.youtube.com/watch?v=OXGznpKZ_sA",
        docsLink: "https://developer.mozilla.org/en-US/docs/Web/CSS",
        practiceLink: "https://www.freecodecamp.org/learn/responsive-web-design/"
    },
    {
        skillName: "React",
        youtubeLink: "https://www.youtube.com/watch?v=bMknfKXIFA8",
        docsLink: "https://react.dev/learn",
        practiceLink: "https://scrimba.com/learn/learnreact"
    },
    {
        skillName: "Node.js",
        youtubeLink: "https://www.youtube.com/watch?v=f2EqECiTBL8",
        docsLink: "https://nodejs.org/en/docs",
        practiceLink: "https://nodeschool.io/"
    },
    {
      skillName: "Express",
      youtubeLink: "https://www.youtube.com/watch?v=SccSCuHhOw0",
      docsLink: "https://expressjs.com/",
      practiceLink: "https://www.freecodecamp.org/learn/back-end-development-and-apis/basic-node-and-express"
    },
    {
      skillName: "REST APIs",
      youtubeLink: "https://www.youtube.com/watch?v=GZvSYJDk-us",
      docsLink: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
      practiceLink: "https://reqres.in/"
    },
    {
      skillName: "Python",
      youtubeLink: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
      docsLink: "https://docs.python.org/3/",
      practiceLink: "https://www.hackerrank.com/domains/python"
    },
    {
      skillName: "ML Basics",
      youtubeLink: "https://www.youtube.com/watch?v=i_LwzRVP7bg",
      docsLink: "https://developers.google.com/machine-learning/crash-course",
      practiceLink: "https://www.kaggle.com/learn/intro-to-machine-learning"
    },
    {
      skillName: "Data Analysis",
      youtubeLink: "https://www.youtube.com/watch?v=r-uOLxNrNk8",
      docsLink: "https://pandas.pydata.org/docs/",
      practiceLink: "https://www.datacamp.com/courses/intro-to-python-for-data-science"
    },
    {
      skillName: "Figma",
      youtubeLink: "https://www.youtube.com/watch?v=3q3FV65JDBg",
      docsLink: "https://help.figma.com/hc/en-us",
      practiceLink: "https://www.figma.com/community"
    },
    {
      skillName: "UI/UX Principles",
      youtubeLink: "https://www.youtube.com/watch?v=sAQi_15-S2Y",
      docsLink: "https://lawsofux.com/",
      practiceLink: "https://sharpen.design/"
    },
    {
      skillName: "Wireframing",
      youtubeLink: "https://www.youtube.com/watch?v=gJc2QPRO2E8",
      docsLink: "https://balsamiq.com/learn/articles/what-are-wireframes/",
      practiceLink: "https://wireframe.cc/"
    },
    {
      skillName: "Prototyping",
      youtubeLink: "https://www.youtube.com/watch?v=64sZ4L3wRxA",
      docsLink: "https://www.invisionapp.com/inside-design/what-is-prototyping/",
      practiceLink: "https://framer.com/projects"
    }
];

// Seeding function
const seedDB = async () => {
    try {
        console.log('Clearing existing data...');
        await Role.deleteMany({});
        await SkillResource.deleteMany({});
        
        console.log('Seeding new data...');
        await Role.insertMany(rolesData);
        await SkillResource.insertMany(skillResourcesData);
        
        console.log('Database seeded successfully!');
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

seedDB();
