/**
 * Firebase Realtime Database config for shared likes + comments.
 * See SETUP-ENGAGEMENT.md.
 */
window.SIMBA_ENGAGEMENT = {
  enabled: true,
  firebase: {
    apiKey: "AIzaSyD_B0PwVi2xv6ijQBtas6SxlcL22WAe7lw",
    authDomain: "simba-life.firebaseapp.com",
    databaseURL: "https://simba-life-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "simba-life",
    storageBucket: "simba-life.firebasestorage.app",
    messagingSenderId: "712985942689",
    appId: "1:712985942689:web:8e414330af1d67bd432ee0"
  },
  rootPath: "simba-life/posts",
  maxCommentLength: 200
};
