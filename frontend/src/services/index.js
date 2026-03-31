import api from './api'

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password })
    return response.data
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  async getMe() {
    const response = await api.get('/auth/me')
    return response.data
  },

  async logout() {
    const response = await api.post('/auth/logout')
    return response.data
  },

  getGoogleAuthUrl() {
    return `${import.meta.env.VITE_API_URL || ''}/api/auth/google`
  },

  getGithubAuthUrl() {
    return `${import.meta.env.VITE_API_URL || ''}/api/auth/github`
  }
}

export const documentService = {
  async getDocuments(params = {}) {
    const response = await api.get('/documents', { params })
    return response.data
  },

  async getDocument(id) {
    const response = await api.get(`/documents/${id}`)
    return response.data
  },

  async uploadDocument(formData, onProgress) {
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      }
    })
    return response.data
  },

  async ingestUrl(url, knowledgeBaseId, title, tags) {
    const response = await api.post('/documents/url', { 
      url, 
      knowledgeBaseId, 
      title, 
      tags 
    })
    return response.data
  },

  async updateDocument(id, data) {
    const response = await api.put(`/documents/${id}`, data)
    return response.data
  },

  async deleteDocument(id) {
    const response = await api.delete(`/documents/${id}`)
    return response.data
  },

  async reprocessDocument(id) {
    const response = await api.post(`/documents/${id}/reprocess`)
    return response.data
  }
}

export const chatService = {
  async query(data) {
    const response = await api.post('/chat/query', data)
    return response.data
  },

  async getChats(params = {}) {
    const response = await api.get('/chat', { params })
    return response.data
  },

  async getChat(id) {
    const response = await api.get(`/chat/${id}`)
    return response.data
  },

  async updateChat(id, data) {
    const response = await api.put(`/chat/${id}`, data)
    return response.data
  },

  async deleteChat(id) {
    const response = await api.delete(`/chat/${id}`)
    return response.data
  },

  async addFeedback(chatId, messageIndex, feedback) {
    const response = await api.post(`/chat/${chatId}/feedback`, {
      messageIndex,
      ...feedback
    })
    return response.data
  },

  async summarize(data) {
    const response = await api.post('/chat/summarize', data)
    return response.data
  },

  async generateInsights(data) {
    const response = await api.post('/chat/insights', data)
    return response.data
  }
}

export const knowledgeBaseService = {
  async getKnowledgeBases(params = {}) {
    const response = await api.get('/knowledge-base', { params })
    return response.data
  },

  async getKnowledgeBase(id) {
    const response = await api.get(`/knowledge-base/${id}`)
    return response.data
  },

  async createKnowledgeBase(data) {
    const response = await api.post('/knowledge-base', data)
    return response.data
  },

  async updateKnowledgeBase(id, data) {
    const response = await api.put(`/knowledge-base/${id}`, data)
    return response.data
  },

  async deleteKnowledgeBase(id) {
    const response = await api.delete(`/knowledge-base/${id}`)
    return response.data
  },

  async shareKnowledgeBase(id, email, permission) {
    const response = await api.post(`/knowledge-base/${id}/share`, { 
      email, 
      permission 
    })
    return response.data
  },

  async removeShare(id, userId) {
    const response = await api.delete(`/knowledge-base/${id}/share/${userId}`)
    return response.data
  },

  async searchKnowledgeBase(id, query, limit = 10) {
    const response = await api.get(`/knowledge-base/${id}/search`, { 
      params: { query, limit } 
    })
    return response.data
  },

  async getStats(id) {
    const response = await api.get(`/knowledge-base/${id}/stats`)
    return response.data
  }
}

export const teamService = {
  async getTeams() {
    const response = await api.get('/teams')
    return response.data
  },

  async getTeam(id) {
    const response = await api.get(`/teams/${id}`)
    return response.data
  },

  async createTeam(data) {
    const response = await api.post('/teams', data)
    return response.data
  },

  async updateTeam(id, data) {
    const response = await api.put(`/teams/${id}`, data)
    return response.data
  },

  async deleteTeam(id) {
    const response = await api.delete(`/teams/${id}`)
    return response.data
  },

  async inviteMember(teamId, email, role) {
    const response = await api.post(`/teams/${teamId}/invite`, { email, role })
    return response.data
  },

  async joinTeam(token) {
    const response = await api.post(`/teams/join/${token}`)
    return response.data
  },

  async removeMember(teamId, memberId) {
    const response = await api.delete(`/teams/${teamId}/members/${memberId}`)
    return response.data
  },

  async updateMemberRole(teamId, memberId, role) {
    const response = await api.put(`/teams/${teamId}/members/${memberId}/role`, { role })
    return response.data
  }
}

export const userService = {
  async getProfile() {
    const response = await api.get('/users/profile')
    return response.data
  },

  async updateProfile(data) {
    const response = await api.put('/users/profile', data)
    return response.data
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/users/password', { 
      currentPassword, 
      newPassword 
    })
    return response.data
  },

  async getUsage() {
    const response = await api.get('/users/usage')
    return response.data
  },

  async deleteAccount(password, confirmation) {
    const response = await api.delete('/users/account', { 
      data: { password, confirmation } 
    })
    return response.data
  }
}
