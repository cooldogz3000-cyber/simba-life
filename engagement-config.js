/**
 * Firebase Realtime Database config for shared likes + comments.
 * Fill in values from Firebase Console → Project settings → Your apps.
 * Leave enabled:false until keys are pasted — UI still shows, writes stay off.
 *
 * See SETUP-ENGAGEMENT.md for step-by-step.
 */
window.SIMBA_ENGAGEMENT = {
  enabled: false,
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    // optional:
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  /** RTDB path prefix — keep namespaced */
  rootPath: "simba-life/posts",
  maxCommentLength: 200
};
