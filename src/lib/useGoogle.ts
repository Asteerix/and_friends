// import * as WebBrowser from "expo-web-browser";
// import * as Google from "expo-auth-session/providers/google";
// import { useEffect } from "react";
// import { GoogleAuthProvider, signInWithCredential } from "firebase/auth"; // Firebase
// import { auth } from "./firebase"; // Firebase

// WebBrowser.maybeCompleteAuthSession();

export function useGoogle() {
  // const [request, response, prompt] = Google.useIdTokenAuthRequest({
  //   clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  // });

  // useEffect(() => {
  //   if (response?.type === "success") {
  //     const { id_token } = response.params;
  //     const cred = GoogleAuthProvider.credential(id_token); // Firebase
  //     signInWithCredential(auth, cred); // Firebase
  //   }
  // }, [response]);

  // return [request, response, prompt] as const;
  console.warn("useGoogle hook needs to be adapted for Supabase or removed if not used.");
  return [null, null, () => {}] as const; // Retourner une structure compatible pour éviter les erreurs
}
