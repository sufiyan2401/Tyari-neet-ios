import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNavBar/BottomNavBar';

// Auth Screens
import AskForEmail from '../screens/auth/ForgotPassword/AskForEmail';
import OTPVerification from '../screens/auth/ForgotPassword/ForgotOtpVerification';
import ResetPassword from '../screens/auth/ForgotPassword/ResetPassword';
import Landing from '../screens/auth/Landing/Landing';
import Login from '../screens/auth/Login/Login';
import RegisterOTPVerification from '../screens/auth/Register/RegisterOTPVerification';
import SetAccountPassword from '../screens/auth/Register/SetAccountPassword';
import SetEmail from '../screens/auth/Register/SetEmail';

// Main Screens
import Chapters from '../screens/main/Chapters';
import Home from '../screens/main/Home';
import Library from '../screens/main/Library';
import Payment from '../screens/main/Payment';
import Plans from '../screens/main/Plans';
import Privacy from '../screens/main/Privacy';
import Profile from '../screens/main/Profile';
import AboutUs from '../screens/main/AboutUs';
import ContactUs from '../screens/main/ContactUs';
import RefundPolicy from '../screens/main/RefundPolicy';
import Subjects from '../screens/main/Subjects';
import SubscriptionMessage from '../screens/main/SubscriptionMessage';
import TermsAndConditions from '../screens/main/TermsAndConditions';
import DailyTestChapter from '../screens/main/DailyTestChapter';
import FeatureContent from '../screens/main/FeatureContent';
import Leaderboard from '../screens/main/Leaderboard';
import TestMCQ from '../screens/main/TestMCQ';
import TestResult from '../screens/main/TestResult';
import Tests from '../screens/main/Tests';
import TopicContent from '../screens/main/TopicContent';
import Topics from '../screens/main/Topics';
import NotFoundScreen from '../screens/NotFoundScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string; size: number }) => {
            const Home = require('lucide-react-native').Home;
            return <Home size={24} color={color} strokeWidth={color === '#000000' ? 2.2 : 1.8} />;
          },
        }}
      />
      <Tab.Screen
        name="SubjectsTab"
        component={Subjects}
        options={{ title: 'Library' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={Library}
        options={{
          title: 'My Library',
        }}
      />
      <Tab.Screen
        name="TestsTab"
        component={Tests}
        options={{
          title: 'Tests',
          tabBarIcon: ({ color }: { color: string; size: number }) => {
            const ClipboardList = require('lucide-react-native').ClipboardList;
            return <ClipboardList size={24} color={color} strokeWidth={color === '#000000' ? 2.2 : 1.8} />;
          },
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string; size: number }) => {
            const User = require('lucide-react-native').User;
            return <User size={24} color={color} strokeWidth={color === '#000000' ? 2.2 : 1.8} />;
          },
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={Landing} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SetEmail" component={SetEmail} />
      <Stack.Screen name="RegisterOTPVerification" component={RegisterOTPVerification} />
      <Stack.Screen name="SetAccountPassword" component={SetAccountPassword} />
      <Stack.Screen name="AskForEmail" component={AskForEmail} />
      <Stack.Screen name="OTPVerification" component={OTPVerification} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen name="Privacy" component={Privacy} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditions} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="SubjectSelect" component={Subjects} />
      <Stack.Screen name="Chapters" component={Chapters} />
      <Stack.Screen name="Topics" component={Topics} />
      <Stack.Screen name="TopicContent" component={TopicContent} />
      <Stack.Screen name="Plans" component={Plans} />
      <Stack.Screen name="Payment" component={Payment} />
      <Stack.Screen name="SubscriptionMessage" component={SubscriptionMessage} />
      <Stack.Screen name="AboutUs" component={AboutUs} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
      <Stack.Screen name="RefundPolicy" component={RefundPolicy} />
      <Stack.Screen name="Privacy" component={Privacy} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditions} />
      <Stack.Screen name="DailyTestChapter" component={DailyTestChapter} />
      <Stack.Screen name="FeatureContent" component={FeatureContent} />
      <Stack.Screen name="Leaderboard" component={Leaderboard} />
      <Stack.Screen name="TestMCQ" component={TestMCQ} />
      <Stack.Screen name="TestResult" component={TestResult} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isGuest, hasSession, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F1BB3E" />
      </View>
    );
  }

  if (user || isGuest || hasSession) {
    return <MainStack />;
  }

  return <AuthStack />;
}
