import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  Image,
  Dimensions,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEventsAdvanced } from "../hooks/useEventsAdvanced";
import { useSession } from "../lib/SessionContext";
import { useFonts } from "expo-font";
import { supabase } from "../../lib/supabase";

const DISCO_IMAGE = require("../../assets/images/events/event_logo.png");
const HERO_HEIGHT = Dimensions.get("window").height;
const HERO_PADDING_H = 24;
const IMAGE_MAX_HEIGHT = HERO_HEIGHT * 0.38;
const themeColor = "#FFE400";
const RADIUS = 36;

const COVER_TABS = ["Style", "Decorate", "Templates"];
const COVER_BACKGROUNDS = [
  { color: "#F7B8F7" },
  { color: "#00FFB2" },
  { color: "#B6A6FF" },
  { color: "#3B82F6" },
  { color: "#219653" },
];
const COVER_FONTS = [{ label: "Space Mono", value: "SpaceMono-Regular" }];
const COVER_TEMPLATES = [
  { color: "#00FFB2", label: "YOUR BDAY PARTY" },
  { color: "#B6A6FF", label: "MOVIE NIGHT" },
  { color: "#FF9100" },
  { color: "#F7B8F7" },
  { color: "#3B82F6" },
  { color: "#219653" },
];
const COVER_DECORATIONS = Array(18).fill(0);

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { session, getCurrentSession } = useSession();
  const { createEvent } = useEventsAdvanced();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [coverBgColor, setCoverBgColor] = useState(themeColor);
  const [coverFont, setCoverFont] = useState("PlayfairDisplay-Bold");
  const [coverImage, setCoverImage] = useState(DISCO_IMAGE);
  const [showEditCover, setShowEditCover] = useState(false);
  const [coverTab, setCoverTab] = useState("Style");
  const [fontsLoaded, fontError] = useFonts({
    "SpaceMono-Regular": require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const handleDatePicker = () => {
    // Simple date picker logic - for demo purposes
    const today = new Date();
    const defaultDate = today.toISOString().split("T")[0];
    setDate(defaultDate);
  };

  const handleTimePicker = () => {
    // Simple time picker logic - for demo purposes
    const now = new Date();
    const defaultTime = now.toTimeString().slice(0, 5);
    setTime(defaultTime);
  };

  const handleCreate = async () => {
    // Vérification plus robuste de l'authentification
    console.log("[CreateEventScreen] Début handleCreate");
    console.log("[CreateEventScreen] Session:", !!session);
    console.log("[CreateEventScreen] Session.user:", !!session?.user);
    console.log("[CreateEventScreen] Session.user.id:", session?.user?.id);

    // Si pas de session du tout, c'est un problème grave
    if (!session) {
      console.error("[CreateEventScreen] Aucune session trouvée");
      Alert.alert("Erreur", "Session non trouvée. Veuillez vous reconnecter.");
      return;
    }

    // Si session mais pas d'utilisateur, on essaie de récupérer la session
    if (!session.user) {
      console.warn("[CreateEventScreen] Session trouvée mais pas d'utilisateur");
      try {
        // Tentative de récupération de la session depuis Supabase
        const currentSession = await getCurrentSession();
        console.log("[CreateEventScreen] Session récupérée:", !!currentSession);
        console.log("[CreateEventScreen] Utilisateur récupéré:", !!currentSession?.user);
        
        if (!currentSession?.user) {
          Alert.alert("Erreur", "Vous devez être connecté pour créer un événement. Veuillez vous reconnecter.");
          return;
        }
      } catch (error) {
        console.error("[CreateEventScreen] Erreur lors de la récupération de session:", error);
        Alert.alert("Erreur", "Problème d'authentification. Veuillez vous reconnecter.");
        return;
      }
    }

    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est requis");
      return;
    }

    if (!date || !time) {
      Alert.alert("Erreur", "La date et l'heure sont requises");
      return;
    }

    setLoading(true);
    try {
      const eventDateTime = `${date}T${time}:00.000Z`;
      const result = await createEvent({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        date: eventDateTime,
        location: location.trim() || undefined,
        tags: tags.trim()
          ? tags.split(",").map((tag) => tag.trim())
          : undefined,
        is_private: privacy,
        cover_bg_color: coverBgColor,
        cover_font: coverFont,
        cover_image: typeof coverImage === "string" ? coverImage : undefined,
      });

      if (result.error) {
        Alert.alert("Erreur", "Impossible de créer l'événement");
        return;
      }

      Alert.alert("Succès", "Événement créé avec succès !", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Erreur", "Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    handleCreate();
  };

  const handleSaveDraft = () => {
    Alert.alert("Info", "Fonctionnalité de brouillon à venir");
  };

  useEffect(() => {
    const params = route.params as any;
    if (params) {
      if (params.coverBgColor) setCoverBgColor(params.coverBgColor);
      if (params.coverFont) setCoverFont(params.coverFont);
      if (params.coverImage) setCoverImage(params.coverImage);
    }
  }, [route.params]);

  useEffect(() => {
    if (!fontsLoaded) {
      console.log("[DEBUG] Fonts not loaded yet");
    } else {
      console.log("[DEBUG] Fonts loaded successfully");
    }
    if (fontError) {
      console.log("[DEBUG] Font loading error:", fontError);
    }
  }, [fontsLoaded, fontError]);

  // Log de diagnostic (sans protection individuelle)
  useEffect(() => {
    console.log("[CreateEventScreen] 🔍 Diagnostic: Session:", !!session, "User:", !!session?.user);
  }, [session]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFF",
        }}
      >
        <Text style={{ marginBottom: 16, color: "#888" }}>
          Chargement des polices...
        </Text>
        <ActivityIndicator size="large" color="#FFE400" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFF" }}
      contentContainerStyle={{ paddingBottom: 120, backgroundColor: "#FFF" }}
      showsVerticalScrollIndicator={false}
    >
      {/* Section cover + header + image + bouton Edit Cover */}
      <View
        style={{
          backgroundColor: coverBgColor || "#CDE6FF",
          borderBottomLeftRadius: RADIUS,
          borderBottomRightRadius: RADIUS,
          overflow: "hidden",
          paddingBottom: 40,
          paddingTop: 36,
          alignItems: "center",
          position: "relative",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            height: 110,
            paddingHorizontal: 16,
            paddingBottom: 12,
            zIndex: 10,
            backgroundColor: "transparent",
            width: "100%",
          }}
        >
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#222" />
          </TouchableOpacity>
          <Text
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 12,
              textAlign: "center",
              fontSize: 18,
              color: "#222",
              fontFamily: Platform.select({
                ios: "Arial",
                android: "Roboto",
                default: "sans-serif",
              }),
              fontWeight: "bold",
              zIndex: 1,
              letterSpacing: 0.2,
            }}
          >
            Create Event
          </Text>
          <View
            style={{
              position: "absolute",
              right: 16,
              bottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFF",
                marginLeft: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
              }}
              onPress={() => (navigation as any).navigate("Chat")}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#222"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFF",
                marginLeft: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 2,
              }}
              onPress={() => (navigation as any).navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Cover content */}
        <View
          style={{
            width: "100%",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <TextInput
            style={{
              fontSize: 36,
              color: "#222",
              textAlign: "center",
              fontFamily: coverFont,
              fontWeight: "bold",
              lineHeight: 42,
              maxWidth: "90%",
              backgroundColor: "transparent",
              letterSpacing: 0.1,
              marginBottom: 2,
            }}
            placeholder="Add Your Title"
            placeholderTextColor="#222"
            value={title}
            onChangeText={setTitle}
            multiline
            numberOfLines={3}
            maxLength={60}
            textAlign="center"
            selectionColor="#000"
          />
          <TextInput
            style={{
              fontSize: 16,
              color: "#222",
              marginTop: 6,
              textAlign: "center",
              fontFamily: coverFont,
              fontWeight: "400",
              maxWidth: "90%",
              marginBottom: 8,
              backgroundColor: "transparent",
              opacity: 0.7,
              letterSpacing: 0.05,
            }}
            placeholder="Drop a fun little punchline to get the crew hyped for what's coming."
            placeholderTextColor="#9E9E9E"
            value={subtitle}
            onChangeText={setSubtitle}
            multiline
            numberOfLines={2}
            maxLength={80}
            textAlign="center"
            selectionColor="#000"
          />
        </View>
        <View
          style={{
            width: "100%",
            justifyContent: "flex-start",
            alignItems: "center",
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          <Image
            source={coverImage}
            style={{
              width: "80%",
              height: IMAGE_MAX_HEIGHT,
              maxHeight: IMAGE_MAX_HEIGHT,
              alignSelf: "center",
              marginTop: 8,
              marginBottom: 8,
            }}
            resizeMode="contain"
          />
        </View>
        <View
          style={{
            width: "100%",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <Pressable
            style={({ pressed }) => [
              {
                backgroundColor: "#FFF",
                borderRadius: 12,
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: "#E5E5E5",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                minWidth: 160,
              },
              pressed && {
                opacity: 0.7,
                elevation: 4,
                transform: [{ scale: 0.97 }],
              },
            ]}
            onPress={() => setShowEditCover((v) => !v)}
          >
            <Ionicons
              name="pencil-outline"
              size={20}
              color="#222"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#222",
                fontSize: 15,
                fontWeight: "600",
                fontFamily: Platform.select({
                  ios: "Arial",
                  android: "Roboto",
                  default: "sans-serif",
                }),
                letterSpacing: 0.1,
              }}
            >
              Edit Cover
            </Text>
          </Pressable>
        </View>
        {/* Editeur inline amélioré */}
        {showEditCover && (
          <View
            style={{
              width: "92%",
              alignSelf: "center",
              backgroundColor: "#FFF",
              borderRadius: 24,
              marginTop: 18,
              marginBottom: 8,
              paddingBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Onglets */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                borderBottomWidth: 1,
                borderColor: "#F0F0F0",
                height: 48,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                backgroundColor: "#FFF",
              }}
            >
              {COVER_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    height: 48,
                  }}
                  onPress={() => setCoverTab(tab)}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: coverTab === tab ? "#222" : "#888",
                      fontWeight: coverTab === tab ? "700" : "500",
                      letterSpacing: 0.1,
                    }}
                  >
                    {tab}
                  </Text>
                  {coverTab === tab && (
                    <View
                      style={{
                        height: 3,
                        width: 32,
                        backgroundColor: "#222",
                        borderRadius: 2,
                        marginTop: 2,
                      }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {/* Contenu onglet Style */}
            {coverTab === "Style" && (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 24,
                  paddingBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "#000",
                    fontWeight: "600",
                    marginBottom: 12,
                    letterSpacing: 0.05,
                  }}
                >
                  Font
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  {COVER_FONTS.map((f) => (
                    <TouchableOpacity
                      key={f.value}
                      style={{
                        borderWidth: 1,
                        borderColor: coverFont === f.value ? "#222" : "#E5E5E5",
                        borderRadius: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        marginRight: 8,
                        backgroundColor:
                          coverFont === f.value ? "#F5F5F5" : "#FFF",
                        minWidth: 60,
                        alignItems: "center",
                        justifyContent: "center",
                        maxWidth: 120,
                      }}
                      onPress={() => setCoverFont(f.value)}
                    >
                      <Text
                        style={{
                          fontSize: 17,
                          color: coverFont === f.value ? "#000" : "#222",
                          fontWeight: coverFont === f.value ? "700" : "500",
                          letterSpacing: 0.05,
                          fontFamily: Platform.select({
                            ios: "Arial",
                            android: "Roboto",
                            default: "sans-serif",
                          }),
                          maxWidth: 100,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: "#000",
                    fontWeight: "600",
                    marginBottom: 12,
                    letterSpacing: 0.05,
                  }}
                >
                  Background
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  {COVER_BACKGROUNDS.map((bg, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        marginRight: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: bg.color,
                        borderWidth: coverBgColor === bg.color ? 2 : 0,
                        borderColor: "#000",
                      }}
                      onPress={() => setCoverBgColor(bg.color)}
                    />
                  ))}
                  <TouchableOpacity
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#E5E5E5",
                      backgroundColor: "#FFF",
                    }}
                  >
                    <Ionicons name="add" size={20} color="#9E9E9E" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: "#000",
                    fontWeight: "600",
                    marginBottom: 12,
                    letterSpacing: 0.05,
                  }}
                >
                  Upload Media
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E5E5",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginBottom: 12,
                    backgroundColor: "#FFF",
                  }}
                >
                  <Text
                    style={{
                      color: "#222",
                      fontSize: 15,
                      fontWeight: "500",
                      letterSpacing: 0.05,
                    }}
                  >
                    Upload Image
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E5E5",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginBottom: 12,
                    backgroundColor: "#FFF",
                  }}
                >
                  <Text
                    style={{
                      color: "#222",
                      fontSize: 15,
                      fontWeight: "500",
                      letterSpacing: 0.05,
                    }}
                  >
                    Upload Video
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Contenu onglet Decorate */}
            {coverTab === "Decorate" && (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 24,
                  paddingBottom: 24,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  {COVER_DECORATIONS.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        backgroundColor: "#FFF",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: 4,
                        borderWidth: 1,
                        borderColor: "#E5E5E5",
                      }}
                    >
                      <Image
                        source={coverImage}
                        style={{ width: 48, height: 48, resizeMode: "contain" }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {/* Contenu onglet Templates */}
            {coverTab === "Templates" && (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 24,
                  paddingBottom: 24,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                    justifyContent: "flex-start",
                  }}
                >
                  {COVER_TEMPLATES.map((tpl, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        width: 150,
                        height: 100,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        margin: 6,
                        backgroundColor: tpl.color,
                      }}
                    >
                      {tpl.label && (
                        <Text
                          style={{
                            color: "#222",
                            fontWeight: "700",
                            fontSize: 16,
                            textAlign: "center",
                            letterSpacing: 0.05,
                          }}
                        >
                          {tpl.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {/* Boutons Save/Cancel */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                marginBottom: 8,
                paddingHorizontal: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#000",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  marginRight: 8,
                }}
                onPress={() => setShowEditCover(false)}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "600",
                    letterSpacing: 0.05,
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#FFF",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  marginLeft: 8,
                  borderWidth: 1,
                  borderColor: "#E5E5E5",
                }}
                onPress={() => setShowEditCover(false)}
              >
                <Text
                  style={{
                    color: "#222",
                    fontSize: 15,
                    fontWeight: "600",
                    letterSpacing: 0.05,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      {/* Formulaire */}
      <View style={styles.formSection}>
        <Text style={styles.label}>Date & Time</Text>
        <View style={styles.rowGap}>
          <Pressable
            style={({ pressed }) => [
              styles.inputBtn,
              pressed && {
                opacity: 0.7,
                elevation: 2,
                transform: [{ scale: 0.98 }],
              },
            ]}
            onPress={handleDatePicker}
          >
            <Text style={styles.inputBtnText}>{date || "Select date"}</Text>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#9E9E9E"
              style={{ marginLeft: 8 }}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.inputBtn,
              pressed && {
                opacity: 0.7,
                elevation: 2,
                transform: [{ scale: 0.98 }],
              },
            ]}
            onPress={handleTimePicker}
          >
            <Text style={styles.inputBtnText}>{time || "Select time"}</Text>
            <Ionicons
              name="time-outline"
              size={18}
              color="#9E9E9E"
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        </View>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.inputRow}
          placeholder="Add location (address, city, etc.)"
          placeholderTextColor="#9E9E9E"
          value={location}
          onChangeText={setLocation}
          selectionColor="#000"
        />
        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.inputRow}
          placeholder="Add up to 3 tags to describe your event"
          placeholderTextColor="#9E9E9E"
          value={tags}
          onChangeText={setTags}
          selectionColor="#000"
        />
        <Text style={styles.label}>Customize</Text>
        <Pressable
          style={({ pressed }) => [
            styles.inputRow,
            pressed && {
              opacity: 0.7,
              elevation: 2,
              transform: [{ scale: 0.98 }],
            },
          ]}
          onPress={() => {
            /* open customize modal */
          }}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color="#9E9E9E"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.inputRowText}>Add Extra Details</Text>
          <Ionicons
            name="chevron-forward-outline"
            size={18}
            color="#9E9E9E"
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
        <Text style={styles.label}>Privacy</Text>
        <View style={styles.privacyRow}>
          <Text style={styles.privacyLabel}>Invite-Only Event</Text>
          <Switch
            value={privacy}
            onValueChange={setPrivacy}
            trackColor={{ false: "#E5E5E5", true: "#000" }}
            thumbColor={privacy ? "#FFF" : "#FFF"}
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
          />
        </View>
        <Text style={styles.privacyDesc}>Only invited guests can view</Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.draftBtn,
              pressed && {
                opacity: 0.7,
                elevation: 2,
                transform: [{ scale: 0.98 }],
              },
            ]}
            onPress={handleSaveDraft}
            disabled={loading}
          >
            <Text style={styles.draftBtnText}>Save as Draft</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.publishBtn,
              loading && { opacity: 0.6 },
              pressed && {
                opacity: 0.7,
                elevation: 2,
                transform: [{ scale: 0.98 }],
              },
            ]}
            onPress={handlePublish}
            disabled={loading}
          >
            <Text style={styles.publishBtnText}>
              {loading ? "Publishing..." : "Publish"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    textAlign: "center",
    fontSize: 17,
    color: "#222",
    fontFamily: Platform.select({
      ios: "PlayfairDisplay-Bold",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "bold",
    zIndex: 1,
  },
  headerRight: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  heroContent: {
    width: "100%",
    paddingHorizontal: HERO_PADDING_H,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 24,
  },
  heroTextBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  heroTitleInput: {
    fontSize: 36,
    color: "#222",
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "PlayfairDisplay-Bold",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "bold",
    lineHeight: 40,
    maxWidth: "90%",
  },
  heroSubtitleInput: {
    fontSize: 15,
    color: "#222",
    marginTop: 8,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
    maxWidth: "90%",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  heroImgContainer: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
  },
  heroImg: {
    width: "120%",
    height: IMAGE_MAX_HEIGHT * 1.15,
    maxHeight: IMAGE_MAX_HEIGHT * 1.15,
    alignSelf: "center",
  },
  formSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  label: {
    fontSize: 15,
    color: "#000",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
  },
  rowGap: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  inputBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  inputBtnText: {
    color: "#222",
    fontSize: 15,
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  inputRowText: {
    color: "#222",
    fontSize: 15,
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    minHeight: 80,
    fontSize: 15,
    color: "#222",
    marginBottom: 8,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 0,
  },
  privacyLabel: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
  },
  privacyDesc: {
    fontSize: 13,
    color: "#9E9E9E",
    marginBottom: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  draftBtnText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "600",
  },
  publishBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  publishBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
