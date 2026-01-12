import client from './client';

/**
 * Get all sessions, optionally filtered by category.
 * @param {string} category - 'conversation' or 'search'
 */
export const getSessions = async (category = null) => {
    const params = category ? { category } : {};
    const response = await client.get('/chats/', { params });
    return response.data;
};

/**
 * Create a new chat session.
 * @param {string} title - Session title
 * @param {string} category - 'conversation' or 'search'
 * @param {string} mode - 'thesis' or 'general'
 */
export const createSession = async (title, category = 'conversation', mode = 'thesis') => {
    const response = await client.post('/chats/', { title, category, mode });
    return response.data;
};

/**
 * Delete a chat session.
 */
export const deleteSession = async (sessionId) => {
    const response = await client.delete(`/chats/${sessionId}`);
    return response.data;
};

/**
 * Send a query to the AI assistant.
 * @param {string} question - The user's question
 * @param {string} sessionId - Session ID to save conversation to
 * @param {string} mode - 'thesis' or 'general' (for prompt selection)
 */
export const sendQuery = async (question, sessionId = null, mode = 'thesis') => {
    const response = await client.post('/chats/query', {
        question,
        session_id: sessionId,
        mode
    });
    return response.data;
};

/**
 * Update search results for a session (used by EXA search).
 */
export const updateSessionResults = async (sessionId, results) => {
    const response = await client.put(`/chats/${sessionId}/results`, { results });
    return response.data;
};
