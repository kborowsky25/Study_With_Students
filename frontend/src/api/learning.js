import client from './client'

export const getLearningProfile  = ()          => client.get('/learning-profile')
export const saveLearningProfile = (data)      => client.put('/learning-profile', data)
export const getRecommendedTutors = (limit = 6) => client.get('/tutors/recommended', { params: { limit } })
