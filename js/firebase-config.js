/**
 * SensePoint - Firebase Configuration
 * Firebase SDK 초기화 및 전역 인스턴스 노출
 *
 * [중요] firebaseConfig 값을 본인의 Firebase 프로젝트 설정으로 교체하세요.
 * Firebase Console > 프로젝트 설정 > 일반 > 웹 앱에서 확인할 수 있습니다.
 */

const firebaseConfig = {
  apiKey: 'AIzaSyAS1FladWDXoTo7NijgAWLxsd3NRhyT6Ww',
  authDomain: 'sensepoint-login.firebaseapp.com',
  projectId: 'sensepoint-login',
  storageBucket: 'sensepoint-login.firebasestorage.app',
  messagingSenderId: '537537488397',
  appId: '1:537537488397:web:778077e2b72cc6c95ed744',
  measurementId: 'G-MP3TBKTRRK',
};

firebase.initializeApp(firebaseConfig);

window.FB = {
  auth: firebase.auth(),
  db: firebase.firestore(),
};
