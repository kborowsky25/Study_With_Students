import client from './client'

// Parent accounts and family links (server/routes/family.py). Children are addressed by user id.
export const getFamily              = ()                    => client.get('/family')
export const turnOnParentMode       = ()                    => client.post('/family/parent-role')
export const inviteChild            = (email)               => client.post('/family/invites', { email })
export const acceptInvite           = (linkId)              => client.post(`/family/invites/${linkId}/accept`)
export const declineInvite          = (linkId)              => client.post(`/family/invites/${linkId}/decline`)
export const removeLink             = (linkId)              => client.delete(`/family/links/${linkId}`)
export const getChild               = (childId)             => client.get(`/family/children/${childId}`)
export const getChildConversations  = ()                    => client.get('/family/conversations')
export const getChildThread         = (childId, partnerId)  => client.get(`/family/children/${childId}/messages/${partnerId}`)
