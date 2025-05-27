import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const HERO_HEIGHT = Dimensions.get("window").height;
const HERO_PADDING_H = 24;
const IMAGE_MAX_HEIGHT = HERO_HEIGHT * 0.38;
const themeColor = "#FFE400";
const RADIUS = 36;

const ILLUSTRATION = require("../../assets/images/events/event_logo.png");

const TEMPLATES = [
  { color: "#00FFB2", label: "YOUR BDAY PARTY" },
  { color: "#B6A6FF", label: "MOVIE NIGHT" },
  { color: "#FF9100" },
  { color: "#F7B8F7" },
  { color: "#3B82F6" },
  { color: "#219653" },
  { color: "#3B82F6" },
  { color: "#219653" },
];
const DECORATIONS = Array(18).fill(0);
const BACKGROUNDS = [
  { color: "#F7B8F7" },
  { color: "#00FFB2" },
  { color: "#B6A6FF" },
  { color: "#3B82F6" },
  { color: "#219653" },
];
const FONTS = ["Classic Invite", "AFTER HOURS", "OFFBEAT"];

export default function EditCoverScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [tab, setTab] = useState<"Style" | "Decorate" | "Templates">("Style");
  const [title, setTitle] = useState("Finally, a pasta night part|");
  const [subtitle, setSubtitle] = useState(
    "Come hungry. Bring a pasta, a sauce, or just yourself."
  );
  const [selectedFont, setSelectedFont] = useState(FONTS[1]);
  const [selectedBg, setSelectedBg] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedDeco, setSelectedDeco] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      {/* Header fixe avec ombre */}
      <View style={[styles.headerFixed, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitleAbsolute}>Edit Cover</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerCircle}
            onPress={() => (navigation as any).navigate("Chat")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#222"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCircle}
            onPress={() => (navigation as any).navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color="#222" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Hero section */}
        <View
          style={{
            backgroundColor: themeColor,
            borderBottomLeftRadius: RADIUS,
            borderBottomRightRadius: RADIUS,
            overflow: "hidden",
            paddingBottom: 40,
            paddingTop: 24,
            alignItems: "center",
          }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextBlock}>
              <TextInput
                style={styles.heroTitleInput}
                placeholder="Add Your Title"
                placeholderTextColor="#222"
                value={title}
                onChangeText={setTitle}
                multiline
                numberOfLines={3}
                maxLength={60}
              />
              <TextInput
                style={styles.heroSubtitleInput}
                placeholder="Subtitle"
                placeholderTextColor="#222"
                value={subtitle}
                onChangeText={setSubtitle}
                multiline
                numberOfLines={2}
                maxLength={80}
              />
            </View>
            <View style={styles.heroImgContainer}>
              <Image
                source={ILLUSTRATION}
                style={styles.heroImg}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.resetBtn}>
              <Ionicons
                name="trash-outline"
                size={18}
                color="#222"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.resetBtnText}>Reset to Default</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Tabs sticky */}
        <View style={styles.tabsRowSticky}>
          {["Style", "Decorate", "Templates"].map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tabBtn}
              onPress={() => setTab(t as any)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t}
              </Text>
              {tab === t && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
        {/* Tab content */}
        {tab === "Style" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Font</Text>
            <View style={styles.fontRow}>
              {FONTS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.fontBtn,
                    selectedFont === f && styles.fontBtnActive,
                  ]}
                  onPress={() => setSelectedFont(f)}
                >
                  <Text
                    style={[
                      styles.fontBtnText,
                      selectedFont === f && styles.fontBtnTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Background</Text>
            <View style={styles.bgRow}>
              {BACKGROUNDS.map((bg, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.bgCircle,
                    {
                      backgroundColor: bg.color,
                      borderWidth: selectedBg === i ? 2 : 0,
                      borderColor: "#000",
                    },
                  ]}
                  onPress={() => setSelectedBg(i)}
                />
              ))}
              <TouchableOpacity
                style={[
                  styles.bgCircle,
                  {
                    borderWidth: 1,
                    borderColor: "#E5E5E5",
                    backgroundColor: "#FFF",
                  },
                ]}
              >
                <Ionicons name="add" size={20} color="#9E9E9E" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Upload Media</Text>
            <TouchableOpacity style={styles.uploadBtn}>
              <Text style={styles.uploadBtnText}>Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn}>
              <Text style={styles.uploadBtnText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        )}
        {tab === "Decorate" && (
          <View style={styles.tabContent}>
            <View style={styles.decoGrid}>
              {DECORATIONS.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.decoCell}
                  onPress={() => setSelectedDeco(i)}
                >
                  <Image
                    source={ILLUSTRATION}
                    style={[
                      styles.decoImg,
                      selectedDeco === i && {
                        borderColor: "#000",
                        borderWidth: 2,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {tab === "Templates" && (
          <View style={styles.tabContent}>
            <View style={styles.templateGrid}>
              {TEMPLATES.map((tpl, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.templateCell, { backgroundColor: tpl.color }]}
                  onPress={() => setSelectedTemplate(i)}
                >
                  {tpl.label && (
                    <Text style={styles.templateLabel}>{tpl.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      {/* Footer fixe avec ombre */}
      <View style={styles.footerFixed}>
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerFixed: {
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
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  resetBtnText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "500",
  },
  tabsRowSticky: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFF",
    marginTop: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    height: 48,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  tabText: {
    fontSize: 15,
    color: "#888",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#222",
    fontWeight: "700",
  },
  tabUnderline: {
    height: 3,
    width: 32,
    backgroundColor: "#222",
    borderRadius: 2,
    marginTop: 2,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    color: "#000",
    fontWeight: "600",
    marginBottom: 12,
    fontFamily: Platform.select({
      ios: "SF Pro Text",
      android: "Roboto",
      default: "sans-serif",
    }),
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  fontBtn: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  fontBtnActive: {
    borderColor: "#222",
    backgroundColor: "#F5F5F5",
  },
  fontBtnText: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },
  fontBtnTextActive: {
    fontWeight: "700",
    color: "#000",
  },
  bgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  bgCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: "#FFF",
  },
  uploadBtnText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "500",
  },
  decoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  decoCell: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  decoImg: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
  },
  templateCell: {
    width: 150,
    height: 100,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
  },
  templateLabel: {
    color: "#222",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  footerFixed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginRight: 8,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginLeft: 8,
  },
  cancelBtnText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "600",
  },
});
