// app/src/ui/UIKitScreen.js
// Every component in one screen, for checking the look on a real device.
// Not wired into navigation. To view it, temporarily add to any stack:
//   <Stack.Screen name="UIKit" component={UIKitScreen} />
// then navigation.navigate('UIKit').

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, space, gutter } from '../theme';
import {
  Screen,
  Header,
  SectionHeader,
  Text,
  Heading,
  Button,
  IconButton,
  Card,
  Chip,
  Pill,
  ProgressBar,
  Segmented,
  ListRow,
  SearchInput,
  MoodDot,
  EmptyState,
} from './index';

const MOODS = ['sorted', 'broke', 'panic', 'shook', 'sleepy', 'sus', 'cheeky', 'excited'];

export default function UIKitScreen({ navigation }) {
  const [tab, setTab] = useState('feed');
  const [chip, setChip] = useState('all');

  return (
    <Screen scroll>
      <Header
        overline="design system"
        title="ui kit"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
        right={<IconButton icon="notifications-outline" badge={2} accessibilityLabel="notifications" />}
      />

      <View style={styles.block}>
        <SectionHeader title="type" />
        <Heading variant="display">explore</Heading>
        <Heading variant="title" mark="?">what needs sorting today</Heading>
        <Heading>today's drop</Heading>
        <Text>body text. calm, lowercase, few words.</Text>
        <Text variant="label" tone="muted">label, muted</Text>
        <Text variant="overline" tone="muted">overline</Text>
      </View>

      <View style={styles.block}>
        <SectionHeader title="buttons" />
        <View style={styles.wrap}>
          <Button title="claim offer" />
          <Button title="apply now" variant="accent" />
          <Button title="my discounts" variant="outline" />
          <Button title="not now" variant="ghost" />
          <Button title="filters" variant="light" icon="options-outline" size="sm" />
        </View>
        <Button title="sign in" variant="accent" size="lg" fullWidth style={{ marginTop: space.sm }} />
      </View>

      <View style={styles.block}>
        <SectionHeader title="chips and pills" />
        <View style={styles.wrap}>
          <Chip label="karachi" accent />
          {['all', 'food', 'cafes', 'fashion'].map((c) => (
            <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
          ))}
        </View>
        <View style={[styles.wrap, { marginTop: space.sm }]}>
          <Pill label="10% off" />
          <Pill label="86% match" tone="ink" />
          <Pill label="new" tone="sand" />
          <Pill label="USED" tone="success" />
          <Pill label="EXPIRED" tone="muted" />
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="segmented" />
        <Segmented options={['feed', 'confessions']} value={tab} onChange={setTab} />
        <SearchInput placeholder="search brands" style={{ marginTop: space.md }} />
      </View>

      <View style={styles.block}>
        <SectionHeader title="cards" action="see all" onAction={() => {}} />
        <Card variant="ink">
          <Text variant="overline" tone="accent">scholarships</Text>
          <Heading variant="title" tone="inverse" style={{ marginTop: space.xs }}>fund your dreams</Heading>
          <Button title="apply now" variant="inverse" size="sm" style={{ marginTop: space.md }} />
        </Card>
        <Card style={{ marginTop: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">daily missions</Text>
            <Text variant="label">3 of 8</Text>
          </View>
          <ProgressBar value={0.375} style={{ marginTop: space.sm }} />
        </Card>
        <Card variant="accent" style={{ marginTop: space.sm }}>
          <Text variant="overline">your balance</Text>
          <Text variant="number">860</Text>
        </Card>
      </View>

      <View style={styles.block}>
        <SectionHeader title="list rows" />
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <ListRow icon="person-outline" title="profile details" subtitle="view and edit your info" onPress={() => {}} />
          <ListRow icon="pricetag-outline" title="my discounts" subtitle="codes, qr and redemptions" onPress={() => {}} divider />
          <ListRow icon="settings-outline" title="settings" subtitle="notifications, privacy" onPress={() => {}} divider />
        </Card>
        <ListRow
          card
          style={{ marginTop: space.sm }}
          left={<View style={styles.logo}><Text variant="caption" tone="muted">logo</Text></View>}
          title="[BRAND]"
          subtitle="cafe · 1.2 km"
          right={<Pill label="15% off" />}
          onPress={() => {}}
        />
      </View>

      <View style={styles.block}>
        <SectionHeader title="moods" meta="sorted vs not yet" />
        <View style={styles.wrap}>
          {MOODS.map((m) => (
            <MoodDot key={m} mood={m} size={40} />
          ))}
          <MoodDot mood="shook" size={40} muted />
        </View>
      </View>

      <EmptyState mood="sleepy" title="no discounts yet" body="claim one and it shows up here." action="explore offers" onAction={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, marginTop: space.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lineSoft, alignItems: 'center', justifyContent: 'center' },
});
