// Session-based auth — no config import needed

export class ZammadAPI {
    constructor() {
        this.statesCache = null;
        this.prioritiesCache = null;
        this.articleTypesCache = null;
        this.usersCache = {};
        this.currentUser = null;
        this.csrfToken = null;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }
        return headers;
    }

    getApiBaseUrl() {
        // Use the proxy path — works in both dev (Vite proxy) and production (Nginx proxy)
        return '/zammad-api';
    }

    getExternalUrl() {
        // For generating clickable ticket links
        return window.location.origin;
    }

    async request(endpoint, options = {}) {
        const baseUrl = this.getApiBaseUrl();
        const url = `${baseUrl}${endpoint}`;
        const response = await fetch(url, {
            headers: this.getHeaders(),
            credentials: 'include',  // Send session cookies
            ...options,
        });

        // Capture CSRF token from Zammad response headers
        const token = response.headers.get('csrf-token');
        if (token) {
            this.csrfToken = token;
        }

        if (response.status === 401) {
            // Not authenticated — redirect to Zammad login
            window.location.href = '/#login';
            throw new Error('Not authenticated');
        }

        if (response.status === 403) {
            throw new Error('Forbidden');
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    async logout() {
        try {
            await this.request('/api/v1/signout', { method: 'DELETE' });
        } catch (e) {
            console.error('Logout failed', e);
        }
        // Always redirect to login regardless of success/failure
        window.location.href = '/#login';
    }

    async testConnection() {
        try {
            const user = await this.request('/api/v1/users/me');
            this.currentUser = user;
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        try {
            this.currentUser = await this.request('/api/v1/users/me');
            return this.currentUser;
        } catch {
            return null;
        }
    }

    async getTickets(page = 1, perPage = 100) {
        return this.request(`/api/v1/tickets?page=${page}&per_page=${perPage}&order_by=created_at&sort_by=desc`);
    }

    async getAllTickets() {
        const allTickets = [];
        let page = 1;
        const perPage = 100;

        while (true) {
            const tickets = await this.getTickets(page, perPage);
            if (!tickets || tickets.length === 0) break;
            allTickets.push(...tickets);
            if (tickets.length < perPage) break;
            page++;
            if (page > 50) break;
        }

        return allTickets;
    }

    async getTicketStates() {
        if (this.statesCache) return this.statesCache;
        this.statesCache = await this.request('/api/v1/ticket_states');
        return this.statesCache;
    }

    async getTicketPriorities() {
        if (this.prioritiesCache) return this.prioritiesCache;
        this.prioritiesCache = await this.request('/api/v1/ticket_priorities');
        return this.prioritiesCache;
    }

    async getTicketArticleTypes() {
        if (this.articleTypesCache) return this.articleTypesCache;
        try {
            this.articleTypesCache = await this.request('/api/v1/ticket_articles/types');
            return this.articleTypesCache;
        } catch {
            return [];
        }
    }

    async getUser(id) {
        if (this.usersCache[id]) return this.usersCache[id];
        try {
            const user = await this.request(`/api/v1/users/${id}`);
            this.usersCache[id] = user;
            return user;
        } catch {
            return { firstname: 'Unknown', lastname: 'User' };
        }
    }

    async getUsers() {
        try {
            return await this.request('/api/v1/users?per_page=200');
        } catch (e) {
            console.warn('Users fetch failed (likely lack of admin permissions):', e.message);
            return [];
        }
    }
}
