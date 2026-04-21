/**
 * Built-in candidate profile — used for every generation (no JSON upload).
 * Edit this file to change your static resume source data.
 */

export interface StaticContact {
  phone: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface StaticEducation {
  degree: string;
  institution: string;
  duration: string;
}

export interface StaticUserProfile {
  name: string;
  contact: StaticContact;
  summary: string;
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    responsibilities: string[];
  }>;
  projects: Array<{
    name: string;
    description: string[];
    techStack: string[];
  }>;
  skills: Record<string, string[]>;
  education: StaticEducation[];
}

export const STATIC_USER_PROFILE: StaticUserProfile = {
  name: "Aditya Kundra",
  contact: {
    phone: "+91 7011429667",
    email: "adityadef@gmail.com",
    linkedin: "https://linkedin.com/in/adi-kundra",
    github: "https://github.com/AdityaKundra",
  },
  summary:
    "Full Stack Engineer with 5+ years of experience building scalable, high-performance web applications using MERN stack and Next.js. Proven track record of optimizing APIs, improving system performance, and delivering production-grade solutions used by 100K+ users.",
  experience: [
    {
      role: "Full Stack Engineer",
      company: "AVH Commerce (Vanavya)",
      duration: "Sep 2025 – May 2026",
      responsibilities: [
        "Built and scaled e-commerce features improving performance and user experience",
        "Developed optimized APIs using Node.js, Express, MongoDB",
        "Implemented CMS workflows for seamless product/content management",
        "Improved frontend performance using Next.js optimization techniques",
      ],
    },
    {
      role: "Software Engineer",
      company: "Bonami Software",
      duration: "May 2021 – Aug 2023",
      responsibilities: [
        "Developed scalable full-stack applications (Node.js, React, MongoDB)",
        "Optimized APIs and database queries, reducing response time",
        "Built custom CMS tools automating workflows",
        "Mentored junior developers and led code reviews",
      ],
    },
    {
      role: "Back-End Developer",
      company: "PS Tech Global",
      duration: "Aug 2020 – July 2021",
      responsibilities: [
        "Built and optimized web applications using PHP, JavaScript, HTML, CSS",
        "Reduced server load through refactoring and performance tuning",
      ],
    },
  ],
  projects: [
    {
      name: "GENIE – Learning Platform",
      description: [
        "Built APIs used by 100K+ users",
        "Reduced data fetch time by 40%",
      ],
      techStack: ["React.js", "REST APIs", "WordPress"],
    },
    {
      name: "Vanavya – E-commerce Platform",
      description: [
        "Developed scalable product and CMS systems",
        "Improved API performance and frontend speed",
      ],
      techStack: ["Next.js", "Node.js", "MongoDB"],
    },
    {
      name: "Plus Fan – Fan Engagement Platform",
      description: [
        "Built MERN-based engagement platform",
        "Designed scalable APIs and user interaction flows",
      ],
      techStack: ["MongoDB", "Express.js", "React.js", "Node.js"],
    },
  ],
  skills: {
    languages: ["JavaScript", "TypeScript", "PHP"],
    frontend: ["React.js", "Next.js", "Tailwind CSS", "Redux"],
    backend: ["Node.js", "Express.js", "REST APIs", "WebSockets"],
    database: ["MongoDB", "SQL"],
    devops: ["AWS (EC2, S3, Lambda)", "Docker", "Firebase"],
    tools: ["Git", "Postman", "Jira"],
  },
  education: [
    {
      degree: "Master of Computer Applications (MCA)",
      institution: "Chandigarh University",
      duration: "2023 – 2025",
    },
    {
      degree: "Bachelor of Computer Applications (BCA)",
      institution: "Subharti University",
      duration: "2019 – 2022",
    },
  ],
};
