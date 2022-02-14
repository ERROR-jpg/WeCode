export function InitFireBase() {
    // Initialize the Firebase SDK.
    firebase.initializeApp({
      apiKey: "AIzaSyCAmLg97LMRIKsZrYStaVbUjMFSvA2pLm4",
      databaseURL: "https://wecode-1aff7-default-rtdb.firebaseio.com/",
    });
  
    // Get Firebase Database reference.
    var firepadRef = firebase.database().ref();
  
    const urlparams = new URLSearchParams(window.location.search);
    const roomId = urlparams.get("id");
  
    if (roomId) {
      firepadRef = firepadRef.child(roomId);
    } else {
      firepadRef = firepadRef.push();
      window.history.replaceState(null, "Share Code", "?id=" + firepadRef.key);
    }
  
    return firepadRef;
  }
  