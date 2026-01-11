import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput, FlatList, Animated, Platform } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback, useRef, useEffect } from "react";
import { friendsService, type FriendRequest, type SearchResult } from "@/services/friends";
import { HeaderButton } from "@/components/PageHeader";
import type { User } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { spacing } from "@/lib/theme";
import { getDisplayName, getUpcomingBirthdays } from "@/lib/utils";
import { FriendMenu } from "@/components/FriendMenu";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useAuth } from "@clerk/clerk-expo";
import { CreateWishlistSheet } from "@/components/CreateWishlistSheet";
import { CreateGroupGiftSheet } from "@/components/CreateGroupGiftSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends, usePendingRequests, useSentRequests } from "@/hooks/useFriends";

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { refreshUnreadNotificationsCount, refreshPendingRequestsCount } = useNotificationContext();
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: friends = [], isLoading: isLoadingFriends, refetch: refetchFriends, isFetching: isFetchingFriends } = useFriends();
  const { data: pendingRequests = [], refetch: refetchPendingRequests, isFetching: isFetchingPendingRequests } = usePendingRequests();
  const { data: sentRequests = [], refetch: refetchSentRequests, isFetching: isFetchingSentRequests } = useSentRequests();
  const isLoading = isLoadingFriends;
  const isRefreshing = isFetchingFriends || isFetchingPendingRequests || isFetchingSentRequests;
  const wasSearchActiveOnBlurRef = useRef(false);
  const [friendMenuVisible, setFriendMenuVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedFriendBlockStatus, setSelectedFriendBlockStatus] = useState<{ isBlockedByMe?: boolean; isBlockedByThem?: boolean }>({});
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const [birthdayGiftModalVisible, setBirthdayGiftModalVisible] = useState(false);
  const [selectedBirthdayFriend, setSelectedBirthdayFriend] = useState<{ id: string; name: string } | null>(null);
  const [createWishlistSheetVisible, setCreateWishlistSheetVisible] = useState(false);
  const [createGroupGiftSheetVisible, setCreateGroupGiftSheetVisible] = useState(false);
  
  // Search state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const isSearchActiveRef = useRef(false);
  
  // Animation for search icon transition
  const searchIconOpacity = useRef(new Animated.Value(1)).current;
  const searchIconRotation = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const searchBarScale = useRef(new Animated.Value(0.95)).current;
  const xButtonRotation = useRef(new Animated.Value(0)).current;
  
  // Initialize animation values when component mounts
  useEffect(() => {
    if (isSearchActive) {
      searchBarOpacity.setValue(1);
      searchBarScale.setValue(1);
      searchIconOpacity.setValue(0);
    }
  }, []);

  // Helper function to refetch all friend data
  const refetchAll = useCallback(() => {
    refetchFriends();
    refetchPendingRequests();
    refetchSentRequests();
  }, [refetchFriends, refetchPendingRequests, refetchSentRequests]);

  // Also fetch when screen comes into focus (navigation between tabs)
  // Keep ref in sync with state
  useEffect(() => {
    isSearchActiveRef.current = isSearchActive;
  }, [isSearchActive]);

  // But only if Clerk is loaded and user is authenticated
  useFocusEffect(
    useCallback(() => {
      
      // Reset search state when navigating back to this tab (industry standard behavior)
      // Only reset if search was active when we navigated away
      if (wasSearchActiveOnBlurRef.current) {
        console.log("🟢 FriendsScreen: Resetting search state on navigation back");
        // Reset search state
        setIsSearchActive(false);
        setSearchQuery("");
        setSearchResults([]);
        // Reset animation values
        searchIconOpacity.setValue(1);
        searchIconRotation.setValue(0);
        searchBarOpacity.setValue(0);
        searchBarScale.setValue(0.95);
        xButtonRotation.setValue(0);
        searchInputRef.current?.blur();
        wasSearchActiveOnBlurRef.current = false; // Reset the flag
      }
      
      // React Query handles fetching automatically when enabled, no need to manually fetch
      
      // Cleanup: Track if search was active when we lose focus



      return () => {
        console.log("🔴 FriendsScreen: useFocusEffect cleanup - screen losing focus, isSearchActive:", isSearchActiveRef.current);
        wasSearchActiveOnBlurRef.current = isSearchActiveRef.current;
      };
    }, [isClerkLoaded, userId])
  );

  const onRefresh = () => {
    refetchAll();
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      Alert.alert("Success", "Friend request accepted!");
      refetchAll();
      await refreshUnreadNotificationsCount();
      await refreshPendingRequestsCount(); // Update the counter
      // Refresh search results if search is active
      if (isSearchActive && searchQuery.trim()) {
        const results = await friendsService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendsService.rejectFriendRequest(requestId);
      Alert.alert("Success", "Friend request rejected");
      refetchAll();
      await refreshPendingRequestsCount(); // Update the counter
      // Refresh search results if search is active
      if (isSearchActive && searchQuery.trim()) {
        const results = await friendsService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const handleRemoveFriend = () => {
    setFriendMenuVisible(false);
    if (!selectedFriend) return;
    setRemoveConfirmVisible(true);
  };

  const confirmRemoveFriend = async () => {
    if (!selectedFriend) return;
    try {
      await friendsService.removeFriend(selectedFriend.id);
      Alert.alert("Success", "Friend removed");
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({});
      setRemoveConfirmVisible(false);
      refetchAll();
      // Refresh search results if search is active
      if (isSearchActive && searchQuery.trim()) {
        const results = await friendsService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error: any) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to remove friend");
      setRemoveConfirmVisible(false);
    }
  };

  const handleBlockUser = () => {
    if (!selectedFriend) return;
    // Close menu first, then open block modal after a short delay
    setFriendMenuVisible(false);
    // Use a shorter delay to make the transition smoother
    setTimeout(() => {
      setBlockConfirmVisible(true);
    }, 150);
  };

  const confirmBlockUser = async () => {
    if (!selectedFriend) return;
    try {
      await friendsService.blockUser(selectedFriend.id);
      Alert.alert("Success", "User blocked successfully");
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({});
      setBlockConfirmVisible(false);
      refetchAll();
      // Refresh search results if search is active - add small delay to ensure DB is updated
      if (isSearchActive && searchQuery.trim()) {
        setTimeout(async () => {
          try {
            const results = await friendsService.searchUsers(searchQuery.trim());
            setSearchResults(results);
          } catch (error) {
            console.error("Error refreshing search after block:", error);
          }
        }, 300);
      }
    } catch (error: any) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to block user");
      setBlockConfirmVisible(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedFriend) return;
    
    try {
      await friendsService.unblockUser(selectedFriend.id);
      Alert.alert("Success", "User unblocked successfully");
      setFriendMenuVisible(false);
      setSelectedFriend(null);
      setSelectedFriendBlockStatus({}); // Clear block status
      refetchAll();
      // Refresh search results if search is active - add small delay to ensure DB is updated
      if (isSearchActive && searchQuery.trim()) {
        setTimeout(async () => {
          try {
            const results = await friendsService.searchUsers(searchQuery.trim());
            setSearchResults(results);
          } catch (error) {
            console.error("Error refreshing search after unblock:", error);
          }
        }, 300);
      }
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendsService.cancelFriendRequest(requestId);
      Alert.alert("Success", "Friend request cancelled");
      refetchAll();
      // Refresh search results if search is active
      if (isSearchActive && searchQuery.trim()) {
        const results = await friendsService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to cancel friend request");
    }
  };

  const handleSearchPress = () => {
    if (isSearchActive) {
      // Close search - animate out with spin
      Animated.parallel([
        Animated.timing(searchIconOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(searchIconRotation, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(xButtonRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(searchBarOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(searchBarScale, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsSearchActive(false);
        setSearchQuery("");
        setSearchResults([]);
        searchInputRef.current?.blur();
        // Reset rotation values
        xButtonRotation.setValue(0);
        // Refresh friends data to show any new sent requests
        refetchAll();
      });
    } else {
      // Open search - set state first, then animate
      setIsSearchActive(true);
      
      // Set initial values for animation
      searchIconOpacity.setValue(1);
      searchIconRotation.setValue(0);
      searchBarOpacity.setValue(0);
      searchBarScale.setValue(0.95);
      xButtonRotation.setValue(0);
      
      // Use a small delay to ensure the component is rendered
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(searchIconOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(searchIconRotation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(xButtonRotation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(searchBarOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(searchBarScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Focus input after animation
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 50);
        });
      }, 10);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup search state when component unmounts
  useEffect(() => {
    return () => {
      setIsSearchActive(false);
      setSearchQuery("");
      setSearchResults([]);
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await friendsService.searchUsers(query.trim());
      setSearchResults(results);
      console.log("✅ Found", results.length, "users");
    } catch (error) {
      console.error("❌ Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If text is empty, clear results immediately
    if (!text.trim() || text.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    
    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendsService.sendFriendRequest(userId);
      Alert.alert("Success", "Friend request sent!");

      // Refresh search results
      if (searchQuery.trim()) {
        const results = await friendsService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }

      // Refresh friends data to update sent requests list
      refetchAll();

      await refreshUnreadNotificationsCount();
    } catch (error) {
      console.error("❌ Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/friends/${item.id}`)}
        style={styles.searchResultRow}
      >
        <View style={styles.friendInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {(getDisplayName(item)?.[0] || item.username?.[0] || "?").toUpperCase()}
            </Text>
          </View>
          <View style={styles.friendDetails}>
            <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
              {getDisplayName(item) || item.username}
            </Text>
            <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{item.username}</Text>
          </View>
        </View>
        <View style={styles.searchResultActions}>
          {item.isBlockedByMe ? (
            <>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                <Feather name="slash" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Blocked</Text>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e: any) => {
                  e.stopPropagation();
                  // Convert SearchResult to User-like object for FriendMenu
                  const userForMenu = {
                    id: item.id,
                    username: item.username,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    avatar: item.avatar,
                    bio: item.bio,
                  } as User;
                  setSelectedFriend(userForMenu);
                  setSelectedFriendBlockStatus({
                    isBlockedByMe: item.isBlockedByMe,
                    isBlockedByThem: item.isBlockedByThem,
                  });
                  setFriendMenuVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : item.isFriend ? (
            <>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                <Feather name="check-circle" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Friends</Text>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e: any) => {
                  e.stopPropagation();
                  // Convert SearchResult to User-like object for FriendMenu
                  const userForMenu = {
                    id: item.id,
                    username: item.username,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    avatar: item.avatar,
                    bio: item.bio,
                  } as User;
                  setSelectedFriend(userForMenu);
                  setSelectedFriendBlockStatus({
                    isBlockedByMe: item.isBlockedByMe,
                    isBlockedByThem: item.isBlockedByThem,
                  });
                  setFriendMenuVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : item.isPending ? (
            item.isSentByMe && item.pendingRequestId ? (
              // Sent by me - show pending badge with cancel button
              <>
                <View style={styles.pendingStatusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                    <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.cancelButtonBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleCancelRequest(item.pendingRequestId!);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    // Convert SearchResult to User-like object for FriendMenu
                    const userForMenu = {
                      id: item.id,
                      username: item.username,
                      firstName: item.firstName,
                      lastName: item.lastName,
                      avatar: item.avatar,
                      bio: item.bio,
                    } as User;
                    setSelectedFriend(userForMenu);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : item.pendingRequestId ? (
              // Received by me - show accept and decline buttons
              <>
                <View style={styles.requestActions}>
                  <TouchableOpacity 
                    style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleAcceptRequest(item.pendingRequestId!);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="check" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rejectButton, { borderColor: theme.colors.textSecondary + '40' }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleRejectRequest(item.pendingRequestId!);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={18} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    // Convert SearchResult to User-like object for FriendMenu
                    const userForMenu = {
                      id: item.id,
                      username: item.username,
                      firstName: item.firstName,
                      lastName: item.lastName,
                      avatar: item.avatar,
                      bio: item.bio,
                    } as User;
                    setSelectedFriend(userForMenu);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              // Fallback - just show pending badge
              <>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                  <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    // Convert SearchResult to User-like object for FriendMenu
                    const userForMenu = {
                      id: item.id,
                      username: item.username,
                      firstName: item.firstName,
                      lastName: item.lastName,
                      avatar: item.avatar,
                      bio: item.bio,
                    } as User;
                    setSelectedFriend(userForMenu);
                    setFriendMenuVisible(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            )
          ) : (
            <>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleSendRequest(item.id);
                }}
                activeOpacity={0.7}
              >
                <Feather name="user-plus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e: any) => {
                  e.stopPropagation();
                  // Convert SearchResult to User-like object for FriendMenu
                  const userForMenu = {
                    id: item.id,
                    username: item.username,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    avatar: item.avatar,
                    bio: item.bio,
                  } as User;
                  setSelectedFriend(userForMenu);
                  setSelectedFriendBlockStatus({
                    isBlockedByMe: item.isBlockedByMe,
                    isBlockedByThem: item.isBlockedByThem,
                  });
                  setFriendMenuVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };


  // Calculate consistent top padding that accounts for safe area (dynamic island/notch)
  const headerTopPadding = Math.max(60, Platform.OS === "ios" ? insets.top + 6 : insets.top + 32);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.background, paddingTop: headerTopPadding }]}>
        <View style={styles.headerContent}>
          {!isSearchActive && (
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Friends</Text>
          )}
          
          {/* Search Icon - Hidden when search is active */}
          {!isSearchActive && (
            <Animated.View 
              style={{ 
                opacity: searchIconOpacity, 
                marginLeft: 'auto',
                transform: [{
                  rotate: searchIconRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  })
                }]
              }}
            >
              <HeaderButton
                icon="search"
                onPress={handleSearchPress}
                style={{ marginRight: 0 }}
              />
            </Animated.View>
          )}
          
          {/* Search Bar - Visible when search is active */}
          {isSearchActive && (
            <Animated.View 
              style={[
                styles.searchBarContainer,
                {
                  opacity: searchBarOpacity,
                  transform: [{ scale: searchBarScale }],
                }
              ]}
            >
              <View style={[styles.headerSearchBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.primary, borderWidth: 1 }]}>
                <Feather name="search" size={20} color={theme.colors.primary} />
                <TextInput
                  ref={searchInputRef}
                  style={[styles.headerSearchInput, { color: theme.colors.textPrimary }]}
                  placeholder="Search by name or username"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearchQueryChange("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <Animated.View 
                style={[
                  styles.closeSearchButtonWrapper,
                  {
                    transform: [{
                      rotate: xButtonRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '0deg'],
                      })
                    }]
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={handleSearchPress}
                  style={styles.closeSearchButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Search Results */}
      {isSearchActive && (
        <View style={styles.searchResultsContainer}>
          {isSearching ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.searchLoadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.searchResultsContent}
            />
          ) : searchQuery.trim() && !isSearching ? (
            <View style={styles.searchEmptyState}>
              <Feather name="search" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No users found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Try a different username or name
              </Text>
            </View>
          ) : (
            <View style={styles.searchEmptyState}>
              <Feather name="search" size={64} color={theme.colors.primary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Find your friends</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Search by name or username to connect with friends
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Main Content - Hidden when search is active */}
      {!isSearchActive && (
      <ScrollView 
        style={styles.mainContent}
        contentContainerStyle={styles.mainContentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Pending friend requests section */}
      {!isLoading && pendingRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Pending Requests</Text>
          {pendingRequests.map((request, index) => (
            <View key={request.id}>
              <TouchableOpacity
                onPress={() => handleViewProfile(request.user.id)}
                activeOpacity={0.7}
                style={styles.requestRow}
              >
                <View style={styles.friendInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {(getDisplayName(request.user)?.[0] || request.user.username?.[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(request.user) || request.user.username || "Unknown"}
                    </Text>
                    <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{request.user.username}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity 
                    style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleAcceptRequest(request.id);
                    }}
                  >
                    <Feather name="check" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rejectButton, { borderColor: theme.colors.textSecondary + '40' }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleRejectRequest(request.id);
                    }}
                  >
                    <Feather name="x" size={18} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setSelectedFriend(request.user);
                      setFriendMenuVisible(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              {index < pendingRequests.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.colors.textPrimary + '30' }]} />
              )}
            </View>
          ))}
        </View>
      )}

      {/* Sent friend requests section */}
      {!isLoading && sentRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Sent Requests</Text>
          {sentRequests.map((request, index) => (
            <View key={request.id}>
              <TouchableOpacity
                onPress={() => handleViewProfile(request.friend.id)}
                activeOpacity={0.7}
                style={styles.requestRow}
              >
                <View style={styles.friendInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {(getDisplayName(request.friend)?.[0] || request.friend.username?.[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(request.friend) || request.friend.username || "Unknown"}
                    </Text>
                    <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{request.friend.username}</Text>
                  </View>
                </View>
                <View style={styles.sentRequestActions}>
                  <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}>
                    <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>Pending</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.cancelButtonBadge, { backgroundColor: theme.colors.textSecondary + '15' }]}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleCancelRequest(request.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setSelectedFriend(request.friend);
                      setSelectedFriendBlockStatus({}); // Reset block status for sent requests
                      setFriendMenuVisible(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              {index < sentRequests.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
              )}
            </View>
          ))}
        </View>
      )}

      {/* Active Events Section */}
      {!isLoading && (
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="gift" size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Active Events</Text>
            </View>
          </View>
          <View style={styles.eventsContainer}>
            {/* Secret Santa Quick Action */}
            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                // TODO: Navigate to Secret Santa creation/management
                console.log("Create Secret Santa");
              }}
            >
              <View style={styles.eventCardContent}>
                <Feather name="gift" size={20} color="#FFFFFF" />
                <View style={styles.eventCardText}>
                  <Text style={[styles.eventCardTitle, { color: "#FFFFFF" }]}>Secret Santa</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Group Gift Quick Action */}
            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setSelectedBirthdayFriend(null);
                setCreateGroupGiftSheetVisible(true);
              }}
            >
              <View style={styles.eventCardContent}>
                <Feather name="users" size={20} color="#FFFFFF" />
                <View style={styles.eventCardText}>
                  <Text style={[styles.eventCardTitle, { color: "#FFFFFF" }]}>Group Gift</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upcoming Birthdays Section */}
      {!isLoading && friends.length > 0 && (() => {
        const upcomingBirthdays = getUpcomingBirthdays(friends, 30);
        const displayedBirthdays = upcomingBirthdays.slice(0, 3);
        return (
          <View style={[styles.eventsSection, styles.birthdaysSection]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Feather name="calendar" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Upcoming Birthdays</Text>
              </View>
            </View>
            {upcomingBirthdays.length > 0 ? (
              <>
                {displayedBirthdays.map((birthday, index) => {
                  const daysText = birthday.daysUntil === 0 
                    ? "Today" 
                    : birthday.daysUntil === 1 
                    ? "1 day"
                    : `${birthday.daysUntil} days`;
                  return (
                    <View key={birthday.friend.id}>
                      <View style={styles.birthdayLeaderboardRow}>
                        <TouchableOpacity
                          onPress={() => handleViewProfile(birthday.friend.id)}
                          activeOpacity={0.7}
                          style={styles.birthdayLeaderboardContent}
                        >
                          {/* Days Left Badge */}
                          <View style={styles.birthdayDaysBadge}>
                            <Text style={[styles.birthdayDaysText, { color: theme.colors.textPrimary }]}>
                              {daysText}
                            </Text>
                          </View>
                          
                          {/* Small Avatar */}
                          <View style={[styles.birthdayAvatarSmall, { backgroundColor: theme.colors.primary }]}>
                            {birthday.friend.avatar ? (
                              <Text style={styles.birthdayAvatarTextSmall}>🖼️</Text>
                            ) : (
                              <Text style={styles.birthdayAvatarTextSmall}>
                                {(getDisplayName(birthday.friend) || birthday.friend.username?.[0] || "?").toUpperCase()}
                              </Text>
                            )}
                          </View>
                          
                          {/* Name and Date */}
                          <View style={styles.birthdayLeaderboardInfo}>
                            <Text style={[styles.birthdayLeaderboardName, { color: theme.colors.textPrimary }]}>
                              {getDisplayName(birthday.friend) || birthday.friend.username || "Friend"}
                            </Text>
                            <Text style={[styles.birthdayLeaderboardDate, { color: theme.colors.textSecondary }]}>
                              {birthday.formattedDate}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        
                        {/* Group Gift/Wishlist Button */}
                        <TouchableOpacity
                          style={[styles.birthdayActionButton, { backgroundColor: theme.colors.primary }]}
                          onPress={() => {
                            setSelectedBirthdayFriend({
                              id: birthday.friend.id,
                              name: getDisplayName(birthday.friend) || birthday.friend.username || "Friend"
                            });
                            setBirthdayGiftModalVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Feather name="gift" size={14} color="#FFFFFF" />
                          <Text style={styles.birthdayActionButtonText}>Gift</Text>
                        </TouchableOpacity>
                      </View>
                      {index < displayedBirthdays.length - 1 && (
                        <View style={[styles.birthdayDivider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
                      )}
                    </View>
                  );
                })}
                {friends.length > 3 && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => router.push("/friends/birthdays")}
                  >
                    <Text style={[styles.seeMoreText, { color: theme.colors.primary }]}>
                      See All Birthdays
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyStateSmall}>
                <Feather name="calendar" size={40} color={theme.colors.primary} />
                <Text style={[styles.emptyTitleSmall, { color: theme.colors.textPrimary }]}>
                  No upcoming birthdays
                </Text>
                <Text style={[styles.emptySubtitleSmall, { color: theme.colors.textSecondary }]}>
                  Birthdays from your friends will appear here
                </Text>
              </View>
            )}
          </View>
        );
      })()}

      {/* Friends List Section */}
      {!isLoading && friends.length > 0 && (
        <View style={styles.friendsListSection}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="users" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Friends ({friends.length})</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading friends...</Text>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.emptyStateSmall}>
          <Feather name="users" size={40} color={theme.colors.primary} />
          <Text style={[styles.emptyTitleSmall, { color: theme.colors.textPrimary }]}>No friends yet</Text>
          <Text style={[styles.emptySubtitleSmall, { color: theme.colors.textSecondary }]}>
            Tap the search icon to find friends
          </Text>
        </View>
      ) : (
        <>
          {friends.slice(0, 3).map((friend, index) => (
            <View key={friend.id}>
              <TouchableOpacity
                onPress={() => handleViewProfile(friend.id)}
                activeOpacity={0.7}
                style={styles.friendRow}
              >
                <View style={styles.friendInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    {friend.avatar ? (
                      <Text style={styles.avatarText}>🖼️</Text>
                    ) : (
                      <Text style={styles.avatarText}>
                        {(getDisplayName(friend)?.[0] || friend.username?.[0] || "?").toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: theme.colors.textPrimary }]}>
                      {getDisplayName(friend) || friend.username || "Unknown"}
                    </Text>
                    <Text style={[styles.friendUsername, { color: theme.colors.textSecondary }]}>@{friend.username}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setSelectedFriend(friend);
                    setSelectedFriendBlockStatus({}); // Reset block status for friends list
                    setFriendMenuVisible(true);
                  }}
                  style={styles.menuButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="more-horizontal" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
              {index < Math.min(friends.length, 3) - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary + '30' }]} />
              )}
            </View>
          ))}
          {friends.length > 3 && (
            <TouchableOpacity
              style={styles.seeMoreButton}
              onPress={() => router.push("/friends/all")}
            >
              <Text style={[styles.seeMoreText, { color: theme.colors.primary }]}>
                See All Friends
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
      </ScrollView>
      )}

      {/* Friend Menu */}
      {selectedFriend && (
        <FriendMenu
          visible={friendMenuVisible}
          onClose={() => {
            setFriendMenuVisible(false);
            setSelectedFriend(null);
            setSelectedFriendBlockStatus({});
          }}
          onViewProfile={() => {
            setFriendMenuVisible(false);
            handleViewProfile(selectedFriend.id);
          }}
          onGift={() => {
            setFriendMenuVisible(false);
            setSelectedBirthdayFriend({
              id: selectedFriend.id,
              name: getDisplayName(selectedFriend) || selectedFriend.username || "Friend"
            });
            setTimeout(() => {
              setBirthdayGiftModalVisible(true);
            }, 200);
          }}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          areFriends={friends.some(f => f.id === selectedFriend.id)}
          isBlockedByMe={selectedFriendBlockStatus.isBlockedByMe}
          isBlockedByThem={selectedFriendBlockStatus.isBlockedByThem}
        />
      )}

      {/* Block User Confirmation Modal */}
      <DeleteConfirmModal
        visible={blockConfirmVisible && !!selectedFriend}
        title={selectedFriend ? (getDisplayName(selectedFriend) || selectedFriend.username || "this user") : ""}
        modalTitle="Block User"
        onConfirm={confirmBlockUser}
        onCancel={() => {
          setBlockConfirmVisible(false);
        }}
      />

      {/* Remove Friend Confirmation Modal */}
      <DeleteConfirmModal
        visible={removeConfirmVisible && !!selectedFriend}
        title={selectedFriend ? (getDisplayName(selectedFriend) || selectedFriend.username || "this friend") : ""}
        modalTitle="Remove Friend"
        onConfirm={confirmRemoveFriend}
        onCancel={() => {
          setRemoveConfirmVisible(false);
        }}
      />

      {/* Birthday Gift Choice Modal */}
      <BottomSheet visible={birthdayGiftModalVisible} onClose={() => setBirthdayGiftModalVisible(false)} autoHeight>
        <View style={[styles.birthdayGiftModalContent, { backgroundColor: theme.colors.background }]}>
          <View style={styles.birthdayGiftModalHeader}>
            <Text style={[styles.birthdayGiftModalTitle, { color: theme.colors.textPrimary }]}>
              Create Gift List for {selectedBirthdayFriend?.name}
            </Text>
          </View>
          
          <View style={styles.birthdayGiftOptions}>
            {/* Regular Wishlist Option */}
            <TouchableOpacity
              style={[
                styles.birthdayGiftOption,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={() => {
                setBirthdayGiftModalVisible(false);
                // Small delay to let the modal close before opening the next one
                setTimeout(() => {
                  setCreateWishlistSheetVisible(true);
                }, 200);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.birthdayGiftOptionIcon,
                { backgroundColor: theme.colors.primary + '15' }
              ]}>
                <Feather name="list" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.birthdayGiftOptionContent}>
                <Text style={[styles.birthdayGiftOptionTitle, { color: theme.colors.textPrimary }]}>
                  Create Wishlist
                </Text>
                <Text style={[styles.birthdayGiftOptionDescription, { color: theme.colors.textSecondary }]}>
                  Create a personal wishlist for this friend's birthday
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Group Gift Option */}
            <TouchableOpacity
              style={[
                styles.birthdayGiftOption,
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.textSecondary + '40',
                }
              ]}
              onPress={() => {
                setBirthdayGiftModalVisible(false);
                setTimeout(() => {
                  setCreateGroupGiftSheetVisible(true);
                }, 200);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.birthdayGiftOptionIcon,
                { backgroundColor: theme.colors.primary + '15' }
              ]}>
                <Feather name="users" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.birthdayGiftOptionContent}>
                <Text style={[styles.birthdayGiftOptionTitle, { color: theme.colors.textPrimary }]}>
                  Create Group Gift
                </Text>
                <Text style={[styles.birthdayGiftOptionDescription, { color: theme.colors.textSecondary }]}>
                  Create a shared wishlist with friends for group gifting
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* Create Wishlist Sheet */}
      <CreateWishlistSheet
        visible={createWishlistSheetVisible}
        onClose={() => setCreateWishlistSheetVisible(false)}
        initialTitle={selectedBirthdayFriend ? `${selectedBirthdayFriend.name}'s Birthday` : undefined}
      />
      
      {/* Create Group Gift Sheet */}
      <CreateGroupGiftSheet
        visible={createGroupGiftSheetVisible}
        onClose={() => setCreateGroupGiftSheetVisible(false)}
        initialTitle={selectedBirthdayFriend ? `${selectedBirthdayFriend.name}'s Birthday` : undefined}
        initialFriendId={selectedBirthdayFriend?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pendingSection: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventsSection: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  birthdaysContainer: {
    gap: 8,
  },
  birthdayLeaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  birthdayLeaderboardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  birthdayDaysBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: 60,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  birthdayDaysText: {
    fontSize: 13,
    fontWeight: "600",
  },
  birthdayAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  birthdayAvatarTextSmall: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  birthdayLeaderboardInfo: {
    flex: 1,
  },
  birthdayLeaderboardName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  birthdayLeaderboardDate: {
    fontSize: 12,
  },
  birthdayActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    gap: 6,
  },
  birthdayActionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  birthdayDivider: {
    height: 1,
    width: "100%",
    marginVertical: 4,
  },
  birthdaysSection: {
    marginTop: 48,
    paddingBottom: 0,
  },
  emptyStateSmall: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 32,
  },
  emptyTitleSmall: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitleSmall: {
    fontSize: 12,
    textAlign: "center",
  },
  eventsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  eventCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  eventCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardText: {
    // Removed flex: 1 to allow proper centering
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  eventCardSubtitle: {
    fontSize: 12,
  },
  friendsListSection: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 16,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  seeMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    marginTop: 5,
  },
  seeMoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "100%",
    marginLeft: 24,
    marginVertical: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1, // Decreased spacing
  },
  friendUsername: {
    fontSize: 14,
  },
  sentRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sentRequestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    padding: 4,
  },
  searchHeaderContainer: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  closeSearchButtonWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeSearchButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchResultsContent: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  searchResultActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 100,
  },
  searchLoadingText: {
    fontSize: 16,
  },
  searchEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 60,
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    paddingBottom: 130, // Extra padding to account for bottom menu bar (80px height + padding)
  },
  headerContainer: {
    // paddingTop calculated dynamically using safe area insets in JSX
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    minHeight: 40,
    position: "relative",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: '100%',
  },
  birthdayGiftModalContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  birthdayGiftModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 0,
  },
  birthdayGiftModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  birthdayGiftOptions: {
    gap: 12,
  },
  birthdayGiftOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  birthdayGiftOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  birthdayGiftOptionContent: {
    flex: 1,
  },
  birthdayGiftOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  birthdayGiftOptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
