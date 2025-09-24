document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------
    // CONFIG & STATE
    // ----------------------------------------
    const config = {
        SERVER_URL: "https://arise-backend-2gjv.onrender.com", // Fetched from backend config
        GOOGLE_CLIENT_ID: "555267087741-0q9stov2plo13qojprjq005vgemnfvm9.apps.googleusercontent.com", // Fetched from backend config
        PM_SITE_URL: "https://www.pminternship.gov.in/",
    };

    const state = {
        token: localStorage.getItem("arise_token"),
        user: null,
        isOnline: navigator.onLine,
        currentSection: "auth-section",
    };

    const popularSkills = [
        "HTML",
        "CSS",
        "JavaScript",
        "React",
        "Node.js",
        "Express",
        "MongoDB",
        "Python",
        "TensorFlow",
        "ML Basics",
        "Data Analysis",
        "Figma",
        "UI/UX Principles",
        "REST APIs",
        "Wireframing",
        "Prototyping",
    ];

    // ----------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------
    const mainContent = document.querySelector(".main-content");
    const sidebar = document.querySelector(".sidebar");
    const navLinks = document.querySelectorAll(".nav-link");
    const allSections = document.querySelectorAll(".page-section");
    const themeToggle = document.getElementById("theme-toggle");
    const logoutBtn = document.getElementById("logout-btn");
    const userNameEl = document.getElementById("user-name");
    const toastEl = document.getElementById("toast-notification");

    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------
    const init = () => {
        // Theme setup
        const isDarkMode = localStorage.getItem("arise_dark_mode") === "true";
        themeToggle.checked = isDarkMode;
        document.body.classList.toggle("dark-mode", isDarkMode);

        // Network status
        window.addEventListener("online", () => {
            state.isOnline = true;
            showToast("You are back online!", "success");
        });
        window.addEventListener("offline", () => {
            state.isOnline = false;
            showToast("You are offline. Some features may be limited.", "error");
        });

        setupEventListeners();

        if (state.token) {
            try {
                const payload = JSON.parse(atob(state.token.split(".")[1]));
                state.user = {
                    name: payload.name,
                    email: payload.email
                };
                mainContent.style.display = "block";
                sidebar.style.display = "flex";
                showSection("dashboard-section");
                updateDashboard();
            } catch (e) {
                console.error("Invalid token:", e);
                logout();
            }
        } else {
            showAuthView();
        }
        initGoogleSignIn();
        populateSkillsCheckboxes();
    };

    const showAuthView = () => {
        mainContent.style.display = "flex";
        sidebar.style.display = "none";
        allSections.forEach((s) => s.classList.remove("active"));
        document.getElementById("auth-section").classList.add("active");
        state.currentSection = "auth-section";
    };

    // ----------------------------------------
    // AUTHENTICATION
    // ----------------------------------------
    const initGoogleSignIn = () => {
        google.accounts.id.initialize({
            client_id: "555267087741-0q9stov2plo13qojprjq005vgemnfvm9.apps.googleusercontent.com", // Replace with your actual client ID
            callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(
            document.getElementById("google-signin-button-login"), {
                theme: "outline",
                size: "large",
                width: "300"
            }
        );
        google.accounts.id.renderButton(
            document.getElementById("google-signin-button-signup"), {
                theme: "outline",
                size: "large",
                width: "300"
            }
        );
    };

    async function handleGoogleCredentialResponse(response) {
        try {
            const res = await apiCall("/auth/google", "POST", {
                token: response.credential,
            });
            if (res.token) {
                loginSuccess(res.token, res.name);
            } else {
                showToast("Google Sign-In failed.", "error");
            }
        } catch (error) {
            showToast(
                error.message || "An error occurred during Google Sign-In.",
                "error"
            );
        }
    }

    const loginSuccess = (token, name) => {
        localStorage.setItem("arise_token", token);
        state.token = token;
        state.user = {
            name
        };
        mainContent.style.display = "block";
        sidebar.style.display = "flex";
        showSection("dashboard-section");
        updateDashboard();
        showToast(`Welcome, ${name}!`, "success");
    };

    const logout = () => {
        localStorage.removeItem("arise_token");
        state.token = null;
        state.user = null;
        showAuthView();
    };

    // ----------------------------------------
    // API CALL HELPER
    // ----------------------------------------
    const apiCall = async (endpoint, method = "GET", body = null) => {
        const headers = {
            "Content-Type": "application/json"
        };
        if (state.token) {
            headers["Authorization"] = `Bearer ${state.token}`;
        }
        const options = {
            method,
            headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(config.SERVER_URL + endpoint, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.message || `HTTP error! status: ${response.status}`
            );
        }
        return response.json();
    };

    // ----------------------------------------
    // UI & NAVIGATION
    // ----------------------------------------
    const showSection = (sectionId) => {
        if (state.currentSection === sectionId) return;

        allSections.forEach((section) => {
            section.classList.toggle("active", section.id === sectionId);
        });

        navLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.section === sectionId);
        });

        state.currentSection = sectionId;

        // Load data for the new section
        switch (sectionId) {
            case "dashboard-section":
                updateDashboard();
                break;
            case "assignment-section":
                loadAssignment();
                break;
            case "recommendations-section":
                loadRecommendations();
                break;
            case "resume-section":
                loadResume();
                break;
        }
    };

    const showToast = (message, type = "success") => {
        toastEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        setTimeout(() => {
            toastEl.className = "toast";
        }, 3000);
    };

    // ----------------------------------------
    // DASHBOARD
    // ----------------------------------------
    const updateDashboard = async () => {
        if (!state.user) return;
        userNameEl.textContent = state.user.name;

        try {
            const assignment = await apiCall("/assignment");
            document.getElementById("profile-status").textContent =
                "Status: Complete ✔️";
        } catch (e) {
            document.getElementById("profile-status").textContent =
                "Status: Incomplete";
        }

        try {
            const resume = await apiCall("/resume");
            let completion = 0;
            if (resume.personalInfo && resume.personalInfo.name) completion += 20;
            if (resume.summary) completion += 20;
            if (resume.education && resume.education.length > 0) completion += 20;
            if (resume.experience && resume.experience.length > 0) completion += 20;
            if (resume.skills && resume.skills.length > 0) completion += 20;

            document.getElementById(
                "resume-completion-status"
            ).textContent = `${completion}% Complete`;
            document.getElementById(
                "resume-progress-fill"
            ).style.width = `${completion}%`;
        } catch (e) {
            document.getElementById(
                "resume-completion-status"
            ).textContent = `0% Complete`;
            document.getElementById("resume-progress-fill").style.width = `0%`;
        }
    };

    // ----------------------------------------
    // ASSESSMENT
    // ----------------------------------------
    const populateSkillsCheckboxes = () => {
        const container = document.querySelector(".skills-checkbox-grid");
        container.innerHTML = popularSkills
            .map(
                (skill) => `
            <label><input type="checkbox" name="skills" value="${skill}"> ${skill}</label>
        `
            )
            .join("");
    };

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault();
        const formData = {
            rolePreferences: document
                .getElementById("role-preferences")
                .value.split(",")
                .map((s) => s.trim()),
            qualification: document.getElementById("qualification").value,
            fieldOfStudy: document.getElementById("field-of-study").value,
            preferredSectors: document
                .getElementById("preferred-sectors")
                .value.split(",")
                .map((s) => s.trim()),
            workPreference: document.querySelector(
                'input[name="work-preference"]:checked'
            )?.value,
            duration: document.querySelector('input[name="duration"]:checked')?.value,
            skills: Array.from(
                document.querySelectorAll('input[name="skills"]:checked')
            ).map((cb) => cb.value),
            freeTextSkills: document.getElementById("free-text-skills").value,
            digitalConfidence: document.querySelector(
                'input[name="digital-confidence"]:checked'
            )?.value,
            additionalInfo: document.getElementById("additional-info").value,
        };

        try {
            await apiCall("/assignment", "POST", formData);
            showToast("Assessment saved! Finding your recommendations...", "success");
            showSection("recommendations-section");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    const loadAssignment = async () => {
        try {
            const data = await apiCall("/assignment");
            document.getElementById("role-preferences").value =
                data.rolePreferences.join(", ");
            document.getElementById("qualification").value = data.qualification;
            document.getElementById("field-of-study").value = data.fieldOfStudy;
            document.getElementById("preferred-sectors").value =
                data.preferredSectors.join(", ");
            document.querySelector(
                `input[name="work-preference"][value="${data.workPreference}"]`
            ).checked = true;
            document.querySelector(
                `input[name="duration"][value="${data.duration}"]`
            ).checked = true;
            data.skills.forEach((skill) => {
                const cb = document.querySelector(
                    `input[name="skills"][value="${skill}"]`
                );
                if (cb) cb.checked = true;
            });
            document.getElementById("free-text-skills").value = data.freeTextSkills;
            document.querySelector(
                `input[name="digital-confidence"][value="${data.digitalConfidence}"]`
            ).checked = true;
            document.getElementById("additional-info").value = data.additionalInfo;
        } catch (e) {
            // Form is empty, which is fine
        }
    };

    // ----------------------------------------
    // RECOMMENDATIONS
    // ----------------------------------------
    const loadRecommendations = async () => {
        const container = document.getElementById("recommendations-container");
        container.innerHTML = `<p>Loading recommendations...</p>`;

        try {
            const roles = await apiCall("/recommendations");
            if (roles.length === 0) {
                container.innerHTML = `<p>No recommendations found. Please complete your assessment.</p>`;
                return;
            }
            container.innerHTML = roles.map(renderRoleCard).join("");

            const allMissingSkills = new Set();
            roles.slice(0, 3).forEach((role) => {
                // Only get skills for top 3 roles
                if (role.missingSkills) {
                    role.missingSkills.forEach((skill) => allMissingSkills.add(skill));
                }
            });
            loadSkillResources(Array.from(allMissingSkills));
        } catch (error) {
            container.innerHTML = `<p class="error">${error.message}</p>`;
        }
    };

    const renderRoleCard = (role) => {
        const applyLink = state.isOnline ? role.applyLink : config.PM_SITE_URL;
        const skillsHTML = role.skillsRequired
            .map((skill) => {
                const isMissing =
                    role.missingSkills && role.missingSkills.includes(skill);
                return `<span class="skill-tag ${
          isMissing ? "missing" : ""
        }">${skill}</span>`;
            })
            .join("");

        return `
            <div class="card role-card">
                <h3>${role.title}</h3>
                <div class="salary">${role.salary}</div>
                <p>${role.description}</p>
                <div class="skills-list">${skillsHTML}</div>
                <a href="${applyLink}" target="_blank" class="btn btn-primary">Apply ${
      state.isOnline ? "Now" : "on PM Portal"
    }</a>
            </div>
        `;
    };

    const loadSkillResources = async (skills) => {
        const container = document.getElementById("skill-resources-container");
        container.innerHTML = "";
        if (skills.length === 0) {
            document.getElementById("missing-skills-container").style.display =
                "none";
            return;
        }
        document.getElementById("missing-skills-container").style.display = "block";

        for (const skill of skills) {
            try {
                const resource = await apiCall(`/resources/${skill}`);
                container.innerHTML += `
                    <div class="card resource-card">
                        <h4>Learn: ${resource.skillName}</h4>
                        <div class="resource-links">
                            <a href="${resource.youtubeLink}" target="_blank">YouTube</a>
                            <a href="${resource.docsLink}" target="_blank">Docs</a>
                            <a href="${resource.practiceLink}" target="_blank">Practice</a>
                        </div>
                    </div>
                `;
            } catch (e) {
                // skill not found, ignore
            }
        }
    };

    // ----------------------------------------
    // RESUME BUILDER
    // ----------------------------------------
    const {
        jsPDF
    } = window.jspdf;

    const addResumeEntry = (containerId, type) => {
        const container = document.getElementById(containerId);
        const entryDiv = document.createElement('div');
        entryDiv.className = 'resume-entry';
        let fields = '';

        switch (type) {
            case 'education':
                fields = `
          <div class="form-grid">
            <div class="form-group"><input type="text" class="resume-institution" placeholder="Institution"></div>
            <div class="form-group"><input type="text" class="resume-degree" placeholder="Degree"></div>
            <div class="form-group"><input type="text" class="resume-field" placeholder="Field of Study"></div>
            <div class="form-group"><input type="text" class="resume-gradYear" placeholder="Graduation Year"></div>
          </div>
        `;
                break;
            case 'experience':
                fields = `
          <div class="form-grid">
            <div class="form-group"><input type="text" class="resume-company" placeholder="Company"></div>
            <div class="form-group"><input type="text" class="resume-role" placeholder="Role"></div>
            <div class="form-group form-group-full"><input type="text" class="resume-duration" placeholder="Duration (e.g., 2022-2023)"></div>
          </div>
          <div class="form-group"><textarea class="resume-description" placeholder="Description of your role..."></textarea></div>
        `;
                break;
            case 'project':
                fields = `
          <div class="form-group"><input type="text" class="resume-project-title" placeholder="Project Title"></div>
          <div class="form-group"><textarea class="resume-project-description" placeholder="Project description..."></textarea></div>
          <div class="form-group"><input type="url" class="resume-project-link" placeholder="Project Link"></div>
        `;
                break;
            default:
                return;
        }
        entryDiv.innerHTML = fields;
        container.appendChild(entryDiv);
    };

    const handleResumeSave = async (e) => {
        e.preventDefault();
        const resumeData = getResumeDataFromForm();
        try {
            await apiCall("/resume", "POST", resumeData);
            showToast("Resume saved successfully!", "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    const handlePdfDownload = async () => {
        showToast("Generating PDF...");
        const resumeData = getResumeDataFromForm();

        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(resumeData.personalInfo.name, 20, y);
        y += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(
            `${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.linkedin}`,
            20,
            y
        );
        y += 15;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", 20, y);
        y += 7;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(resumeData.summary, 170), 20, y);
        y += 20;

        // Add other sections (Education, Experience, etc.)
        // This is a simplified example
        doc.save(`${resumeData.personalInfo.name.replace(" ", "_")}_Resume.pdf`);
    };

    const getResumeDataFromForm = () => {
        const education = Array.from(document.querySelectorAll('#education-entries .resume-entry')).map((entry) => ({
            institution: entry.querySelector('.resume-institution').value,
            degree: entry.querySelector('.resume-degree').value,
            field: entry.querySelector('.resume-field').value,
            gradYear: entry.querySelector('.resume-gradYear').value,
        }));

        const experience = Array.from(document.querySelectorAll('#experience-entries .resume-entry')).map((entry) => ({
            company: entry.querySelector('.resume-company').value,
            role: entry.querySelector('.resume-role').value,
            duration: entry.querySelector('.resume-duration').value,
            description: entry.querySelector('.resume-description').value,
        }));

        const projects = Array.from(document.querySelectorAll('#project-entries .resume-entry')).map((entry) => ({
            title: entry.querySelector('.resume-project-title').value,
            description: entry.querySelector('.resume-project-description').value,
            link: entry.querySelector('.resume-project-link').value,
        }));

        return {
            personalInfo: {
                name: document.getElementById('resume-name').value,
                email: document.getElementById('resume-email').value,
                phone: document.getElementById('resume-phone').value,
                linkedin: document.getElementById('resume-linkedin').value,
            },
            summary: document.getElementById('resume-summary').value,
            skills: document
                .getElementById('resume-skills')
                .value.split(',')
                .map((s) => s.trim()),
            education,
            experience,
            projects,
        };
    };

    const loadResume = async () => {
        try {
            const data = await apiCall('/resume');
            // Clear existing dynamic entries
            document.getElementById('education-entries').innerHTML = '';
            document.getElementById('experience-entries').innerHTML = '';
            document.getElementById('project-entries').innerHTML = '';

            if (data.personalInfo) {
                document.getElementById('resume-name').value = data.personalInfo.name || '';
                document.getElementById('resume-email').value = data.personalInfo.email || '';
                document.getElementById('resume-phone').value = data.personalInfo.phone || '';
                document.getElementById('resume-linkedin').value = data.personalInfo.linkedin || '';
            }
            document.getElementById('resume-summary').value = data.summary || '';
            document.getElementById('resume-skills').value = (data.skills || []).join(', ');

            (data.education || []).forEach((edu) => {
                addResumeEntry('education-entries', 'education');
                const entry = document.querySelector('#education-entries .resume-entry:last-child');
                entry.querySelector('.resume-institution').value = edu.institution;
                entry.querySelector('.resume-degree').value = edu.degree;
                entry.querySelector('.resume-field').value = edu.field;
                entry.querySelector('.resume-gradYear').value = edu.gradYear;
            });

            (data.experience || []).forEach((exp) => {
                addResumeEntry('experience-entries', 'experience');
                const entry = document.querySelector('#experience-entries .resume-entry:last-child');
                entry.querySelector('.resume-company').value = exp.company;
                entry.querySelector('.resume-role').value = exp.role;
                entry.querySelector('.resume-duration').value = exp.duration;
                entry.querySelector('.resume-description').value = exp.description;
            });

            (data.projects || []).forEach((proj) => {
                addResumeEntry('project-entries', 'project');
                const entry = document.querySelector('#project-entries .resume-entry:last-child');
                entry.querySelector('.resume-project-title').value = proj.title;
                entry.querySelector('.resume-project-description').value = proj.description;
                entry.querySelector('.resume-project-link').value = proj.link;
            });
        } catch (e) {
            // Resume not found, form is empty
        }
    };

    // ----------------------------------------
    // CHATBOT
    // ----------------------------------------
    const handleChatSend = async () => {
        const input = document.getElementById('chat-input');
        const prompt = input.value.trim();
        if (!prompt) return;

        addChatMessage(prompt, 'user');
        input.value = '';

        const typingIndicatorHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        addChatMessage(typingIndicatorHTML, 'bot', {
            id: 'typing-indicator'
        });

        try {
            const res = await apiCall('/chatbot', 'POST', {
                prompt
            });
            addChatMessage(res.reply, 'bot');
        } catch (error) {
            addChatMessage(error.message, 'bot', {
                isError: true
            });
        } finally {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
    };

    const addChatMessage = (text, sender, options = {}) => {
        const {
            isError = false, id = null
        } = options;
        const chatWindow = document.getElementById('chat-window');
        const messageDiv = document.createElement('div');
        if (id) {
            messageDiv.id = id;
        }
        messageDiv.className = `chat-message ${sender}`;
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        if (isError) {
            bubble.style.color = 'red';
        }
        bubble.innerHTML = text; // Use innerHTML to render the spinner
        messageDiv.appendChild(bubble);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    // ----------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------
    const setupEventListeners = () => {
        themeToggle.addEventListener("change", () => {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("arise_dark_mode", themeToggle.checked);
        });

        logoutBtn.addEventListener("click", logout);

        navLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                showSection(e.currentTarget.dataset.section);
            });
        });

        document.querySelector(".dashboard-grid").addEventListener("click", (e) => {
            const card = e.target.closest(".quick-nav-card");
            if (card) {
                showSection(card.dataset.section);
            }
        });

        // Auth form toggling
        document.getElementById("show-signup").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("login-container").style.display = "none";
            document.getElementById("signup-container").style.display = "block";
        });
        document.getElementById("show-login").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("signup-container").style.display = "none";
            document.getElementById("login-container").style.display = "block";
        });

        // Form Submissions
        document
            .getElementById("login-form")
            .addEventListener("submit", async (e) => {
                e.preventDefault();
                const button = e.target.querySelector('button[type="submit"]');
                button.classList.add('loading');
                button.disabled = true;

                const email = document.getElementById("login-email").value;
                const password = document.getElementById("login-password").value;
                try {
                    const res = await apiCall("/auth/login", "POST", {
                        email,
                        password
                    });
                    loginSuccess(res.token, res.name);
                } catch (error) {
                    showToast(error.message, "error");
                } finally {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            });
        document
            .getElementById("signup-form")
            .addEventListener("submit", async (e) => {
                e.preventDefault();
                const button = e.target.querySelector('button[type="submit"]');
                button.classList.add('loading');
                button.disabled = true;

                const name = document.getElementById("signup-name").value;
                const email = document.getElementById("signup-email").value;
                const password = document.getElementById("signup-password").value;
                try {
                    const res = await apiCall("/auth/signup", "POST", {
                        name,
                        email,
                        password,
                    });
                    loginSuccess(res.token, res.name);
                } catch (error) {
                    showToast(error.message, "error");
                } finally {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            });
        document
            .getElementById("assignment-form")
            .addEventListener("submit", handleAssignmentSubmit);
        document
            .getElementById("resume-form")
            .addEventListener("submit", handleResumeSave);
        document
            .getElementById("download-pdf-btn")
            .addEventListener("click", handlePdfDownload);

        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = e.target.querySelector('button[type="submit"]');
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match.', 'error');
                return;
            }

            button.classList.add('loading');
            button.disabled = true;

            try {
                const payload = { newPassword };
                if (document.getElementById('current-password').required) {
                    payload.currentPassword = currentPassword;
                }

                const res = await apiCall('/auth/change-password', 'POST', payload);
                showToast(res.message, 'success');
                e.target.reset(); // Clear the form
                loadProfile(); // Refresh the form state
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                button.classList.remove('loading');
                button.disabled = false;
            }
        });

        document.getElementById('add-education-btn').addEventListener('click', () => addResumeEntry('education-entries', 'education'));
        document.getElementById('add-experience-btn').addEventListener('click', () => addResumeEntry('experience-entries', 'experience'));
        document.getElementById('add-project-btn').addEventListener('click', () => addResumeEntry('project-entries', 'project'));

        // Chatbot
        document
            .getElementById("chat-send-btn")
            .addEventListener("click", handleChatSend);
        document.getElementById("chat-input").addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleChatSend();
        });
    };

    // ----------------------------------------
    // START THE APP
    // ----------------------------------------
    init();
});