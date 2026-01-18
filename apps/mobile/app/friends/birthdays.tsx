import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Platform, Image } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState, useCallback, useEffect } from "react";
import { friendsService } from "@/services/friends";
import type { User } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { getDisplayName, getUpcomingBirthdays } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-expo";
import { CreateWishlistSheet } from "@/components/CreateWishlistSheet";
import { CreateGroupGiftSheet } from "@/components/CreateGroupGiftSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { Alert } from "react-native";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AllBirthdaysScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLoaded: isClerkLoaded, userId } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [birthdayGiftModalVisible, setBirthdayGiftModalVisible] = useState(false);
  const [selectedBirthdayFriend, setSelectedBirthdayFriend] = useState<{ id: string; name: string } | null>(null);
  const [createWishlistSheetVisible, setCreateWishlistSheetVisible] = useState(false);
  const [createGroupGiftSheetVisible, setCreateGroupGiftSheetVisible] = useState(false);


  const fetchFriends = useCallback(async (showLoader = true) => {
    try {
      const shouldShowLoader = showLoader && !hasLoadedOnce;
      if (shouldShowLoader) {
        setIsLoading(true);
      }
      const friendsData = await friendsService.getFriends();
      setFriends(friendsData);
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
      console.log("✅ Loaded", friendsData.length, "friends for birthdays");
    } catch (error) {
      console.error("❌ Error fetching friends:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    if (isClerkLoaded && userId && !hasLoadedOnce) {
      fetchFriends(true);
    }
  }, [isClerkLoaded, userId, hasLoadedOnce, fetchFriends]);

  useFocusEffect(
    useCallback(() => {
      if (isClerkLoaded && userId) {
        if (hasLoadedOnce) {
          fetchFriends(false);
        } else {
          fetchFriends(true);
        }
      }
    }, [fetchFriends, isClerkLoaded, userId, hasLoadedOnce])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchFriends(false);
  };

  const handleViewProfile = (friendId: string) => {
    router.push(`/friends/${friendId}`);
  };

  const upcomingBirthdays = getUpcomingBirthdays(friends, 365);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Birthdays"
        backButton={true}
        onBack={() => router.replace("/(tabs)/friends")}
      />

      <ScrollView 
        style={styles.mainContent}
        contentContainerStyle={styles.mainContentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !hasLoadedOnce ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, marginTop: 16 }]}>Loading birthdays...</Text>
          </View>
        ) : !isLoading && hasLoadedOnce && upcomingBirthdays.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={64} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No upcoming birthdays</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Birthdays from your friends will appear here
            </Text>
          </View>
        ) : !isLoading && hasLoadedOnce && (
          <>
            <View style={styles.birthdaysListSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Upcoming Birthdays ({upcomingBirthdays.length})
              </Text>
            </View>
            {upcomingBirthdays.map((birthday, index) => {
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
                      <View style={[styles.birthdayAvatarSmall, { backgroundColor: theme.colors.primary, overflow: 'hidden' }]}>
                        {birthday.friend.avatar ? (
                          <Image 
                            source={{ uri: birthday.friend.avatar }} 
                            style={{ width: 32, height: 32 }}
                            resizeMode="cover"
                          />
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
                  {index < upcomingBirthdays.length - 1 && (
                    <View style={[styles.birthdayDivider, { backgroundColor: theme.colors.textSecondary + '20' }]} />
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Birthday Gift Choice Modal */}
      <BottomSheet visible={birthdayGiftModalVisible} onClose={() => setBirthdayGiftModalVisible(false)} autoHeight>
        <View style={[styles.birthdayGiftModalContent, { backgroundColor: theme.colors.background }]}>
          {/* Header - Standard pattern: centered title, no X button */}
          <View style={styles.birthdayGiftModalHeader}>
            <Text style={[styles.birthdayGiftModalTitle, { color: theme.colors.textPrimary }]}>
              Create Gift List for {selectedBirthdayFriend?.name}
            </Text>
          </View>
          
          <View style={[styles.birthdayGiftOptions, { paddingBottom: Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20) }]}>
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
                setCreateGroupGiftSheetVisible(true);
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
  headerContainer: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    paddingBottom: 130,
  },
  birthdaysListSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  birthdayLeaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 24,
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
  birthdayGiftModalContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  birthdayGiftModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  birthdayGiftModalTitle: {
    fontSize: 20,
    fontWeight: "600",
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

