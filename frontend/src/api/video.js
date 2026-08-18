import { request, authHeaders } from './client';

export async function getFeed(page = 1, size = 20) {
  return request(`/video/feed?page=${page}&size=${size}`);
}

export async function getVideo(videoId, token) {
  return request(`/video/storage/${videoId}`, {
    headers: authHeaders(token),
  });
}

export async function uploadVideo(token, { title, description, file }) {
  const form = new FormData();
  form.append('title', title);
  if (description) form.append('description', description);
  form.append('file', file);
  return request('/video/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function deleteVideo(token, videoId) {
  return request(`/video/storage/${videoId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function setVideoActivity(token, videoId, activityType) {
  return request(`/video/${videoId}?activity_type=${activityType}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getComments(videoId, page = 1, size = 100, token) {
  return request(`/comments/videos/${videoId}?page=${page}&size=${size}`, {
    headers: authHeaders(token),
  });
}

export async function createComment(token, videoId, text) {
  return request(`/comments/videos/${videoId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ text }),
  });
}

export async function setCommentActivity(token, commentId, activity = 'like') {
  return request(`/comments/${commentId}?activity=${activity}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getComment(token, commentId) {
  return request(`/comments/${commentId}`, {
    headers: authHeaders(token),
  });
}

export async function getTimecode(videoId, token) {
  return request(`/video/${videoId}/timecode`, {
    headers: authHeaders(token),
  });
}

export async function setTimecode(videoId, timecodeSec, token) {
  return request(`/video/${videoId}/timecode?timecode_sec=${timecodeSec}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getUserVideos(userId, page = 0, size = 100) {
  return request(`/profile/${userId}/videos?page=${page}&size=${size}`);
}
