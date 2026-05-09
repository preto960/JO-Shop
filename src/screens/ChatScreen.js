import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '@context/AuthContext';
import apiService from '@services/api';
import {
  getPusherClient,
  subscribeToOrderChannel,
  unsubscribeFromOrderChannel,
} from '@services/pusher';
import theme from '@theme/styles';
import useThemeColors from '@hooks/useThemeColors';

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatTime = dateStr => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDate = dateStr => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}`;
};

// ─── Component ────────────────────────────────────────────────────────────

const ChatScreen = ({route, navigation}) => {
  const {orderId, orderNumber, otherUserName} = route.params;
  const {user, token} = useAuth();
  const {primary} = useThemeColors();
  const styles = useMemo(() => createStyles(primary), [primary]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const flatListRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // ─── Fetch message history ─────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.fetchChatMessages(orderId);
      if (res) {
        // Backend returns { data: [...messages], pagination: {...} }
        let msgs = [];
        if (res.messages) {
          msgs = res.messages;
        } else if (res.data && Array.isArray(res.data)) {
          msgs = res.data.map(m => ({
            id: String(m.id),
            content: m.content,
            senderId: String(m.senderId),
            senderName: m.sender?.name || '',
            senderRole: m.senderId === user?.id ? 'customer' : 'delivery',
            createdAt: m.createdAt,
          }));
        } else if (Array.isArray(res)) {
          msgs = res;
        }
        setMessages(msgs);
      }
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ─── Pull to refresh ──────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  // ─── Subscribe to Pusher ──────────────────────────────────────────────

  useEffect(() => {
    if (!token || !orderId) return;

    const pusher = getPusherClient(token);
    pusherRef.current = pusher;
    const channel = subscribeToOrderChannel(pusher, orderId);
    channelRef.current = channel;

    channel.bind('new-message', data => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind('new-message');
        unsubscribeFromOrderChannel(pusherRef.current, orderId);
      }
    };
  }, [token, orderId]);

  // ─── Auto-scroll to bottom on new messages ────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  // ─── Send message ─────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      await apiService.sendChatMessage(orderId, content, 'customer');
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setInputText(content); // Restore on failure
    } finally {
      setSending(false);
    }
  };

  // ─── Hide React Navigation header (we use a custom inline header) ──

  useEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

  // ─── Render: Message Bubble ───────────────────────────────────────────

  const renderMessage = useCallback(
    ({item, index}) => {
      const isSender = String(item.senderId) === String(user?.id);
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const showDate =
        !prevMessage ||
        formatDate(item.createdAt) !== formatDate(prevMessage.createdAt);

      return (
        <View>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageRow,
              isSender ? styles.messageRowSender : styles.messageRowReceiver,
            ]}>
            <View
              style={[
                styles.bubble,
                isSender ? styles.bubbleSender : styles.bubbleReceiver,
              ]}>
              <Text
                style={[
                  styles.bubbleText,
                  isSender ? styles.bubbleTextSender : styles.bubbleTextReceiver,
                ]}>
                {item.content}
              </Text>
              <View
                style={[
                  styles.bubbleFooter,
                  isSender
                    ? styles.bubbleFooterSender
                    : styles.bubbleFooterReceiver,
                ]}>
                {item.senderName && !isSender && (
                  <Text style={styles.senderName}>{item.senderName}</Text>
                )}
                <Text
                  style={[
                    styles.timeText,
                    isSender
                      ? styles.timeTextSender
                      : styles.timeTextReceiver,
                  ]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [messages, styles, user?.id],
  );

  // ─── Key extractor ────────────────────────────────────────────────────

  const keyExtractor = useCallback(item => String(item.id), []);

  // ─── Empty state ──────────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={56}
          color={theme.colors.textLight}
        />
        <Text style={styles.emptyTitle}>Sin mensajes</Text>
        <Text style={styles.emptyText}>
          Inicia una conversación sobre tu pedido.
        </Text>
      </View>
    );
  }, [loading, styles]);

  // ─── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Chat Pedido #{orderNumber}</Text>
            {otherUserName && (
              <Text style={styles.headerSubtitle}>{otherUserName}</Text>
            )}
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loaderText}>Cargando mensajes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat Pedido #{orderNumber}</Text>
          {otherUserName && (
            <Text style={styles.headerSubtitle}>{otherUserName}</Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyList
              : styles.messagesList
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[primary]}
              tintColor={primary}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          inverted={false}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={theme.colors.textLight}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.7}>
              {sending ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Ionicons name="send" size={20} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const createStyles = primary =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.white,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    headerLeft: {
      width: 40,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerRight: {
      width: 40,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },

    // Loader
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    loaderText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },

    // Messages list
    messagesList: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    emptyList: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      lineHeight: 22,
    },

    // Date separator
    dateSeparator: {
      alignItems: 'center',
      marginVertical: theme.spacing.md,
    },
    dateText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textLight,
      backgroundColor: theme.colors.inputBg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },

    // Message rows
    messageRow: {
      marginBottom: theme.spacing.xs,
      maxWidth: '85%',
    },
    messageRowSender: {
      alignSelf: 'flex-end',
    },
    messageRowReceiver: {
      alignSelf: 'flex-start',
    },

    // Bubbles
    bubble: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
    },
    bubbleSender: {
      backgroundColor: primary,
      borderBottomRightRadius: theme.borderRadius.xs,
    },
    bubbleReceiver: {
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: theme.borderRadius.xs,
    },

    // Bubble text
    bubbleText: {
      fontSize: theme.fontSize.md,
      lineHeight: 20,
    },
    bubbleTextSender: {
      color: theme.colors.white,
    },
    bubbleTextReceiver: {
      color: theme.colors.text,
    },

    // Bubble footer (sender name + time)
    bubbleFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    bubbleFooterSender: {
      justifyContent: 'flex-end',
    },
    bubbleFooterReceiver: {
      justifyContent: 'flex-start',
    },
    senderName: {
      fontSize: theme.fontSize.xs,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    timeText: {
      fontSize: 10,
    },
    timeTextSender: {
      color: 'rgba(255,255,255,0.7)',
    },
    timeTextReceiver: {
      color: theme.colors.textLight,
    },

    // Input bar
    inputBar: {
      backgroundColor: theme.colors.white,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.inputBg,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    textInput: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      maxHeight: 100,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.sm,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.textLight,
      opacity: 0.6,
    },
  });

export default ChatScreen;
