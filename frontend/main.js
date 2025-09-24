document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & CONSTANTS ---
    const API_URL = '/api';

    // --- STATE MANAGEMENT STORE ---
    const createStore = (initialState) => {
        let state = initialState;
        const listeners = new Set();
        const handler = {
            set: (target, property, value) => {
                target[property] = value;
                listeners.forEach(listener => listener());
                return true;
            },
            get: (target, property) => {
                if (typeof target[property] === 'object' && target[property] !== null) {
                    return JSON.parse(JSON.stringify(target[property]));
                }
                return target[property];
            }
        };
        const proxyState = new Proxy(state, handler);
        return {
            getState: () => state,
            setState: (newState) => Object.assign(proxyState, newState),
            subscribe: (listener) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
        };
    };

    const initialResumeState = {
        personalInfo: { name: '', email: '', phone: '', linkedin: '' },
        summary: '',
        education: [{ id: Date.now(), institution: '', degree: '', field: '', gradYear: '' }],
        experience: [],
        projects: [],
        skills: '',
    };

    const store = createStore({
        user: null,
        token: localStorage.getItem('arise_token'),
        isDarkMode: localStorage.getItem('arise_dark_mode') === 'true',
        currentSection: 'auth-section',
        resume: JSON.parse(JSON.stringify(initialResumeState)),
        assignment: {},
        recommendations: [],
        chatbot: { history: [], isLoading: false },
    });

    // --- API CALL HELPER ---
    const apiCall = async (endpoint, method = 'GET', body = null) => {
        const headers = { 'Content-Type': 'application/json' };
        if (store.getState().token) {
            headers['Authorization'] = `Bearer ${store.getState().token}`;
        }
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(API_URL + endpoint, options);
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    showToast('Your session has expired. Please log in again.', 'error');
                }
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            if (response.status === 204) return null;
            return response.json();
        } catch (error) {
            if (error.message.includes('Unexpected end of JSON input') || error.message.includes('Unexpected token')) {
                // Ignore empty response errors
            } else {
               showToast(error.message, 'error');
            }
            throw error;
        }
    };
    
    // --- GENERAL UI FUNCTIONS ---
    const showToast = (message, type = "info") => {
        const toastEl = document.getElementById('toast-notification');
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        setTimeout(() => { toastEl.className = "toast"; }, 4000);
    };

    const showSection = (sectionId) => {
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(sectionId);
        if(section) section.classList.add('active');
        
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.section === sectionId);
        });
        store.setState({ currentSection: sectionId });

        if (sectionId === 'recommendations-section') Recommendations.fetch();
        if (sectionId === 'assignment-section') Assignment.render();
    };

    const logout = () => {
        localStorage.removeItem('arise_token');
        localStorage.removeItem('arise_dark_mode');
        window.location.reload();
    };

    // --- MAIN RENDER FUNCTION ---
    function renderApp() {
        const { token, isDarkMode, user, currentSection } = store.getState();
        
        document.body.classList.toggle('dark-mode', isDarkMode);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = isDarkMode;

        const appContainer = document.querySelector('.app-container');
        const mainContent = document.querySelector('.main-content');

        if (token && user) {
            appContainer.classList.add('authenticated');
            mainContent.style.marginLeft = '';
            if (currentSection === 'auth-section') {
                showSection('dashboard-section');
            }
        } else {
            appContainer.classList.remove('authenticated');
            mainContent.style.marginLeft = '0';
            showSection('auth-section');
        }
    }
    
    // --- INITIAL DATA FETCH ---
    async function fetchInitialData() {
        if (!store.getState().token) return;
        try {
            const payload = JSON.parse(atob(store.getState().token.split(".")[1]));
            store.setState({ user: { name: payload.name, email: payload.email } });

            const [resume, assignment] = await Promise.all([
                apiCall('/resume').catch(() => (JSON.parse(JSON.stringify(initialResumeState)))),
                apiCall('/assignment').catch(() => ({}))
            ]);

            const mergedResume = {
                ...JSON.parse(JSON.stringify(initialResumeState)),
                ...resume,
                personalInfo: { ...initialResumeState.personalInfo, ...resume?.personalInfo },
                skills: Array.isArray(resume?.skills) ? resume.skills.join(', ') : (resume?.skills || ''),
            };

            store.setState({ 
                resume: mergedResume, 
                assignment: assignment || {} 
            });
        } catch (error) {
            console.error("Token invalid or failed to fetch initial data", error);
            logout();
        }
    }

    // --- COMPONENT LOGIC ---

    const Auth = {
        init() {
            const loginForm = document.getElementById('login-form');
            const signupForm = document.getElementById('signup-form');
            const showSignup = document.getElementById('show-signup');
            const showLogin = document.getElementById('show-login');

            showSignup?.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('signup-container').style.display = 'block';
            });

            showLogin?.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('signup-container').style.display = 'none';
                document.getElementById('login-container').style.display = 'block';
            });
            
            loginForm?.addEventListener('submit', this.handleLogin);
            signupForm?.addEventListener('submit', this.handleSignup);
            
            if (typeof google !== 'undefined') {
                this.initGoogleSignIn();
            }
        },

        handleLogin: async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try {
                const res = await apiCall('/auth/login', 'POST', { email, password });
                localStorage.setItem('arise_token', res.token);
                await fetchInitialData();
                store.setState({ token: res.token });
            } catch (error) { /* Handled by apiCall */ }
        },

        handleSignup: async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
             try {
                const res = await apiCall('/auth/signup', 'POST', { name, email, password });
                localStorage.setItem('arise_token', res.token);
                await fetchInitialData();
                store.setState({ token: res.token });
            } catch (error) { /* Handled by apiCall */ }
        },

        initGoogleSignIn() {
            google.accounts.id.initialize({
                client_id: '555267087741-0q9stov2plo13qojprjq005vgemnfvm9.apps.googleusercontent.com', // Replace with your actual client ID
                callback: this.handleGoogleCredentialResponse,
            });
            google.accounts.id.renderButton(
                document.getElementById('google-signin-button-login'),
                { theme: "outline", size: "large", width: "300" }
            );
            google.accounts.id.renderButton(
                document.getElementById('google-signin-button-signup'),
                { theme: "outline", size: "large", width: "300" }
            );
        },

        handleGoogleCredentialResponse: async (response) => {
            try {
                const res = await apiCall('/auth/google', 'POST', { token: response.credential });
                localStorage.setItem('arise_token', res.token);
                await fetchInitialData();
                store.setState({ token: res.token });
            } catch (error) { /* Handled by apiCall */ }
        }
    };
    
    const Dashboard = {
        init() {
            document.querySelector('.dashboard-grid')?.addEventListener('click', (e) => {
                const card = e.target.closest('.quick-nav-card');
                if (card) showSection(card.dataset.section);
            });
            this.render();
            store.subscribe(this.render);
        },
        render() {
            const { resume, assignment, user } = store.getState();
            if(!user) return;

            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = user.name;

            const profileStatus = document.getElementById('profile-status');
            if (assignment && Object.keys(assignment).length > 2) { // checks for more than just _id and userId
                profileStatus.textContent = 'Status: Complete ✔️';
                profileStatus.style.color = 'var(--secondary-color)';
            } else {
                profileStatus.textContent = 'Status: Incomplete';
                profileStatus.style.color = 'var(--accent-color)';
            }

            let completion = 0;
            if (resume.personalInfo?.name) completion += 20;
            if (resume.summary) completion += 20;
            if (resume.education?.length > 0 && resume.education[0]?.institution) completion += 20;
            if (resume.experience?.length > 0 && resume.experience[0]?.company) completion += 20;
            if (resume.skills) completion += 20;
            document.getElementById('resume-completion-status').textContent = `${completion}% Complete`;
            document.getElementById('resume-progress-fill').style.width = `${completion}%`;
        }
    };
    
    const Assignment = {
        init() {
            const form = document.getElementById('assignment-form');
            form?.addEventListener('submit', this.handleSubmit);
        },
        handleSubmit: async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.skills = formData.getAll('skills');
            data.interests = data.interests.split(',').map(s => s.trim()).filter(Boolean);
            data.preferredSectors = data.preferredSectors.split(',').map(s => s.trim()).filter(Boolean);
            data.statePreference = data.statePreference.split(',').map(s => s.trim()).filter(Boolean);
            data.cityPreference = data.cityPreference.split(',').map(s => s.trim()).filter(Boolean);

            try {
                const savedAssignment = await apiCall('/assignment', 'POST', data);
                store.setState({ assignment: savedAssignment });
                showToast('Assessment saved successfully!', 'success');
                showSection('recommendations-section');
            } catch (error) { /* Handled by apiCall */ }
        },
        render() {
            const form = document.getElementById('assignment-form');
            if (!form) return;
            const { assignment } = store.getState();

            const popularSkills = ["JavaScript", "Python", "React", "Node.js", "MongoDB", "HTML", "CSS", "Java", "SQL", "AWS", "Docker", "Git"];
            
            form.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Your Top Skills (select many)</label>
                        <div class="skills-checkbox-grid">
                            ${popularSkills.map(skill => `
                                <label><input type="checkbox" name="skills" value="${skill}" ${assignment.skills?.includes(skill) ? 'checked' : ''}> ${skill}</label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Your Interests</label>
                        <input type="text" name="interests" placeholder="e.g., AI, Web Development" value="${(assignment.interests || []).join(', ')}">
                    </div>
                    <div class="form-group">
                        <label>Highest Qualification</label>
                        <input type="text" name="qualification" placeholder="e.g., B.Tech" value="${assignment.qualification || ''}">
                    </div>
                    <div class="form-group">
                        <label>Field of Study</label>
                        <input type="text" name="fieldOfStudy" placeholder="e.g., Computer Science" value="${assignment.fieldOfStudy || ''}">
                    </div>
                    <div class="form-group">
                        <label>Preferred Sectors</label>
                        <input type="text" name="preferredSectors" placeholder="e.g., IT, Finance" value="${(assignment.preferredSectors || []).join(', ')}">
                    </div>
                    <div class="form-group">
                        <label>Location Preference</label>
                        <select name="locationPreference">
                            <option value="Work from Home" ${assignment.locationPreference === 'Work from Home' ? 'selected' : ''}>Work from Home</option>
                            <option value="In-office" ${assignment.locationPreference === 'In-office' ? 'selected' : ''}>In-office</option>
                            <option value="Hybrid" ${assignment.locationPreference === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label>Preferred States</label>
                        <input type="text" name="statePreference" placeholder="e.g., Telangana, Maharashtra" value="${(assignment.statePreference || []).join(', ')}">
                    </div>
                    <div class="form-group">
                        <label>Preferred Cities</label>
                        <input type="text" name="cityPreference" placeholder="e.g., Hyderabad, Pune" value="${(assignment.cityPreference || []).join(', ')}">
                    </div>
                    <div class="form-group">
                        <label>Preferred Duration</label>
                        <select name="durationPreference">
                            <option value="1 Month" ${assignment.durationPreference === '1 Month' ? 'selected' : ''}>1 Month</option>
                            <option value="2 Months" ${assignment.durationPreference === '2 Months' ? 'selected' : ''}>2 Months</option>
                            <option value="3 Months" ${assignment.durationPreference === '3 Months' ? 'selected' : ''}>3 Months</option>
                            <option value="6 Months" ${assignment.durationPreference === '6 Months' ? 'selected' : ''}>6 Months</option>
                        </select>
                    </div>
                     <div class="form-group">
                        <label>Stipend Expectation</label>
                        <select name="stipendExpectation">
                            <option value="Any" ${assignment.stipendExpectation === 'Any' ? 'selected' : ''}>Any</option>
                            <option value="Paid" ${assignment.stipendExpectation === 'Paid' ? 'selected' : ''}>Paid</option>
                            <option value="10k+" ${assignment.stipendExpectation === '10k+' ? 'selected' : ''}>10k+</option>
                            <option value="20k+" ${assignment.stipendExpectation === '20k+' ? 'selected' : ''}>20k+</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">Save Assessment</button>
            `;
        }
    };
    
    const Recommendations = {
        init() {
            store.subscribe(this.render);
        },
        fetch: async () => {
            try {
                const data = await apiCall('/recommendations');
                store.setState({ recommendations: data || [] });
            } catch (error) {
                store.setState({ recommendations: [] }); // Clear on error
            }
        },
        render() {
            const container = document.getElementById('recommendations-container');
            if (!container) return;
            const { recommendations } = store.getState();
            
            if (recommendations.length === 0) {
                container.innerHTML = `<p>No recommendations found. Please complete your assessment for personalized results.</p>`;
                return;
            }

            container.innerHTML = recommendations.map(role => `
                <div class="card role-card">
                    <h3>${role.title}</h3>
                    <div class="company">${role.company}</div>
                    <div class="details">
                        <span><i class="fas fa-map-marker-alt"></i> ${role.location}</span>
                        <span><i class="fas fa-wallet"></i> ${role.stipend}</span>
                        <span><i class="fas fa-clock"></i> ${role.duration}</span>
                    </div>
                    <p class="description">${role.description.substring(0, 100)}...</p>
                    <div class="skills-list">
                        ${(role.skillsRequired || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    <a href="${role.applyLink}" target="_blank" class="btn btn-primary">Apply Now</a>
                </div>
            `).join('');
        }
    };
    
    const ResumeBuilder = {
        init() {
            const formContainer = document.getElementById('resume-form');
            if (!formContainer) return;
            
            formContainer.addEventListener('input', this.handleInputChange);
            formContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if(!button) return;
                const { action, type, id } = button.dataset;
                if (action === 'add') this.addEntry(type);
                if (action === 'delete') this.deleteEntry(type, id);
            });
            formContainer.addEventListener('submit', this.handleSave);
        },
        
        handleInputChange(e) {
            const { path } = e.target.dataset;
            if(!path) return;
            const resume = store.getState().resume;
            
            const keys = path.split('.');
            let current = resume;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (Array.isArray(current)) {
                    current = current.find(item => item.id == keys[i+1]);
                    i++; // Skip next key as it's the ID
                } else {
                    current = current[key];
                }
            }
            current[keys[keys.length - 1]] = e.target.value;
            store.setState({ resume });
        },

        addEntry(type) {
            const resume = store.getState().resume;
            const newEntry = { id: Date.now() };
            if (type === 'education') Object.assign(newEntry, { institution: '', degree: '', field: '', gradYear: '' });
            if (type === 'experience') Object.assign(newEntry, { company: '', role: '', duration: '', description: '' });
            if (type === 'projects') Object.assign(newEntry, { title: '', description: '', link: '' });
            if (!resume[type]) resume[type] = [];
            resume[type].push(newEntry);
            store.setState({ resume });
        },

        deleteEntry(type, id) {
            const resume = store.getState().resume;
            resume[type] = resume[type].filter(item => item.id != id);
            store.setState({ resume });
        },

        handleSave: async (e) => {
            e.preventDefault();
            const resumeToSave = store.getState().resume;
            try {
                const savedResume = await apiCall('/resume', 'POST', resumeToSave);
                const mergedResume = {
                    ...store.getState().resume, 
                    ...savedResume,
                    skills: Array.isArray(savedResume?.skills) ? savedResume.skills.join(', ') : (savedResume?.skills || '')
                };
                store.setState({ resume: mergedResume });
                showToast('Resume saved successfully!', 'success');
            } catch (error) { /* Handled by apiCall */ }
        },

        renderForm() {
            const form = document.getElementById('resume-form');
            const { resume } = store.getState();
            if (!form) return;
            
            const renderSection = (type, fields, title) => {
                let entriesHtml = (resume[type] || []).map(entry => `
                    <div class="resume-entry">
                        <button type="button" class="btn-icon delete-entry" data-action="delete" data-type="${type}" data-id="${entry.id}" aria-label="Delete Entry">&times;</button>
                        <div class="form-grid">
                            ${fields.map(field => `
                                <div class="form-group ${field.fullWidth ? 'form-group-full' : ''}">
                                    <${field.type === 'textarea' ? 'textarea' : 'input'} 
                                        type="${field.type || 'text'}" 
                                        placeholder="${field.placeholder}" 
                                        data-path="${type}.${entry.id}.${field.key}" 
                                        rows="4"
                                    >${field.type === 'textarea' ? (entry[field.key] || '') : ''}</${field.type === 'textarea' ? 'textarea' : 'input'}>
                                </div>
                            `).join('').replace(/<input(.*?)>/g, (match, p1) => {
                                const key = p1.match(/data-path=".*?\.(.*?)"/)[1];
                                const value = entry[key] || '';
                                return `<input${p1} value="${value}">`;
                            })}
                        </div>
                    </div>
                `).join('');

                return `
                    <h3>${title}</h3>
                    <div id="${type}-entries">${entriesHtml}</div>
                    <button type="button" class="btn btn-secondary" data-action="add" data-type="${type}"><i class="fas fa-plus"></i> Add ${title}</button>
                `;
            };

            form.innerHTML = `
                <h3>Personal Information</h3>
                <div class="form-grid">
                    <div class="form-group"><input type="text" placeholder="Full Name" data-path="personalInfo.name" value="${resume.personalInfo.name}"></div>
                    <div class="form-group"><input type="email" placeholder="Email" data-path="personalInfo.email" value="${resume.personalInfo.email}"></div>
                    <div class="form-group"><input type="tel" placeholder="Phone" data-path="personalInfo.phone" value="${resume.personalInfo.phone}"></div>
                    <div class="form-group"><input type="url" placeholder="LinkedIn Profile URL" data-path="personalInfo.linkedin" value="${resume.personalInfo.linkedin}"></div>
                </div>
                <h3>Professional Summary</h3>
                <div class="form-group"><textarea placeholder="A brief summary about your professional background..." data-path="summary" rows="4">${resume.summary}</textarea></div>
                
                ${renderSection('education', [
                    { key: 'institution', placeholder: 'Institution' }, { key: 'degree', placeholder: 'Degree' },
                    { key: 'field', placeholder: 'Field of Study' }, { key: 'gradYear', placeholder: 'Graduation Year' }
                ], 'Education')}
                ${renderSection('experience', [
                    { key: 'company', placeholder: 'Company' }, { key: 'role', placeholder: 'Role / Title' },
                    { key: 'duration', placeholder: 'Duration (e.g., 2022-2023)', fullWidth: true },
                    { key: 'description', placeholder: 'Description of responsibilities and achievements...', type: 'textarea', fullWidth: true }
                ], 'Experience')}
                ${renderSection('projects', [
                    { key: 'title', placeholder: 'Project Title', fullWidth: true },
                    { key: 'link', placeholder: 'Project Link (e.g., GitHub)', fullWidth: true },
                    { key: 'description', placeholder: 'Project description...', type: 'textarea', fullWidth: true }
                ], 'Projects')}

                <h3>Skills</h3>
                <div class="form-group">
                    <input type="text" placeholder="Comma-separated skills, e.g., JavaScript, Python" data-path="skills" value="${resume.skills}">
                </div>
                <div class="resume-actions"><button type="submit" class="btn btn-primary">Save Resume</button></div>
            `;
        },

        renderPreview() {
            const pane = document.getElementById('resume-preview-pane');
            const { resume } = store.getState();
            if (!pane) return;

            const sanitize = (text) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const contactInfo = [sanitize(resume.personalInfo.email), sanitize(resume.personalInfo.phone), sanitize(resume.personalInfo.linkedin)].filter(Boolean).join(' | ');

            const renderEntries = (entries) => entries.map(entry => `
                <div class="preview-entry">
                    <div class="preview-entry-header">
                        <span class="title">${sanitize(entry.institution || entry.company || entry.title || '')}</span>
                        <span class="date">${sanitize(entry.gradYear || entry.duration || '')}</span>
                    </div>
                    <div class="subtitle">${sanitize(entry.degree || entry.role || '')} ${entry.field ? `in ${sanitize(entry.field)}` : ''}</div>
                    ${entry.description ? `<div class="description"><ul><li>${sanitize(entry.description).replace(/\n/g, '</li><li>')}</li></ul></div>` : ''}
                </div>
            `).join('');

            pane.innerHTML = `
                <div class="preview-header">
                    <h1 class="preview-name">${sanitize(resume.personalInfo.name) || 'Your Name'}</h1>
                    <p class="preview-contact">${contactInfo || 'Contact Information'}</p>
                </div>
                ${resume.summary ? `<div class="preview-section"><h2 class="preview-section-title">Summary</h2><p class="preview-summary">${sanitize(resume.summary)}</p></div>` : ''}
                ${resume.education?.length > 0 ? `<div class="preview-section"><h2 class="preview-section-title">Education</h2>${renderEntries(resume.education)}</div>` : ''}
                ${resume.experience?.length > 0 ? `<div class="preview-section"><h2 class="preview-section-title">Experience</h2>${renderEntries(resume.experience)}</div>` : ''}
                ${resume.projects?.length > 0 ? `<div class="preview-section"><h2 class="preview-section-title">Projects</h2>${renderEntries(resume.projects)}</div>` : ''}
                ${resume.skills ? `<div class="preview-section"><h2 class="preview-section-title">Skills</h2><p class="preview-skills">${sanitize(resume.skills)}</p></div>` : ''}
            `;
        }
    };
    
    const Chatbot = {
         init() {
            const sendBtn = document.getElementById('chat-send-btn');
            const input = document.getElementById('chat-input');
            const suggestedPrompts = document.getElementById('suggested-prompts');
            
            sendBtn?.addEventListener('click', () => this.sendMessage(input.value));
            input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(input.value);
                }
            });
            input?.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = (input.scrollHeight) + 'px';
            });
            suggestedPrompts?.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                if(prompt) this.sendMessage(prompt);
            });
            store.subscribe(this.render);
         },
         render() {
            const { history, isLoading } = store.getState().chatbot;
            const chatWindow = document.getElementById('chat-window');
            if(!chatWindow) return;

            chatWindow.innerHTML = history.map(msg => `
                <div class="chat-message ${msg.role}">
                    <div class="avatar"><i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i></div>
                    <div class="message-bubble">${msg.role === 'user' ? msg.parts : marked.parse(msg.parts)}</div>
                </div>
            `).join('');

            if (isLoading) {
                chatWindow.innerHTML += `
                    <div class="chat-message bot">
                        <div class="avatar"><i class="fas fa-robot"></i></div>
                        <div class="message-bubble typing-indicator"><span></span><span></span><span></span></div>
                    </div>`;
            }
            chatWindow.scrollTop = chatWindow.scrollHeight;
         },
         sendMessage: async (promptText) => {
            const prompt = promptText.trim();
            if (!prompt || store.getState().chatbot.isLoading) return;

            const input = document.getElementById('chat-input');
            input.value = '';
            input.style.height = 'auto';

            const currentHistory = store.getState().chatbot.history;
            const newUserMessage = { role: 'user', parts: prompt };
            
            store.setState({ chatbot: { ...store.getState().chatbot, history: [...currentHistory, newUserMessage], isLoading: true } });

            try {
                const res = await apiCall('/chatbot', 'POST', { prompt, history: currentHistory });
                const newBotMessage = { role: 'bot', parts: res.reply };
                store.setState({ chatbot: { ...store.getState().chatbot, history: [...currentHistory, newUserMessage, newBotMessage], isLoading: false } });
            } catch (error) {
                const errorMessage = { role: 'bot', parts: 'Sorry, I encountered an error. Please try again.' };
                store.setState({ chatbot: { ...store.getState().chatbot, history: [...currentHistory, newUserMessage, errorMessage], isLoading: false } });
            }
         }
    };
    
    // --- MAIN INITIALIZATION ---
    function init() {
        renderApp();
        store.subscribe(renderApp);

        fetchInitialData().then(() => {
            Auth.init();
            Dashboard.init();
            Assignment.init();
            Recommendations.init();
            ResumeBuilder.init();
            Chatbot.init();

            store.subscribe(ResumeBuilder.renderForm);
            store.subscribe(() => ResumeSyncer.sync());

            document.querySelector('.sidebar-nav')?.addEventListener('click', (e) => {
                const link = e.target.closest('.nav-link');
                if (link && store.getState().token) {
                    e.preventDefault();
                    showSection(link.dataset.section);
                }
            });
            document.getElementById('logout-btn')?.addEventListener('click', logout);
            document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
                store.setState({ isDarkMode: e.target.checked });
                localStorage.setItem('arise_dark_mode', e.target.checked);
            });
        });
    }

    const ResumeSyncer = {
        timeoutId: null,
        sync() {
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => {
                ResumeBuilder.renderPreview();
            }, 300); // Debounce preview rendering
        }
    };

    init();
});