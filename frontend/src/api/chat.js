import client from './client';

export const getChats = async (type = null) => {
    const params = type ? { type } : {};
    const response = await client.get('/chats/', { params });
    return response.data;
};

export const createChat = async (title, type = 'knowledge_base') => {
    const response = await client.post('/chats/', { title, type });
    return response.data;
};

export const deleteChat = async (id) => {
    const response = await client.delete(`/chats/${id}`);
    return response.data;
};

export const sendQuery = async (query, sessionId = null, chatType = 'thesis') => {
    const response = await client.post('/chats/query', { question: query, session_id: sessionId, chat_type: chatType });
    return response.data;
};
