export default {
  translation: {
    common: {
      continue: 'Continue',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      retry: 'Retry',
      refresh: 'Refresh',
      clear: 'Clear',
      goBack: 'Go Back',
      comingSoon: 'Coming Soon',
      required: 'Required',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      share: 'Share',
      copy: 'Copy',
      copied: 'Copied!',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      submit: 'Submit',
      create: 'Create',
      update: 'Update',
      add: 'Add',
      remove: 'Remove',
      select: 'Select',
      selectAll: 'Select All',
      none: 'None',
      all: 'All',
      new: 'New',
      old: 'Old',
      recent: 'Recent',
      popular: 'Popular',
      featured: 'Featured',
      recommended: 'Recommended',
      viewAll: 'View All',
      viewMore: 'View More',
      viewLess: 'View Less',
      showMore: 'Show More',
      showLess: 'Show Less',
      seeAll: 'See All',
      collapse: 'Collapse',
      expand: 'Expand',
      readMore: 'Read More',
      readLess: 'Read Less',
      learnMore: 'Learn More',
      getStarted: 'Get Started',
      skip: 'Skip',
      previous: 'Previous',
      finish: 'Finish',
      complete: 'Complete',
      incomplete: 'Incomplete',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      active: 'Active',
      inactive: 'Inactive',
      enabled: 'Enabled',
      disabled: 'Disabled',
      on: 'On',
      off: 'Off',
      open: 'Open',
      closed: 'Closed',
      public: 'Public',
      private: 'Private',
      joined: 'Joined',
      left: 'Left',
      follow: 'Follow',
      unfollow: 'Unfollow',
      following: 'Following',
      followers: 'Followers',
      like: 'Like',
      unlike: 'Unlike',
      likes: 'Likes',
      comment: 'Comment',
      comments: 'Comments',
      reply: 'Reply',
      replies: 'Replies',
      repost: 'Repost',
      quote: 'Quote',
      mention: 'Mention',
      mentions: 'Mentions',
      tag: 'Tag',
      tags: 'Tags',
      location: 'Location',
      locations: 'Locations',
      date: 'Date',
      time: 'Time',
      dateTime: 'Date & Time',
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      nextWeek: 'Next Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      nextMonth: 'Next Month',
      thisYear: 'This Year',
      lastYear: 'Last Year',
      nextYear: 'Next Year',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      am: 'AM',
      pm: 'PM',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      ago: 'ago',
      in: 'in',
      now: 'Now',
      justNow: 'Just now',
      online: 'Online',
      offline: 'Offline',
      away: 'Away',
      busy: 'Busy',
      available: 'Available',
      unavailable: 'Unavailable',
    },
    auth: {
      phoneVerification: {
        title: 'Are you real or something?',
        subtitle: "Let's make sure you're a real one. Enter your phone number to keep things safe.",
        phoneNumber: 'Phone number',
        phoneNumberPlaceholder: 'Enter your phone number',
        countryCode: 'Country code',
        sendCode: 'Send code',
        resendCode: 'Resend code',
        resendIn: 'Resend in {{seconds}}s',
        codeSent: 'SMS sent!',
        codeSentTo: 'A verification code has been sent to {{phoneNumber}}',
        codeAlreadySent: 'A code has already been sent to this number. Check your SMS.',
        invalidPhoneNumber: 'Please enter a valid phone number',
        tooManyAttempts: 'Too many attempts',
        waitBeforeRetry: 'Please wait {{time}} before requesting a new code.',
        sendingCode: 'Sending code...',
        verifying: 'Verifying...',
        offlineMessage: 'Your request will be processed once the connection is restored.',
        warning: 'Warning',
        selectCountry: 'Select your country',
        notReceivingSMS: 'Not receiving SMS?',
        smsHelpLabel: 'Help for receiving SMS',
        serviceUnavailable: 'Service temporarily unavailable',
        serviceUnavailableMessage: 'SMS service is temporarily unavailable. What would you like to do?',
        testMode: 'Test Mode',
        testModeInstructions: 'Use:\nNumber: +33612345678\nCode: 123456',
        useTestMode: 'Use',
        help: 'Help',
        smsFailed: 'Unable to send SMS',
        checkNumberAndRetry: 'Check your number and try again.',
      },
      codeVerification: {
        title: 'Enter verification code',
        subtitle: 'We sent a code to {{phoneNumber}}',
        enterCode: 'Enter the 6-digit code',
        verify: 'Verify',
        invalidCode: 'Invalid code. Please try again.',
        codeExpired: 'Code expired. Please request a new one.',
        wrongCode: 'Wrong code. Please check and try again.',
        didntReceiveCode: "Didn't receive the code?",
        changeNumber: 'Change phone number',
      },
      signInRequired: 'Sign in required',
    },
    home: {
      tabs: {
        forYou: 'For You',
        discover: 'Discover',
        myEvents: 'My Events',
      },
      sections: {
        todayEvents: "Today's Events",
        upcomingEvents: 'Upcoming Events',
        popularEvents: 'Popular Events',
        nearbyEvents: 'Nearby Events',
        recommendedEvents: 'Recommended For You',
        trendingEvents: 'Trending Events',
        newEvents: 'New Events',
        categories: 'Categories',
        featuredOrganizers: 'Featured Organizers',
        allEvents: 'All Events',
        basedOnInterests: 'Based on Your Interests',
        friendsGoing: 'Your Friends Are Going To',
        eventsYouAreGoing: 'Events You Are Going To',
      },
      searchPlaceholder: 'Search for an event or friend',
      emptyStates: {
        noEvents: 'No events found',
        noEventsDescription: 'Check back later for new events',
        noMyEvents: 'You have no events',
        noMyEventsDescription: 'Events you create or join will appear here',
      },
      filters: {
        all: 'All',
        today: 'Today',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        free: 'Free',
        paid: 'Paid',
        online: 'Online',
        inPerson: 'In Person',
        nearby: 'Nearby',
      },
    },
    events: {
      details: {
        about: 'About this event',
        attendees: 'Attendees',
        location: 'Location',
        dateAndTime: 'Date & Time',
        price: 'Price',
        free: 'Free',
        organizer: 'Organizer',
        description: 'Description',
        tickets: 'Tickets',
        availableTickets: '{{count}} tickets available',
        soldOut: 'Sold Out',
        buyTicket: 'Buy Ticket',
        register: 'Register',
        registered: 'Registered',
        join: 'Join Event',
        leave: 'Leave Event',
        share: 'Share Event',
        save: 'Save Event',
        saved: 'Saved',
        unsave: 'Unsave',
        report: 'Report Event',
        moreEvents: 'More Events',
        similarEvents: 'Similar Events',
        moreFromOrganizer: 'More from {{organizer}}',
        viewDetails: 'View Details',
        going: 'going',
        joinComingSoon: 'Join event functionality coming soon!',
        suggestItem: 'Suggest an Item',
        suggestItemMessage: 'What item would you like to suggest?',
        suggest: 'Suggest',
        itemSuggestionComingSoon: 'Item suggestion feature will be available soon!',
        itemUpdateError: 'Could not update item. Please try again.',
        missingResponses: 'Missing responses',
        answerAllQuestions: 'Please answer all required questions',
        signInToRespond: 'Please sign in to submit responses',
        responsesSubmitted: 'Your responses have been submitted!',
        submitResponsesError: 'Failed to submit responses',
        rsvpSubmitted: 'RSVP Submitted',
        rsvpWithoutQuestions: "You have RSVP'd without answering questions.",
        hostPreview: 'Host Preview',
        invite: 'Invite',
        pendingRequests: 'Pending Requests',
        sendReminder: 'Send Reminder',
        hostedBy: 'Hosted by',
        coHostedWith: 'Co-hosted with',
        hostApprovalRequired: 'Host approval required',
        defaultDescription: 'Join us for an amazing experience! The host will share more details soon.',
        thingsToKnow: 'Things to know',
        rsvpDeadline: 'RSVP deadline',
        dressCode: 'Dress code',
        eventTheme: 'Event theme',
        ageRequirement: 'Age requirement',
        guestsAllowed: 'Guests allowed',
        eventType: 'Event type',
        eventCapacity: 'Event capacity',
        registration: 'Registration',
        contact: 'Contact',
        website: 'Website',
        parking: 'Parking',
        eventCosts: 'Event costs',
        paymentAtEvent: 'Payment collected at the event',
        parkingTransportation: 'Parking & Transportation',
        noParkingAtVenue: 'No parking available at venue',
      },
      errors: {
        notFound: 'Event not found',
      },
      creation: {
        title: 'Create Event',
        eventName: 'Event Name',
        eventNamePlaceholder: 'Enter event name',
        eventType: 'Event Type',
        category: 'Category',
        selectCategory: 'Select a category',
        description: 'Description',
        descriptionPlaceholder: 'Describe your event',
        date: 'Date',
        startTime: 'Start Time',
        endTime: 'End Time',
        location: 'Location',
        locationPlaceholder: 'Enter event location',
        online: 'Online Event',
        inPerson: 'In-Person Event',
        price: 'Price',
        free: 'Free Event',
        paid: 'Paid Event',
        ticketPrice: 'Ticket Price',
        numberOfTickets: 'Number of Tickets',
        unlimited: 'Unlimited',
        limited: 'Limited',
        privacy: 'Privacy',
        publicEvent: 'Public Event',
        privateEvent: 'Private Event',
        inviteOnly: 'Invite Only',
        coverImage: 'Cover Image',
        uploadImage: 'Upload Image',
        changeImage: 'Change Image',
        removeImage: 'Remove Image',
        preview: 'Preview',
        publish: 'Publish Event',
        saveDraft: 'Save as Draft',
        cancel: 'Cancel',
        discard: 'Discard Changes',
        discardConfirm: 'Are you sure you want to discard your changes?',
      },
      management: {
        editEvent: 'Edit Event',
        deleteEvent: 'Delete Event',
        deleteConfirm: 'Are you sure you want to delete this event?',
        cancelEvent: 'Cancel Event',
        cancelConfirm: 'Are you sure you want to cancel this event?',
        attendeeList: 'Attendee List',
        exportAttendees: 'Export Attendees',
        sendMessage: 'Send Message to Attendees',
        eventInsights: 'Event Insights',
        views: 'Views',
        registrations: 'Registrations',
        checkedIn: 'Checked In',
        revenue: 'Revenue',
      },
      categories: {
        music: 'Music',
        sports: 'Sports',
        arts: 'Arts',
        food: 'Food & Drink',
        business: 'Business',
        technology: 'Technology',
        health: 'Health & Wellness',
        education: 'Education',
        fashion: 'Fashion',
        film: 'Film & Media',
        gaming: 'Gaming',
        travel: 'Travel',
        charity: 'Charity',
        community: 'Community',
        other: 'Other',
      },
      status: {
        upcoming: 'Upcoming',
        ongoing: 'Ongoing',
        ended: 'Ended',
        cancelled: 'Cancelled',
        postponed: 'Postponed',
        draft: 'Draft',
        published: 'Published',
      },
    },
    profile: {
      tabs: {
        posts: 'Posts',
        events: 'Events',
        media: 'Media',
        likes: 'Likes',
        about: 'About',
        attended: 'Attended',
        organized: 'Organized',
        memories: 'Memories',
        friends: 'Friends',
        ratings: 'Ratings',
      },
      info: {
        memberSince: 'Member since {{date}}',
        followers: '{{count}} Followers',
        following: '{{count}} Following',
        events: '{{count}} Events',
        bio: 'Bio',
        website: 'Website',
        location: 'Location',
        joined: 'Joined {{date}}',
      },
      actions: {
        follow: 'Follow',
        unfollow: 'Unfollow',
        message: 'Message',
        share: 'Share Profile',
        report: 'Report User',
        block: 'Block User',
        unblock: 'Unblock User',
        accept: 'Accept',
        decline: 'Decline',
      },
      loading: 'Loading profile...',
      completeYourProfile: 'Complete Your Profile',
      completeProfile: 'Complete Profile',
      talkToMeAbout: 'Talk to Me About',
      onRepeat: 'On Repeat',
      goToSpot: 'Go-To Spot',
      noFriendsYet: 'No friends yet',
      findFriends: 'Find Friends',
      noFriendsFound: 'No friends found',
      noReceivedRequests: 'No received requests',
      noRequestsFound: 'No requests found',
      noSentRequests: 'No sent requests',
      sentTime: 'Sent {{time}}',
      friendStatus: 'Friends',
      pendingStatus: 'Pending',
      noUsersFound: 'No users found',
      findNewFriends: 'Find new friends',
      noRatingsReceived: 'No ratings received yet',
      noRatingsGiven: 'No ratings given yet',
      noMemoriesYet: 'No memories yet',
      storiesWillAppearHere: 'Your stories will appear here',
      updateRating: 'Update Rating',
      rate: 'Rate',
      settings: {
        editProfile: 'Edit Profile',
        changePhoto: 'Change Photo',
        removePhoto: 'Remove Photo',
        name: 'Name',
        username: 'Username',
        bio: 'Bio',
        website: 'Website',
        location: 'Location',
        privacy: 'Privacy',
        notifications: 'Notifications',
        account: 'Account',
        security: 'Security',
        preferences: 'Preferences',
        language: 'Language',
        theme: 'Theme',
        helpSupport: 'Help & Support',
        about: 'About',
        termsOfService: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        logout: 'Log Out',
        deleteAccount: 'Delete Account',
      },
    },
    map: {
      title: 'Map',
      search: 'Search location',
      searchPlaceholder: 'Search for a city or place',
      nearMe: 'Near Me',
      currentLocation: 'Current Location',
      distance: '{{distance}} km away',
      noEventsNearby: 'No events nearby',
      noEventsFound: 'No events found',
      loadingEvents: 'Loading events...',
      zoomIn: 'Zoom in to see more events',
      viewDetails: 'View Details',
      going: '+{{count}} going',
      offlineMode: '📵 Offline mode',
      slowConnection: '🐌 Slow connection detected',
      filters: {
        radius: 'Radius',
        withinKm: 'Within {{km}} km',
        categories: 'Categories',
        dateRange: 'Date Range',
        priceRange: 'Price Range',
      },
    },
    notifications: {
      title: 'Notifications',
      markAllRead: 'Mark all as read',
      clearAll: 'Clear all',
      empty: 'No notifications',
      types: {
        eventReminder: 'Event Reminder',
        newFollower: 'New Follower',
        eventUpdate: 'Event Update',
        eventCancelled: 'Event Cancelled',
        newMessage: 'New Message',
        mention: 'Mention',
        like: 'Like',
        comment: 'Comment',
      },
    },
    chat: {
      title: 'Messages',
      newMessage: 'New Message',
      typeMessage: 'Type a message...',
      send: 'Send',
      delivered: 'Delivered',
      seen: 'Seen',
      typing: 'typing...',
      online: 'Online',
      lastSeen: 'Last seen {{time}}',
      deleteMessage: 'Delete Message',
      deleteConversation: 'Delete Conversation',
      blockUser: 'Block User',
      unblockUser: 'Unblock User',
      reportUser: 'Report User',
      noMessages: 'No messages yet',
      startConversation: 'Start a conversation',
    },
    settings: {
      title: 'Settings',
      account: {
        title: 'Account Settings',
        phoneNumber: 'Phone Number',
        email: 'Email',
        changePassword: 'Change Password',
        twoFactorAuth: 'Two-Factor Authentication',
        connectedAccounts: 'Connected Accounts',
        dataPrivacy: 'Data & Privacy',
        downloadData: 'Download My Data',
        deleteAccount: 'Delete Account',
        deactivateAccount: 'Deactivate Account',
      },
      notifications: {
        title: 'Notification Settings',
        push: 'Push Notifications',
        email: 'Email Notifications',
        sms: 'SMS Notifications',
        eventInvites: 'Event Invites',
        eventInvitesDesc: 'Get notified when someone invites you to an event',
        eventReminders: 'Event Reminders',
        eventRemindersDesc: 'Reminders for upcoming events',
        eventUpdates: 'Event Updates',
        eventUpdatesDesc: "Changes to events you're attending",
        newFollowers: 'New Followers',
        newFollowersDesc: 'When someone follows you',
        messages: 'Messages',
        messagesDesc: 'Direct messages from friends',
        mentions: 'Mentions',
        updates: 'App Updates',
        promotions: 'Promotions & Offers',
        stories: 'Stories',
        storiesDesc: 'New stories from friends',
      },
      privacy: {
        title: 'Privacy Settings',
        profileVisibility: 'Profile Visibility',
        publicProfileDesc: 'Anyone can see your profile',
        public: 'Public',
        friendsOnly: 'Friends Only',
        private: 'Private',
        showLocation: 'Show My Location',
        showLocationDesc: 'Show your general location on profile',
        showAge: 'Show Age',
        showAgeDesc: 'Display your age on profile',
        showOnlineStatus: 'Show Online Status',
        allowMessages: 'Allow Messages From',
        allowMessagesDesc: 'Who can send you direct messages',
        everyone: 'Everyone',
        nobody: 'Nobody',
        blockedUsers: 'Blocked Users',
      },
      preferences: {
        title: 'Preferences',
        language: 'Language',
        languageDesc: 'Choose your preferred language',
        theme: 'Theme',
        lightTheme: 'Light',
        darkTheme: 'Dark',
        systemTheme: 'System',
        dateFormat: 'Date Format',
        timeFormat: 'Time Format',
        currency: 'Currency',
        measurementUnit: 'Measurement Unit',
        metric: 'Metric',
        imperial: 'Imperial',
        settingsSaved: 'Settings saved successfully',
        failedToSave: 'Failed to save settings',
        clearCache: 'Clear Cache',
        clearCacheMessage: 'This will clear all cached data. Continue?',
        cacheCleared: 'Cache cleared',
        downloadDataMessage: 'Your data will be sent to your email address',
        request: 'Request',
        dataRequestSubmitted: 'Data request submitted. You will receive an email within 24 hours.',
        deleteAccountWarning: 'This action cannot be undone. All your data will be permanently deleted.',
        confirmDeletion: 'Confirm Deletion',
        typeDeleteToConfirm: 'Please type "DELETE" to confirm',
        accountDeleted: 'Account Deleted',
        accountDeletedMessage: 'Your account has been deleted',
      },
    },
    errors: {
      general: 'Something went wrong',
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
      notFound: 'Not found',
      unauthorized: 'Unauthorized',
      forbidden: 'Forbidden',
      validationError: 'Please check your input',
      requiredField: 'This field is required',
      invalidEmail: 'Invalid email address',
      invalidPhone: 'Invalid phone number',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      userNotFound: 'User not found',
      eventNotFound: 'Event not found',
      ticketsSoldOut: 'Tickets are sold out',
      paymentFailed: 'Payment failed',
      uploadFailed: 'Upload failed',
      locationPermissionDenied: 'Location permission denied',
      cameraPermissionDenied: 'Camera permission denied',
      photoLibraryPermissionDenied: 'Photo library permission denied',
    },
    permissions: {
      location: {
        title: 'Location Access',
        message: 'We need access to your location to show nearby events',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
      camera: {
        title: 'Camera Access',
        message: 'We need access to your camera to take photos',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
      photoLibrary: {
        title: 'Photo Library Access',
        message: 'We need access to your photo library to upload images',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
      notifications: {
        title: 'Notification Access',
        message: 'We need permission to send you notifications about events',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    },
    network: {
      offline: 'You are offline',
      slowConnection: 'Slow connection detected',
      slowConnectionMessage: 'Actions may take longer',
      reconnecting: 'Reconnecting...',
      connected: 'Connected',
      checkConnection: 'Check your internet connection',
      retryConnection: 'Retry',
      stillNoConnection: 'Still no connection',
      retrying: 'Retrying...',
      networkError: 'Network error',
      connectionLost: 'Connection lost',
      connectionRestored: 'Connection restored',
      poorConnection: 'Poor connection quality',
      excellentConnection: 'Excellent connection',
      goodConnection: 'Good connection',
      fairConnection: 'Fair connection',
    },
  },
};