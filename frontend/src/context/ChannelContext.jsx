import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as channelsApi from '../api/channels';

export const ChannelContext = createContext(null);

export function ChannelProvider({ children }) {
  const { token, user } = useAuth();
  const [myChannel, setMyChannel] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);

  // In-memory cache and inflight promises refs
  const channelsCacheRef = useRef({});
  const inFlightChannelsRef = useRef({});

  // Helper to fetch channel by author/owner ID directly via /channels/user/{user_id}
  const getChannelByAuthorId = useCallback(async (userId) => {
    if (!userId) return null;
    const lookupKey = `user_${userId}`;

    if (channelsCacheRef.current[lookupKey]) {
      return channelsCacheRef.current[lookupKey];
    }
    if (inFlightChannelsRef.current[lookupKey]) {
      return inFlightChannelsRef.current[lookupKey];
    }

    const fetchPromise = (async () => {
      try {
        const ch = await channelsApi.getChannelByUserId(userId);
        if (ch) {
          channelsCacheRef.current[lookupKey] = ch;
          channelsCacheRef.current[ch.id] = ch;
          if (ch.handle) channelsCacheRef.current[ch.handle] = ch;
          if (ch.owner_id) channelsCacheRef.current[`user_${ch.owner_id}`] = ch;
          delete inFlightChannelsRef.current[lookupKey];
          return ch;
        }
      } catch {}

      delete inFlightChannelsRef.current[lookupKey];
      return null;
    })();

    inFlightChannelsRef.current[lookupKey] = fetchPromise;
    return fetchPromise;
  }, []);

  // Helper to fetch channel by UUID or handle via /channels/{id_or_handle}
  const getChannelData = useCallback(async (idOrHandle) => {
    if (!idOrHandle) return null;
    const lookupKey = String(idOrHandle);

    if (channelsCacheRef.current[lookupKey]) {
      return channelsCacheRef.current[lookupKey];
    }
    if (inFlightChannelsRef.current[lookupKey]) {
      return inFlightChannelsRef.current[lookupKey];
    }

    const fetchPromise = (async () => {
      // If numeric ID passed, use /channels/user/{user_id}
      if (!isNaN(lookupKey) && !lookupKey.includes('-')) {
        return getChannelByAuthorId(Number(lookupKey));
      }

      try {
        const ch = await channelsApi.getChannel(lookupKey);
        if (ch) {
          channelsCacheRef.current[lookupKey] = ch;
          channelsCacheRef.current[ch.id] = ch;
          if (ch.handle) channelsCacheRef.current[ch.handle] = ch;
          if (ch.owner_id) channelsCacheRef.current[`user_${ch.owner_id}`] = ch;
          delete inFlightChannelsRef.current[lookupKey];
          return ch;
        }
      } catch {}

      delete inFlightChannelsRef.current[lookupKey];
      return null;
    })();

    inFlightChannelsRef.current[lookupKey] = fetchPromise;
    return fetchPromise;
  }, [getChannelByAuthorId]);

  // Helper to get photo URL (prefer from ChannelResponse, fallback to API)
  const getPhotoUrl = useCallback(async (channelId, photoType = 'avatar') => {
    if (!channelId) return null;
    const cached = channelsCacheRef.current[channelId];
    if (cached) {
      if (photoType === 'avatar' && cached.avatar_url) return cached.avatar_url;
      if (photoType === 'avatar_small' && (cached.avatar_small_url || cached.avatar_url)) {
        return cached.avatar_small_url || cached.avatar_url;
      }
      if (photoType === 'banner' && cached.banner_url) return cached.banner_url;
    }

    try {
      const res = await channelsApi.getChannelPhotoUrl(channelId, photoType);
      return res?.url || null;
    } catch {
      return null;
    }
  }, []);

  // Fetch or create user's channel on login
  const refreshMyChannel = useCallback(async () => {
    if (!token || !user?.id) {
      setMyChannel(null);
      return;
    }
    try {
      let ch = await getChannelByAuthorId(user.id);

      if (!ch) {
        try {
          ch = await channelsApi.createChannel(token);
        } catch (createErr) {
          console.warn('Channel creation status:', createErr);
        }
      }

      if (ch) {
        channelsCacheRef.current[ch.id] = ch;
        if (ch.handle) channelsCacheRef.current[ch.handle] = ch;
        if (ch.owner_id) channelsCacheRef.current[`user_${ch.owner_id}`] = ch;
        setMyChannel(ch);
      }
    } catch (e) {
      console.error('Error refreshing my channel:', e);
    }
  }, [token, user?.id, getChannelByAuthorId]);

  // Load subscriptions when user is logged in
  const refreshSubscriptions = useCallback(async () => {
    if (!token) {
      setSubscriptions([]);
      return;
    }
    setSubscriptionsLoading(true);
    try {
      const list = await channelsApi.getMySubscriptions(token);
      const items = list || [];
      setSubscriptions(items);
      items.forEach((ch) => {
        channelsCacheRef.current[ch.id] = ch;
        if (ch.handle) channelsCacheRef.current[ch.handle] = ch;
        if (ch.owner_id) channelsCacheRef.current[`user_${ch.owner_id}`] = ch;
      });
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user?.id) {
      refreshMyChannel();
      refreshSubscriptions();
    } else {
      setMyChannel(null);
      setSubscriptions([]);
    }
  }, [token, user?.id, refreshMyChannel, refreshSubscriptions]);

  // Toggle subscription
  const toggleSub = useCallback(async (channelId) => {
    if (!token) throw new Error('Требуется авторизация');
    const res = await channelsApi.toggleSubscription(token, channelId);

    await refreshSubscriptions();

    try {
      const updatedCh = await channelsApi.getChannel(channelId);
      if (updatedCh) {
        channelsCacheRef.current[updatedCh.id] = updatedCh;
        if (updatedCh.handle) channelsCacheRef.current[updatedCh.handle] = updatedCh;
        if (updatedCh.owner_id) channelsCacheRef.current[`user_${updatedCh.owner_id}`] = updatedCh;
      }
    } catch {}

    return res.is_subscribed;
  }, [token, refreshSubscriptions]);

  const isSubscribed = useCallback((channelId) => {
    if (!channelId || !subscriptions) return false;
    return subscriptions.some((sub) => sub.id === channelId);
  }, [subscriptions]);

  return (
    <ChannelContext.Provider
      value={{
        myChannel,
        subscriptions,
        subscriptionsLoading,
        getChannelData,
        getChannelByAuthorId,
        getPhotoUrl,
        toggleSub,
        isSubscribed,
        refreshSubscriptions,
        refreshMyChannel,
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  return useContext(ChannelContext);
}
