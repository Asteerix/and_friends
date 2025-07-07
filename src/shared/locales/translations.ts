
// Type-safe translations for the app
export interface Translations {
  // Common
  welcome: string;
  loading: string;
  continue: string;
  skip: string;
  cancel: string;
  add: string;
  save: string;
  done: string;
  next: string;
  back: string;
  error: string;
  success: string;
  delete: string;
  edit: string;
  confirm: string;
  search: string;
  noResults: string;
  tryAgain: string;
  ok: string;
  yes: string;
  no: string;
  
  // Auth screens
  phone_verification_title: string;
  phone_placeholder: string;
  invalid_phone: string;
  verify_code_title: string;
  code_verification_subtitle: string;
  invalid_code: string;
  error_sending_otp: string;
  error_resending_otp: string;
  otp_resent_success: string;
  resend_code_link: string;
  
  // Onboarding
  name_input_title: string;
  name_input_subtitle: string;
  name_input_fullname_placeholder: string;
  name_input_username_placeholder: string;
  name_input_fullname_empty: string;
  name_input_fullname_number: string;
  name_input_username_empty: string;
  error_username_required: string;
  error_username_invalid: string;
  error_username_taken: string;
  
  age_input_title: string;
  age_input_subtitle: string;
  hide_from_profile: string;
  
  avatar_pick_title: string;
  avatar_pick_subtitle: string;
  avatar_pick_snap: string;
  avatar_pick_gallery: string;
  
  contacts_permission_title: string;
  contacts_permission_subtitle: string;
  allow_contacts: string;
  
  location_permission_title: string;
  location_permission_subtitle: string;
  allow_location: string;
  
  path_input_title: string;
  path_input_subtitle: string;
  path_label: string;
  
  jam_picker_title: string;
  jam_picker_subtitle: string;
  jam_picker_placeholder: string;
  
  restaurant_picker_title: string;
  restaurant_picker_subtitle: string;
  restaurant_picker_placeholder: string;
  restaurant_picker_no_results: string;
  restaurant_picker_unavailable: string;
  
  hobby_picker_title: string;
  hobby_picker_subtitle: string;
  hobby_picker_add: string;
  hobby_picker_new: string;
  hobby_picker_placeholder: string;
  hobby_picker_max: string;
  
  // Home screen
  home_title: string;
  home_greeting_morning: string;
  home_greeting_afternoon: string;
  home_greeting_evening: string;
  home_greeting_night: string;
  home_section_upcoming: string;
  home_section_popular: string;
  home_section_nearby: string;
  home_section_memories: string;
  home_view_all: string;
  home_no_events: string;
  home_search_placeholder: string;
  
  // Events
  event_create_title: string;
  event_title_placeholder: string;
  event_description_placeholder: string;
  event_location_placeholder: string;
  event_date_label: string;
  event_time_label: string;
  event_category_label: string;
  event_privacy_label: string;
  event_privacy_public: string;
  event_privacy_friends: string;
  event_privacy_private: string;
  event_create_success: string;
  event_create_error: string;
  event_details_about: string;
  event_details_hosted_by: string;
  event_details_attendees: string;
  event_details_going: string;
  event_details_maybe: string;
  event_details_not_going: string;
  event_details_rsvp: string;
  event_details_im_in: string;
  event_details_bring: string;
  event_details_tap_to_claim: string;
  event_details_location: string;
  event_invite_friends: string;
  event_edit_cover: string;
  
  // Chat
  chat_title: string;
  chat_no_messages: string;
  chat_type_message: string;
  chat_send: string;
  chat_voice_message: string;
  chat_new_conversation: string;
  chat_search_conversations: string;
  chat_online: string;
  chat_typing: string;
  chat_delivered: string;
  chat_read: string;
  
  // Profile
  profile_title: string;
  profile_edit: string;
  profile_settings: string;
  profile_logout: string;
  profile_events_hosted: string;
  profile_events_attended: string;
  profile_friends: string;
  profile_about: string;
  profile_interests: string;
  profile_favorite_spot: string;
  profile_favorite_song: string;
  profile_age: string;
  profile_location: string;
  profile_joined: string;
  
  // Settings
  settings_title: string;
  settings_account: string;
  settings_notifications: string;
  settings_privacy: string;
  settings_language: string;
  settings_theme: string;
  settings_theme_light: string;
  settings_theme_dark: string;
  settings_theme_auto: string;
  settings_about: string;
  settings_help: string;
  settings_terms: string;
  settings_privacy_policy: string;
  settings_delete_account: string;
  settings_delete_account_confirm: string;
  
  // Notifications
  notifications_title: string;
  notifications_all: string;
  notifications_events: string;
  notifications_messages: string;
  notifications_empty: string;
  notifications_new_event: string;
  notifications_event_reminder: string;
  notifications_new_message: string;
  notifications_friend_request: string;
  notifications_event_update: string;
  
  // Calendar
  calendar_title: string;
  calendar_today: string;
  calendar_week: string;
  calendar_month: string;
  calendar_no_events: string;
  calendar_add_event: string;
  
  // Map
  map_title: string;
  map_nearby_events: string;
  map_filter: string;
  map_list_view: string;
  map_ar_view: string;
  map_permission_denied: string;
  
  // Stories/Memories
  memories_title: string;
  memories_create: string;
  memories_no_stories: string;
  memories_view_all: string;
  memories_from: string;
  memories_add_photo: string;
  memories_add_caption: string;
  memories_share: string;
  memories_delete: string;
  memories_delete_confirm: string;
  
  // Errors
  error_network: string;
  error_server: string;
  error_unknown: string;
  error_required_field: string;
  error_invalid_email: string;
  error_invalid_phone: string;
  error_weak_password: string;
  error_passwords_dont_match: string;
  error_user_not_found: string;
  error_wrong_credentials: string;
  error_email_taken: string;
  error_too_many_requests: string;
  error_session_expired: string;
  error_upload_failed: string;
  error_download_failed: string;
  error_permission_denied: string;
  error_location_disabled: string;
  error_camera_denied: string;
  error_microphone_denied: string;
  
  // Success messages
  success_profile_updated: string;
  success_event_created: string;
  success_event_updated: string;
  success_event_deleted: string;
  success_rsvp_updated: string;
  success_message_sent: string;
  success_friend_added: string;
  success_settings_saved: string;
  success_photo_uploaded: string;
  success_story_posted: string;
  
  // Time
  time_now: string;
  time_min_ago: string;
  time_mins_ago: string;
  time_hour_ago: string;
  time_hours_ago: string;
  time_day_ago: string;
  time_days_ago: string;
  time_week_ago: string;
  time_weeks_ago: string;
  time_month_ago: string;
  time_months_ago: string;
  
  // Days
  day_monday: string;
  day_tuesday: string;
  day_wednesday: string;
  day_thursday: string;
  day_friday: string;
  day_saturday: string;
  day_sunday: string;
  
  // Months
  month_january: string;
  month_february: string;
  month_march: string;
  month_april: string;
  month_may: string;
  month_june: string;
  month_july: string;
  month_august: string;
  month_september: string;
  month_october: string;
  month_november: string;
  month_december: string;
  
  // Categories
  category_all: string;
  category_party: string;
  category_dinner: string;
  category_drinks: string;
  category_sports: string;
  category_music: string;
  category_art: string;
  category_outdoor: string;
  category_gaming: string;
  category_movie: string;
  category_other: string;
  
  // RSVP
  rsvp_going: string;
  rsvp_maybe: string;
  rsvp_not_going: string;
  rsvp_update_success: string;
  
  // Polls
  poll_create: string;
  poll_question_placeholder: string;
  poll_option_placeholder: string;
  poll_add_option: string;
  poll_vote: string;
  poll_votes: string;
  poll_ends_in: string;
  poll_ended: string;
  poll_results: string;
  
  // Voice messages
  voice_recording: string;
  voice_tap_to_play: string;
  voice_playing: string;
  voice_paused: string;
  
  // Misc
  and_more: string;
  see_more: string;
  see_less: string;
  share: string;
  copy: string;
  copied: string;
  report: string;
  block: string;
  unblock: string;
  follow: string;
  unfollow: string;
  invite: string;
  invited: string;
  pending: string;
  accepted: string;
  declined: string;
  
  // Placeholders
  placeholder_search: string;
  placeholder_write_message: string;
  placeholder_add_comment: string;
  placeholder_whats_happening: string;
  
  // Empty states
  empty_events: string;
  empty_messages: string;
  empty_notifications: string;
  empty_friends: string;
  empty_search: string;
  
  // Loading states
  loading_events: string;
  loading_messages: string;
  loading_profile: string;
  loading_map: string;
  
  // Refresh
  pull_to_refresh: string;
  refreshing: string;
  
  // Confirmation dialogs
  confirm_delete_event: string;
  confirm_leave_event: string;
  confirm_block_user: string;
  confirm_logout: string;
  confirm_discard_changes: string;
};
export const translations: { en: Translations; fr: Translations } = {
  en: require('./en-extended.json'),
  fr: require('./fr-extended.json'),
};