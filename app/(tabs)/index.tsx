import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native';
import { CameraViewer } from '@/components/CameraViewer';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <CameraViewer userId="user1" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
