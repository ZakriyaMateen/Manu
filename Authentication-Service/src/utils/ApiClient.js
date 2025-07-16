import axios from 'axios';

class ApiClient {
    constructor(baseURL = '') {
        this.client = axios.create({
            baseURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Interceptors can be added here
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                // Customize error handling
                const customError = {
                    status: error?.response?.status || 500,
                    message: error?.response?.data?.message || error.message || 'Unknown Error',
                    data: error?.response?.data || null,
                };
                return Promise.reject(customError);
            }
        );
    }

    async get(url, config = {}) {
        return this.client.get(url, config);
    }

    async post(url, data = {}, config = {}) {
        return this.client.post(url, data, config);
    }

    async put(url, data = {}, config = {}) {
        return this.client.put(url, data, config);
    }

    async delete(url, config = {}) {
        return this.client.delete(url, config);
    }
}

export default ApiClient;
