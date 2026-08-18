import { request, authHeaders } from './client';

/**
 * Get channel information by UUID or by handle (e.g. '@username')
 */
export async function getChannel(idOrHandle) {
  return request(`/channels/${encodeURIComponent(idOrHandle)}`);
}

/**
 * Get channel information by author/user ID
 */
export async function getChannelByUserId(userId) {
  return request(`/channels/user/${userId}`);
}


/**
 * Create channel for current authenticated user
 */
export async function createChannel(token) {
  return request('/channels/', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

/**
 * Update channel settings (handle, name, description, country)
 */
export async function updateChannel(token, { handle, name, description, country }) {
  return request('/channels/', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ handle, name, description, country }),
  });
}

/**
 * Toggle subscription to a channel
 */
export async function toggleSubscription(token, channelId) {
  return request(`/subscriptions/${channelId}/toggle`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

/**
 * Get list of channels the current user is subscribed to
 */
export async function getMySubscriptions(token) {
  return request('/subscriptions/my', {
    headers: authHeaders(token),
  });
}

/**
 * Upload channel photo (avatar or banner)
 * @param {string} token
 * @param {File} file
 * @param {'avatar' | 'banner'} fileType
 */
export async function uploadChannelPhoto(token, file, fileType = 'avatar') {
  const form = new FormData();
  form.append('file', file);
  return request(`/storage/channels/photo?file_type=${fileType}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: form,
  });
}

/**
 * Get public photo URL for a channel from MinIO
 * @param {string} channelId
 * @param {'avatar' | 'avatar_small' | 'banner'} photoType
 */
export async function getChannelPhotoUrl(channelId, photoType = 'avatar') {
  return request(`/storage/${channelId}?photo_type=${photoType}`);
}
