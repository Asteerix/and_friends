import { useState, useRef, useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";
import { supabase } from "../../lib/supabase";
import { t } from "../locales";

interface UseOtpVerificationProps {
  phone: string; // Changé de email à phone
  callingCode: string; // Ajouté pour reconstruire le numéro complet si besoin pour resend
  countryCode: string; // Ajouté pour contexte, pourrait être utile
  onSuccess: () => void;
  lang: "fr" | "en";
}

export function useOtpVerification({
  phone, // Changé de email à phone
  callingCode, // Ajouté
  countryCode, // Ajouté
  onSuccess,
  lang,
}: UseOtpVerificationProps) {
  console.log(
    "[useOtpVerification] Hook initialized with params:",
    JSON.stringify({ phone, callingCode, countryCode, lang }, null, 2)
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alreadyVerifiedRef = useRef(false); // 🚫 Empêche les doublons
  const verifyCount = useRef(0); // Pour debug

  // Timer pour le resend
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  const resetTimer = useCallback(() => setTimer(60), []);

  // Gestion de la vérification OTP
  const verifyCode = useCallback(
    async (inputCode?: string) => {
      const codeToVerify = typeof inputCode === "string" ? inputCode : code;
      if (codeToVerify.length !== 6) return;
      if (alreadyVerifiedRef.current) {
        console.log(
          "[OTP] verifyOtp invoked but alreadyVerifiedRef=true, skipping."
        );
        return;
      }
      alreadyVerifiedRef.current = true;
      console.log("[OTP] verifyOtp invoked", ++verifyCount.current);
      setLoading(true);
      setError(false);
      setErrorMessage("");

      const fullPhoneNumberForVerification = `+${callingCode}${phone}`;
      console.log(
        "[useOtpVerification] Attempting to verify OTP. Identifier:",
        fullPhoneNumberForVerification,
        "Token:",
        codeToVerify,
        "Type:",
        "sms"
      );

      try {
        // Utilisation de verifyOtp pour la v2 de supabase-js
        const { data, error: verificationError } =
          await supabase.auth.verifyOtp({
            phone: fullPhoneNumberForVerification, // Utiliser le numéro de téléphone complet
            token: codeToVerify,
            type: "sms", // Spécifier le type SMS
          });

        console.log(
          "[useOtpVerification] Supabase verifyOtp response. Data:",
          JSON.stringify(data, null, 2),
          "Error:",
          JSON.stringify(verificationError, null, 2)
        );

        if (verificationError) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          setError(true);
          // Adapter le message d'erreur si nécessaire, ex: "code_sms_invalide"
          const specificMessage =
            verificationError.message.includes("already been used") ||
            verificationError.message.includes("expired")
              ? t("otp_expired_or_used", lang)
              : t("invalid_code", lang);
          setErrorMessage(specificMessage);
          AccessibilityInfo.announceForAccessibility(specificMessage);
          setCode(""); // Vider le code en cas d'erreur pour nouvelle saisie
          alreadyVerifiedRef.current = false; // autorise un 2ᵉ essai manuel
          console.error(
            "[useOtpVerification] Error in verifyCode:",
            JSON.stringify(verificationError, null, 2)
          );
        } else if (data && (data.session || data.user)) {
          // Vérifier la présence de session ou user dans data
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          setError(false);
          setErrorMessage("");
          onSuccess();
        } else {
          // Cas où il n'y a pas d'erreur mais pas de session/user (inattendu pour un OTP réussi)
          console.warn(
            "[useOtpVerification] verifyOtp success but no session/user in data:",
            JSON.stringify(data, null, 2)
          );
          setError(true);
          setErrorMessage(t("unexpected_error_no_session", lang)); // Nouveau message à ajouter aux traductions
          AccessibilityInfo.announceForAccessibility(
            t("unexpected_error_no_session", lang)
          );
          alreadyVerifiedRef.current = false;
        }
      } catch (err: any) {
        console.error(
          "[useOtpVerification] Catch block error in verifyCode:",
          err
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        setErrorMessage(t("unexpected_error", lang));
        AccessibilityInfo.announceForAccessibility(t("unexpected_error", lang));
        alreadyVerifiedRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [code, phone, callingCode, lang, onSuccess]
  );

  // Gestion du resend
  const resendCode = useCallback(async () => {
    if (timer > 0) return;
    setLoading(true);
    setError(false);
    setErrorMessage("");

    const fullPhoneNumberForResend = `+${callingCode}${phone}`;
    console.log(
      "[useOtpVerification] Attempting to resend OTP to:",
      fullPhoneNumberForResend
    );

    try {
      // Utilisation de signInWithOtp pour renvoyer un code par SMS
      const { error: resendError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumberForResend,
        options: {
          shouldCreateUser: false, // Important: ne pas créer un nouvel utilisateur lors du renvoi
        },
      });

      console.log(
        "[useOtpVerification] Supabase signInWithOtp (resend) response. Error:",
        JSON.stringify(resendError, null, 2)
      );

      if (resendError) {
        setError(true);
        setErrorMessage(t("error_resending_otp", lang));
        AccessibilityInfo.announceForAccessibility(
          t("error_resending_otp", lang)
        );
        console.error(
          "[useOtpVerification] Error in resendCode:",
          JSON.stringify(resendError, null, 2)
        );
      } else {
        resetTimer();
        // Optionnel: informer l'utilisateur que le code a été renvoyé
        AccessibilityInfo.announceForAccessibility(
          t("otp_resent_successfully", lang)
        ); // Nouveau message
      }
    } catch (err: any) {
      console.error(
        "[useOtpVerification] Catch block error in resendCode:",
        err
      );
      setError(true);
      setErrorMessage(t("unexpected_error", lang));
      AccessibilityInfo.announceForAccessibility(t("unexpected_error", lang));
    } finally {
      setLoading(false);
    }
  }, [phone, callingCode, lang, timer, resetTimer]); // Ajout de phone et callingCode

  return {
    code,
    setCode,
    error,
    errorMessage,
    loading,
    timer,
    verifyCode,
    resendCode,
    resetTimer,
  };
}
