import { StatusBar } from 'expo-status-bar';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// The v2 web app, packed into a single page by scripts/build-site.js
import site from './site';

// A fixed address for the page, so what it stores on the device stays put between launches
const ORIGIN = 'https://sovereign.local/';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <WebView
          style={styles.web}
          source={{ html: site, baseUrl: ORIGIN }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          textZoom={100}
          bounces={false}
          overScrollMode="never"
          onShouldStartLoadWithRequest={(request) => {
            // Hand phone numbers to the dialer instead of loading them as a page
            if (request.url.startsWith('tel:')) {
              Linking.openURL(request.url);
              return false;
            }
            return true;
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101319' },
  web: { flex: 1, backgroundColor: '#101319' },
});
