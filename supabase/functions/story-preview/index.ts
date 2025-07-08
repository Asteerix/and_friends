import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const storyId = url.pathname.split('/').pop()

    if (!storyId) {
      return new Response('Story ID required', { status: 400 })
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch story details
    const { data: story, error } = await supabaseClient
      .from('stories')
      .select(`
        *,
        user:profiles!stories_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('id', storyId)
      .single()

    if (error || !story) {
      return new Response('Story not found', { status: 404 })
    }

    // Generate HTML with Open Graph meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${story.user?.full_name || story.user?.username || 'User'}'s Memory | AndFriends</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url.origin}/story/${storyId}">
  <meta property="og:title" content="${story.user?.full_name || story.user?.username || 'User'}'s Memory">
  <meta property="og:description" content="${story.caption || 'Check out this amazing memory on AndFriends!'}">
  <meta property="og:image" content="${story.media_url}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url.origin}/story/${storyId}">
  <meta property="twitter:title" content="${story.user?.full_name || story.user?.username || 'User'}'s Memory">
  <meta property="twitter:description" content="${story.caption || 'Check out this amazing memory on AndFriends!'}">
  <meta property="twitter:image" content="${story.media_url}">
  
  <!-- Deep Link Redirect -->
  <script>
    // Check if the app is installed and redirect
    const appScheme = 'andfriends://story/${storyId}';
    const appStoreUrl = 'https://apps.apple.com/app/andfriends/id123456789';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.andfriends.app';
    
    // Try to open the app
    window.location = appScheme;
    
    // Fallback to app store after 2 seconds
    setTimeout(() => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        window.location = appStoreUrl;
      } else if (/android/i.test(userAgent)) {
        window.location = playStoreUrl;
      } else {
        // Desktop: Show a nice preview
        document.getElementById('preview').style.display = 'block';
      }
    }, 2000);
  </script>
  
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #000;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    
    #preview {
      display: none;
      text-align: center;
      max-width: 600px;
      padding: 20px;
    }
    
    .media-container {
      position: relative;
      max-width: 100%;
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .media-container img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 20px 0;
    }
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid #fff;
    }
    
    .username {
      font-size: 18px;
      font-weight: 600;
    }
    
    .caption {
      font-size: 16px;
      line-height: 1.5;
      margin: 20px 0;
      opacity: 0.9;
    }
    
    .cta {
      background: #FF4458;
      color: white;
      padding: 12px 32px;
      border-radius: 24px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      margin-top: 20px;
    }
    
    .app-links {
      margin-top: 40px;
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    
    .app-links a {
      display: inline-block;
    }
    
    .app-links img {
      height: 40px;
    }
  </style>
</head>
<body>
  <div id="preview">
    <h1>AndFriends</h1>
    
    <div class="user-info">
      <img src="${story.user?.avatar_url || 'https://via.placeholder.com/48'}" alt="Avatar" class="avatar">
      <div class="username">@${story.user?.username || 'unknown'}</div>
    </div>
    
    <div class="media-container">
      ${story.media_type === 'video' 
        ? `<video src="${story.media_url}" controls style="width: 100%; height: auto;"></video>`
        : `<img src="${story.media_url}" alt="Memory">`
      }
    </div>
    
    ${story.caption ? `<p class="caption">${story.caption}</p>` : ''}
    
    <p style="opacity: 0.7;">
      <strong>${story.views_count || 0}</strong> views • 
      <strong>${story.likes_count || 0}</strong> likes • 
      <strong>${story.replies_count || 0}</strong> comments
    </p>
    
    <a href="#" class="cta">View in AndFriends App</a>
    
    <div class="app-links">
      <a href="https://apps.apple.com/app/andfriends/id123456789">
        <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on App Store">
      </a>
      <a href="https://play.google.com/store/apps/details?id=com.andfriends.app">
        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play">
      </a>
    </div>
  </div>
</body>
</html>
    `

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})