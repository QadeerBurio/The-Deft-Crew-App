// screens/Social/YourAccount.js — account details. Same data and actions; design system layout.
import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ScreenHeader, HeaderIconButton, ListRow, Button } from '../../ui';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

export default function YourAccount({ navigation }) {
  const { user } = useContext(AuthContext);

  const isVerified = user?.status === 'Verified';
  const statusIcon = isVerified ? 'checkmark-circle' : 'time-outline';

  const getInitials = () => {
    if (!user?.name) return '?';
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const info = [
    { icon: 'person-outline', label: 'full name', value: user?.name },
    { icon: 'mail-outline', label: 'email address', value: user?.email },
    { icon: 'call-outline', label: 'phone number', value: user?.phone },
    { icon: 'school-outline', label: 'university', value: user?.university?.name },
    { icon: 'id-card-outline', label: 'roll number', value: user?.rollNo },
    { icon: 'location-outline', label: 'location', value: user?.location },
  ];

  const stats = [
    { n: user?.connections?.length || 0, label: 'connections' },
    { n: user?.posts?.length || 0, label: 'posts' },
    { n: user?.referralCount || 0, label: 'referrals' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <ScreenHeader
        title="account"
        onBack={() => navigation.goBack()}
        right={<HeaderIconButton icon="create-outline" label="edit profile" onPress={() => navigation.navigate('EditProfileScreen')} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} maxFontSizeMultiplier={MAX_FONT_SCALE}>{user?.name}</Text>
              <View style={styles.pills}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{(user?.role || 'student').toLowerCase()}</Text>
                </View>
                <View style={[styles.statusPill, isVerified && { backgroundColor: T.successBg }]}>
                  <Ionicons name={statusIcon} size={12} color={isVerified ? T.success : T.ink} />
                  <Text style={[styles.statusText, isVerified && { color: T.success }]}>
                    {isVerified ? 'verified account' : 'pending verification'}
                  </Text>
                </View>
              </View>
              {!!user?.university?.name && <Text style={styles.meta}>{user.university.name}</Text>}
              {!!user?.location && <Text style={styles.meta}>{user.location}</Text>}
            </View>
          </View>

          <View style={styles.stats}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 && styles.statLine]}>
                <Text style={styles.statN} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s.n}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal information */}
        <Text style={styles.groupTitle} accessibilityRole="header">personal information</Text>
        <View style={styles.card}>
          {info.map((row) => (
            <ListRow
              key={row.label}
              icon={row.icon}
              title={row.value || 'not set'}
              meta={row.label}
              chevron={false}
            />
          ))}
          <ListRow
            icon={statusIcon}
            iconColor={isVerified ? T.success : T.ink}
            title={isVerified ? 'verified' : 'pending'}
            meta="verification status"
            chevron={false}
            divider={false}
          />
        </View>

        {/* Security note */}
        <View style={styles.note}>
          <Ionicons name="shield-checkmark" size={20} color={T.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>secure & encrypted</Text>
            <Text style={styles.noteText}>
              Your information is encrypted and managed according to TDC privacy policies.
            </Text>
          </View>
        </View>

        <Button
          title="edit profile"
          onPress={() => navigation.navigate('EditProfileScreen')}
          style={{ marginTop: 18 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { borderRadius: 26, backgroundColor: T.ink, padding: 18, marginTop: 4 },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: T.yellow, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 68, height: 68, borderRadius: 34 },
  avatarText: { fontFamily: F.heading, fontSize: 24, color: T.ink },
  name: { fontFamily: F.heading, fontSize: 21, color: T.white },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  rolePill: { height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: T.yellow, justifyContent: 'center' },
  rolePillText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: T.yellowSoft },
  statusText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
  meta: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.inkLine },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { borderLeftWidth: 1, borderLeftColor: T.inkLine },
  statN: { fontFamily: F.heading, fontSize: 20, color: T.white },
  statLabel: { fontFamily: F.body, fontSize: 12, color: T.onInkMuted, marginTop: 2 },
  groupTitle: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginTop: 22, marginBottom: 10, paddingLeft: 4 },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: 'hidden' },
  note: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: T.yellowSoft },
  noteTitle: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  noteText: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: T.ink, marginTop: 2 },
});
