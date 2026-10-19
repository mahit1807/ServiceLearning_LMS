const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get Zoom OAuth access token using Server-to-Server OAuth (Account Credentials).
 * Tokens are cached until expiry.
 */
async function getZoomAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom credentials not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in backend/.env');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    'https://zoom.us/oauth/token',
    null,
    {
      params: {
        grant_type: 'account_credentials',
        account_id: ZOOM_ACCOUNT_ID,
      },
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

  return cachedToken;
}

/**
 * Create a permanent Zoom meeting for a course.
 * Uses type 3 (Recurring meeting with no fixed time) so it remains
 * the same permanent link for the course.
 * Configures auto_recording to "cloud" for automatic cloud recording.
 */
async function createPermanentZoomMeeting({ topic, duration = 60 }) {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic,
        type: 3, // Recurring meeting with no fixed time = permanent link
        duration,
        timezone: 'Asia/Kolkata',
        settings: {
          join_before_host: true,
          participant_video: true,
          host_video: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: 'cloud', // Automatic cloud recording
          approval_type: 0, // Automatically approve
          registration_type: 1,
          meeting_authentication: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      meetingId: String(response.data.id),
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      topic: response.data.topic,
      duration: response.data.duration,
      autoRecording: response.data.settings?.auto_recording || 'cloud',
    };
  } catch (err) {
    // Check if cloud recording is not available for this account
    const errMsg = err.response?.data?.message || err.message;
    console.error('Zoom createPermanentZoomMeeting error:', errMsg);

    // If cloud recording is not supported, try with local recording
    if (errMsg.toLowerCase().includes('recording') || err.response?.status === 400) {
      console.warn('Cloud recording may not be available. Retrying with local recording...');
      try {
        const response = await axios.post(
          'https://api.zoom.us/v2/users/me/meetings',
          {
            topic,
            type: 3,
            duration,
            timezone: 'Asia/Kolkata',
            settings: {
              join_before_host: true,
              participant_video: true,
              host_video: true,
              mute_upon_entry: true,
              waiting_room: false,
              auto_recording: 'local',
              approval_type: 0,
              meeting_authentication: false,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          meetingId: String(response.data.id),
          joinUrl: response.data.join_url,
          startUrl: response.data.start_url,
          topic: response.data.topic,
          duration: response.data.duration,
          autoRecording: response.data.settings?.auto_recording || 'local',
        };
      } catch (retryErr) {
        console.error('Zoom retry with local recording also failed:', retryErr.response?.data || retryErr.message);
        throw new Error(`Failed to create Zoom meeting: ${retryErr.response?.data?.message || retryErr.message}`);
      }
    }

    throw new Error(`Failed to create Zoom meeting: ${errMsg}`);
  }
}

/**
 * Create a scheduled Zoom meeting (for individual live sessions).
 * Kept for backward compatibility with existing live_sessions flow.
 */
async function createZoomMeeting({ topic, startTime, duration = 60 }) {
  const token = await getZoomAccessToken();

  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration,
      timezone: 'Asia/Kolkata',
      settings: {
        join_before_host: true,
        participant_video: true,
        host_video: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: 'cloud',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    meetingId: String(response.data.id),
    joinUrl: response.data.join_url,
    startUrl: response.data.start_url,
    topic: response.data.topic,
    startTime: response.data.start_time,
    duration: response.data.duration,
  };
}

/**
 * Fetch meeting participants/report from Zoom.
 */
async function getMeetingParticipants(meetingId) {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/report/meetings/${meetingId}/participants`,
      {
        params: { page_size: 300 },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.participants || [];
  } catch (err) {
    // If meeting hasn't ended yet, try the live participants endpoint
    if (err.response?.status === 400 || err.response?.status === 404) {
      try {
        const liveResponse = await axios.get(
          `https://api.zoom.us/v2/meetings/${meetingId}/participants`,
          {
            params: { page_size: 300 },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return liveResponse.data.participants || [];
      } catch {
        return [];
      }
    }
    throw err;
  }
}

/**
 * Get meeting details from Zoom.
 */
async function getZoomMeetingDetails(meetingId) {
  const token = await getZoomAccessToken();

  const response = await axios.get(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

/**
 * Fetch recording data for a meeting from Zoom.
 */
async function getMeetingRecordings(meetingId) {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    const recordings = (data.recording_files || []).map(r => ({
      recordingUrl: r.download_url,
      playUrl: r.play_url,
      recordingStart: r.recording_start,
      recordingEnd: r.recording_end,
      duration: r.duration || 0,
      fileSize: r.file_size || 0,
      recordingType: r.recording_type,
      status: r.status === 'completed' ? 'available' : 'processing',
    }));

    return {
      password: data.password || null,
      recordings,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      // No recordings exist yet
      return { password: null, recordings: [] };
    }
    console.error('Fetch recordings error:', err.response?.data || err.message);
    throw new Error(`Failed to fetch recordings: ${err.response?.data?.message || err.message}`);
  }
}

module.exports = {
  getZoomAccessToken,
  createZoomMeeting,
  createPermanentZoomMeeting,
  getMeetingParticipants,
  getZoomMeetingDetails,
  getMeetingRecordings,
};
